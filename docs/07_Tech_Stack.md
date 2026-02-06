# 🛠️ AI Reading Co-pilot 技术栈文档

**文档版本:** v1.0  
**最后更新:** 2026-02-02  
**文档目的:** 帮助后续开发者快速了解项目技术架构

---

## 1. 技术栈概览 (Tech Stack Overview)

| 层级 | 技术选型 | 版本 | 说明 |
|:---|:---|:---|:---|
| **前端框架** | React | ^18.3.1 | 使用最新 React 18，支持 Concurrent Features |
| **构建工具** | Vite | ^6.0.0 | 极速 HMR，现代化的开发体验 |
| **编程语言** | JavaScript (ES Modules) | ES2022+ | 未使用 TypeScript |
| **样式方案** | Vanilla CSS | - | 原生 CSS + CSS Variables，无预处理器 |
| **Markdown 渲染** | marked | ^15.0.0 | 用于渲染 AI 响应中的 Markdown 内容 |
| **字体** | Google Fonts (Outfit) | - | 现代无衬线字体 |
| **AI 服务** | 多 Provider 支持 | - | 阿里云 DashScope / Google Gemini |

---

## 2. 项目结构 (Project Structure)

```
AI-Reading-Co-pilot/
│
├── 📁 src-react/                    # React 前端应用 (主要开发目录)
│   ├── index.html                   # 入口 HTML
│   ├── package.json                 # 项目依赖配置
│   ├── vite.config.js               # Vite 构建配置
│   │
│   └── 📁 src/
│       ├── main.jsx                 # 应用入口点
│       ├── App.jsx                  # 根组件
│       │
│       ├── 📁 components/           # UI 组件目录
│       │   ├── 📁 ReaderPanel/      # 阅读面板组件
│       │   ├── 📁 CopilotPanel/     # AI 助手面板组件
│       │   ├── 📁 FloatingControls/ # 浮动控制器组件
│       │   └── 📁 ImportModal/      # 导入弹窗组件
│       │
│       ├── 📁 context/              # React Context 状态管理
│       │   └── AppContext.jsx       # 全局状态上下文
│       │
│       ├── 📁 services/             # 服务层
│       │   ├── aiService.js         # AI 服务封装
│       │   └── config.js            # AI 配置 (从 localStorage 读取)
│       │
│       ├── 📁 data/                 # 数据层
│       │   └── demoData.js          # 演示用模拟数据
│       │
│       └── 📁 styles/               # 样式文件
│           └── index.css            # 全局样式
│
├── 📁 js/                           # 遗留 Vanilla JS 代码 (已弃用)
├── index.html                       # 遗留入口 (已弃用)
├── index.css                        # 遗留样式 (已弃用)
│
└── 📁 docs/
    ├── 00_Master_PRD.md             # 主控产品需求文档
    ├── 01_Design_System.md          # 设计系统文档
    ├── 02_Mode_Flow.md              # Flow 模式详细定义
    ├── 03_Mode_Learn.md             # Learn 模式详细定义
    ├── 04_Data_Schema.md            # 数据结构定义
    └── 05_Backend_System.md         # 后端系统文档
```

---

## 3. 核心架构 (Core Architecture)

### 3.1 状态管理 (State Management)

项目使用 **React Context API** 进行全局状态管理，无需引入 Redux/Zustand 等外部库。

**核心状态 (`AppContext.jsx`):**

```javascript
{
    mode: 'flow' | 'learn',           // 当前阅读模式
    level: 1 | 2 | 3,                 // 脚手架等级 (干预强度)
    vocabLevel: 'A1' ~ 'C2',          // 用户词汇水平
    activeId: string | null,          // 当前激活的段落 ID
    revealedKeys: string[],           // 已揭示的知识点 key 列表
    bookData: { [paragraphId]: {...} } // 段落关联数据 (知识点、翻译、洞察)
}
```

**关键 Actions:**

| 方法 | 说明 |
|:---|:---|
| `switchMode(newMode)` | 切换阅读模式 (flow/learn) |
| `changeLevel(newLevel)` | 切换脚手架等级 (1-3) |
| `changeVocabLevel(level)` | 切换词汇等级 (A1-C2) |
| `setActiveId(id)` | 设置当前激活段落 |
| `revealKey(key)` | 标记某个知识点已揭示 |
| `updateBookData(id, data)` | 更新段落数据 |

### 3.2 组件架构 (Component Architecture)

采用 **功能文件夹模式**，每个组件独立成文件夹：

```
ComponentName/
└── ComponentName.jsx    # 组件实现
```

**主要组件职责:**

| 组件 | 职责 |
|:---|:---|
| `App.jsx` | 根组件，管理段落数据，协调子组件 |
| `FloatingControls` | 顶部浮动控制栏 (模式切换、等级调节、导入按钮) |
| `ReaderPanel` | 左侧阅读面板，渲染段落与生词高亮 |
| `CopilotPanel` | 右侧 AI 助手面板，展示知识点/翻译/洞察 |
| `ImportModal` | Smart Import 弹窗，处理用户导入文本 |

### 3.3 AI 服务层 (AI Service Layer)

`aiService.js` 封装了统一的 AI 调用接口，支持多 Provider 切换：

**支持的 AI Provider:**

| Provider | 模型 | API 端点 |
|:---|:---|:---|
| **阿里云 DashScope** | `qwen-turbo` | `dashscope.aliyuncs.com` |
| **Google Gemini** | `gemini-2.5-flash-lite` | `generativelanguage.googleapis.com` |

