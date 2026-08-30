---
layout: post
title: 方案 B 实现：业务 starter 直连 auth 服务的完整代码
subtitle: /authz 契约、自动装配、filter 与本地缓存、401/302 语义、mock 护栏、非 Java 接入与逐服务灰度
categories: 教程与踩坑
tags: [k8s, 认证, idaas, sa-token, spring-boot]
series: 云原生实践
updated: 2026-08-31
environment: Spring Boot 3 + Java 17 + 公司统一 IDaaS（不限部署位置）
use_case: 统一认证方案 B 的实现细节：auth 服务 /authz、业务 starter 全套、非 Java 中间件、灰度上线
---

> 这是统一认证系列的第四篇，也是[方案 B](/2026/08/31/统一认证完整方案-业务服务接入与本地调试/)（业务 starter filter 直连 auth 服务，不依赖 ingress 全局拦截）的**实现篇**。前三篇分别是：[GitOps 与 K8s 统一认证落地](/2026/08/31/GitOps与K8s统一认证落地/)、[GitOps 里 k8s 公共配置放哪](/2026/08/31/GitOps里k8s公共配置放哪/)、[统一认证完整方案](/2026/08/31/统一认证完整方案-业务服务接入与本地调试/)。这一篇只回答一个问题：**方案 B 到底怎么写**——auth 服务的 `/authz` 契约与实现、starter 的完整骨架（自动装配、filter、本地缓存、401/302 语义、mock 护栏、@CurrentUser）、非 Java 服务怎么接、以及逐服务灰度的节奏。代码以 Spring Boot 3 + Java 17 为例，思路对 Boot 2 同样适用（只差自动装配注册方式）。

## 目录

1. 总览：两个交付物，一份契约
2. auth 服务实现：/authz
3. starter 实现（核心）
4. 非 Java 服务接入
5. 本地调试：三档
6. 灰度上线与检查表
7. 参考

## 一、总览：两个交付物，一份契约

方案 B 只有**两个交付物**，中间靠一份 HTTP 契约连接：

```
┌─────────────────┐   ①filter 拦截每个请求      ┌──────────────────────┐
│ company-auth-   │ ──────────────────────────> │  auth 服务（平台维护） │
│ starter（依赖） │   GET /authz                │  - IDaaS SDK（全公司  │
│                 │   Cookie + X-App-Id + URI   │    只装这一份）        │
│ 业务服务 x N     │ <────────────────────────── │  - Redis 会话缓存     │
└─────────────────┘   200 用户JSON / 401 / 403  │  - 应用级 RBAC        │
        │                                       └──────────────────────┘
        ②组装 UserContext，业务代码取用
```

- **auth 服务**：平台组维护，一个接口 `/authz` + IDaaS SDK + RBAC；
- **starter**：业务组引入的唯一东西，自动装配，理论上零代码接入；
- **契约**：`/authz` 的请求/响应就是"公司认证协议"，Java starter 和各语言中间件都对着它写。

## 二、auth 服务实现：/authz

### 2.1 接口契约（先定协议，再写代码）

请求（由 starter/中间件发出）：

| 头 | 含义 |
|---|---|
| `Cookie` | 原样带上浏览器请求里的 IDaaS cookie |
| `X-App-Id` | 调用方的应用标识，如 `a.company.com`（在业务服务配置里写死，不用动态猜 Host） |
| `X-Original-Uri` | 原始请求路径，用于审计日志和将来的路径级 RBAC |

响应：

| 状态码 | 含义 | Body |
|---|---|---|
| 200 | 会话有效且有权限 | `{"uid":"u123","name":"张三","roles":["app-user"]}` |
| 401 | 无会话/会话无效 | 空（前端只需状态码） |
| 403 | 会话有效但没有这个应用的权限 | 空 |
| 5xx | auth/IDaaS 自身故障 | 空（调用方按 fail-closed 处理） |

