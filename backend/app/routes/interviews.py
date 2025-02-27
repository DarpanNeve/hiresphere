from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.auth import get_current_user
from app.schemas.interview import Interview, InterviewCreate
from app.services.interview import create_interview, get_user_interviews, get_interview
from app.services.openai import generate_questions, analyze_response
from app.schemas.user import User
from bson import ObjectId

router = APIRouter()


@router.post("/start")
async def start_interview(
        interview_in: InterviewCreate,
        current_user: User = Depends(get_current_user)
):
    try:
        # Create new interview session
        interview = await create_interview(interview_in, str(current_user.id))
        print(interview)

        # Generate initial questions
        questions = await generate_questions(interview["topic"])
        print(questions)

        # Convert the ObjectId to string before returning
        interview_dict = {**interview}
        if "_id" in interview_dict:
            interview_dict["_id"] = str(interview_dict["_id"])
        if "id" in interview_dict and isinstance(interview_dict["id"], ObjectId):
            interview_dict["id"] = str(interview_dict["id"])

        return {
            "interview": interview_dict,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start interview: {str(e)}"
        )


@router.get("/history")
async def get_interview_history(current_user: User = Depends(get_current_user)):
    try:
        interviews = await get_user_interviews(str(current_user.id))
        return interviews
    except Exception as e:
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
        interview = await get_interview(interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        if interview["user_id"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this interview")

        return interview
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch interview details: {str(e)}"
        )