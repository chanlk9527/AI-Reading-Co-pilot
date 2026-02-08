from typing import Optional
from pydantic import BaseModel

class AIChatRequest(BaseModel):
    system_prompt: str
    user_query: str
    provider: str = "aliyun"  # 'aliyun' or 'google'
    api_key: Optional[str] = None
    request_type: str = "chat"  # chat | analysis

class TTSRequest(BaseModel):
    text: str
    voice: str = "narrator"