应用标识用配置里的 `X-App-Id` 而不是从 Host 推断：显式、可测、不依赖转发头的行为差异。内网信任边界内这个字段可以信任；要防"乱报 appId"，给内部调用加一个共享 token（下文）。

### 2.2 实现骨架

```java
@RestController
@RequiredArgsConstructor
public class AuthzController {

    private final IdpClient idpClient;        // IDaaS 适配，全公司唯一
    private final SessionCache sessionCache;  // Redis：cookie -> 用户，TTL 30~60s
    private final AppRbac rbac;

    @GetMapping("/authz")
    public ResponseEntity<?> authz(
            @RequestHeader(value = "Cookie", required = false) String cookieHeader,
            @RequestHeader("X-App-Id") String appId,
            @RequestHeader(value = "X-Original-Uri", required = false) String uri) {

        String cookie = extractCookie(cookieHeader);
        if (cookie == null) return unauthenticated();

        // ① 会话校验：先查缓存，未命中回源 IDaaS
        UserPrincipal p = sessionCache.get(cookie).orElseGet(() -> {
            var validated = idpClient.validate(cookie);
            validated.ifPresent(v -> sessionCache.put(cookie, v));
            return validated.orElse(null);
        });
        if (p == null) return unauthenticated();

        // ② 应用级 RBAC
        if (!rbac.canAccess(appId, p)) {
            log.warn("[rbac-deny] app={} uid={} uri={}", appId, p.uid(), uri);
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(p);
    }

    private ResponseEntity<Void> unauthenticated() {
        return ResponseEntity.status(401).build();
    }
}
```

三个关键点：

**IDaaS SDK 只装在这里。** 对外只有一个接口，方便将来换 SDK / 换实现（本地验签 or 内省）：

```java
public interface IdpClient {
    /** 校验 IDaaS 会话 cookie，返回用户；无效返回 empty */
    Optional<UserPrincipal> validate(String cookieValue);
}
```

**Redis 会话缓存**：key 用 `sha256(cookie)`（内存和日志里不落原始凭证），TTL 30~60s。代价照旧要写进文档：**撤销延迟 = 缓存 TTL**，踢人/禁用后最多一个周期内还能访问，按安全基线调。IDaaS 抖动时这层缓存同时是缓冲。

**RBAC 用 sa-token，但只用 RBAC 部分**——不 `StpUtil.login`、没有自己的会话，实现 `StpInterface` 提供数据、显式传 uid 做判断：

```java
@Component
public class AppRbac implements StpInterface {

    /** app -> 允许访问的角色集合；数据源：自维护权限表或 IDaaS 组织，二选一（对接时确认） */
    private final Map<String, Set<String>> appRoles = loadAppRoles();

    public boolean canAccess(String appId, UserPrincipal p) {
        Set<String> allowed = appRoles.get(appId);
        return allowed == null || allowed.isEmpty()      // 未配置 = 不限制（安全基线也可以选拒绝）
                || p.roles().stream().anyMatch(allowed::contains);
    }

    @Override public List<String> getRoleList(Object loginId, String loginType) { /* 查角色表 */ }
    @Override public List<String> getPermissionList(Object loginId, String loginType) { /* 查权限表 */ }
}
```

其余注意：auth 自身的 `/actuator/health` 必须放行；服务间内部调用不走用户会话，用 same-token 或网络白名单；**fail-closed**——IDaaS/Redis 不可用时宁可全站 401/5xx，不裸奔。

## 三、starter 实现（核心）

### 3.1 工程结构

