from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
import logging
from app.core.auth import get_current_user
from app.schemas.user import User
from app.services.reports import get_hr_reports, get_report_stats

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