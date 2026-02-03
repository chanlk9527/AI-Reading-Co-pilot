import httpx
import json
import logging
from app.config import AI_CONFIG

logger = logging.getLogger(__name__)

async def call_aliyun(api_key: str, system_prompt: str, user_query: str):
    """Call Alibaba Cloud DashScope API (non-streaming)"""
    logger.info(f"[Aliyun Call] Prompt:\nSystem: {system_prompt}\nUser: {user_query}")
    url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": AI_CONFIG["aliyun"]["model"],
                "input": {
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_query}
                    ]
                },
                "parameters": {
                    "result_format": "message"
                }
            }
        )
        
        if response.status_code != 200:
            logger.error(f"[Aliyun Call] Error: {response.text}")
            raise Exception(f"Aliyun API error: {response.text}")
        
        data = response.json()
        content = data["output"]["choices"][0]["message"]["content"]
        logger.info(f"[Aliyun Call] Response: {content}")
        return {"content": content}

async def call_google(api_key: str, system_prompt: str, user_query: str):
    """Call Google Gemini API (non-streaming)"""
    model = AI_CONFIG["google"]["model"]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    combined_prompt = f"{system_prompt}\n\nUser Query: {user_query}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{
                    "parts": [{"text": combined_prompt}]
                }]
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Google API error: {response.text}")
        
        data = response.json()
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"content": content}

async def stream_aliyun(api_key: str, system_prompt: str, user_query: str):
    """Stream from Alibaba Cloud DashScope API"""
    logger.info(f"[Aliyun Stream] Prompt: System={system_prompt[:50]}... User={user_query[:50]}...")
    url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "X-DashScope-SSE": "enable"
            },
            json={
                "model": AI_CONFIG["aliyun"]["model"],
                "input": {
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_query}
                    ]
                },
                "parameters": {
                    "result_format": "message",
                    "incremental_output": True
                }
            }
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                logger.error(f"[Aliyun Stream] Error: {error_text.decode()}")
                raise Exception(f"Aliyun API error: {error_text.decode()}")
            
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data_str = line[5:].strip()
                    if data_str:
                        try:
                            data = json.loads(data_str)
                            if "output" in data and "choices" in data["output"]:
                                content = data["output"]["choices"][0]["message"].get("content", "")
                                if content:
                                    logger.debug(f"[Aliyun Stream] Chunk: {content}")
                                    yield content
                        except json.JSONDecodeError:
                            pass

async def stream_google(api_key: str, system_prompt: str, user_query: str):
    """Stream from Google Gemini API"""
    model = AI_CONFIG["google"]["model"]
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={api_key}"
    
    combined_prompt = f"{system_prompt}\n\nUser Query: {user_query}"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            url,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{
                    "parts": [{"text": combined_prompt}]
                }]
            }
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                raise Exception(f"Google API error: {error_text.decode()}")
            
            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                try:
                    if buffer.strip().startswith("["):
                        buffer = buffer.strip()[1:]
                    
                    parts = buffer.split("},{")
                    for i, part in enumerate(parts[:-1]):
                        if not part.startswith("{"):
                            part = "{" + part
                        if not part.endswith("}"):
                            part = part + "}"
                        try:
                            data = json.loads(part)
                            if "candidates" in data:
                                text = data["candidates"][0]["content"]["parts"][0].get("text", "")
                                if text:
                                    yield text
                        except:
                            pass
                    buffer = parts[-1] if parts else ""
                except:
                    pass