```
company-auth-starter/
├── pom.xml
└── src/main/
    ├── java/com/company/auth/
    │   ├── CompanyAuthAutoConfiguration.java
    │   ├── CompanyAuthProperties.java
    │   ├── core/
    │   │   ├── UserPrincipal.java        # record(uid, name, roles)
    │   │   ├── UserContext.java          # ThreadLocal
    │   │   ├── AuthClient.java           # 调 /authz
    │   │   ├── AuthReply.java            # 200/401/403 三态结果
    │   │   └── PrincipalCache.java       # Caffeine 本地缓存
    │   ├── filter/
    │   │   ├── FilterModeAuthFilter.java # 方案B主模式
    │   │   ├── HeaderModeAuthFilter.java # 预留：将来切边缘注入
    │   │   └── MockModeAuthFilter.java   # 本地开发
    │   ├── web/
    │   │   ├── CurrentUser.java          # 参数注解
    │   │   └── CurrentUserArgumentResolver.java
    │   └── async/UserContextTaskDecorator.java
    └── resources/META-INF/
        └── spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

### 3.2 配置项

```yaml
# 业务服务只需要这一段
company:
  auth:
    mode: filter            # filter | header | mock
    enforce: false          # 上线初期 false=observe（只记日志不拦截），灰度完改 true
    app-id: a.company.com   # 本服务应用标识（/authz 的 X-App-Id）
    auth-url: "http://auth.auth-system.svc:8080/authz"
    cookie-name: "idaas_session"
    login-url: "https://idaas.xxx.com/login"   # 页面请求 401 时 302 的目标
    cache-ttl: 30s          # 撤销延迟 = 这个值，过安全评审
    auth-timeout-ms: 500    # 调 auth 的超时，fail-closed
    exclude-paths:
      - /actuator/**
      - /public/**
      - /api/internal/**    # 内部服务调用走 same-token，不走用户会话
    api-prefixes:
      - /api/               # 这些前缀按 API 处理（401 JSON），其余按页面（302）
```

```java
@ConfigurationProperties("company.auth")
public class CompanyAuthProperties {
    public enum Mode { FILTER, HEADER, MOCK }

    private Mode mode = Mode.FILTER;
    private boolean enforce = true;
    private String appId;
    private String authUrl;
    private String cookieName = "idaas_session";
    private String loginUrl;
    private Duration cacheTtl = Duration.ofSeconds(30);
    private Duration badCacheTtl = Duration.ofSeconds(5);   // 401 负缓存
    private long authTimeoutMs = 500;
    private List<String> excludePaths = new ArrayList<>(List.of("/actuator/**"));
    private List<String> apiPrefixes = new ArrayList<>(List.of("/api/"));
    private final Mock mock = new Mock();

    public static class Mock {
        private String uid = "dev001";
        private String name = "本地用户";
        private List<String> roles = List.of("app-user", "admin");
        // getter/setter
    }
    // 其余 getter/setter 省略
}
```

### 3.3 UserContext / UserPrincipal

```java
public record UserPrincipal(String uid, String name, List<String> roles) {}

public final class UserContext {
    private static final ThreadLocal<UserPrincipal> HOLDER = new ThreadLocal<>();

    public static void set(UserPrincipal p) { HOLDER.set(p); }

    /** 取不到直接抛异常——把"忘了登录/异步没传"暴露在第一时间，而不是 NPE 在深处 */
    public static UserPrincipal get() {
        UserPrincipal p = HOLDER.get();
        if (p == null) throw new IllegalStateException("当前线程没有用户上下文（未登录或异步线程未传递）");
        return p;
    }
    public static Optional<UserPrincipal> optional() { return Optional.ofNullable(HOLDER.get()); }
    public static void clear() { HOLDER.remove(); }   // 线程池复用，必须清
}
```

### 3.4 AuthClient：调 /authz

```java
public class AuthClient {
    private final RestTemplate http;
    private final CompanyAuthProperties props;

