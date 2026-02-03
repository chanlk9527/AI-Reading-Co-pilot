# 📑 00_Master_PRD.md (主控文档)

**项目名称：** AI Reading Coach (AI 沉浸式阅读教练)

**版本号：** v2.1 (The Cognitive Scaffolding Edition)

**最后更新：** 2026-02-03
**文档状态：** 🟡 持续迭代中

---

## 1. 产品愿景 (Product Vision)

**"让阅读回归阅读，让学习回归学习。"**

现有的阅读工具往往陷入两难：要么干扰太少导致读不懂（纯阅读器），要么干扰太多导致读不下去（生词提示满天飞）。

**v2.x 的核心哲学是"认知脚手架 (Cognitive Scaffolding)"**。
我们要打造一个动态的阅读环境，它承认用户在不同时刻有不同的认知目标：
1.  **Consumption (消费):** 享受内容，追求心流。
2.  **Acquisition (习得):** 解构文本，研磨句法。
3.  **Retention (保持):** 测试记忆，强化回路。

通过 **"场景分层"**，我们将这三种需求解耦，互不干扰。

---

## 2. 核心架构：双模三级矩阵 (The Matrix)

这是产品的核心逻辑骨架。用户通过 **Mode (模式)** 选择场景，通过 **Level (1-3)** 定义 AI 介入的深度。

### 2.1 两大模式 (The 2 Modes)

| 模式 | 隐喻 (Metaphor) | 核心价值 | 实现状态 |
| :--- | :--- | :--- | :--- |
| **☕️ Flow**<br>(心流模式) | **隐形眼镜**<br>(Contact Lens) | **无痛阅读**<br>极低干扰，仅提供必要的背景支持，保持沉浸感。 | ✅ 已实现 |
| **🎓 Learn**<br>(学习模式) | **X光透视镜**<br>(X-Ray Specs) | **深度习得**<br>透视句法结构，进行苏格拉底式学习。 | ✅ 已实现 (迭代中) |

> **📝 Review Mode**: 计划中，暂未实现。

### 2.2 三级交互脚手架 (The 3 Scaffolding Levels)

**Scaffolding Level (1-3)** 定义交互的 **干预强度 (Intervention Intensity)**。

#### Flow Mode 交互矩阵

| 等级 | Hover 显示 | 点击交互 | 实现状态 |
| :--- | :--- | :--- | :--- |
| **Lv 1: Support** | 中文释义 | - | ✅ 已实现 |
| **Lv 2: Scaffold** | 英文线索 (Clue) | 点击切换中/英释义 | ✅ 已实现 |
| **Lv 3: Challenge** | 英文线索 (Clue) | - | ✅ 已实现 |

#### Learn Mode 交互矩阵

| 等级 | 生词 Hover | 右侧卡片 | 实现状态 |
| :--- | :--- | :--- | :--- |
| **Lv 1: Support** | 内联中文标签 | 直接显示释义 | ✅ 已实现 |
| **Lv 2: Scaffold** | 中文释义 | 直接显示释义 | ✅ 已实现 |
| **Lv 3: Challenge** | 无 (仅高亮) | Blur 遮罩，点击揭示 | ✅ 已实现 |

### 2.3 词汇能力等级 (Vocabulary Proficiency)

新增 **Vocabulary Level (A1 - C2)**，代表用户的词汇储备水平。
**作用：** 决定了 **哪些词** 会被视为生词并被高亮。

*   **逻辑：** `Show Word IF (Word.Difficulty >= User.VocabLevel)`
*   **解耦设计：**
    *   **Vocab Level** 决定 **内容 (What)**：用户是 B2，则 B2+ 的词高亮。
    *   **Scaffold Level** 决定 **交互 (How)**：Hover 时显示什么内容。

**实现状态：** ✅ 已实现

---

## 3. 学习模式核心组件 (Learn Mode Components)

### 3.1 句子X光 (Sentence X-Ray) - **NEW v2.1**

**位置：** Knowledge Scaffolding 区域顶部
**触发：** 随句子分析自动生成（复用现有 AI 调用）
**目的：** 帮助用户理解复杂句子的结构

```
┌─────────────────────────────────────┐
│ 🔍 句子X光                           │
├─────────────────────────────────────┤
│ 主语: Mr. Bennet                    │
│ 谓语: was so odd a mixture of...   │
│ 结构: so...that 结果状语从句         │
│ 💡 核心含义: "如此...以至于..."       │
└─────────────────────────────────────┘
```

**数据结构：**
```javascript
{
  subject: "Mr. Bennet",
  predicate: "was so odd a mixture of...",
  structure: "so...that 结果状语从句",
  meaning: "如此...以至于..."
}
```

**实现状态：** 🟡 设计完成，待开发

### 3.2 教练问答 (Coach Q&A) - **NEW v2.1**

**位置：** Copilot Panel 底部
**触发：** 用户点击 "开始问答" 按钮（按需调用，节省 Token）
**目的：** 用问题引导用户主动思考，实现苏格拉底式学习

