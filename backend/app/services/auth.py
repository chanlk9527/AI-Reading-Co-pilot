import secrets
import hashlib
import jwt
from datetime import datetime, timedelta
from typing import Optional
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS

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