    public AuthClient(CompanyAuthProperties props) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout((int) props.getAuthTimeoutMs());
        f.setReadTimeout((int) props.getAuthTimeoutMs());
        this.http = new RestTemplate(f);
        this.props = props;
    }

    public AuthReply validate(String cookie, String uri) {
        HttpHeaders h = new HttpHeaders();
        h.set(HttpHeaders.COOKIE, props.getCookieName() + "=" + cookie);
        h.set("X-App-Id", props.getAppId());
        h.set("X-Original-Uri", uri);
        try {
            ResponseEntity<UserPrincipal> resp = http.exchange(
                    props.getAuthUrl(), HttpMethod.GET, new HttpEntity<>(h), UserPrincipal.class);
            return AuthReply.ok(resp.getBody());
        } catch (HttpStatusCodeException e) {
            int s = e.getStatusCode().value();
            if (s == 401) return AuthReply.unauthenticated();
            if (s == 403) return AuthReply.forbidden();
            throw new AuthUnavailableException(e);          // 5xx → fail-closed
        } catch (ResourceAccessException e) {
            throw new AuthUnavailableException(e);          // 超时/连不上 → fail-closed
        }
    }
}
```

```java
public record AuthReply(int status, UserPrincipal principal) {
    public boolean ok() { return status == 200; }
    public static AuthReply ok(UserPrincipal p)        { return new AuthReply(200, p); }
    public static AuthReply unauthenticated()          { return new AuthReply(401, null); }
    public static AuthReply forbidden()                { return new AuthReply(403, null); }
}
```

### 3.5 本地缓存：两段 Caffeine

命中时**零网络调用**，这是 B 模式性能的关键。正缓存 TTL 30s；**负缓存 5s** 防止有人拿坏 cookie 疯狂打穿 auth：

```java
public class PrincipalCache {
    private final Cache<String, AuthReply> ok;
    private final Cache<String, Boolean> bad;

    public PrincipalCache(CompanyAuthProperties props) {
        this.ok  = Caffeine.newBuilder().expireAfterWrite(props.getCacheTtl())
                           .maximumSize(10_000).build();
        this.bad = Caffeine.newBuilder().expireAfterWrite(props.getBadCacheTtl())
                           .maximumSize(10_000).build();
    }

    public AuthReply get(String cookieHash, Supplier<AuthReply> loader) {
        AuthReply hit = ok.getIfPresent(cookieHash);
        if (hit != null) return hit;
        if (Boolean.TRUE.equals(bad.getIfPresent(cookieHash))) return AuthReply.unauthenticated();
        AuthReply fresh = loader.get();
        if (fresh.ok()) ok.put(cookieHash, fresh); else bad.put(cookieHash, Boolean.TRUE);
        return fresh;
    }

