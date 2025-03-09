from fastapi import APIRouter, Depends, HTTPException, status
import logging
from datetime import datetime, timedelta
from app.core.auth import get_current_user
from app.schemas.user import User
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate, PaymentMethodUpdate
from app.db.mongodb import db
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/purchase")
async def purchase_subscription(
        subscription_in: SubscriptionCreate,
        current_user: User = Depends(get_current_user)
):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Calculate subscription dates
        now = datetime.utcnow()

        # Set subscription length based on plan
        if subscription_in.plan == "starter":
            end_date = now + timedelta(days=30)  # 1 month
        elif subscription_in.plan == "professional":
            end_date = now + timedelta(days=30)  # 1 month
        elif subscription_in.plan == "enterprise":
            end_date = now + timedelta(days=30)  # 1 month
        else:
            end_date = now + timedelta(days=30)  # Default to 1 month

        # Create subscription
        subscription_data = {
            "user_id": ObjectId(current_user.id),
            "plan": subscription_in.plan,
            "status": "active",
            "features": {
                "max_hr_accounts": 1 if subscription_in.plan == "starter" else 3 if subscription_in.plan == "professional" else 999,
                "max_interviews": 10 if subscription_in.plan == "starter" else 50 if subscription_in.plan == "professional" else 999,
                "max_candidates": 20 if subscription_in.plan == "starter" else 100 if subscription_in.plan == "professional" else 999,
                "custom_branding": subscription_in.plan in ["professional", "enterprise"],
                "api_access": subscription_in.plan == "enterprise",
                "priority_support": subscription_in.plan in ["professional", "enterprise"]
            },
            "start_date": now,
            "end_date": end_date,
            "payment_method": subscription_in.payment_method,
            "created_at": now,
            "updated_at": now
        }

        result = await db.database.subscriptions.insert_one(subscription_data)
        subscription_data["_id"] = str(result.inserted_id)

        return subscription_data

    except Exception as e:
        logger.error(f"Failed to purchase subscription: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to purchase subscription: {str(e)}"
        )


@router.get("/")
async def get_all_subscriptions(current_user: User = Depends(get_current_user)):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Get all subscriptions with user details
        pipeline = [
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "_id",
                    "as": "user"
                }
            },
            {
                "$unwind": "$user"
            },
            {
                "$project": {
                    "_id": 1,
                    "hr_name": "$user.full_name",
                    "company_name": "$user.company_name",
                    "plan": 1,
                    "status": 1,
                    "amount": 1,
                    "payment_method": 1,
                    "last_payment_amount": 1,
                    "next_payment_date": 1,
                    "created_at": 1,
                    "updated_at": 1
                }
            }
        ]

        subscriptions = await db.database.subscriptions.aggregate(pipeline).to_list(length=None)

        # Convert ObjectId to string
        for subscription in subscriptions:
            subscription["_id"] = str(subscription["_id"])
        print(subscriptions)
        return subscriptions

    except Exception as e:
        logger.error(f"Failed to fetch subscriptions: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subscriptions: {str(e)}"
        )


@router.put("/{subscription_id}")
async def update_subscription(
        subscription_id: str,
        subscription_data: SubscriptionUpdate,
        current_user: User = Depends(get_current_user)
):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Update subscription
        update_data = subscription_data.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()

        result = await db.database.subscriptions.find_one_and_update(
            {"_id": ObjectId(subscription_id)},
            {"$set": update_data},
            return_document=True
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )

        # Convert ObjectId to string
        result["_id"] = str(result["_id"])
        result["user_id"] = str(result["user_id"])

        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to update subscription: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subscription: {str(e)}"
        )


@router.post("/{subscription_id}/cancel")
async def cancel_subscription(
        subscription_id: str,
        current_user: User = Depends(get_current_user)
):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Update subscription status
        result = await db.database.subscriptions.find_one_and_update(
            {"_id": ObjectId(subscription_id)},
            {
                "$set": {
                    "status": "cancelled",
                    "updated_at": datetime.utcnow()
                }
            },
            return_document=True
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )

        return {"message": "Subscription cancelled successfully"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )