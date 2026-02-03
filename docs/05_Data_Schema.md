这是 v2.0 架构的最后一块拼图。这份文档定义了后端 API 如何返回数据，以支撑前端的“双重漏斗”、“X光透视”和“苏格拉底交互”。

---

# 📄 文件 6: 05_Data_Schema.md

```markdown
# 💾 05_Data_Schema.md (数据结构规范)

**适用范围：** 后端 API, AI 模型输出, 前端 Store
**核心目标：** 提供结构化的文本元数据，支撑 v2.0 的动态渲染需求。

---

## 1. 核心实体关系 (Entity Relationship)

*   **Book** 包含多个 **Chapter**。
*   **Chapter** 包含多个 **Paragraph** (流式加载的基本单位)。
*   **Paragraph** 包含：
    *   `Content`: 原始文本。
    *   `Atoms`: 知识原子 (单词/句法/文化点)。
    *   `Insights`: 多维度的 AI 伴读笔记。
    *   `Context`: 氛围元数据 (情感/图片)。

---

## 2. API 响应结构 (JSON Response)

前端请求 `GET /api/v2/book/{book_id}/chapter/{ch_id}/paragraph/{para_id}` 时返回的标准结构。

### 2.1 顶层结构 (The Paragraph Object)

```json
{
  "paragraph_id": "p_1024",
  "sequence": 1,
  "raw_text": "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
  
  // 1. 句法切分数据 (用于 Lv 1-2 的 Chunking View)
  // 前端根据此数组渲染虚线框或增加间距
  "chunks": [
    { "span": [0, 13], "label": "Main Clause" },   // "It is a truth"
    { "span": [14, 38], "label": "Modifier" },     // "universally acknowledged"
    { "span": [40, 115], "label": "Real Subject" } // "that... wife"
  ],

  // 2. 知识原子列表 (用于 Learn Mode 的 X-Ray 高亮)
  // 前端需根据 User Level 和 Type 进行 filter
  "knowledge_atoms": [ ... ], 

  // 3. 自适应伴读 (用于 Dashboard 顶部)
  "adaptive_insights": { ... },

  // 4. 氛围上下文 (用于 Flow Mode 右侧)
  "ambient_context": { ... }
}
```

---

### 2.2 知识原子 (Knowledge Atoms)

这是“双重漏斗”的核心数据源。

```json
[
  {
    "id": "atom_001",
    "target_span": [14, 25], // "universally" 在 raw_text 中的位置
    "display_text": "universally",
    
    // --- 核心过滤字段 (The Funnel) ---
    "type": "VOCAB",        // 枚举: VOCAB | SYNTAX | CULTURE
    "difficulty": 2,        // 1-5 (Integer)

    // --- 核心内容 payload ---
    "content": {
      "ipa": "/ˌjuː.nɪˈvɜː.səl.i/",
      "audio_url": "https://assets.aicdn.com/audio/universally.mp3",
      
      // Level 1-2 直给模式
      "definition_cn": "普遍地；人人皆知地",
      
      // Level 3-5 苏格拉底模式 (Hint)
      "hint_type": "SYNONYM", // SYNONYM | ANTONYM | ROOT | ETYMOLOGY
      "hint_text": "Synonym: Widely, Generally", 
      
      // 语境详情 (Reveal 后显示)
      "definition_en": "In a way that is known by everyone",
      "context_note": "此处修饰 acknowledged，强调这是一种社会共识。"
    }
  },
  {
    "id": "atom_002",
    "target_span": [0, 13], // "It is a truth"
    "type": "SYNTAX",
    "difficulty": 3,
    "content": {
      "definition_cn": "形式主语结构",
      "hint_text": "Look at the 'It'. Is it the real subject?",
      // 句法图解元数据
      "syntax_diagram": {
        "structure": "It (dummy) ... that (real subject)",
        "explanation": "It 只是占位符，真正的逻辑主语是 that 引导的从句。"
      }
    }
  }
]
```

---

### 2.3 自适应伴读 (Adaptive Insights)

包含三个平行版本的内容，前端根据 User Level 选取一个显示。

```json
"adaptive_insights": {
  // Lv 1-2: 翻译官人格
  "survival": {
    "title": "📝 段落大意",
    "text": "这句话是全书的开头。核心意思是：大家都默认，有钱的单身汉肯定缺个老婆。",
    "tags": ["Summary"]
  },
  
  // Lv 3-4: 教授人格
  "analytical": {
    "title": "🔍 句法分析",
    "text": "这是一个经典的'形式主语'结构。注意作者使用了 'must be in want of' 而不是简单的 'wants'，这种被动语气暗示了社会对男性的强迫。",
    "tags": ["Syntax", "Tone"]
  },
  
  // Lv 5: 评论家人格
  "critical": {
    "title": "⚖️ 文学批评",
    "text": "这是文学史上最著名的反讽(Irony)之一。奥斯汀将这一世俗偏见称为 'Truth' (真理)，瞬间确立了全书讽刺、机智的基调。",
    "debate_prompt": "Is money truly the foundation of marriage in Austen's view?", // 辩论钩子
    "tags": ["Irony", "Social Critique"]
  }
}
```

---

### 2.4 氛围上下文 (Ambient Context)

用于 Flow Mode 的非干扰式显示。

```json
"ambient_context": {
  // 情感分析 -> 决定背景色温
  "sentiment": {
    "score": 0.8, // -1.0 (Sad) ~ 1.0 (Happy)
    "label": "WITTY" // WITTY | TENSE | MELANCHOLY
  },
  
  // 实体链接 -> 决定显示什么插图
  "visual_assets": [
    {
      "trigger_entity": "fortune",
      "asset_type": "IMAGE",
      "url": "https://assets.aicdn.com/history/regency_money.jpg",
      "caption": "19世纪的年金制度"
    }
  ]
}
```

---

## 3. 用户状态数据 (User State Store)

这部分数据存储在前端 LocalStorage 或同步至用户数据库，用于支撑 **Review Mode** 的算法。

```json
{
  "user_profile": {
    "current_level": 3,
    "total_words_learned": 150
  },
  
  // 交互历史 (Review Mode 的挖掘来源)
  "interaction_log": [
    {
      "atom_id": "atom_001", // universally
      "book_id": "b_01",
      "action": "REVEALED", // 用户在 Learn 模式下点击翻开了卡片
      "timestamp": 1706512345000,
      "context_strength": 0.5 // 初始记忆强度
    },
    {
      "atom_id": "atom_005",
      "action": "PEEKED", // 用户在 Review 模式下偷看了答案
      "timestamp": 1706519000000,
      "penalty": true
    }
  ]
}
```

---

## 4. 字段值枚举字典 (Enums)

### 4.1 Knowledge Type
*   `VOCAB`: 单词、短语、固定搭配。
*   `SYNTAX`: 句型结构、语法点、长难句逻辑。
*   `CULTURE`: 历史背景、地理实体、文学典故。

### 4.2 Hint Type (For Learn Mode)
*   `SIMPLE_DEF`: 简单的英文释义 (User Lv 1-2).
*   `SYNONYM`: 近义词 (User Lv 3).
*   `ANTONYM`: 反义词 (User Lv 3).
*   `ROOT`: 词根词缀 (User Lv 4).
*   `CONTEXT_CLUE`: 语境填空提示 (User Lv 4-5).

### 4.3 Sentiment Label (For Flow Mode)
*   `NEUTRAL` (默认)
*   `JOY` / `WITTY` (暖色调)
*   `SAD` / `GLOOMY` (冷色调)
*   `TENSE` / `SCARY` (暗角/高对比度)

```