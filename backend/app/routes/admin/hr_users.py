from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.schemas.user import User, UserCreate, UserUpdate
from app.services.user import create_user, update_user, delete_user, get_user_by_id
from app.db.mongodb import db
from bson import ObjectId
import logging
from datetime import datetime
router = APIRouter()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def check_subscription_limits(admin_id: str):
    """Check if admin has available HR slots in their subscription"""
    subscription = await db.database.subscriptions.find_one({
        "user_id": ObjectId(admin_id),
        "status": "active"
    })

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active subscription found. Please subscribe to create HR accounts."
        )

    # Check if subscription has expired
    if datetime.utcnow() > subscription["end_date"]:
        await db.database.subscriptions.update_one(
            {"_id": subscription["_id"]},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription has expired. Please renew to create HR accounts."
        )

    # Count current HR users
    current_hr_count = await db.database.users.count_documents({
        "created_by": ObjectId(admin_id),
        "role": "hr"
    })

    # Check against subscription limits
    if current_hr_count >= subscription["features"]["max_hr_accounts"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR account limit reached for your subscription plan. Please upgrade to create more HR accounts."
        )


@router.get("/")
async def get_hr_users(current_user: User = Depends(get_current_user)):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Get all HR users
        cursor = db.database.users.find({"role": "hr"})
        hr_users = []

        async for user in cursor:
            # Get subscription info
            subscription = await db.database.subscriptions.find_one({
                "user_id": user["_id"]
            })

            # Get candidate count
            candidate_count = await db.database.candidates.count_documents({
                "hr_id": user["_id"]
            })

            hr_users.append({
                "_id": str(user["_id"]),
                "full_name": user["full_name"],
                "email": user["email"],
                "company_name": user.get("company_name", ""),
                "status": user.get("status", "active"),
                "subscription_plan": subscription["plan"] if subscription else None,
                "subscription_status": subscription["status"] if subscription else None,
                "candidate_count": candidate_count,
                "created_at": user["created_at"]
            })

        return hr_users

    except Exception as e:
        logger.error(f"Failed to fetch HR users: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch HR users: {str(e)}"
        )


@router.post("/")
async def create_hr_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to create HR users"
            )

        # Check subscription limits
        await check_subscription_limits(str(current_user.id))

        # Force role to be HR
        user_data.role = "hr"

        # Add reference to creating admin
        user_data.created_by = current_user.id

        # Create the user
        new_user = await create_user(user_data)

        return {
            "_id": str(new_user.id),
            "full_name": new_user.full_name,
            "email": new_user.email,
            "created_at": new_user.created_at
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create HR user: {str(e)}"
        )


@router.put("/{user_id}")
async def update_hr_user(
        user_id: str,
        user_data: UserUpdate,
        current_user: User = Depends(get_current_user)
):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Get the user
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Check if user is HR
        if user.role != "hr":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only update HR users"
            )

        # Update the user
        updated_user = await update_user(user_id, user_data.dict(exclude_unset=True))

        return {
            "_id": str(updated_user.id),
            "full_name": updated_user.full_name,
            "email": updated_user.email,
            "company_name": updated_user.company_name,
            "status": updated_user.status,
            "created_at": updated_user.created_at
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to update HR user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update HR user: {str(e)}"
        )


@router.delete("/{user_id}")
async def delete_hr_user(user_id: str, current_user: User = Depends(get_current_user)):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Get the user
        user = await get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Check if user is HR
        if user.role != "hr":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only delete HR users"
            )

        # Delete the user
        await delete_user(user_id)

        return {"message": "User deleted successfully"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to delete HR user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete HR user: {str(e)}"
        )