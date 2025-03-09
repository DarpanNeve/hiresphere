from fastapi import APIRouter, Depends, HTTPException, status
import logging
from datetime import datetime, timedelta
from app.core.auth import get_current_user
from app.schemas.user import User
from app.db.mongodb import db
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    try:
        # Check if user is admin
        if not hasattr(current_user, 'role') or current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Calculate date ranges
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)

        # Get total HR users
        total_hr = await db.database.users.count_documents({
            "role": "hr"
        })

        # Get active subscriptions
        active_subscriptions = await db.database.subscriptions.count_documents({
            "status": "active"
        })

        # Calculate total revenue
        pipeline = [
            {
                "$match": {
                    "status": "active"
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]

        revenue_result = await db.database.subscriptions.aggregate(pipeline).to_list(length=1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0

        # Get recent activity
        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": thirty_days_ago}
                }
            },
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
                    "date": "$created_at",
                    "hrName": "$user.full_name",
                    "hrEmail": "$user.email",
                    "action": "$action",
                    "details": "$details"
                }
            },
            {
                "$sort": {"date": -1}
            },
            {
                "$limit": 10
            }
        ]

        recent_activity = await db.database.activity_logs.aggregate(pipeline).to_list(length=None)

        return {
            "totalHR": total_hr,
            "activeSubscriptions": active_subscriptions,
            "totalRevenue": total_revenue,
            "recentActivity": recent_activity
        }

    except Exception as e:
        logger.error(f"Failed to fetch dashboard stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard stats: {str(e)}"
        )