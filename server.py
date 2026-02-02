"""
AI Reading Co-pilot Backend Server
- Edge TTS 实时语音
- 用户认证 (JWT)
- 文本存储管理
"""

import asyncio
import io
import os
import json
import re
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import edge_tts
import jwt
import hashlib
import secrets

from database import get_db, init_database

# ============ 配置 ============
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days

# ============ App 初始化 ============
app = FastAPI(title="AI Reading Co-pilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# 确保数据库已初始化
init_database()

# ============ Pydantic Models ============

# Auth
class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Texts
class TextCreate(BaseModel):
    title: str
    content: str
    scaffolding_data: Optional[dict] = None

class TextUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    scaffolding_data: Optional[dict] = None

class TextResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: str
    updated_at: str

class ParagraphResponse(BaseModel):
    id: int
    text_id: int
    sequence: int
    content: str
    translation: Optional[str]
    analysis: Optional[dict]

class ParagraphUpdate(BaseModel):
    translation: Optional[str] = None
    analysis: Optional[dict] = None

# TTS
class TTSRequest(BaseModel):
    text: str
    voice: str = "narrator"

VOICES = {
    "narrator": "en-GB-RyanNeural",
    "female": "en-GB-SoniaNeural",
    "male": "en-US-GuyNeural",
    "female_us": "en-US-JennyNeural",
}

# ============ Auth Helpers ============

def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub"))
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def hash_password(password: str) -> str:
    """Hash password with salt using SHA-256"""
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((salt + password).encode())
    return f"{salt}${hash_obj.hexdigest()}"

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hashed value"""
    try:
        salt, hash_value = hashed.split('$')
        hash_obj = hashlib.sha256((salt + password).encode())
        return hash_obj.hexdigest() == hash_value
    except:
        return False

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return dict(user)

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Optional auth - returns None if not authenticated"""
    if not credentials:
        return None
    user_id = verify_token(credentials.credentials)
    if not user_id:
        return None
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        return dict(user) if user else None

# ============ Health Check ============

@app.get("/")
async def health_check():
    return {"status": "ok", "service": "AI Reading Co-pilot API"}

# ============ Auth Endpoints ============

@app.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    """用户注册"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if email exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password and create user
        password_hash = hash_password(data.password)
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (data.email, password_hash)
        )
        user_id = cursor.lastrowid
        
        # Get created user
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = dict(cursor.fetchone())
        
        token = create_access_token(user_id)
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                created_at=str(user["created_at"])
            )
        )

@app.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """用户登录"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (data.email,))
        user = cursor.fetchone()
        
        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user = dict(user)
        token = create_access_token(user["id"])
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                created_at=str(user["created_at"])
            )
        )

@app.get("/auth/me", response_model=UserResponse)
async def get_me(user = Depends(get_current_user)):
    """获取当前用户信息"""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        created_at=str(user["created_at"])
    )

# ============ Text Endpoints ============

@app.get("/texts", response_model=List[TextResponse])
async def list_texts(user = Depends(get_current_user)):
    """获取用户的文本列表"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM texts WHERE user_id = ? ORDER BY updated_at DESC",
            (user["id"],)
        )
        texts = cursor.fetchall()
        
        result = []
        for t in texts:
            t = dict(t)
            result.append(TextResponse(
                id=t["id"],
                title=t["title"],
                content=t["content"],
                created_at=str(t["created_at"]),
                updated_at=str(t["updated_at"])
            ))
        return result

@app.post("/texts", response_model=TextResponse, status_code=201)
async def create_text(data: TextCreate, user = Depends(get_current_user)):
    """创建新文本并自动分段"""
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO texts (user_id, title, content) VALUES (?, ?, ?)",
            (user["id"], data.title, data.content)
        )
        text_id = cursor.lastrowid
        
        # Split content into paragraphs
        # 1. Primary Split: By Newlines
        raw_paragraphs = [p.strip() for p in re.split(r'\n+', data.content) if p.strip()]
        
        final_paragraphs = []
        for p in raw_paragraphs:
            # 2. Secondary Split: If paragraph is too long (> 500 chars), split by sentences
            if len(p) > 500:
                # Regex looks for [.!?] followed by whitespace, avoiding common abbreviations (simplistic)
                # Matches: (Period/Exclaim/Question) + (Space/End)
                sentences = re.split(r'(?<=[.!?])\s+', p)
                final_paragraphs.extend([s.strip() for s in sentences if s.strip()])
            else:
                final_paragraphs.append(p)
        
        # Insert paragraphs
        if final_paragraphs:
            para_values = [(text_id, i, p) for i, p in enumerate(final_paragraphs)]
            cursor.executemany(
                "INSERT INTO paragraphs (text_id, sequence, content) VALUES (?, ?, ?)",
                para_values
            )
        
        cursor.execute("SELECT * FROM texts WHERE id = ?", (text_id,))
        t = dict(cursor.fetchone())
        
        return TextResponse(
            id=t["id"],
            title=t["title"],
            content=t["content"],
            created_at=str(t["created_at"]),
            updated_at=str(t["updated_at"])
        )

@app.get("/texts/{text_id}/paragraphs", response_model=List[ParagraphResponse])
async def get_text_paragraphs(text_id: int, user = Depends(get_current_user)):
    """获取文本的段落列表"""
    with get_db() as conn:
        cursor = conn.cursor()
        # Verify ownership
        cursor.execute("SELECT id FROM texts WHERE id = ? AND user_id = ?", (text_id, user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Text not found")
            
        cursor.execute(
            "SELECT * FROM paragraphs WHERE text_id = ? ORDER BY sequence ASC",
            (text_id,)
        )
        rows = cursor.fetchall()
        
        result = []
        for r in rows:
            r = dict(r)
            analysis = None
            if r["analysis_json"]:
                try:
                    analysis = json.loads(r["analysis_json"])
                except:
                    pass
            
            result.append(ParagraphResponse(
                id=r["id"],
                text_id=r["text_id"],
                sequence=r["sequence"],
                content=r["content"],
                translation=r["translation"],
                analysis=analysis
            ))
        return result

@app.put("/paragraphs/{para_id}", response_model=ParagraphResponse)
async def update_paragraph(para_id: int, data: ParagraphUpdate, user = Depends(get_current_user)):
    """更新段落分析结果"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify ownership via join
        cursor.execute('''
            SELECT p.* FROM paragraphs p
            JOIN texts t ON p.text_id = t.id
            WHERE p.id = ? AND t.user_id = ?
        ''', (para_id, user["id"]))
        
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Paragraph not found")
            
        updates = []
        params = []
        
        if data.translation is not None:
            updates.append("translation = ?")
            params.append(data.translation)
            
        if data.analysis is not None:
            updates.append("analysis_json = ?")
            params.append(json.dumps(data.analysis))
            
        if updates:
            params.append(para_id)
            cursor.execute(
                f"UPDATE paragraphs SET {', '.join(updates)} WHERE id = ?",
                params
            )
            
        # Return updated
        cursor.execute("SELECT * FROM paragraphs WHERE id = ?", (para_id,))
        r = dict(cursor.fetchone())
        
        analysis = None
        if r["analysis_json"]:
            try:
                analysis = json.loads(r["analysis_json"])
            except:
                pass
                
        return ParagraphResponse(
            id=r["id"],
            text_id=r["text_id"],
            sequence=r["sequence"],
            content=r["content"],
            translation=r["translation"],
            analysis=analysis
        )

