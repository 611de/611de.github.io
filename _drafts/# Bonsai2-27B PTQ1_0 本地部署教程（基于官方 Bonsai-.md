# Bonsai2-27B PTQ1_0 本地部署教程（基于官方 Bonsai-demo，WSL2 / Linux）
> 模型：Bonsai2-27B GGUF PTQ1_0（1.76 bpw，5.93GB，基于Qwen3.8-27B基座，PrismML三元量化）
> 环境：WSL2 Ubuntu / Debian，NVIDIA CUDA显卡
> 说明：Bonsai-demo 默认下载 PQ2_0 大模型；本文主线：使用 demo 工程，手动下载 PTQ1_0 更小量化模型，本地启动自带8080 WebUI。

## 一、前置说明
1. Bonsai2 是 PrismML 基于 Qwen3.8-27B 开发的多模态推理大模型。
2. PTQ1_0（1.76 bpw，5.93GB）体积更小，显存占用更低；PQ2_0（2.16 bpw，7.25GB）是demo默认模型。
3. ⚠️ PTQ1_0 是 PrismML 自定义三元量化格式，**只能使用 PrismML 魔改prism分支 llama.cpp**，原版llama.cpp无法加载。
4. Bonsai-demo 已经内置编译好的 `llama-server` 二进制，**不需要自己编译llama.cpp**。
5. 硬件参考：RTX 8G显存推荐这套配置；12G+显存可以全开GPU层。

## 二、拉取 Bonsai-demo 官方仓库
```bash
git clone [https://github.com/PrismML-Eng/Bonsai-demo](https://github.com/PrismML-Eng/Bonsai-demo)
cd Bonsai-demo
```

> 可选：执行`./setup.sh`，这个脚本会自动拉取依赖、下载**PQ2_0模型**。
> 👉 如果你只用PTQ1_0，**可以不执行setup.sh下载模型**，后续手动下载PTQ1_0。

## 三、下载 PTQ1_0 模型（国内hf-mirror镜像，避开pip系统环境报错）
> 问题：Ubuntu/WSL2新版Python3.12+有`externally-managed-environment`保护，不能直接全局pip。
> 方案：使用`pipx`安装hf工具，或者使用hfd.sh脚本。下面选用`pipx`方式。

### 1. 安装 hf 工具（pipx，自动隔离环境）
```bash
apt update && apt install pipx -y
pipx install huggingface_hub
```
安装完成后，命令是 `hf`，不是旧版 `huggingface-cli`。

### 2. 设置国内HF镜像
```bash
export HF_ENDPOINT=[https://hf-mirror.com](https://hf-mirror.com)
```

### 3. 下载 PTQ1_0 主模型（保存到`models`目录）
```bash
hf download prism-ml/Ternary-Bonsai-2-27B-gguf Ternary-Bonsai-2-27B-PTQ1_0.gguf --local-dir models
```
> 断点续传：下载中断，重复执行本行即可继续。

### 4.【可选】多模态mmproj视觉层（图片对话才需要，纯文本不用下载）
```bash
hf download prism-ml/Ternary-Bonsai-2-27B-gguf mmproj-bonsai2-q8_0.gguf --local-dir models
```

> 备用方案（不想装任何python工具，直接hfd.sh脚本下载）
```bash
wget [https://hf-mirror.com/hfd/hfd.sh](https://hf-mirror.com/hfd/hfd.sh)
chmod +x hfd.sh
export HF_ENDPOINT=[https://hf-mirror.com](https://hf-mirror.com)
./hfd.sh prism-ml/Ternary-Bonsai-2-27B-gguf --file Ternary-Bonsai-2-27B-PTQ1_0.gguf --local-dir models
```

下载完成后文件路径：
`Bonsai-demo/models/Ternary-Bonsai-2-27B-PTQ1_0.gguf`

## 四、环境变量说明
- `BONSAI_NGL`：多少层模型加载到GPU显存（Number of GPU Layers）
  - `BONSAI_NGL=80`：8G显卡推荐，大部分层GPU，少量层落CPU，防止OOM
  - `BONSAI_NGL=999`：全部层加载GPU，12G+显存可用
