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

---

## 3. 核心 API 流程

### 3.1 导入 (Import)
1. 接收原文文本。
2. 调用 NLP 引擎 (Spacy) 进行分句。
3. 将分句结果存入 `sentences` 表。
4. 初始化阅读进度。

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
