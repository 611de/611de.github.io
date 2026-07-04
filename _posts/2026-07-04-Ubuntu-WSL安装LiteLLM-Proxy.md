---
layout: post
title: Ubuntu 和 WSL 如何安装 LiteLLM Proxy
subtitle: 避开 PEP 668，使用 pipx 或虚拟环境隔离安装
categories: LLM 应用开发
tags: [LiteLLM, Ubuntu, WSL, Python, pipx]
series: LLM 工具链
updated: 2026-07-04
environment: Ubuntu 24.04 或 WSL 2
versions: Python 3.12；LiteLLM 使用安装时的稳定版本
use_case: 在 Debian、Ubuntu 或 WSL 中安装 LiteLLM Proxy，并避免污染系统 Python
---

在较新的 Debian、Ubuntu 和 WSL 环境中，直接执行 `pip install` 可能出现 `externally-managed-environment` 错误。这是 [PEP 668](https://packaging.python.org/en/latest/specifications/externally-managed-environments/) 的保护机制：系统不允许 `pip` 直接修改由操作系统管理的 Python 环境。

安装 LiteLLM Proxy 时，不建议使用 `sudo pip` 或长期依赖 `--break-system-packages`。更稳妥的方式是使用 `pipx`；如果还需要修改源码或管理项目依赖，则使用虚拟环境。

## 方案一：使用 pipx 安装

`pipx` 会为命令行工具创建独立的 Python 环境，同时将命令加入用户的 `PATH`。对于只需要运行 LiteLLM Proxy 的场景，这是最省事的方案。

### 1. 安装 pipx

```bash
sudo apt update
sudo apt install -y pipx
pipx ensurepath
```

执行完 `pipx ensurepath` 后，重新打开终端。如果当前终端需要立即生效，可以运行：

```bash
source ~/.bashrc
```

### 2. 安装 LiteLLM Proxy

```bash
pipx install 'litellm[proxy]'
```

如果已经安装，升级时执行：

```bash
pipx upgrade litellm
```

### 3. 验证安装

```bash
litellm --help
```

能够正常显示命令帮助，就说明 LiteLLM 已加入 `PATH`。

## 方案二：使用 Python 虚拟环境

如果要为 LiteLLM 固定版本、保存配置或参与开发，建议为它建立单独的虚拟环境。

### 1. 安装虚拟环境支持

```bash
sudo apt update
sudo apt install -y python3-venv python3-full
```

### 2. 创建并激活环境

```bash
python3 -m venv ~/.venvs/litellm
source ~/.venvs/litellm/bin/activate
```

### 3. 安装 LiteLLM Proxy

```bash
python -m pip install --upgrade pip
python -m pip install 'litellm[proxy]'
litellm --help
```

使用结束后退出虚拟环境：

```bash
deactivate
```

下次使用时只需重新激活：

```bash
source ~/.venvs/litellm/bin/activate
```

## 启动一个本地代理

下面以本机 Ollama 中的 `llama3.2` 为例。先确认 Ollama 服务和模型已经可用：

```bash
ollama pull llama3.2
ollama list
```

启动 LiteLLM Proxy：

```bash
litellm --model ollama/llama3.2 --port 4000
```

另开一个终端检查 OpenAI 兼容接口：

```bash
curl http://localhost:4000/v1/models
```

如果代理启动正常，接口会返回模型信息。生产环境还需要配置访问密钥、请求限流和日志策略，不能直接把未鉴权的端口暴露到公网。更完整的代理配置可参考 [LiteLLM Proxy 官方文档](https://docs.litellm.ai/docs/simple_proxy)。

## 常见错误

### `externally-managed-environment`

不要使用 `sudo pip install`。选择 `pipx` 或虚拟环境，确保依赖不会覆盖系统 Python 包。

### `litellm: command not found`

先执行：

```bash
pipx ensurepath
source ~/.bashrc
```

如果使用虚拟环境，则确认已经运行：

```bash
source ~/.venvs/litellm/bin/activate
```

### 安装原生依赖失败

安装基础编译环境后重试：

```bash
sudo apt install -y build-essential python3-dev
```

### 4000 端口已被占用

指定其他端口：

```bash
litellm --model ollama/llama3.2 --port 4001
```

## 不推荐的安装方式

以下命令会绕过系统 Python 的保护机制：

```bash
pip install 'litellm[proxy]' --break-system-packages
```

它适合一次性的隔离测试环境，不适合作为日常安装方案。系统 Python 被覆盖后，可能影响依赖它的操作系统工具。

## 总结

- 只运行 LiteLLM Proxy：优先使用 `pipx`。
- 需要固定版本或开发调试：使用 `venv`。
- 不要使用 `sudo pip` 修改系统 Python。
- 对外提供代理服务前，必须增加鉴权、限流和额度控制。

参考资料：[LiteLLM Proxy](https://docs.litellm.ai/docs/simple_proxy)、[pipx](https://pipx.pypa.io/stable/)、[Python externally managed environments](https://packaging.python.org/en/latest/specifications/externally-managed-environments/)。
