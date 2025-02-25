import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.auth import get_current_user
from app.services.openai import analyze_response
from app.services.interview import get_interview
from app.db.mongodb import db
from bson import ObjectId
from app.schemas.user import User
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{interview_id}/submit")
async def submit_feedback(
        interview_id: str,
        response_data: dict,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Received feedback submission request for interview {interview_id}")
        logger.info(f"User ID: {current_user.id}")
        logger.info(f"Question Index: {response_data.get('questionIndex')}")
        logger.info(f"Response length: {len(response_data.get('response', ''))}")

        # Get the interview
        logger.info(f"Fetching interview details for ID: {interview_id}")
        interview = await get_interview(interview_id)
        if not interview:
            logger.error(f"Interview not found: {interview_id}")
            raise HTTPException(status_code=404, detail="Interview not found")

        # Verify user owns this interview
        logger.info("Verifying user ownership")
        if interview["user_id"] != str(current_user.id):
            logger.error(f"Unauthorized access attempt by user {current_user.id} for interview {interview_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this interview")

        # Log the start of OpenAI analysis
        logger.info("Starting OpenAI response analysis")
        start_time = datetime.now()
        print(response_data)
        # Analyze the response using OpenAI
        analysis = await analyze_response(response_data['response'])
        print('Analysis is ' + str(analysis))
        # Log analysis completion and duration
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(f"OpenAI analysis completed in {duration:.2f} seconds")
        logger.info(
            f"Analysis scores - Knowledge: {analysis['knowledge_score']}, Communication: {analysis['communication_score']}, Confidence: {analysis['confidence_score']}")

        # Update the interview with feedback
        logger.info(f"Updating interview {interview_id} with feedback")
        update_data = {
            "knowledge_score": analysis["knowledge_score"],
            "communication_score": analysis["communication_score"],
            "confidence_score": analysis["confidence_score"],
            "feedback": analysis["feedback"],
            f"responses.{response_data['response']['response']['questionIndex']}": {
                "question": response_data['response']['response']["question"],
                "response": response_data['response']['response']["response"],
                "analysis": analysis,
                "timestamp": datetime.utcnow()
            }
        }

        # Log the database update operation
        logger.info("Executing database update")
        update_result = await db.database.interviews.update_one(
            {"_id": ObjectId(interview_id)},
            {"$set": update_data}
        )

        logger.info(f"Database update complete. Modified count: {update_result.modified_count}")

        return {
            "message": "Feedback submitted successfully",
            "analysis": analysis
        }
    except HTTPException as he:
        logger.error(f"HTTP Exception in submit_feedback: {str(he)}")
        raise he
    except Exception as e:
        logger.error(f"Unexpected error in submit_feedback: {str(e)}", exc_info=True)
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
        logger.info(f"Fetching feedback for interview {interview_id}")
        logger.info(f"User ID: {current_user.id}")

        # Get the interview with feedback
        interview = await get_interview(interview_id)
        if not interview:
            logger.error(f"Interview not found: {interview_id}")
            raise HTTPException(status_code=404, detail="Interview not found")

        # Verify user owns this interview
        logger.info("Verifying user ownership")
        if interview["user_id"] != str(current_user.id):
            logger.error(f"Unauthorized access attempt by user {current_user.id} for interview {interview_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this interview")

        logger.info("Successfully retrieved feedback")
        return {
            "knowledge_score": interview.get("knowledge_score"),
            "communication_score": interview.get("communication_score"),
            "confidence_score": interview.get("confidence_score"),
            "feedback": interview.get("feedback"),
            "responses": interview.get("responses", [])
        }
    except HTTPException as he:
        logger.error(f"HTTP Exception in get_feedback: {str(he)}")
        raise he
    except Exception as e:
        logger.error(f"Unexpected error in get_feedback: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch feedback: {str(e)}"
        )


@router.get("/summary/recent")
async def get_recent_feedback_summary(
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Fetching recent feedback summary for user {current_user.id}")

        # Get the user's 5 most recent interviews
        logger.info("Querying database for recent interviews")
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

        logger.info(f"Found {len(interviews)} recent interviews")

        # Calculate average scores
        if interviews:
            logger.info("Calculating average scores")
            avg_knowledge = sum(i["knowledge_score"] for i in interviews if i.get("knowledge_score")) / len(interviews)
            avg_communication = sum(i["communication_score"] for i in interviews if i.get("communication_score")) / len(
                interviews)
            avg_confidence = sum(i["confidence_score"] for i in interviews if i.get("confidence_score")) / len(
                interviews)

            logger.info(
                f"Average scores - Knowledge: {avg_knowledge:.2f}, Communication: {avg_communication:.2f}, Confidence: {avg_confidence:.2f}")
        else:
            logger.info("No interviews found, setting average scores to 0")
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
        logger.error(f"Unexpected error in get_recent_feedback_summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch summary: {str(e)}"
        )