    /** key 用 hash，内存/日志不落原始 cookie */
    public static String hash(String cookie) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256")
                    .digest(cookie.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
```

### 3.6 核心 Filter

```java
public class FilterModeAuthFilter extends OncePerRequestFilter {
    private static final AntPathMatcher MATCHER = new AntPathMatcher();

    private final CompanyAuthProperties props;
    private final AuthClient authClient;
    private final PrincipalCache cache;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        // ① 预检和放行路径直接过
        if (isPreflight(req) || isExcluded(req)) { chain.doFilter(req, res); return; }

        // ② 取 cookie，走缓存调 auth
        String cookie = extractCookie(req);
        AuthReply reply;
        try {
            reply = cookie == null ? AuthReply.unauthenticated()
                    : cache.get(PrincipalCache.hash(cookie),
                                () -> authClient.validate(cookie, requestUri(req)));
        } catch (AuthUnavailableException e) {
            log.error("[auth] auth 服务不可用，fail-closed", e);
            res.sendError(503);                    // 绝不放行
            return;
        }

        // ③ 失败：observe 只记日志；enforce 走 401/302
        if (!reply.ok()) {
            if (!props.isEnforce()) {
                log.warn("[auth-observe] {} {} -> {} ua={}", req.getMethod(),
                        req.getRequestURI(), reply.status(), req.getHeader("User-Agent"));
            } else {
                handleUnauthenticated(req, res, reply);
                return;
            }
        }

        // ④ 组装上下文，必须 finally 清理
        UserContext.set(reply.principal());
        try { chain.doFilter(req, res); } finally { UserContext.clear(); }
    }

    private boolean isPreflight(HttpServletRequest req) {
        return "OPTIONS".equalsIgnoreCase(req.getMethod());
    }

    private boolean isExcluded(HttpServletRequest req) {
        return props.getExcludePaths().stream()
                .anyMatch(p -> MATCHER.match(p, req.getRequestURI()));
    }

    private String extractCookie(HttpServletRequest req) {
        if (req.getCookies() == null) return null;
        for (Cookie c : req.getCookies()) {
            if (props.getCookieName().equals(c.getName())) return c.getValue();
        }
        return null;
    }
}
```

### 3.7 失败语义：API 401 JSON，页面 302

B 模式的一个小福利：响应是 filter 自己写的，**body 不会被谁吞掉**（A 模式里 nginx 会吞子请求 body），所以 loginUrl 可以直接放进 401 的 body：

```java
private void handleUnauthenticated(HttpServletRequest req, HttpServletResponse res, AuthReply reply)
        throws IOException {
    if (isApi(req)) {
        res.setStatus(reply.status());   // 401 或 403
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"code\":" + reply.status()
                + ",\"message\":\"unauthenticated\",\"loginUrl\":\"" + props.getLoginUrl() + "\"}");
    } else {
        String proto = headerOr(req, "X-Forwarded-Proto", req.getScheme());
        String host  = headerOr(req, "X-Forwarded-Host", req.getHeader("Host"));
        String back  = proto + "://" + host + req.getRequestURI()
                     + (req.getQueryString() != null ? "?" + req.getQueryString() : "");
        res.setStatus(302);
        res.setHeader(HttpHeaders.LOCATION, props.getLoginUrl() + "?back="
                + URLEncoder.encode(back, StandardCharsets.UTF_8));
    }
}

private boolean isApi(HttpServletRequest req) {
    if ("XMLHttpRequest".equals(req.getHeader("X-Requested-With"))) return true;
    if (props.getApiPrefixes().stream().anyMatch(p -> req.getRequestURI().startsWith(p))) return true;
    String accept = req.getHeader("Accept");
    return accept != null && !accept.contains("text/html");
}
```

前端配套只有一个：axios/fetch 拦截器见到 401 就 `window.location = body.loginUrl`（或前端自己的配置），所有项目复用同一个组件。

### 3.8 mock 模式与生产护栏

```java
public class MockModeAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        var m = props.getMock();
        UserContext.set(new UserPrincipal(m.getUid(), m.getName(), m.getRoles()));
        try { chain.doFilter(req, res); } finally { UserContext.clear(); }
    }
}
```

护栏放在自动装配里，**prod profile + mock 直接拒绝启动**——否则哪天本地配置带上生产，等于开了伪造身份的后门：

```java
void guard(Environment env, CompanyAuthProperties props) {
    if (props.getMode() == Mode.MOCK && env.acceptsProfiles(Profiles.of("prod"))) {
        throw new IllegalStateException("company.auth.mode=mock 禁止在生产 profile 下启用");
    }
    if (props.getMode() == Mode.FILTER && !StringUtils.hasText(props.getAuthUrl())) {
        throw new IllegalStateException("filter 模式必须配置 company.auth.auth-url");
    }
}
```

### 3.9 header 模式（预留迁移位）

将来如果公司要边缘统一拦截（ingress 全局 auth-url + 注入 header），业务**代码零改动**，配置切一下：

```java
public class HeaderModeAuthFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String uid = req.getHeader("X-Auth-User-Id");
        if (uid == null) { res.sendError(401); return; }   // 边缘已拦截过，这里只是兜底
        UserContext.set(new UserPrincipal(uid,
                req.getHeader("X-Auth-User-Name"),
                splitRoles(req.getHeader("X-Auth-Roles"))));
        try { chain.doFilter(req, res); } finally { UserContext.clear(); }
    }
}
```

### 3.10 @CurrentUser 与异步传递

```java
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {}

