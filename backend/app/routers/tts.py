import edge_tts
import io
import os
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.ai import TTSRequest
from app.config import VOICES

router = APIRouter(prefix="/tts", tags=["TTS"])

@router.post("")
async def text_to_speech(request: TTSRequest):
    voice = VOICES.get(request.voice, VOICES["narrator"])
    communicate = edge_tts.Communicate(request.text, voice)
    audio_data = io.BytesIO()
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.write(chunk["data"])
            
    audio_data.seek(0)
    return StreamingResponse(audio_data, media_type="audio/mpeg")
