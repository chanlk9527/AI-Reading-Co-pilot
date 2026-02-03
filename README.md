# 🚀 AI Reading Co-pilot - 本地安装指南

欢迎使用 AI Reading Co-pilot 项目！本指南将帮助您在本地设置并运行该应用程序。

## 📋 先决条件

在开始之前，请确保您已安装以下软件：
- **Node.js**: v18.0.0 或更高版本
- **npm**: v9.0.0 或更高版本
- **Git**

## 🛠️ 安装与启动

本项目的现代版本基于 **React (+Vite)** 构建，代码位于 `src-react` 目录中。

### 1. 导航至项目目录
打开终端并导航到项目根目录，然后进入 React 源代码文件夹：

```bash
cd src-react
```

### 2. 安装依赖
安装所需的 Node.js 包：

```bash
npm install
```

### 3. 启动开发服务器
运行本地开发服务器：

```bash
npm run dev
```

应用程序现应可在以下地址访问：
👉 **http://localhost:3000** (或终端中显示的端口)

---

## 🔑 AI 服务配置

本应用程序使用外部 AI 服务（Google Gemini 或 阿里通义千问）来生成见解和知识点。**您必须在本地配置 API 密钥才能使用这些功能。**

### 如何配置密钥
1. 在浏览器中打开应用程序（例如 `http://localhost:3000`）。
2. 打开 **浏览器开发者工具**（按 F12 或 右键点击 -> 检查）。
3. 切换到 **控制台 (Console)** 标签页。
4. 根据您首选的提供商运行以下命令：

#### 选项 A: Google Gemini (推荐)
```javascript
// 设置提供商为 Google
localStorage.setItem('AI_PROVIDER', 'google');

// 设置您的 Google API 密钥
localStorage.setItem('GOOGLE_API_KEY', 'AIzaSy...'); // 请替换为您实际的密钥
```

#### 选项 B: 阿里通义千问 (DashScope)
```javascript
// 设置提供商为 Aliyun
localStorage.setItem('AI_PROVIDER', 'aliyun');

// 设置您的 Aliyun API 密钥
localStorage.setItem('ALIYUN_API_KEY', 'sk-...'); // 请替换为您实际的密钥
```

5. **刷新页面** 以使更改生效。

---

## 📂 项目结构

- **`src-react/`**: React 主应用程序（当前版本）。
  - **`src/components/`**: UI 组件（ReaderPanel, CopilotPanel 等）。
  - **`src/services/`**: API 集成（AI 服务）。
  - **`src/styles/`**: 全局 CSS (`index.css`)。
- **`start_server.sh` / `server.py`**: 旧版/实验性 Python 后端（用于 TTS）。*主 React 应用当前不需要此部分。*
- **`js/` & `*.html`**: 旧版原生 JS 代码（已弃用）。

## ❓ 常见问题解答

**问: AI 功能无法工作 / 出现 "API Key missing" 错误。**
答: 请确保您已按照上述 "AI 服务配置" 步骤操作并刷新了页面。检查浏览器控制台以获取具体的错误信息。

**问: 页面布局看起来很乱。**
答: 请确保您是在运行 `src-react` 中的应用，而不是直接打开根目录下的旧版 `.html` 文件。

**问: 如何切换阅读模式？**
答: 使用屏幕 **右上角** 的悬浮控件在 Flow（沉浸）、Learn（学习）和 Review（复习）模式之间切换。