- `BONSAI_CTX`：上下文窗口大小（输入+历史对话+输出总和上限）
  - `BONSAI_CTX=32768` → 32k上下文，8G显存推荐
  - 不建议8G卡直接开262144（模型原生262K上下文，KV缓存直接爆显存）
- `--n-predict`：单次回答最大输出token（包含Bonsai内部推理思考token，就是你遇到的「输出token上限」）
- `--reasoning-budget`：Bonsai模型内部思考token预算，思考会占用输出token额度。

## 五、启动 PTQ1_0 服务，内置8080 WebUI
### 纯文本对话（推荐，不需要图片）
```bash
export BONSAI_NGL=80
export BONSAI_CTX=32768
./scripts/start_llama_server.sh \
--model ./models/Ternary-Bonsai-2-27B-PTQ1_0.gguf \
--n-predict 4096 \
--reasoning-budget 2048
```

### 多模态图文对话（带上mmproj，支持上传图片）
```bash
export BONSAI_NGL=80
export BONSAI_CTX=32768
./scripts/start_llama_server.sh \
--model ./models/Ternary-Bonsai-2-27B-PTQ1_0.gguf \
--mmproj ./models/mmproj-bonsai2-q8_0.gguf \
--n-predict 4096 \
--reasoning-budget 2048
```

### 访问地址
- WebUI：[http://127.0.0.1:8080](http://127.0.0.1:8080)
- OpenAI兼容API地址：`[http://127.0.0.1:8080/v1/chat/completions](http://127.0.0.1:8080/v1/chat/completions)`

### ✅ 验证是否加载PTQ1_0
看启动日志第一块：
```
Model:   Ternary-Bonsai-2-27B-PTQ1_0.gguf
```
出现这行代表模型加载成功，不是默认PQ2_0。

## 六、遇到【已达到输出 token 上限，回答截断】怎么处理
> 概念区分：
> 1. `BONSAI_CTX`：全局对话上下文窗口（记住历史的总token上限）
> 2. `--n-predict / Max new tokens`：**单次一轮生成最大输出token（思考+回答一起算）**，触发这个就会截断。

两种调整方式：
1. WebUI界面调整（优先级最高，单次对话生效）
打开8080页面，参数面板：
`Max new tokens` 修改为4096；
`Reasoning effort` 不要拉满最大，Medium足够，减少思考占用token。

2. 启动命令全局设置（上面启动命令里的`--n-predict 4096`就是全局默认）

> 提示：截断之后，直接在输入框发送 `继续`，模型会接着上一轮内容续写。

## 七、一键启动脚本（可选，简化后续操作）
新建`run_ptq1.sh`
```bash
cat > run_ptq1.sh <<'EOF'
#!/bin/bash
export BONSAI_NGL=80
export BONSAI_CTX=32768
./scripts/start_llama_server.sh \
--model ./models/Ternary-Bonsai-2-27B-PTQ1_0.gguf \
--n-predict 4096 \
--reasoning-budget 2048
EOF
chmod +x run_ptq1.sh
```
之后直接运行：
```bash
./run_ptq1.sh
```

## 八、常见踩坑清单
1. ❌ 不要执行`./setup.sh`自动下载模型：setup只会下载PQ2_0，不会下载PTQ1_0。
2. ❌ PTQ1_0不能用原版llama.cpp加载，必须使用demo内置prism分支编译的llama-server。
3. ❌ 8G显存不要设置`BONSAI_NGL=999`，容易OOM显存溢出；爆显存就降低NGL数值（70、65）。
4. ❌ 8G显卡不要设置`BONSAI_CTX=262144`，KV缓存会直接耗尽显存。
5. 警告日志`CORS is set to allow all origins`：本地使用可忽略，公网暴露有安全风险。
6. `Qwen-VL models require at minimum 1024 image tokens`：**纯文本对话直接忽略**；图文任务需要增加参数`--image-min-tokens 1024`。

## 九、模型信息
- Bonsai2-27B 基座：Qwen3.8-27B
- 原生上下文上限：262144 token（262K）
- PTQ1_0：5.93GB，1.76 bpw，三元量化，显存更友好
- PQ2_0：7.25GB，2.16 bpw，demo默认模型
