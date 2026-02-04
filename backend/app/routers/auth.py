from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.models.auth import UserRegister, UserLogin, TokenResponse, UserResponse
from app.services.auth import hash_password, verify_password, create_access_token, verify_token
import logging

router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

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

@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister):
    logger.info(f"Register attempt for email: {data.email}")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        password_hash = hash_password(data.password)
        cursor.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (data.email, password_hash)
        )
        user_id = cursor.lastrowid
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = dict(cursor.fetchone())
        
        token = create_access_token(user_id)
        return TokenResponse(
            access_token=token,
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                credits=user.get("credits", 100),
                created_at=str(user["created_at"])
            )
        )

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    logger.info(f"Login attempt for email: {data.email}")
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
                credits=user.get("credits", 100),
                created_at=str(user["created_at"])
            )
        )

@router.get("/me", response_model=UserResponse)
async def get_me(user = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        credits=user.get("credits", 100),
        created_at=str(user["created_at"])
    )

@router.post("/recharge", response_model=UserResponse)
async def recharge_credits(user = Depends(get_current_user)):
    """Recharge user credits (mock implementation - adds 1000 credits)"""
    logger.info(f"Recharge credits for user {user['id']}")
    with get_db() as conn:
        cursor = conn.cursor()
        new_credits = user.get("credits", 0) + 1000
        cursor.execute(
            "UPDATE users SET credits = ? WHERE id = ?",
            (new_credits, user["id"])
        )
        cursor.execute("SELECT * FROM users WHERE id = ?", (user["id"],))
        updated_user = dict(cursor.fetchone())
        return UserResponse(
            id=updated_user["id"],
            email=updated_user["email"],
            credits=updated_user.get("credits", 100),
            created_at=str(updated_user["created_at"])
        )
