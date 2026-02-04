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

### 2.1 视觉形态
*   **Pre-highlighting (预判高亮):**
    *   **逻辑：** 由 **Vocabulary Level (A1-C2)** 决定哪些词高亮。
    *   **视觉：** 极细的、透明度极低 (`opacity: 0.3`) 的下划线。

### 2.2 交互逻辑：Instant Peek (即视)
*   **Trigger:** 鼠标悬停 (Hover)。
*   **Response (Based on Level):**
    *   **Lv 1 (Support):** 直接显示 **中文核心义**。
    *   **Lv 2 (Scaffold):** 显示 **英文 Synonym** 或 **Emoji**。点击气泡翻转出中文。
    *   **Lv 3 (Challenge):** **无释义显示**。仅显示发音按钮/IPA。需要 **双击** 才会显示释义。
*   **Click Action:** 单击单词加入 Review 队列 (Pin it)。

### 2.3 AI 伴读 (AI Companion) 🆕

**位置：** 段落正文下方（内联显示）
**触发时机：** 随段落 AI 分析自动判断
**适用模式：** Flow / Learn 模式通用

*   **逻辑：** AI 分析句子时判断是否值得添加文学性评注
    *   名句、经典开篇 → 显示评注
    *   关键剧情转折 → 显示评注
    *   普通叙述 → 不显示（节省空间）
*   **评注类型 (12 种)：**

    **文学类**
    *   `famous_quote`: 名句/经典开篇
    *   `literary_insight`: 修辞手法/文风赏析
    *   `plot_turning_point`: 剧情转折/伏笔
    *   `character_insight`: 人物性格揭示

    **知识类**
    *   `historical_context`: 历史背景
    *   `cultural_reference`: 文化典故/流行文化
    *   `scientific_concept`: 科学概念解释
    *   `real_world_connection`: 与现实世界的联系

    **教育类**
    *   `moral_lesson`: 寓意/道德启示（适合儿童读物）
    *   `fun_fact`: 趣味知识点
    *   `reading_tip`: 阅读技巧提示
    *   `author_technique`: 写作技巧展示

**视觉设计：**
```
┌──────────────────────────────────────────────────────────┐
│  It is a truth universally acknowledged...               │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🎙️ "这是英国文学史上最著名的开篇之一。"             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**数据结构：**
```javascript
{
  companion: {
    type: "literary_insight",
    text: "这是英国文学史上最著名的开篇之一。"
  }
}
```

---

## 3. 右侧仪表盘交互 (Ambient Context)

在 Flow 模式下，右侧面板**严格禁止**显示单词列表。

### 3.1 Mood Board (情绪板)
*   **逻辑:** AI 分析当前视窗内文本的情感色彩。
*   **表现:**
    *   *Joy/Light:* 背景色温偏暖。
    *   *Sadness/Gloom:* 背景色温偏冷。

### 3.2 Visual Context (视觉上下文)
*   **Entity Linking:** 当光标经过特定实体（地名、人名）时，右侧静默淡入图片或地图。

---

## 4. 异常处理
*   **AI 介入:** 如果用户在一段停留过久且频繁 Hover，磁吸光标变色并提示切换至 **Learn Mode**。