```
┌─────────────────────────────────────┐
│ 🎓 AI 教练问答        [ 💬 开始问答 ] │
├─────────────────────────────────────┤
│ 🤔 Coach: 你觉得作者用 "odd mixture" │
│    这个词想表达什么?                  │
│                                     │
│ [ A. 奇怪的混合物 ]                  │
│ [ B. 性格复杂矛盾 ]  ← 正确答案       │
│ [ C. 行为古怪 ]                      │
│                                     │
│ [ 💡 直接告诉我答案 ]                 │
└─────────────────────────────────────┘
```

**数据结构：**
```javascript
{
  question: "你觉得作者用 'odd mixture' 想表达什么?",
  options: [
    { id: 'A', text: '奇怪的混合物' },
    { id: 'B', text: '性格复杂矛盾' },
    { id: 'C', text: '行为古怪' }
  ],
  correctAnswer: 'B',
  explanation: "作者用 'odd mixture' 暗示 Mr. Bennet 的性格..."
}
```

**交互规则：**
- 每段落限调用 1 次（结果缓存到 Context）
- 用户选择后显示正确答案 + 解释
- 提供 "直接看答案" 快捷方式

**实现状态：** 🟡 设计完成，待开发

### 3.3 生词脚手架 (Knowledge Scaffolding)

**位置：** Copilot Panel 中部
**功能：** 显示当前段落的核心生词卡片

**实现状态：** ✅ 已实现

---

## 4. 全局功能 (Global Features)

### 4.1 Ask AI (The Omni-Query)

**全模式通用功能**。允许用户针对当前阅读的段落进行自由提问。

*   **交互隐喻:** "Sparkle in the Margin" (边缘的火花)
*   **触发方式:** 点击段落右侧 ✨ 图标
*   **功能:** 支持自由提问 + 预设快捷 Chips

**实现状态：** ✅ 已实现

### 4.2 Smart Import (Magic Content)

**核心流程**: "Import -> Digestion -> Enhancement".

*   **入口 (Magic Paste):** 支持直接粘贴文本。
*   **AI Digestion (预处理):** 自动分句 (Spacy NLP)。
*   **Enhancement (知识增强):** 用户导入的文章，瞬间拥有 Scaffolding 能力。

**实现状态：** ✅ 已实现

### 4.3 阅读进度同步 (Progress Sync)

**跨端同步用户阅读状态：**
*   当前阅读位置 (Paragraph ID)
*   阅读模式 (Flow/Learn)
*   脚手架等级 (1-3)
*   词汇等级 (A1-C2)

**实现状态：** ✅ 已实现

---

## 5. 关键术语表 (Glossary)

*   **Magnetic Marker (磁吸光标):** 位于左侧边缘，指示当前阅读段落的视觉锚点。
*   **Sentence X-Ray (句子X光):** 可视化展示句子结构的分析组件。
*   **Coach Q&A (教练问答):** 用选择题引导用户思考的互动学习组件。
*   **Ambient Context (氛围上下文):** Flow 模式下右侧显示的非文本辅助信息（如地图、人物图）。
*   **Socratic Blur (苏格拉底遮罩):** 知识点默认不显示答案，仅显示线索的交互状态。

---

## 6. 技术架构 (Tech Stack)

| 层级 | 技术选型 | 用途 |
| :--- | :--- | :--- |
| **前端** | React + Vite | SPA 应用 |
| **后端** | FastAPI (Python) | REST API |
| **数据库** | SQLite | 轻量级本地存储 |
| **NLP** | spaCy | 分句处理 |
| **AI** | Aliyun Qwen / Google Gemini | 文本分析 & 对话 |
| **TTS** | Aliyun Cosyvoice | 语音合成 |

---

## 7. 开发路线图 (Roadmap)

### Phase 1: Foundation ✅ 完成
- [x] 全局 Design System
- [x] 核心阅读器渲染与磁吸光标逻辑
- [x] Flow Mode (基础 hover 查词)
- [x] 用户认证系统

### Phase 2: The Brain (Learn Mode) ✅ 完成
- [x] 接入 NLP 引擎进行分句 (Spacy)
- [x] AI 文本分析 (词汇 + 翻译 + Insight)
- [x] 右侧 Knowledge Hub 组件
- [x] 三级脚手架交互矩阵

### Phase 3: Polish & Persist ✅ 完成
- [x] 阅读进度云端同步
- [x] Flow Mode Lv2 点击切换释义
- [x] Flow Mode Lv3 英文线索 (替代音标)

### Phase 4: Deep Learning 🔄 进行中
- [ ] 句子X光 (Sentence X-Ray) 组件
- [ ] 教练问答 (Coach Q&A) 组件
- [ ] AI 分析结果缓存优化

### Phase 5: The Loop (Review Mode) 📅 计划中
- [ ] 用户行为追踪 (记录查词历史)
- [ ] 动态挖空渲染 (Blur effect)
- [ ] 间隔重复算法 (Spaced Repetition)

---

## 8. 附录

### 相关文档
- [技术栈文档](./TECH_STACK.md)
- [本地启动指南](./LOCAL_STARTUP.md)
- [后端配置指南](./BACKEND_SETUP.md)