from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
import logging
from app.core.auth import get_current_user
from app.schemas.interview import Interview, InterviewCreate
from app.services.interview import create_interview, get_user_interviews, get_interview
from app.services.openai import generate_questions, analyze_response
from app.schemas.user import User
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/start")
async def start_interview(
        interview_in: InterviewCreate,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Starting new interview for user {current_user.id} on topic: {interview_in.topic}")

        # Create new interview session
        interview = await create_interview(interview_in, str(current_user.id))
        logger.info(f"Created interview with ID: {interview['id']}")

        # Generate initial questions
        logger.info(f"Generating questions for topic: {interview['topic']}")
        questions = await generate_questions(interview["topic"])
        logger.info(f"Generated {len(questions)} questions")

        return {
            "interview": interview,
            "questions": questions
        }
    except Exception as e:
        logger.error(f"Failed to start interview: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start interview: {str(e)}"
        )


@router.get("/history")
async def get_interview_history(current_user: User = Depends(get_current_user)):
    try:
        logger.info(f"Fetching interview history for user {current_user.id}")
        interviews = await get_user_interviews(str(current_user.id))
        logger.info(f"Found {len(interviews)} interviews")
        return interviews
    except Exception as e:
        logger.error(f"Failed to fetch interview history: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch interview history: {str(e)}"
        )


@router.get("/{interview_id}")
async def get_interview_details(
        interview_id: str,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Fetching interview details for ID: {interview_id}")
        interview = await get_interview(interview_id)
        if not interview:
            logger.error(f"Interview not found: {interview_id}")
            raise HTTPException(status_code=404, detail="Interview not found")

        if interview["user_id"] != str(current_user.id):
            logger.error(f"Unauthorized access attempt by user {current_user.id} for interview {interview_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this interview")

        logger.info(f"Successfully retrieved interview details for ID: {interview_id}")
        return interview
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to fetch interview details: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch interview details: {str(e)}"
        )


@router.post("/{interview_id}/complete")
async def complete_interview(
        interview_id: str,
        background_tasks: BackgroundTasks,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Completing interview {interview_id} for user {current_user.id}")

        # Get the interview
        interview = await get_interview(interview_id)
        if not interview:
            logger.error(f"Interview not found: {interview_id}")
            raise HTTPException(status_code=404, detail="Interview not found")

        if interview["user_id"] != str(current_user.id):
            logger.error(f"Unauthorized access attempt by user {current_user.id} for interview {interview_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this interview")

        # Mark interview as completed
        from app.db.mongodb import db
        from datetime import datetime

        logger.info(f"Marking interview {interview_id} as completed")
        await db.database.interviews.update_one(
            {"_id": ObjectId(interview["id"])},
            {"$set": {"completed_at": datetime.utcnow(), "status": "completed"}}
        )

        logger.info(f"Interview {interview_id} marked as completed")
        return {"message": "Interview completed successfully"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to complete interview: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to complete interview: {str(e)}"
        )