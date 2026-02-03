import os

# ============ Auth 配置 ============
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 days

# ============ AI 配置 ============
AI_CONFIG = {
    "aliyun": {
        "api_key": os.getenv("ALIYUN_API_KEY", "sk-beca0b70649540348826dd433986fe54"),
        "model": "qwen-plus"
    },
    "google": {
        "api_key": os.getenv("GOOGLE_API_KEY", ""),
        "model": "gemini-2.5-flash-lite"
    }
}

# ============ TTS Voices ============
VOICES = {
    "narrator": "en-GB-RyanNeural",
    "female": "en-GB-SoniaNeural",
    "male": "en-US-GuyNeural",
    "female_us": "en-US-JennyNeural",
}
