# ☕️ 02_Mode_Flow.md (心流模式)

**定位：** 沉浸式阅读 (Consumption)
**核心隐喻：** 隐形眼镜 (The Contact Lens)
**主题色：** Emerald Green (`#00B894`)

---

## 1. 核心理念 (Philosophy)

**"Minimum Effective Dose" (最小有效干预)**
Flow 模式假设用户此时的目标是“读完故事”或“获取信息”，而不是“学习语言”。因此，所有的辅助必须是**非阻塞 (Non-blocking)** 的。
*   ❌ 禁止弹出模态框 (Modals)。
*   ❌ 禁止强制视线大幅移动。
*   ❌ 禁止复杂的点击交互。

---

## 2. 左侧阅读区交互 (The Reader Stream)

### 2.1 视觉形态：隐形预判
*   **Pre-highlighting (预判高亮):**
    *   **Selection Logic:** 由 **Vocabulary/Proficiency Level (A1-C2)** 决定哪些词高亮。
    *   **Visual:** 极细的、透明度极低 (`opacity: 0.3`) 的下划线。
*   **Scaffolding Level (控制交互):**
    *   在 Flow 模式下，Level 1-3 不改变高亮的密度，只改变 **Hover 时的气泡内容** (详见 2.2)。

### 2.2 交互逻辑：Instant Peek (即视)
*   **Trigger:** 鼠标悬停 (Hover) / 手指长按 (Touch)。
*   **Response (Based on Level):**
    *   **Lv 1 (Support):** 直接显示 **中文核心义**。
    *   **Lv 2 (Scaffold):** 显示 **英文 Synonym** 或 **Emoji**。点击气泡翻转出中文。
    *   **Lv 3 (Challenge):** **无释义显示**。仅显示发音按钮/IPA。需要 **双击/用力按** 才会显示释义。
*   **Styles:**
    *   位置: 紧贴单词上方 5px。
    *   样式: 黑色半透明气泡 (`rgba(0,0,0,0.8)`), 白色文字。
    *   延迟: 0ms (无延迟)。
*   **Exit:** 鼠标移开，气泡立即消失。
*   **Click Action (点击行为):**
    *   单机单词：**"Pin it"**。单词上方出现一个小红点，表示已加入 **Review 队列**，但不弹出详情卡片，不打断阅读流。

---

## 3. 右侧仪表盘交互 (Ambient Context)

在 Flow 模式下，右侧面板**严格禁止**显示单词列表，以免诱导用户分心背单词。

### 3.1 模块一：Mood Board (情绪板)
*   **逻辑:** AI 分析当前视窗内文本的情感色彩 (Sentiment Analysis)。
*   **表现:**
    *   *Joy/Light:* 背景色温偏暖 (Warm White)。
    *   *Sadness/Gloom:* 背景色温偏冷 (Cool Gray)。
    *   *Tension:* 极其微弱的暗角效果 (Vignette)。

### 3.2 模块二：Visual Context (视觉上下文)
*   **Entity Linking (实体链接):**
    *   当光标经过特定实体（地名、人名、物品）时，右侧静默淡入图片。
*   **示例:**
    *   文本提到 "Pemberley" -> 右侧显示: [一张 19 世纪英国庄园的概念插画]。
    *   文本提到 "Meryton" -> 右侧显示: [简单的方位示意图]。
    *   文本提到 "Bonnet" -> 右侧显示: [摄政时期的女士软帽图片]。

---

## 4. 异常处理
*   **用户困惑:** 如果用户在一段停留超过 10秒 且频繁触发 Hover。
*   **AI 介入:** 磁吸光标变色，并弹出一个微小的 Toast 提示：“Need deep dive? Switch to Learn Mode.”（需要精读？请切换至学习模式）。