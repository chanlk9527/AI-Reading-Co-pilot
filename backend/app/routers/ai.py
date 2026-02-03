from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from app.config import AI_CONFIG
from app.models.ai import AIChatRequest
from app.services.ai import call_aliyun, call_google, stream_aliyun, stream_google
import logging

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)

@router.post("/chat")
async def ai_chat(request: AIChatRequest):
    """Proxy AI requests (non-streaming)"""
    logger.info(f"AI Chat Proxy: {request.provider}")
    provider = request.provider
    api_key = request.api_key or AI_CONFIG.get(provider, {}).get("api_key", "")
    
    if not api_key:
        raise HTTPException(status_code=400, detail=f"{provider} API key is not configured")
    
    try:
        if provider == "aliyun":
            return await call_aliyun(api_key, request.system_prompt, request.user_query)
        elif provider == "google":
            return await call_google(api_key, request.system_prompt, request.user_query)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def ai_chat_stream(request: AIChatRequest):
    """Streaming AI chat"""
    provider = request.provider
    api_key = request.api_key or AI_CONFIG.get(provider, {}).get("api_key", "")
    
    if not api_key:
        raise HTTPException(status_code=400, detail=f"{provider} API key is not configured")
    
    async def generate():
        try:
            if provider == "aliyun":
                async for chunk in stream_aliyun(api_key, request.system_prompt, request.user_query):
                    yield {"data": chunk}
            elif provider == "google":
                async for chunk in stream_google(api_key, request.system_prompt, request.user_query):
                    yield {"data": chunk}
            yield {"data": "[DONE]"}
        except Exception as e:
            yield {"data": f"[ERROR]{str(e)}"}
    
    return EventSourceResponse(generate())
