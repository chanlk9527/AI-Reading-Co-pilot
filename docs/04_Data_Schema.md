# 💾 04_Data_Schema.md (数据结构规范)

**适用范围：** 后端 API, AI 模型输出, 前端 Store
**核心目标：** 提供结构化的文本元数据，支撑 v2.1 的动态渲染需求。

---

## 1. 核心实体关系 (Entity Relationship)

*   **Text (Book/Article)**: 顶层容器，包含元数据（标题、作者、等级等）。
*   **Sentence (Paragraph)**: 数据库存储的基本单位。在 UI 中通常表现为一个可交互的段落。
    *   `content`: 原始英文文本。
    *   `translation`: 对应中文翻译。
    *   `analysis`: 核心 JSON 字段，包含 AI 生成的脚手架数据。
    *   `source_engine`: 导入解析引擎（可选）。
    *   `segmentation_confidence`: PDF 分段置信度（可选，0-1）。

---

## 1.1 PDF 导入质量报告 (Upload Quality Report) 🆕

`POST /pdf/upload` 现在返回结构化质量报告，用于前端判断解析质量与调试：

```json
{
  "success": true,
  "filename": "sample.pdf",
  "text": "完整正文（段落以双换行分隔）",
  "char_count": 12345,
  "truncated": false,
  "message": "PDF 文本提取成功",
  "paragraphs_preview": [
    {
      "text": "段落文本...",
      "page_start": 1,
      "page_end": 1,
      "bbox": [72.0, 96.0, 520.0, 156.0],
      "confidence": 0.88,
      "signals": {
        "vertical_gap": 0.64,
        "indent_jump": 0.11
      }
    }
  ],
  "quality_score": 0.82,
  "layout_flags": {
    "detected_columns": "single|double|mixed",
    "header_footer_removed": true,
    "footnotes_removed": false,
    "degraded_mode": false,
    "low_conf_pages": [],
    "source_engine": "pymupdf",
    "segmentation_confidence": 0.82
  },
  "engine_used": "pymupdf"
}
```

字段说明：
- `paragraphs_preview`: 调试用段落样本（含页码、bbox、置信度、边界信号）。
- `quality_score`: 全文切分质量分数（0-1）。
- `layout_flags`: 版面识别/降级状态/低置信页信息。
- `engine_used`: 当前实际使用的解析引擎。

---

## 2. 句子分析对象 (Sentence Analysis Object)

位于 `Sentence.analysis` 中的 JSON 对象，是前端渲染的能量来源。

### 2.1 整体结构

```json
{
  "translation": "这是一句很有意思的话。", // 冗余一份便于处理
  "knowledge": [ ... ],       // 核心生词与知识点
  "xray": { ... },            // 句子结构分析 (X-Ray)
  "companion": { ... },       // 文学/背景伴读评注
  "insight": { ... }          // 综合洞察 (Legacy/Fallback)
}
```

### 2.2 知识点 (Knowledge Item)

用于“双重漏斗”过滤和生词卡片显示。

```json
{
  "key": "unique_id_01",
  "word": "universally",
  "ipa": "/ˌjuː.nɪˈvɜː.səl.i/",
  "diff": 3,                  // 1-5 难度
  "def": "adv. 普遍地；人人皆知地",
  "clue": "Widely, Generally", // 英文线索/同义词
  "context": "universally acknowledged" // 原文语境
}
```

### 2.3 句子X光 (Sentence X-Ray)

```json
{
  "pattern": "so...that 结果状语从句",
  "breakdown": "Mr. Bennet was so odd a mixture...",
  "keyWords": [
    { "word": "so", "role": "程度副词" },
    { "word": "that", "role": "连词" }
  ],
  "explanation": "如此...以至于... —— 表示因果程度"
}
```

### 2.4 AI 伴读 (Companion)

```json
{
  "type": "famous_quote",
  "text": "这是英国文学史上最著名的开篇之一。"
}
```

---

## 3. 前端 AppContext 数据存储

前端通过 `bookData` 对象缓存这些数据，Key 为 `sentence_id`。

```javascript
bookData: {
  "101": {
    "text": "It is a truth...",
    "translation": "...",
    "knowledge": [...],
    "xray": {...},
    "companion": {...}
  }
}
```

---

## 4. 废弃字段 (Deprecated)

*   `ambient_context`: 已移除。Flow 模式不再尝试根据情感改变背景色或显示实体插图。
*   `adaptive_insights`: 已合并入 `xray` 和 `companion`。
*   `chunks`: 已移除。目前采用更自然的段落/句子流式展示。
