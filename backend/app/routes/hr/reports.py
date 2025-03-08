from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
from app.core.auth import get_current_user
from app.schemas.user import User
from app.services.reports import get_hr_reports, get_report_stats
from app.db.mongodb import db
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def get_reports(
        date_range: Optional[str] = Query("30days", description="Filter by date range: 7days, 30days, 90days, all"),
        position: Optional[str] = Query("all", description="Filter by position"),
        status: Optional[str] = Query("all", description="Filter by status: completed, pending, expired"),
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(
            f"Fetching reports for HR user {current_user.id} with filters: date_range={date_range}, position={position}, status={status}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        reports = await get_hr_reports(str(current_user.id), date_range, position, status)
        logger.info(f"Found {len(reports)} reports")

        return reports
    except Exception as e:
        logger.error(f"Failed to fetch reports: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reports: {str(e)}"
        )


@router.get("/stats")
async def get_stats(
        date_range: Optional[str] = Query("30days", description="Filter by date range: 7days, 30days, 90days, all"),
        position: Optional[str] = Query("all", description="Filter by position"),
        status: Optional[str] = Query("all", description="Filter by status: completed, pending, expired"),
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(
            f"Fetching report stats for HR user {current_user.id} with filters: date_range={date_range}, position={position}, status={status}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        stats = await get_report_stats(str(current_user.id), date_range, position, status)
        logger.info(f"Successfully retrieved report stats")

        return stats
    except Exception as e:
        logger.error(f"Failed to fetch report stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch report stats: {str(e)}"
        )


@router.get("/analytics/questions")
async def get_question_analytics(
        date_range: Optional[str] = Query("30days"),
        current_user: User = Depends(get_current_user)
):
    """Analyze question effectiveness and patterns"""
    try:
        logger.info(f"Fetching question analytics for HR user {current_user.id}")

        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Calculate date filter
        now = datetime.utcnow()
        date_filter = {
            "7days": now - timedelta(days=7),
            "30days": now - timedelta(days=30),
            "90days": now - timedelta(days=90)
        }.get(date_range)

        pipeline = [
            {
                "$match": {
                    "hr_id": ObjectId(current_user.id),
                    **({"created_at": {"$gte": date_filter}} if date_filter else {})
                }
            },
            {
                "$unwind": "$responses"
            },
            {
                "$group": {
                    "_id": "$responses.question",
                    "avg_score": {"$avg": "$responses.analysis.knowledge_score"},
                    "response_count": {"$sum": 1},
                    "completion_rate": {
                        "$avg": {"$cond": [{"$gt": ["$responses.response", ""]}, 1, 0]}
                    }
                }
            },
            {
                "$project": {
                    "question": "$_id",
                    "avg_score": 1,
                    "response_count": 1,
                    "completion_rate": 1,
                    "effectiveness": {
                        "$multiply": [
                            "$avg_score",
                            "$completion_rate"
                        ]
                    }
                }
            },
            {
                "$sort": {"effectiveness": -1}
            }
        ]

        results = await db.database.interviews.aggregate(pipeline).to_list(length=None)

        return {
            "questions": results,
            "summary": {
                "total_questions": len(results),
                "avg_effectiveness": sum(r["effectiveness"] for r in results) / len(results) if results else 0,
                "most_effective": results[0] if results else None,
                "least_effective": results[-1] if results else None
            }
        }

    except Exception as e:
        logger.error(f"Failed to fetch question analytics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch question analytics: {str(e)}"
        )


@router.get("/analytics/candidates")
async def get_candidate_analytics(
        date_range: Optional[str] = Query("30days"),
        current_user: User = Depends(get_current_user)
):
    """Get detailed candidate performance analytics"""
    try:
        logger.info(f"Fetching candidate analytics for HR user {current_user.id}")

        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Calculate date filter
        now = datetime.utcnow()
        date_filter = {
            "7days": now - timedelta(days=7),
            "30days": now - timedelta(days=30),
            "90days": now - timedelta(days=90)
        }.get(date_range)

        pipeline = [
            {
                "$match": {
                    "hr_id": ObjectId(current_user.id),
                    **({"created_at": {"$gte": date_filter}} if date_filter else {})
                }
            },
            {
                "$lookup": {
                    "from": "interviews",
                    "localField": "_id",
                    "foreignField": "candidate_id",
                    "as": "interviews"
                }
            },
            {
                "$project": {
                    "name": 1,
                    "email": 1,
                    "position": 1,
                    "status": 1,
                    "interview_count": {"$size": "$interviews"},
                    "avg_scores": {
                        "$avg": {
                            "$map": {
                                "input": "$interviews",
                                "as": "interview",
                                "in": {
                                    "knowledge": "$$interview.knowledge_score",
                                    "communication": "$$interview.communication_score",
                                    "confidence": "$$interview.confidence_score"
                                }
                            }
                        }
                    },
                    "last_interview": {"$max": "$interviews.created_at"},
                    "improvement_trend": {
                        "$reduce": {
                            "input": "$interviews",
                            "initialValue": 0,
                            "in": {
                                "$subtract": [
                                    "$$this.knowledge_score",
                                    "$$value"
                                ]
                            }
                        }
                    }
                }
            },
            {
                "$sort": {"last_interview": -1}
            }
        ]

        results = await db.database.candidates.aggregate(pipeline).to_list(length=None)

        # Calculate summary statistics
        total_candidates = len(results)
        avg_interview_count = sum(
            r["interview_count"] for r in results) / total_candidates if total_candidates > 0 else 0

        return {
            "candidates": results,
            "summary": {
                "total_candidates": total_candidates,
                "avg_interview_count": avg_interview_count,
                "status_distribution": {
                    status: len([r for r in results if r["status"] == status])
                    for status in set(r["status"] for r in results)
                },
                "position_distribution": {
                    position: len([r for r in results if r["position"] == position])
                    for position in set(r["position"] for r in results)
                }
            }
        }

    except Exception as e:
        logger.error(f"Failed to fetch candidate analytics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch candidate analytics: {str(e)}"
        )


@router.get("/export")
async def export_reports(
        format: str = Query("csv", description="Export format: csv or json"),
        date_range: Optional[str] = Query("30days"),
        position: Optional[str] = Query("all"),
        status: Optional[str] = Query("all"),
        current_user: User = Depends(get_current_user)
):
    """Export reports in specified format"""
    try:
        logger.info(f"Exporting reports for HR user {current_user.id}")

        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Get reports data
        reports = await get_hr_reports(str(current_user.id), date_range, position, status)

        if format == "csv":
            # Convert to CSV format
            import csv
            import io

            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=[
                "candidate_name", "position", "date", "status",
                "knowledge_score", "communication_score", "confidence_score"
            ])

            writer.writeheader()
            for report in reports:
                writer.writerow({
                    "candidate_name": report["candidateName"],
                    "position": report["position"],
                    "date": report["date"],
                    "status": report["status"],
                    "knowledge_score": report["scores"]["knowledge"] if report["scores"] else None,
                    "communication_score": report["scores"]["communication"] if report["scores"] else None,
                    "confidence_score": report["scores"]["confidence"] if report["scores"] else None
                })

            return Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=interview_reports_{datetime.now().strftime('%Y%m%d')}.csv"
                }
            )
        else:
            # Return JSON format
            return {
                "reports": reports,
                "generated_at": datetime.utcnow(),
                "filters": {
                    "date_range": date_range,
                    "position": position,
                    "status": status
                }
            }

    except Exception as e:
        logger.error(f"Failed to export reports: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export reports: {str(e)}"
        )