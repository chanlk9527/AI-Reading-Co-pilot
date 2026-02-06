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
 *   ❌ **无右侧面板**（面板宽度为 0，不显示 Copilot Panel）。
 
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
     *   **Lv 2 (Scaffold):** 显示 **英文 Clue (线索)**。点击气泡翻转出中文。
     *   **Lv 3 (Challenge):** 显示 **英文 Clue (线索)**。无中文显示。
 *   **Click Action:** 点击单词（Level 2）可手动切换当前释义的显示状态。
 
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
     *   `moral_lesson`: 寓意/道德启示
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
 
 ---
 
 ## 3. 异常处理
 
 *   **AI 介入:** 如果用户在一段停留过久且频繁 Hover，磁吸光标变色并提示切换至 **Learn Mode**。
