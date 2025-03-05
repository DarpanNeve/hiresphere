from fastapi import APIRouter, Depends, HTTPException, status
import logging
from app.core.auth import get_current_user
from app.schemas.user import User
from app.schemas.subscription import Subscription, SubscriptionCreate, SubscriptionUpdate, PaymentMethodUpdate
from app.services.subscription import (
    get_user_subscription, create_subscription, update_subscription,
    update_payment_method, cancel_subscription
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=Subscription)
async def get_subscription(current_user: User = Depends(get_current_user)):
    try:
        logger.info(f"Fetching subscription for user {current_user.id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        subscription = await get_user_subscription(str(current_user.id))
        if not subscription:
            logger.error(f"No subscription found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No subscription found"
            )

        logger.info(f"Successfully retrieved subscription for user {current_user.id}")
        return subscription
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to fetch subscription: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subscription: {str(e)}"
        )


@router.post("/update", response_model=Subscription)
async def change_subscription(
        subscription_in: SubscriptionCreate,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Updating subscription for user {current_user.id} to plan {subscription_in.plan}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Check if user already has a subscription
        existing_subscription = await get_user_subscription(str(current_user.id))

        if existing_subscription:
            # Update existing subscription
            updated_subscription = await update_subscription(
                str(existing_subscription["id"]),
                SubscriptionUpdate(plan=subscription_in.plan)
            )
            logger.info(f"Successfully updated subscription for user {current_user.id}")
            return updated_subscription
        else:
            # Create new subscription
            new_subscription = await create_subscription(subscription_in, str(current_user.id))
            logger.info(f"Successfully created new subscription for user {current_user.id}")
            return new_subscription
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to update subscription: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subscription: {str(e)}"
        )


@router.post("/payment-method")
async def change_payment_method(
        payment_data: PaymentMethodUpdate,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Updating payment method for user {current_user.id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Check if user has a subscription
        existing_subscription = await get_user_subscription(str(current_user.id))
        if not existing_subscription:
            logger.error(f"No subscription found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No subscription found"
            )

        # Process payment method update
        result = await update_payment_method(str(existing_subscription["id"]), payment_data)
        logger.info(f"Successfully updated payment method for user {current_user.id}")

        return {"message": "Payment method updated successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to update payment method: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update payment method: {str(e)}"
        )


@router.post("/cancel")
async def cancel_user_subscription(current_user: User = Depends(get_current_user)):
    try:
        logger.info(f"Cancelling subscription for user {current_user.id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Check if user has a subscription
        existing_subscription = await get_user_subscription(str(current_user.id))
        if not existing_subscription:
            logger.error(f"No subscription found for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No subscription found"
            )

        # Cancel subscription
        result = await cancel_subscription(str(existing_subscription["id"]))
        logger.info(f"Successfully cancelled subscription for user {current_user.id}")

        return {"message": "Subscription cancelled successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )