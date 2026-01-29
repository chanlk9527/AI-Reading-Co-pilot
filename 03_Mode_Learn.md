# 🎓 03_Mode_Learn.md (学习模式)

**定位：** 深度习得 (Acquisition)
**核心隐喻：** X光透视镜 (X-Ray Specs)
**主题色：** Royal Blue (`#2980B9`)

---

## 1. 核心理念 (Philosophy)

**"Desirable Difficulty" (必要的困难)**
Learn 模式不仅是展示知识，更是引导思考。我们利用 **双重漏斗 (Double Funnel)** 和 **苏格拉底循环 (Socratic Loop)**，让用户经历“猜测-验证-内化”的过程。

---

## 2. 核心机制：双重漏斗 (The Double Funnel)

前端渲染时，必须同时满足以下两个条件的内容才会被标记/显示：
1.  **Type (类型):** Vocab, Syntax, Culture
2.  **Difficulty Rule:** `Item.Difficulty >= User.Level`
    *   *例外:* Lv 1 用户显示所有难度 (Diff 1-5)。

---

## 3. 左侧阅读区：Syntax X-Ray (句法透视)

根据等级，文本的物理排版发生改变。

| 等级 | 视图名称 | 视觉样式 (CSS 实现) | 目的 |
| :--- | :--- | :--- | :--- |
| **Lv 1-2** | **Chunking View**<br>(意群视图) | `border: 1px dashed rgba(orange, 0.3)`<br>`background: rgba(orange, 0.05)`<br>将长句切分为 `[短语块]`。 | 降低句法认知负荷，辅助断句。 |
| **Lv 3-5** | **Immersion View**<br>(沉浸视图) | 无边框。<br>仅对漏斗筛选出的 Token 添加高亮底色。<br>**Vocab:** Blue Highlight<br>**Syntax:** Orange Highlight | 聚焦核心难点，培养语感。 |

---

## 4. 右侧仪表盘：Knowledge Hub (知识枢纽)

这是 Learn 模式的主战场。

### 4.1 交互核心：苏格拉底循环 (The Socratic Loop)
知识卡片默认不显示答案，而是处于 **"Guess Mode"**。

*   **State A: Guess (猜测态)**
    *   **UI:** 灰色背景，内容折叠。
    *   **Content:** 仅显示单词原形 + **Hint (线索)**。
    *   **Hint 类型:**
        *   *Lv 1-2:* 简单的英文解释 (Simple Definition)。
        *   *Lv 3:* 同义词/反义词 (Synonym/Antonym)。
        *   *Lv 4:* 词根词源 (Etymology)。
        *   *Lv 5:* 空缺 (No Hint)，纯靠语境猜。
*   **Action:** 用户点击卡片。
*   **Feedback:**
    *   视觉：卡片翻转/破碎特效。
    *   听觉：清脆的玻璃破碎音效 (Sound of breakthrough)。
*   **State B: Reveal (揭示态)**
    *   **UI:** 白色背景，高亮边框。
    *   **Content:** 显示中文释义、IPA音标、句法图解、语境备注。

### 4.2 模块：自适应伴读 (Adaptive Insight)
位于仪表盘顶部，随光标所在段落刷新。

*   **Persona Logic (人格切换):**
    *   **The Translator (Lv 1-2):** "Summary Mode"。输出段落大意，解释 Who did What。
    *   **The Professor (Lv 3-4):** "Analysis Mode"。输出句法结构分析（如倒装、虚拟语气）或词汇的精准用法。
    *   **The Critic (Lv 5):** "Discussion Mode"。输出文学赏析（反讽、隐喻、社会背景），并抛出一个 **Debate Question**（辩论题）。

---

## 5. 数据联动
*   **User Action:** 用户在 Learn 模式下点击翻开 (Reveal) 的卡片。
*   **Backend:** 记录 `user_click_history { word_id, timestamp }`。
*   **Purpose:** 这些词将成为 **Review Mode** 中的高优先级挖空对象。