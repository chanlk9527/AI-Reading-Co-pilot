from fastapi import APIRouter, HTTPException, Depends
from sse_starlette.sse import EventSourceResponse
from app.config import (
    AI_CONFIG,
    ANALYSIS_RATE_LIMIT_WINDOW_SECONDS,
    ANALYSIS_RATE_LIMIT_MAX_REQUESTS
)
from app.models.ai import AIChatRequest
from app.services.ai import call_aliyun, call_google, stream_aliyun, stream_google
from app.routers.auth import get_current_user
from app.database import get_db
from collections import defaultdict, deque
import logging
import time

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)
analysis_request_windows = defaultdict(deque)

def enforce_analysis_rate_limit(user_id: int):
    """Sliding-window rate limit for analysis requests."""
    now = time.time()
    window = analysis_request_windows[user_id]
    cutoff = now - ANALYSIS_RATE_LIMIT_WINDOW_SECONDS

    while window and window[0] <= cutoff:
        window.popleft()

    if len(window) >= ANALYSIS_RATE_LIMIT_MAX_REQUESTS:
        retry_after = max(1, int(ANALYSIS_RATE_LIMIT_WINDOW_SECONDS - (now - window[0])))
        raise HTTPException(
            status_code=429,
            detail=(
                "Analysis rate limited: "
                f"max {ANALYSIS_RATE_LIMIT_MAX_REQUESTS} requests in "
                f"{ANALYSIS_RATE_LIMIT_WINDOW_SECONDS}s. Retry in ~{retry_after}s."
            ),
            headers={"Retry-After": str(retry_after)}
        )

    window.append(now)

def get_user_credits(user_id: int) -> int:
    """Return current credits, or raise if user does not exist/no credits."""
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
        return credits

def deduct_one_credit(user_id: int) -> int:
    """Deduct exactly one credit and return remaining credits."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0",
            (user_id,)
        )
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=402,
                detail="Insufficient credits. Please recharge to continue using AI features."
            )

        cursor.execute("SELECT credits FROM users WHERE id = ?", (user_id,))
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        return result["credits"] or 0

@router.post("/chat")
async def ai_chat(request: AIChatRequest, user = Depends(get_current_user)):
    """Proxy AI requests (non-streaming)"""
    logger.info(f"AI Chat Proxy: {request.provider} request_type={request.request_type}")

    if request.request_type == "analysis":
        enforce_analysis_rate_limit(user["id"])

    # Check credit first; deduct after successful provider response.
    current_credits = get_user_credits(user["id"])
    logger.info(f"User {user['id']} has credits: {current_credits}")
    
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

        remaining_credits = deduct_one_credit(user["id"])
        logger.info(f"User {user['id']} used 1 credit, remaining: {remaining_credits}")

        # Add remaining credits to response
        if isinstance(result, dict):
            result["_remaining_credits"] = remaining_credits
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
async def ai_chat_stream(request: AIChatRequest, user = Depends(get_current_user)):
    """Streaming AI chat"""
    if request.request_type == "analysis":
        enforce_analysis_rate_limit(user["id"])

    # Stream path keeps pre-deduct behavior.
    get_user_credits(user["id"])
    remaining_credits = deduct_one_credit(user["id"])
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
