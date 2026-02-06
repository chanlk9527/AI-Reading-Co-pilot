# 🛠️ 后端服务部署说明

虽然目前的 React 前端应用主要设计为客户端运行，但本项目包含一个基于 Python (FastAPI) 的后端服务，用于提供更高级的功能，如用户账户系统、数据持久化存储以及高质量的 Edge TTS (文本转语音) 服务。

## 📋 环境要求

- **Python**: 3.8 或更高版本
- **pip**: Python 包管理器

## 📦 安装依赖

建议创建一个虚拟环境来隔离依赖：

### 1. 创建虚拟环境 (可选但推荐)

**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. 安装必需的库

运行以下命令安装服务器运行所需的 Python 包：

```bash
pip install fastapi uvicorn edge-tts PyJWT
```
*注意：`server.py` 中使用了 `edge-tts` 进行语音合成，`PyJWT` 进行用户认证。*

## 🚀 启动服务器

### 方式 A: 直接使用 Python (适用于 Windows/Mac/Linux)

在项目根目录下，运行以下命令启动服务器：

```bash
uvicorn server:app --reload --port 8000
```
- `--reload`: 开启热重载，代码修改后自动重启（开发模式）。
- `--port 8000`: 指定运行端口为 8000。

### 方式 B: 使用启动脚本 (仅限 macOS/Linux)

如果在 macOS 或 Linux 上，可以直接运行根目录下的脚本：

```bash
chmod +x start_server.sh
./start_server.sh
```

## 🔍 验证运行

服务器启动后，您可以通过访问自动生成的 API 文档来验证服务是否正常运行：

- **Swagger UI (交互式文档)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

如果看到### 1. 启动服务

**推荐方式**: 在根目录直接运行 `restart_server.bat` (Windows) 或 `restart_server.sh` (Mac/Linux)。

**手动方式**:
```bash
cd backend
python server.py
```
*(注意：必须进入 `backend` 目录运行，否则数据库路径可能不正确)*
服务器使用环境变量进行配置。您可以在启动前设置以下变量，或直接在代码中修改默认值（仅限开发环境）：

- `SECRET_KEY`: 用于 JWT 令牌签名的密钥 (默认: "your-secret-key-change-in-production")
  - **生产环境务必修改此项！**

## 🔌 API 功能概览

该后端服务提供以下主要功能模块：

1.  **身份验证 (`/auth`)**: 用户注册、登录、获取当前用户信息。
2.  **文本管理 (`/texts`)**: 创建、读取、更新、删除阅读文本。
3.  **段落管理 (`/paragraphs`)**: 获取文本分段及翻译/分析数据。
4.  **TTS 服务 (`/tts`)**: 利用 Microsoft Edge 的免费接口生成高质量语音。
    - 支持多种声音 (Narrator, Male, Female)。

## ⚠️ 注意事项

- 默认情况下，前端 React 应用可能配置为使用 Mock 数据或直接调用外部 AI API。若要连接此后端，需确保前端 API 请求指向 `http://localhost:8000`。
- 数据库文件 `reading_copilot.db` 会在服务器首次启动时自动在根目录创建 (基于 SQLite)。
