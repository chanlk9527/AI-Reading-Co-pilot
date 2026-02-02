# Backend System Documentation

本文档详细记录了 AI Reading Co-pilot 的后端实现细节。后端采用 Python FastAPI 框架，结合 SQLite 数据库和 Edge TTS 服务。

## 1. 技术栈架构

- **Web 框架**: FastAPI (高性能异步框架)
- **数据库**: SQLite (轻量级本地文件数据库)
- **TTS 引擎**: `edge-tts` (微软 Edge 浏览器语音服务逆向接口)
- **认证机制**: JWT (JSON Web Tokens) + SHA-256 加盐哈希
- **运行环境**: Python 3.8+

## 2. 文件结构

| 文件名 | 说明 |
|--------|------|
| `server.py` | 核心服务文件。包含 API 路由、业务逻辑、认证处理和 TTS 集成。 |
| `database.py` | 数据库层。负责表结构初始化、连接池管理和 Context Manager。 |
| `start_server.sh` | 启动脚本。自动安装依赖并启动 uvicorn 服务。 |

## 3. 数据库设计 (Schema)

数据库文件位置: `./reading_copilot.db`

### 3.1 用户表 (`users`)

存储用户账号信息。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | INTEGER | PRIMARY KEY | 自增用户 ID |
| `email` | TEXT | UNIQUE, NOT NULL | 用户邮箱 |
| `password_hash` | TEXT | NOT NULL | 格式: `salt$hash` (SHA-256) |
| `created_at` | DATETIME | DEFAULT | 注册时间 |

### 3.2 文本表 (`texts`)

存储用户上传或导入的学习文本。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | INTEGER | PRIMARY KEY | 自增文本 ID |
| `user_id` | INTEGER | FOREIGN KEY | 关联 `users.id` |
| `title` | TEXT | NOT NULL | 文章标题 (自动生成或用户指定) |
| `content` | TEXT | NOT NULL | 原始内容 |
| `scaffolding_data` | TEXT | JSON | AI 分析生成的段落、关键词等结构化数据 |
| `created_at` | DATETIME | DEFAULT | 创建时间 |
| `updated_at` | DATETIME | DEFAULT | 更新时间 |

## 4. API 接口文档

### 4.1 用户认证 (Auth)

#### 注册 (`POST /auth/register`)
- **请求**: `{"email": "...", "password": "..."}`
- **响应**: `{"access_token": "...", "token_type": "bearer", "user": {...}}`
- **逻辑**: 检查邮箱唯一性 -> 生成随机 Salt -> SHA-256 哈希密码 -> 存库 -> 签发 JWT。

#### 登录 (`POST /auth/login`)
- **请求**: `{"email": "...", "password": "..."}`
- **响应**: 同注册接口。
- **逻辑**: 查库 -> 提取 Salt -> 重新哈希比对 -> 验证通过签发 JWT。

#### 获取当前用户 (`GET /auth/me`)
- **Header**: `Authorization: Bearer <token>`
- **响应**: 用户信息 (不含密码)。

### 4.2 文本管理 (Texts)

所有接口均需 Bearer Token 认证。

#### 获取列表 (`GET /texts`)
- **响应**: 当前用户的文本列表 (按更新时间倒序)。

#### 创建文本 (`POST /texts`)
- **请求**: 
  ```json
  {
    "title": "Steve Jobs Speech",
    "content": "Full text...",
    "scaffolding_data": { "paragraphs": [...] }
  }
  ```
- **说明**: `scaffolding_data` 用于存储 AI 分析结果，前端加载时直接使用，无需重复分析。

#### 获取详情 (`GET /texts/{id}`)
- **响应**: 完整的文本数据。如果 ID 不属于当前用户，返回 404。

#### 更新文本 (`PUT /texts/{id}`)
- **请求**: 支持更新 title, content 或 scaffolding_data。

#### 删除文本 (`DELETE /texts/{id}`)
- **响应**: 204 No Content。

### 4.3 语音合成 (TTS)

#### 生成语音 (`POST /tts`)
- **请求**: `{"text": "Hello world", "voice": "narrator"}`
- **响应**: `audio/mpeg` 流式音频数据。
- **特点**: 使用 `StreamingResponse` 实现边生成边传输，减少前端等待时间。

#### 获取声音列表 (`GET /voices`)
- **响应**: 支持的角色列表 (Narrator, Female, Male 等)。

## 5. 核心逻辑实现细节

### 5.1 密码哈希 (Security)
为了避免 `passlib`/`bcrypt` 在不同环境下的编译依赖问题，使用了 Python 标准库 `hashlib` 实现加盐哈希：
```python
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((salt + password).encode())
    return f"{salt}${hash_obj.hexdigest()}"
```

### 5.2 数据库连接管理
使用了 `contextmanager` 确保数据库连接在使用后自动关闭，即使发生异常也能回滚：
```python
@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

### 5.3 TTS 流式代理
后端作为 Edge TTS 的代理，将 WebSocket 读取的音频流封装为 HTTP Stream 返回给前端，隐藏了底层协议细节。

## 6. 部署指南

```bash
# 1. 安装依赖
pip install fastapi uvicorn edge-tts pyjwt pydantic email-validator

# 2. 启动服务 (默认端口 8000)
./start_server.sh
# 或
uvicorn server:app --reload
```
