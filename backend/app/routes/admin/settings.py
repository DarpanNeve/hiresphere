from fastapi import APIRouter, Depends, HTTPException, status
import logging
from app.core.auth import get_current_user
from app.schemas.user import User
from app.db.mongodb import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def get_settings(current_user: User = Depends(get_current_user)):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Get settings from database
        settings = await db.database.settings.find_one({"_id": "global"})

        if not settings:
            # Return default settings if none exist
            return {
                "system": {
                    "maintenance_mode": False,
                    "debug_mode": False,
                    "rate_limit": 60,
                    "max_file_size": 5,
                    "allowed_file_types": ["jpg", "png", "pdf"]
                },
                "email": {
                    "smtp_host": "",
                    "smtp_port": "",
                    "smtp_user": "",
                    "smtp_password": "",
                    "from_email": "",
                    "reply_to": ""
                },
                "interview": {
                    "default_question_count": 5,
                    "min_question_count": 3,
                    "max_question_count": 10,
                    "default_interview_duration": 30,
                    "recording_enabled": True
                },
                "security": {
                    "password_min_length": 8,
                    "password_requires_special": True,
                    "password_requires_number": True,
                    "session_timeout": 30,
                    "max_login_attempts": 5
                }
            }

        # Remove internal fields
        settings.pop("_id", None)
        return settings

    except Exception as e:
        logger.error(f"Failed to fetch settings: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch settings: {str(e)}"
        )


@router.put("/")
async def update_settings(
        settings: dict,
        current_user: User = Depends(get_current_user)
):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Update settings
        result = await db.database.settings.find_one_and_update(
            {"_id": "global"},
            {"$set": settings},
            upsert=True,
            return_document=True
        )

        # Remove internal fields
        result.pop("_id", None)
        return result

    except Exception as e:
        logger.error(f"Failed to update settings: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}"
        )