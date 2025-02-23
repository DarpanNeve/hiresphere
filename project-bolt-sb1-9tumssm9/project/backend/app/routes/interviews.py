from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.auth import get_current_user
from app.schemas.interview import Interview, InterviewCreate
from app.services.interview import create_interview, get_user_interviews
from app.services.openai import generate_questions, analyze_response
from app.services.did import create_avatar_video

router = APIRouter()

@router.post("/start", response_model=Interview)
async def start_interview(
    interview_in: InterviewCreate,
    current_user = Depends(get_current_user)
):
    # Create new interview session
    interview = await create_interview(interview_in, current_user.id)
    
    # Generate initial questions
    questions = await generate_questions(interview.topic)
    
    # Create avatar video
    video_url = await create_avatar_video(questions[0])
    
    return {
        "interview": interview,
        "question": questions[0],
        "video_url": video_url
    }

@router.get("/history", response_model=List[Interview])
async def get_interview_history(current_user = Depends(get_current_user)):
    interviews = await get_user_interviews(current_user.id)
    return interviews