from datetime import datetime, timedelta
from bson import ObjectId
from app.db.mongodb import db
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate, PaymentMethodUpdate
from app.schemas.subscription import SubscriptionStatus, SubscriptionPlan


async def get_user_subscription(user_id: str):
    try:
        subscription = await db.database.subscriptions.find_one({"user_id": ObjectId(user_id)})
        if subscription:
            subscription["id"] = str(subscription["_id"])

            # Calculate days remaining
            if subscription["status"] == SubscriptionStatus.EXPIRED:
                subscription["days_remaining"] = 0
            else:
                days = (subscription["end_date"] - datetime.utcnow()).days
                subscription["days_remaining"] = max(0, days)

        return subscription
    except Exception as e:
        raise Exception(f"Failed to fetch user subscription: {str(e)}")


async def create_subscription(subscription_in: SubscriptionCreate, user_id: str):
    try:
        # Set up subscription dates
        now = datetime.utcnow()

        # Determine subscription length based on plan
        if subscription_in.plan == SubscriptionPlan.STARTER:
            end_date = now + timedelta(days=30)  # 1 month
        elif subscription_in.plan == SubscriptionPlan.PROFESSIONAL:
            end_date = now + timedelta(days=30)  # 1 month
        elif subscription_in.plan == SubscriptionPlan.ENTERPRISE:
            end_date = now + timedelta(days=30)  # 1 month
        else:
            end_date = now + timedelta(days=30)  # Default to 1 month

        subscription_data = {
            "user_id": ObjectId(user_id),
            "plan": subscription_in.plan,
            "status": SubscriptionStatus.ACTIVE,
            "start_date": now,
            "end_date": end_date,
            "payment_method": subscription_in.payment_method,
            "created_at": now,
            "updated_at": now
        }

        result = await db.database.subscriptions.insert_one(subscription_data)
        subscription_data["id"] = str(result.inserted_id)
        subscription_data["_id"] = result.inserted_id

        # Calculate days remaining
        subscription_data["days_remaining"] = (end_date - now).days

        return subscription_data
    except Exception as e:
        raise Exception(f"Failed to create subscription: {str(e)}")


async def update_subscription(subscription_id: str, subscription_in: SubscriptionUpdate):
    try:
        # Get current subscription
        subscription = await db.database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
        if not subscription:
            raise Exception("Subscription not found")

        update_data = {k: v for k, v in subscription_in.model_dump().items() if v is not None}

        # If plan is changing, update end date
        if "plan" in update_data and update_data["plan"] != subscription["plan"]:
            now = datetime.utcnow()

            # Determine new subscription length based on plan
            if update_data["plan"] == SubscriptionPlan.STARTER:
                end_date = now + timedelta(days=30)  # 1 month
            elif update_data["plan"] == SubscriptionPlan.PROFESSIONAL:
                end_date = now + timedelta(days=30)  # 1 month
            elif update_data["plan"] == SubscriptionPlan.ENTERPRISE:
                end_date = now + timedelta(days=30)  # 1 month
            else:
                end_date = now + timedelta(days=30)  # Default to 1 month

            update_data["end_date"] = end_date
            update_data["start_date"] = now
            update_data["status"] = SubscriptionStatus.ACTIVE

        update_data["updated_at"] = datetime.utcnow()

        await db.database.subscriptions.update_one(
            {"_id": ObjectId(subscription_id)},
            {"$set": update_data}
        )

        # Get updated subscription
        updated_subscription = await db.database.subscriptions.find_one({"_id": ObjectId(subscription_id)})
        updated_subscription["id"] = str(updated_subscription["_id"])

        # Calculate days remaining
        if updated_subscription["status"] == SubscriptionStatus.EXPIRED:
            updated_subscription["days_remaining"] = 0
        else:
            days = (updated_subscription["end_date"] - datetime.utcnow()).days
            updated_subscription["days_remaining"] = max(0, days)

        return updated_subscription
    except Exception as e:
        raise Exception(f"Failed to update subscription: {str(e)}")


async def update_payment_method(subscription_id: str, payment_data: PaymentMethodUpdate):
    try:
        # Format payment method data
        payment_method = {
            "type": payment_data.type,
            "last4": payment_data.card_number[-4:],
            "expiryMonth": payment_data.expiry_month,
            "expiryYear": payment_data.expiry_year,
            "updated_at": datetime.utcnow()
        }

        await db.database.subscriptions.update_one(
            {"_id": ObjectId(subscription_id)},
            {
                "$set": {
                    "payment_method": payment_method,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return True
    except Exception as e:
        raise Exception(f"Failed to update payment method: {str(e)}")


async def cancel_subscription(subscription_id: str):
    try:
        await db.database.subscriptions.update_one(
            {"_id": ObjectId(subscription_id)},
            {
                "$set": {
                    "status": SubscriptionStatus.CANCELLED,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return True
    except Exception as e:
        raise Exception(f"Failed to cancel subscription: {str(e)}")