@app.get("/texts/{text_id}", response_model=TextResponse)
async def get_text(text_id: int, user = Depends(get_current_user)):
    """获取单个文本"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM texts WHERE id = ? AND user_id = ?",
            (text_id, user["id"])
        )
        t = cursor.fetchone()
        if not t:
            raise HTTPException(status_code=404, detail="Text not found")
        
        t = dict(t)
        return TextResponse(
            id=t["id"],
            title=t["title"],
            content=t["content"],
            created_at=str(t["created_at"]),
            updated_at=str(t["updated_at"])
        )

@app.put("/texts/{text_id}", response_model=TextResponse)
async def update_text(text_id: int, data: TextUpdate, user = Depends(get_current_user)):
    """更新文本"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check ownership
        cursor.execute(
            "SELECT * FROM texts WHERE id = ? AND user_id = ?",
            (text_id, user["id"])
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Text not found")
        
        existing = dict(existing)
        
        # Build update
        updates = []
        params = []
        if data.title is not None:
            updates.append("title = ?")
            params.append(data.title)
        if data.content is not None:
            updates.append("content = ?")
            params.append(data.content)
        if data.scaffolding_data is not None:
            updates.append("scaffolding_data = ?")
            params.append(json.dumps(data.scaffolding_data))
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(text_id)
            cursor.execute(
                f"UPDATE texts SET {', '.join(updates)} WHERE id = ?",
                params
            )
        
        cursor.execute("SELECT * FROM texts WHERE id = ?", (text_id,))
        t = dict(cursor.fetchone())
        
        scaffolding = None
        if t["scaffolding_data"]:
            try:
                scaffolding = json.loads(t["scaffolding_data"])
            except:
                pass
        
        return TextResponse(
            id=t["id"],
            title=t["title"],
            content=t["content"],
            scaffolding_data=scaffolding,
            created_at=str(t["created_at"]),
            updated_at=str(t["updated_at"])
        )

@app.delete("/texts/{text_id}", status_code=204)
async def delete_text(text_id: int, user = Depends(get_current_user)):
    """删除文本"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM texts WHERE id = ? AND user_id = ?",
            (text_id, user["id"])
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Text not found")

# ============ TTS Endpoints ============

@app.get("/voices")
async def list_voices():
    """列出可用声音"""
    return {"voices": VOICES}

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """文本转语音 API"""
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    voice = VOICES.get(request.voice, VOICES["narrator"])
    
    last_error = None
    for attempt in range(3):
        try:
            communicate = edge_tts.Communicate(request.text, voice)
            audio_data = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.write(chunk["data"])
            
            audio_data.seek(0)
            return StreamingResponse(
                audio_data,
                media_type="audio/mpeg",
                headers={"Content-Disposition": "inline; filename=speech.mp3"}
            )
        except Exception as e:
            last_error = e
            print(f"TTS Attempt {attempt+1} failed: {e}")
            await asyncio.sleep(0.5)
            
    raise HTTPException(status_code=500, detail=f"TTS failed after 3 attempts: {str(last_error)}")

# ============ Run Server ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