public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {
    @Override public boolean supportsParameter(MethodParameter p) {
        return p.hasParameterAnnotation(CurrentUser.class) && p.getParameterType() == UserPrincipal.class;
    }
    @Override public Object resolveArgument(MethodParameter p, ModelAndViewContainer m,
            NativeWebRequest r, WebDataBinderFactory b) { return UserContext.get(); }
}
```

业务代码里的全部用法就一行：`order.setCreatedBy(UserContext.get().getUid())` 或参数上 `@CurrentUser UserPrincipal user`。

`@Async` 的线程池要配 TaskDecorator，自建线程池要自己传：

```java
public class UserContextTaskDecorator implements TaskDecorator {
    @Override
    public Runnable decorate(Runnable runnable) {
        UserPrincipal principal = UserContext.optional().orElse(null);
        return () -> {
            if (principal != null) UserContext.set(principal);
            try { runnable.run(); } finally { UserContext.clear(); }
        };
    }
}
```

### 3.11 自动装配：加依赖即生效

```java
@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@EnableConfigurationProperties(CompanyAuthProperties.class)
public class CompanyAuthAutoConfiguration implements WebMvcConfigurer {

    @Bean
    public FilterRegistrationBean<OncePerRequestFilter> companyAuthFilter(
            CompanyAuthProperties props, Environment env) {
        guard(env, props);
        OncePerRequestFilter filter = switch (props.getMode()) {
            case FILTER -> new FilterModeAuthFilter(props,
                    new AuthClient(props), new PrincipalCache(props));
            case HEADER -> new HeaderModeAuthFilter(props);
            case MOCK   -> new MockModeAuthFilter(props);
        };
        FilterRegistrationBean<OncePerRequestFilter> reg = new FilterRegistrationBean<>(filter);
        reg.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);   // 尽量靠前，赶在业务 filter 之前
        reg.addUrlPatterns("/*");
        return reg;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CurrentUserArgumentResolver());
    }
}
```

注册文件（Boot 3）：`src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`，内容一行：

```text
com.company.auth.CompanyAuthAutoConfiguration
```

Boot 2 用 `META-INF/spring.factories`：`org.springframework.boot.autoconfigure.EnableAutoConfiguration=com.company.auth.CompanyAuthAutoConfiguration`。

所有 Bean 提供方都用 `@ConditionalOnMissingBean` 风格留好覆盖缝隙：业务服务想自定义行为，声明同类型 Bean 就能顶掉 starter 的默认实现——这是"无缝替换已有用户封装"的机制基础。

## 四、非 Java 服务接入

契约是 HTTP，所以任何语言写个几十行中间件。Go 示例（生产里补上超时和连接复用）：

```go
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions { next.ServeHTTP(w, r); return }
		c, err := r.Cookie("idaas_session")
		if err != nil { w.WriteHeader(401); return }

		req, _ := http.NewRequest("GET", "http://auth.internal:8080/authz", nil)
		req.Header.Set("Cookie", c.String())
		req.Header.Set("X-App-Id", "b.company.com")
		req.Header.Set("X-Original-Uri", r.URL.Path)
		resp, err := http.DefaultClient.Do(req)
		if err != nil || resp.StatusCode >= 500 { w.WriteHeader(503); return }  // fail-closed
		if resp.StatusCode != 200 { w.WriteHeader(resp.StatusCode); return }

		var u User
		json.NewDecoder(resp.Body).Decode(&u)
		ctx := context.WithValue(r.Context(), userKey, u)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

非 k8s 服务接入只需满足：能访问 auth 服务（内部域名 + IP 白名单）、域名在 IDaaS cookie 父域下、自己管 HTTPS 证书。Java starter 同样直接可用——**认证边界跟代码走，不跟基础设施走**。

