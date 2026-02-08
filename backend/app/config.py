import os

def _positive_int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
        return value if value > 0 else default
    except (TypeError, ValueError):
        return default

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

# ============ Analysis Safeguards ============
ANALYSIS_RATE_LIMIT_WINDOW_SECONDS = _positive_int_env("ANALYSIS_RATE_LIMIT_WINDOW_SECONDS", 20)
ANALYSIS_RATE_LIMIT_MAX_REQUESTS = _positive_int_env("ANALYSIS_RATE_LIMIT_MAX_REQUESTS", 6)

# ============ TTS Voices ============
VOICES = {
    "narrator": "en-GB-RyanNeural",
    "female": "en-GB-SoniaNeural",
    "male": "en-US-GuyNeural",
    "female_us": "en-US-JennyNeural",
}
