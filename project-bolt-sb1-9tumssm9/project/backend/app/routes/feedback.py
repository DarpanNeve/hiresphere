from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.auth import get_current_user
from app.services.openai import analyze_response
from app.services.interview import get_interview
from app.db.mongodb import db
from bson import ObjectId
from app.schemas.user import User

router = APIRouter()


@router.post("/{interview_id}/submit")
async def submit_feedback(
        interview_id: str,
        response_data: dict,
        current_user: User = Depends(get_current_user)
):
    try:
        # Get the interview
        interview = await get_interview(interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Verify user owns this interview
        if interview["user_id"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this interview")

        # Analyze the response using OpenAI
        analysis = await analyze_response(response_data)

        # Update the interview with feedback
        update_data = {
            "knowledge_score": analysis["knowledge_score"],
            "communication_score": analysis["communication_score"],
            "confidence_score": analysis["confidence_score"],
            "feedback": analysis["feedback"],
            f"responses.{response_data['questionIndex']}": {
                "question": response_data["question"],
                "response": response_data["response"],
                "analysis": analysis
            }
        }

        await db.database.interviews.update_one(
            {"_id": ObjectId(interview_id)},
            {"$set": update_data}
        )

        return {
            "message": "Feedback submitted successfully",
            "analysis": analysis
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit feedback: {str(e)}"
        )


@router.get("/{interview_id}")
async def get_feedback(
        interview_id: str,
        current_user: User = Depends(get_current_user)
):
    try:
        # Get the interview with feedback
        interview = await get_interview(interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Verify user owns this interview
        if interview["user_id"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this interview")

        return {
            "knowledge_score": interview.get("knowledge_score"),
            "communication_score": interview.get("communication_score"),
            "confidence_score": interview.get("confidence_score"),
            "feedback": interview.get("feedback"),
            "responses": interview.get("responses", [])
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch feedback: {str(e)}"
        )


@router.get("/summary/recent")
async def get_recent_feedback_summary(
        current_user: User = Depends(get_current_user)
):
    try:
        # Get the user's 5 most recent interviews
        cursor = db.database.interviews.find(
            {"user_id": str(current_user.id)}
        ).sort("created_at", -1).limit(5)

        interviews = []
        async for interview in cursor:
            interviews.append({
                "id": str(interview["_id"]),
                "topic": interview["topic"],
                "knowledge_score": interview.get("knowledge_score"),
                "communication_score": interview.get("communication_score"),
                "confidence_score": interview.get("confidence_score"),
                "created_at": interview["created_at"],
                "responses": interview.get("responses", [])
            })

        # Calculate average scores
        if interviews:
            avg_knowledge = sum(i["knowledge_score"] for i in interviews if i.get("knowledge_score")) / len(interviews)
            avg_communication = sum(i["communication_score"] for i in interviews if i.get("communication_score")) / len(
                interviews)
            avg_confidence = sum(i["confidence_score"] for i in interviews if i.get("confidence_score")) / len(
                interviews)
        else:
            avg_knowledge = avg_communication = avg_confidence = 0

        return {
            "recent_interviews": interviews,
            "average_scores": {
                "knowledge": round(avg_knowledge, 2),
                "communication": round(avg_communication, 2),
                "confidence": round(avg_confidence, 2)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch summary: {str(e)}"
        )