## 五、本地调试：三档

对比[方案篇的四档](/2026/08/31/统一认证完整方案-业务服务接入与本地调试/)，B 模式下"本地 nginx 模拟 ingress"一整档消失了：

| 档位 | 做法 | 场景 |
|---|---|---|
| ① mock | `mode: mock`，本地配置造用户 | 日常开发（90%） |
| ② 直连 dev auth | `auth-url` 指向 dev，curl 带真实 cookie | 调认证链路、RBAC |
| ③ dev 集群 | 部署上去全链路验 | 上线前验收 |

①的配置：

```yaml
# application-local.yml
company:
  auth:
    mode: mock
    mock:
      uid: dev001
      name: 张三(本地)
      roles: [app-user, admin]
```

②：浏览器登录一次 dev IDaaS，F12 复制 cookie，curl 本地服务（会自动经 filter 走真实 /authz 链路）：

```bash
curl http://localhost:8080/api/orders -b "idaas_session=<从F12复制的值>"
```

注意：浏览器在 localhost 上拿不到父域 cookie，这是 cookie 域的物理限制（和方案无关），浏览器全流程联调在 dev 集群做。

## 六、灰度上线与检查表

B 模式的灰度是**逐服务**的，每个团队自己控制节奏，不需要动任何全局开关：

1. 业务服务加 starter 依赖，`enforce: false`（observe）→ 发版 → 什么都不受影响；
2. 看一两天 `[auth-observe]` 日志：谁在裸访、哪些路径该进 exclude、cookie 有没有带上；
3. 改 `enforce: true` → 该服务强制认证完成；
4. 需要用户身份的地方补 `@CurrentUser`（这是唯一的"业务代码改动"）。

检查表：

- [ ] `/authz` 契约文档化（请求头、状态码、JSON 字段），Java 之外的语言照着接
- [ ] starter 默认 `enforce=false`，护栏验证过（prod + mock 拒绝启动）
- [ ] `exclude-paths` 覆盖 /actuator、公开端点、内部调用（same-token）
- [ ] OPTIONS 放行、负缓存生效（坏 cookie 不会打穿 auth）
- [ ] auth 服务：IDaaS SDK 只装这一份、Redis 缓存 TTL 过安全评审、fail-closed、多副本
- [ ] auth 服务内部域名 + IP 白名单，不暴露公网
- [ ] 漏接 starter 的兜底：公司父 POM/脚手架内置 starter + CI 检查依赖
- [ ] 全部服务（含非 k8s）域名收进 IDaaS cookie 父域，非 k8s 服务自己管证书
- [ ] starter 版本进公司 BOM，auth 的 `/authz` 承诺向后兼容
- [ ] 前端统一 401 拦截器组件（读 body 里的 loginUrl 或本地配置）

一句话总结：方案 B 把"认证"做成了**一个服务 + 一个依赖 + 一份 HTTP 契约**——auth 服务拿着全公司唯一的 IDaaS SDK 和 RBAC，starter 用自动装配让业务团队加个依赖就接入，契约让任何语言、任何部署位置的服务都能进来。

## 参考

- 前篇：[统一认证完整方案：IDaaS 会话、ingress 全局拦截、业务服务只读 header](/2026/08/31/统一认证完整方案-业务服务接入与本地调试/)
- 前篇：[GitOps 与 K8s 统一认证落地](/2026/08/31/GitOps与K8s统一认证落地/)
- 前篇：[GitOps 里 k8s 公共配置放哪](/2026/08/31/GitOps里k8s公共配置放哪/)
- [Spring Boot 官方文档 - Auto-configuration](https://docs.spring.io/spring-boot/reference/using/auto-configuration.html)
- [Caffeine Cache](https://github.com/ben-manes/caffeine)
- [sa-token 官方文档](https://sa-token.cc/)——`StpInterface` 与显式传 uid 的 RBAC 用法
