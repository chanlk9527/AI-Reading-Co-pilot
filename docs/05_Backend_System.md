# 05_Backend_System.md (后端系统)

本文档详细记录了 AI Reading Co-pilot 的后端实现细节。后端采用 Python FastAPI 框架，结合 SQLite 数据库。

---

## 1. 技术栈架构

- **Web 框架**: FastAPI
- **数据库**: SQLite (`reading_copilot_v3.db`)
- **认证机制**: JWT (JSON Web Tokens)
- **运行环境**: Python 3.8+

---

## 2. 数据库设计 (V3 Schema)

### 2.1 用户表 (`users`)
- `id`: 主键
- `email`: 唯一
- `password_hash`: 加盐哈希
- `credits`: AI 分析额度 (默认 100)

### 2.2 文本表 (`texts`)
存储文章基本信息及用户个性化状态：
- `scaffolding_data`: AI 预读生成的结构化摘要。
- `reading_mode`: 上次离开时的模式 (`flow` | `learn`)。
- `scaffold_level`: 上次离开时的脚手架等级 (1, 2, 3)。
- `vocab_level`: 上次离开时的词汇等级 (A1-C2)。
- `current_paragraph_id`: **阅读进度同步**的关键字段，记录最后活跃的段落 ID。

### 2.3 句子明细表 (`sentences`)
**核心内容表**，存储经过 AI 切分和分析的单元：
- `text_id`: 关联 `texts.id`。
- `sentence_index`: 段落顺序索引。
- `content`: 英文原文。
- `translation`: 中文翻译。
- `analysis_json`: **核心分析数据**。存储一个 JSON 对象，包含 `knowledge`, `xray`, `companion`, `insight` 等字段。
- `source_engine`: 导入来源引擎（如 `pymupdf`）。
- `segmentation_confidence`: PDF 分段置信度（0-1，便于回归与诊断）。

---

## 3. 核心 API 流程

### 3.1 导入 (Import)
1. 接收原文文本。
2. 调用 NLP 引擎 (Spacy) 进行分句。
3. 将分句结果存入 `sentences` 表。
4. 初始化阅读进度。

### 3.1.1 PDF 导入增强流程 (Layout-Aware) 🆕
`/pdf/upload` 已从“简单换行合并”升级为 `PyMuPDF` 单引擎版面切分管线：

1. **页面提取**：使用 PyMuPDF `rawdict` 获取 block/line/span 坐标、字体、字号与文本。
2. **版面识别**：检测单双栏、重复页眉页脚、脚注区域并剔除非正文元素。
3. **边界评分**：基于 `vertical_gap / indent_jump / punctuation_end / list_marker / font_shift / section_heading / quote_balance` 计算段落边界分数。
4. **语义补偿**：引号保护、列表保护、标题保护、跨页续段补偿。
5. **质量报告**：返回段落预览、切分质量分数与低置信页，便于导入拦截与诊断。

上传接口新增返回：
- `paragraphs_preview`: 段落候选预览（含 bbox、confidence、signals）
- `quality_score`: 全文切分质量评分（0-1）
- `layout_flags`: 版面识别和降级状态
- `engine_used`: 实际使用的引擎路径

### 3.2 分析 (Analyze)
1. 前端触发单个句子/段落的分析。
2. 后端组合 Prompt 调用 LLM (Qwen/Gemini)。
3. 解析 LLM 返回的 JSON数据（必须符合 `04_Data_Schema.md` 规范）。
4. 更新 `sentences.analysis_json`。

### 3.3 同步 (Sync)
- 前端在切换段落、模式或等级时，异步调用 `PUT /texts/{id}` 更新状态。
- 下次进入阅读界面时，前端 `useEffect` 自动拉取这些状态并恢复现场。

---

## 4. 安全说明
- 敏感数据存入 `analysis_json` 前需经过校验。
- 所有 `/texts/*` 路由均受 JWT 保护，确保用户只能访问自己的内容。
