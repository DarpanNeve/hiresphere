from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
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
async def get_dashboard_stats(
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Fetching dashboard stats for HR user {current_user.id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Calculate date ranges
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)

        # Get total candidates
        total_candidates = await db.database.candidates.count_documents({
            "hr_id": ObjectId(current_user.id)
        })

        # Get active interviews (not completed and not expired)
        active_interviews = await db.database.interview_links.count_documents({
            "hr_id": ObjectId(current_user.id),
            "completed": False,
            "expires_at": {"$gt": now}
        })

        # Get completed interviews
        completed_interviews = await db.database.interview_links.count_documents({
            "hr_id": ObjectId(current_user.id),
            "completed": True
        })

        # Calculate average scores from completed interviews
        completed_cursor = db.database.interviews.find({
            "hr_id": ObjectId(current_user.id),
            "completed": True,
            "created_at": {"$gte": thirty_days_ago}
        })

        total_scores = {"knowledge": 0, "communication": 0, "confidence": 0}
        score_count = 0

        async for interview in completed_cursor:
            if all(score in interview for score in ["knowledge_score", "communication_score", "confidence_score"]):
                total_scores["knowledge"] += interview["knowledge_score"]
                total_scores["communication"] += interview["communication_score"]
                total_scores["confidence"] += interview["confidence_score"]
                score_count += 1

        average_score = 0
        if score_count > 0:
            average_score = round(
                (total_scores["knowledge"] + total_scores["communication"] + total_scores["confidence"])
                / (3 * score_count),
                1
            )

        # Get completion rate
        total_links = await db.database.interview_links.count_documents({
            "hr_id": ObjectId(current_user.id),
            "created_at": {"$gte": thirty_days_ago}
        })

        completion_rate = 0
        if total_links > 0:
            completed_links = await db.database.interview_links.count_documents({
                "hr_id": ObjectId(current_user.id),
                "created_at": {"$gte": thirty_days_ago},
                "completed": True
            })
            completion_rate = round((completed_links / total_links) * 100, 1)

        # Get position stats
        pipeline = [
            {
                "$match": {
                    "hr_id": ObjectId(current_user.id),
                    "created_at": {"$gte": thirty_days_ago}
                }
            },
            {
                "$group": {
                    "_id": "$position",
                    "count": {"$sum": 1},
                    "completed": {
                        "$sum": {"$cond": ["$completed", 1, 0]}
                    },
                    "avg_score": {"$avg": "$knowledge_score"}
                }
            }
        ]

        position_stats = await db.database.interview_links.aggregate(pipeline).to_list(length=None)

        # Calculate average response time
        response_times = []
        async for interview in db.database.interviews.find({
            "hr_id": ObjectId(current_user.id),
            "completed": True,
            "created_at": {"$gte": thirty_days_ago}
        }):
            if interview.get("completed_at") and interview.get("created_at"):
                duration = (interview["completed_at"] - interview["created_at"]).total_seconds() / 60
                response_times.append(duration)

        average_response_time = round(sum(response_times) / len(response_times)) if response_times else 0

        # Get trends (last 30 days by week)
        trends = []
        for i in range(4):
            week_start = now - timedelta(days=7 * (i + 1))
            week_end = now - timedelta(days=7 * i)

            completed = await db.database.interview_links.count_documents({
                "hr_id": ObjectId(current_user.id),
                "completed": True,
                "created_at": {
                    "$gte": week_start,
                    "$lt": week_end
                }
            })

            trends.append({
                "period": f"Week {4 - i}",
                "completed": completed,
                "start_date": week_start,
                "end_date": week_end
            })

        return {
            "total_candidates": total_candidates,
            "active_interviews": active_interviews,
            "completed_interviews": completed_interviews,
            "average_score": average_score,
            "completion_rate": completion_rate,
            "position_stats": position_stats,
            "average_response_time": average_response_time,
            "trends": trends
        }

    except Exception as e:
        logger.error(f"Failed to fetch dashboard stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard stats: {str(e)}"
        )


@router.get("/recent-interviews")
async def get_recent_interviews(
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Fetching recent interviews for HR user {current_user.id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Get recent interviews with candidate details
        pipeline = [
            {
                "$match": {
                    "hr_id": ObjectId(current_user.id)
                }
            },
            {
                "$sort": {"created_at": -1}
            },
            {
                "$limit": 10
            },
            {
                "$lookup": {
                    "from": "candidates",
                    "localField": "candidate_id",
                    "foreignField": "_id",
                    "as": "candidate"
                }
            },
            {
                "$unwind": {
                    "path": "$candidate",
                    "preserveNullAndEmptyArrays": True
                }
            }
        ]

        interviews = await db.database.interviews.aggregate(pipeline).to_list(length=None)

        # Format the response
        formatted_interviews = []
        for interview in interviews:
            formatted_interview = {
                "id": str(interview["_id"]),
                "candidate_name": interview.get("candidate", {}).get("name", "Unknown"),
                "position": interview.get("candidate", {}).get("position", "Unknown"),
                "created_at": interview["created_at"],
                "status": "completed" if interview.get("completed") else "in_progress",
                "duration": interview.get("duration"),
                "scores": {
                    "knowledge": interview.get("knowledge_score"),
                    "communication": interview.get("communication_score"),
                    "confidence": interview.get("confidence_score")
                } if all(score in interview for score in
                         ["knowledge_score", "communication_score", "confidence_score"]) else None,
                "feedback": interview.get("feedback"),
                "question_count": len(interview.get("responses", {})),
                "completion_time": (interview.get("completed_at") - interview[
                    "created_at"]).total_seconds() / 60 if interview.get("completed_at") else None
            }
            formatted_interviews.append(formatted_interview)

        return {
            "interviews": formatted_interviews
        }

    except Exception as e:
        logger.error(f"Failed to fetch recent interviews: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch recent interviews: {str(e)}"
        )