from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.auth import authenticate_user, create_access_token, get_current_user
from app.schemas.user import UserCreate, User
from app.services.user import create_user, get_user_by_email
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

@router.post("/register", response_model=User)
async def register(user_in: UserCreate):
    user = await get_user_by_email(user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    user = await create_user(user_in)
    return user

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    logger.info("Login attempt for user: %s", form_data.username)
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        logger.warning("Failed login attempt for user: %s", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    logger.info("User %s logged in successfully", user.email)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user