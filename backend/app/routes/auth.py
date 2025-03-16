from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.auth import authenticate_user, create_access_token, get_current_user
from app.schemas.user import UserCreate, User
from app.services.user import create_user, get_user_by_email
from app.db.mongodb import db
from datetime import timedelta
from app.core.config import settings
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=User)
async def register(user_in: UserCreate):
    # Check if user with this email already exists
    user = await get_user_by_email(user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Only allow candidate and admin registration
    if user_in.role not in ["candidate", "admin"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Only candidate and admin roles are allowed for registration"
        )

    # Create the user
    user = await create_user(user_in)

    # If admin, create a trial subscription
    if user_in.role == "admin":
        from datetime import datetime, timedelta
        trial_subscription = {
            "user_id": user.id,
            "plan": "trial",
            "status": "active",
            "features": {
                "max_hr_accounts": 1,
                "max_interviews": 10,
                "max_candidates": 20
            },
            "start_date": datetime.utcnow(),
            "end_date": datetime.utcnow() + timedelta(days=14),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.database.subscriptions.insert_one(trial_subscription)

    return user


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token with expiry
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )

    logger.info(f"Login successful for user: {user.email}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
    }


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    logger.info(f"Fetching user info for: {current_user.email}")
    return current_user