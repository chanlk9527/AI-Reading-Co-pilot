# 📑 00_Master_PRD.md (主控文档)

**项目名称：** AI Reading Coach (AI 沉浸式阅读教练)

**版本号：** v2.0 (The Cognitive Scaffolding Edition)

**最后更新：** 2026-01-29
**文档状态：** 🟢 已定稿

---

## 1. 产品愿景 (Product Vision)

**“让阅读回归阅读，让学习回归学习。”**

现有的阅读工具往往陷入两难：要么干扰太少导致读不懂（纯阅读器），要么干扰太多导致读不下去（生词提示满天飞）。

**v2.0 的核心哲学是“认知脚手架 (Cognitive Scaffolding)”**。
我们要打造一个动态的阅读环境，它承认用户在不同时刻有不同的认知目标：
1.  **Consumption (消费):** 享受内容，追求心流。
2.  **Acquisition (习得):** 解构文本，研磨句法。
3.  **Retention (保持):** 测试记忆，强化回路。

通过 **“场景分层”**，我们将这三种需求解耦，互不干扰。

---

## 2. 核心架构：三模五级矩阵 (The Matrix)

这是产品的核心逻辑骨架。用户通过 **Mode (模式)** 选择场景，通过 **Level (1-5)** 定义 AI 介入的深度。

### 2.1 三大模式 (The 3 Modes)

| 模式 | 隐喻 (Metaphor) | 核心价值 | 详细定义文件 |
| :--- | :--- | :--- | :--- |
| **☕️ Flow**<br>(心流模式) | **隐形眼镜**<br>(Contact Lens) | **无痛阅读**<br>极低干扰，仅提供必要的背景支持，保持沉浸感。 | [🔗 02_Mode_Flow.md](./02_Mode_Flow.md) |
| **🎓 Learn**<br>(学习模式) | **X光透视镜**<br>(X-Ray Specs) | **深度习得**<br>利用“双重漏斗”机制，透视句法结构，进行苏格拉底式学习。 | [🔗 03_Mode_Learn.md](./03_Mode_Learn.md) |
| **📝 Review**<br>(复习模式) | **完形填空**<br>(The Quiz) | **记忆闭环**<br>基于用户的学习历史生成填空题，强制主动回忆 (Active Recall)。 | [🔗 04_Mode_Review.md](./04_Mode_Review.md) |

### 2.2 五级认知阶梯 (The 5 Levels of Scaffolding)

**Level (1-5)** 此处重新定义为 **“认知脚手架 (Cognitive Scaffolding)”的介入深度**，即 AI **如何** 帮助用户，而不是 **筛选哪些词**。

*   **Lv 1: Survival (生存)** - *“救救我，我读不懂。”*
    *   **AI 行为:** 全量翻译，显性句法切分 (Chunking)，AI 充当“保姆翻译官”。
*   **Lv 2: Basic (基础)** - *“我能读一点。”*
    *   **AI 行为:** 保留短语提示，AI 解释难句结构。
*   **Lv 3: Intermediate (进阶)** - *“我想学逻辑。”* **(默认等级)**
    *   **AI 行为:** 进入“猜词模式” (Hint only)，高亮逻辑连接词，AI 点拨熟词生义。
*   **Lv 4: Advanced (高阶)** - *“我想学修辞。”*
    *   **AI 行为:** 仅提示极难词，AI 分析修辞手法 (隐喻/拟人)。
*   **Lv 5: Master (大师)** - *“我想学文化。”*
    *   **AI 行为:** 极简界面，仅提示文化典故，AI 变为“文学评论家”，引导批判性思维。

### 2.3 词汇能力等级 (Vocabulary Proficiency) - **NEW**

新增 **Vocabulary Level (A1 - C2)**，代表用户的词汇储备水平。
**作用：** 决定了 **哪些词** 会被视为生词并被高亮。

*   **逻辑：** `Show Word IF (Word.Difficulty >= User.VocabLevel)`
*   **冲突解决：** 之前的 Level 混合了“筛选”和“交互”。现在将二者解耦：
    *   **Vocab Level** 决定 **内容 (What)**：用户是 B2，则 B2+ 的词高亮。
    *   **Scaffolding Level** 决定 **形式 (How)**：高亮后，是直接给中文翻译 (Lv1)，还是给英文线索 (Lv3)。

---

## 3. 用户旅程地图 (User Journey Map)

1.  **Onboarding (进入):** 用户打开书籍，默认进入 **Flow Mode (Lv 3)**。阅读体验如母语般顺滑。
2.  **Trigger (触发):** 读到一段复杂的长难句，或者充满生词的心理描写，感到认知过载。
3.  **Switch (切换):** 点击顶部 **🎓 Learn**。界面主题色变蓝，文本被结构化拆解。
4.  **Deep Dive (深潜):**
    *   左侧：看到句子结构被拆开 (Syntax X-Ray)。
    *   右侧：点击单词卡片，通过 Hint 猜测后揭示含义 (Socratic Loop)。
    *   顶部：查看 AI 的深度点评。
5.  **Return (回归):** 搞懂后，切回 **Flow Mode** 继续阅读。
6.  **Review (复习):** 读完一章，切入 **📝 Review**，快速自测刚才查过的词，确认掌握。

---

## 4. 关键术语表 (Glossary)

*   **Magnetic Marker (磁吸光标):** 位于左侧边缘，指示当前阅读段落的视觉锚点。
*   **Double Funnel (双重漏斗):** Learn 模式下的过滤机制，基于“类型”和“难度”筛选知识点。
*   **Ambient Context (氛围上下文):** Flow 模式下右侧显示的非文本辅助信息（如地图、人物图）。
*   **Socratic Blur (苏格拉底遮罩):** 知识点默认不显示答案，仅显示线索的交互状态。

---

## 5. 开发路线图 (High-level Roadmap)

*   **Phase 1: Foundation**
    *   建立全局 Design System。
    *   实现核心阅读器渲染与磁吸光标逻辑。
    *   实现 Flow Mode (基础 hover 查词)。
*   **Phase 2: The Brain (Learn Mode)**
    *   接入 NLP 引擎进行句法分析 (Chunking)。
    *   实现双重漏斗筛选逻辑。
    *   开发右侧 Knowledge Hub 的瀑布流组件。
*   **Phase 3: The Loop (Review Mode)**
    *   实现用户行为追踪 (记录查词历史)。
    *   实现前端动态挖空渲染 (Blur effect)。