**配置方式:**

API Key 通过 `localStorage` 存储，**不硬编码在代码中**：

```javascript
// 设置 API Key (在浏览器控制台执行)
localStorage.setItem('AI_PROVIDER', 'google');         // 或 'aliyun'
localStorage.setItem('GOOGLE_API_KEY', 'your-key');
localStorage.setItem('ALIYUN_API_KEY', 'your-key');
```

**核心方法:**

```javascript
// 通用聊天接口
await aiService.chat(systemPrompt, userQuery);

// 文本分析 (Smart Import 使用)
await aiService.analyzeText(rawText);
```

---

## 4. 开发指南 (Development Guide)

### 4.1 环境要求

- **Node.js**: >= 18.x
- **npm**: >= 9.x
- **操作系统**: Windows / macOS / Linux

### 4.2 快速开始

```bash
# 1. 进入 React 项目目录
cd src-react

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问 http://localhost:3000
```

### 4.3 常用命令

| 命令 | 说明 |
|:---|:---|
| `npm run dev` | 启动开发服务器 (端口 3000) |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |

### 4.4 配置 AI 服务

启动应用后，在浏览器控制台执行以下命令配置 AI：

```javascript
// 使用 Google Gemini (推荐)
localStorage.setItem('AI_PROVIDER', 'google');
localStorage.setItem('GOOGLE_API_KEY', 'AIzaSy...');

// 或使用阿里云 DashScope
localStorage.setItem('AI_PROVIDER', 'aliyun');
localStorage.setItem('ALIYUN_API_KEY', 'sk-...');

// 刷新页面使配置生效
location.reload();
```

---

## 5. 设计系统 (Design System)

### 5.1 主题色

项目使用 **CSS Variables** 定义主题：

```css
:root {
    --color-primary: #6366f1;    /* Indigo 主色 */
    --color-secondary: #8b5cf6;  /* Purple 辅助色 */
    --color-background: #0f0f23; /* 深色背景 */
    --color-surface: #1a1a2e;    /* 卡片背景 */
    --color-text: #e0e0e0;       /* 主文本色 */
}
```

### 5.2 字体

- **主字体**: `'Outfit', sans-serif` (Google Fonts)
- **代码字体**: 系统等宽字体

### 5.3 模式主题

| 模式 | Body 类名 | 视觉特征 |
|:---|:---|:---|
| Flow | `mode-flow` | 暗色调，低对比度，沉浸式 |
| Learn | `mode-learn` | 蓝色主题，高对比度，结构化 |

---

## 6. 数据模型 (Data Models)

### 6.1 段落数据结构

```javascript
{
    id: "para-1",                    // 唯一标识
    text: "原文内容...",              // 段落文本
    knowledge: [                     // 知识点数组
        {
            key: "unique_word_id",   // 唯一 key
            word: "vocabulary",      // 展示词形
            ipa: "/vəˈkæbjəleri/",   // 国际音标
            def: "词汇",              // 中文释义
            clue: "word bank",       // 英文提示
            diff: 4,                 // 难度等级 (1=A1, 6=C2)
            context: "build your vocabulary" // 语境示例
        }
    ],
    insight: {                       // AI 洞察
        tag: "主题标签",
        text: "深度分析内容..."
    },
    translation: "中文翻译..."        // 全段翻译
}
```

### 6.2 难度等级映射

| 数值 | CEFR 等级 | 说明 |
|:---|:---|:---|
| 1 | A1 | 初级入门 |
| 2 | A2 | 初级基础 |
| 3 | B1 | 中级门槛 |
| 4 | B2 | 中级进阶 |
| 5 | C1 | 高级流利 |
| 6 | C2 | 精通母语级 |

---

## 7. 遗留代码说明 (Legacy Code)

项目根目录下的 `js/`、`index.html`、`index.css` 是 **遗留的 Vanilla JS 版本**，目前已迁移至 React。

- ⚠️ **不建议修改遗留代码**
- ✅ 所有新功能开发请在 `src-react/` 目录进行

---

## 8. 相关文档索引

| 文档 | 说明 |
|:---|:---|
| [00_Master_PRD.md](./00_Master_PRD.md) | 产品需求主文档 |
| [01_Design_System.md](./01_Design_System.md) | 设计系统规范 |
| [02_Mode_Flow.md](./02_Mode_Flow.md) | Flow 模式详细定义 |
| [03_Mode_Learn.md](./03_Mode_Learn.md) | Learn 模式详细定义 |
| [04_Data_Schema.md](./04_Data_Schema.md) | 完整数据结构定义 |
| [05_Backend_System.md](./05_Backend_System.md) | 后端系统描述 |
| [06_Backend_Setup.md](./06_Backend_Setup.md) | 后端环境配置 |
| [07_Tech_Stack.md](./07_Tech_Stack.md) | 技术栈概览 |

---

## 9. 常见问题 (FAQ)

### Q: 为什么选择 React Context 而非 Redux？

项目规模中等，状态复杂度可控，Context API 足以满足需求，避免引入额外依赖和模板代码。

### Q: 为什么不使用 TypeScript？

为了快速迭代和降低入门门槛。后续可根据团队需求迁移至 TypeScript。

### Q: AI 响应失败怎么办？

检查 `localStorage` 中的 API Key 是否正确设置，以及网络是否可访问对应的 AI 服务端点。

---

*📝 本文档由开发团队维护，如有更新请同步修改版本号和更新日期。*
