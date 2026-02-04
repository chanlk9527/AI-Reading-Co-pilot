from fastapi import APIRouter, HTTPException, Depends
from sse_starlette.sse import EventSourceResponse
from app.config import AI_CONFIG
from app.models.ai import AIChatRequest
from app.services.ai import call_aliyun, call_google, stream_aliyun, stream_google
from app.routers.auth import get_current_user
from app.database import get_db
import logging

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)

def check_and_deduct_credits(user_id: int) -> int:
    """Check if user has credits and deduct 1. Returns remaining credits."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT credits FROM users WHERE id = ?", (user_id,))
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        
        credits = result["credits"] or 0
        if credits <= 0:
            raise HTTPException(
                status_code=402, 
                detail="Insufficient credits. Please recharge to continue using AI features."
            )
        
        new_credits = credits - 1
        cursor.execute(
            "UPDATE users SET credits = ? WHERE id = ?",
            (new_credits, user_id)
        )
        return new_credits

@router.post("/chat")
async def ai_chat(request: AIChatRequest, user = Depends(get_current_user)):
    """Proxy AI requests (non-streaming)"""
    logger.info(f"AI Chat Proxy: {request.provider}")
    
    # Check and deduct credits
    remaining_credits = check_and_deduct_credits(user["id"])
    logger.info(f"User {user['id']} used 1 credit, remaining: {remaining_credits}")
    
    provider = request.provider
    api_key = request.api_key or AI_CONFIG.get(provider, {}).get("api_key", "")
    
    if not api_key:
        raise HTTPException(status_code=400, detail=f"{provider} API key is not configured")
    
    try:
        if provider == "aliyun":
            result = await call_aliyun(api_key, request.system_prompt, request.user_query)
        elif provider == "google":
            result = await call_google(api_key, request.system_prompt, request.user_query)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        # Add remaining credits to response
        if isinstance(result, dict):
            result["_remaining_credits"] = remaining_credits
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def ai_chat_stream(request: AIChatRequest, user = Depends(get_current_user)):
    """Streaming AI chat"""
    # Check and deduct credits
    remaining_credits = check_and_deduct_credits(user["id"])
    logger.info(f"User {user['id']} used 1 credit for stream, remaining: {remaining_credits}")
    
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

@router.get("/credits")
async def get_credits(user = Depends(get_current_user)):
    """Get current user's credit balance"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT credits FROM users WHERE id = ?", (user["id"],))
        result = cursor.fetchone()
        return {"credits": result["credits"] if result else 0}

