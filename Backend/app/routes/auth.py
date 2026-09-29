import os
import time
import json
import base64
import hmac
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import UserSignUp, UserSignIn, UserResponse, AuthTokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

SALT = os.getenv("PASSWORD_SALT", "zoom_clone_secure_salt_2024")
SECRET_KEY = os.getenv("SECRET_KEY", "zoom-clone-dev-secret-key-change-in-production")
ACCESS_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24 * 7  # 7-day token expiration

def hash_password(password: str) -> str:
    """Hash password securely using SHA-256 with salt."""
    return hashlib.sha256((SALT + password).encode("utf-8")).hexdigest()

def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_access_token(user_id: int, email: str) -> str:
    """Generate a standard signed HS256 JWT access token."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "email": email,
        "iat": now,
        "exp": now + ACCESS_TOKEN_EXPIRE_SECONDS
    }
    h_b64 = _b64_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_b64 = _b64_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h_b64}.{p_b64}".encode("utf-8")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64_encode(sig)
    return f"{h_b64}.{p_b64}.{sig_b64}"

def decode_access_token(token: str) -> Dict[str, Any]:
    """Verify signature and expiration of a standard HS256 JWT access token."""
    clean_token = token.replace("Bearer ", "").replace("bearer ", "").strip()
    parts = clean_token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token format")

    h_b64, p_b64, sig_b64 = parts
    signing_input = f"{h_b64}.{p_b64}".encode("utf-8")
    expected_sig = _b64_encode(hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest())

    if not hmac.compare_digest(expected_sig, sig_b64):
        raise ValueError("Invalid token signature")

    payload = json.loads(_b64_decode(p_b64).decode("utf-8"))
    if "exp" in payload and payload["exp"] < time.time():
        raise ValueError("Token expired")

    return payload

@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserSignUp, db: Session = Depends(get_db)):
    """Simple sign up with email, password, and full name returning signed JWT."""
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    name = payload.full_name.strip() if payload.full_name and payload.full_name.strip() else "atithi jaiman"

    user = User(
        email=email,
        full_name=name,
        password_hash=hash_password(payload.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user_id=user.id, email=user.email)
    return AuthTokenResponse(token=token, user=UserResponse.model_validate(user))

@router.post("/signin", response_model=AuthTokenResponse)
def signin(payload: UserSignIn, db: Session = Depends(get_db)):
    """Simple sign in verifying password and returning signed JWT."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or user.password_hash != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user_id=user.id, email=user.email)
    return AuthTokenResponse(token=token, user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Retrieve currently authenticated user profile from verified JWT signature."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(authorization)
        user_id = int(payload.get("user_id") or payload.get("sub"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user
