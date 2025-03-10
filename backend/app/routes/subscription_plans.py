from fastapi import APIRouter, HTTPException, status, Depends
import logging
from app.db.mongodb import db
from app.models.subscription_plan import SubscriptionPlan
from bson import ObjectId
from datetime import datetime
from app.core.auth import get_current_user
from app.schemas.user import User
from app.services.subscription import get_user_subscription

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def get_subscription_plans():
    try:
        # Get all subscription plans
        cursor = db.database.subscription_plans.find().sort("price", 1)
        plans = []

        async for plan in cursor:
            # Convert ObjectId to string for JSON serialization
            plan["_id"] = str(plan["_id"])
            plans.append(plan)

        # If no plans exist in the database, create default plans
        if not plans:
            default_plans = [
                {
                    "name": "Starter",
                    "price": 49,
                    "billing_period": "monthly",
                    "features": [
                        "10 interview links per month",
                        "Basic analytics",
                        "Email support",
                        "1 HR account"
                    ],
                    "max_hr_accounts": 1,
                    "max_interviews": 10,
                    "max_candidates": 20,
                    "is_popular": False
                },
                {
                    "name": "Professional",
                    "price": 99,
                    "billing_period": "monthly",
                    "features": [
                        "50 interview links per month",
                        "Custom interview topics",
                        "Advanced analytics",
                        "Priority email support",
                        "Up to 3 HR accounts"
                    ],
                    "max_hr_accounts": 3,
                    "max_interviews": 50,
                    "max_candidates": 100,
                    "is_popular": True
                },
                {
                    "name": "Enterprise",
                    "price": 249,
                    "billing_period": "monthly",
                    "features": [
                        "Unlimited interview links",
                        "Custom interview topics",
                        "Advanced analytics & reporting",
                        "White-label solution",
                        "API access",
                        "Dedicated account manager",
                        "Phone & email support",
                        "Unlimited HR accounts"
                    ],
                    "max_hr_accounts": 999,
                    "max_interviews": 999,
                    "max_candidates": 999,
                    "is_popular": False
                }
            ]

            # Insert default plans
            for plan in default_plans:
                plan["created_at"] = datetime.utcnow()
                plan["updated_at"] = datetime.utcnow()
                result = await db.database.subscription_plans.insert_one(plan)
                plan["_id"] = str(result.inserted_id)
                plans.append(plan)

        return plans

    except Exception as e:
        logger.error(f"Failed to fetch subscription plans: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subscription plans: {str(e)}"
        )


@router.get("/current")
async def get_current_subscription(current_user: User = Depends(get_current_user)):
    try:
        logger.info(f"Fetching current subscription for user {current_user.id}")

        # Get user's subscription
        subscription = await get_user_subscription(str(current_user.id))
        if not subscription:
            # Return trial subscription data
            return {
                "plan": "trial",
                "status": "trial",
                "start_date": datetime.utcnow(),
                "end_date": datetime.utcnow() + timedelta(days=14),
                "days_remaining": 14,
                "payment_method": None
            }

        # Get the plan details
        plan = await db.database.subscription_plans.find_one({"name": subscription["plan"].title()})
        if plan:
            plan["_id"] = str(plan["_id"])

        # Combine subscription and plan details
        return {
            "plan": subscription["plan"],
            "status": subscription["status"],
            "start_date": subscription["start_date"],
            "end_date": subscription["end_date"],
            "days_remaining": subscription["days_remaining"],
            "payment_method": subscription.get("payment_method"),
            "plan_details": plan
        }

    except Exception as e:
        logger.error(f"Failed to fetch current subscription: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch current subscription: {str(e)}"
        )