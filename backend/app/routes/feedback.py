import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Dict
from app.core.auth import get_current_user
from app.services.openai import analyze_response
from app.services.interview import get_interview
from app.db.mongodb import db
from bson import ObjectId
from app.schemas.user import User
from datetime import datetime
from app.core.config import settings

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
        logger.info(f"Response length: {len(response_data.get('response', {}).get('response', ''))}")

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

        # Log the start of analysis
        logger.info("Starting response analysis")
        start_time = datetime.now()

        # Store the response first without analysis to avoid timeout issues
        logger.info(f"Storing response for question {response_data.get('questionIndex')}")
        await db.database.interviews.update_one(
            {"_id": ObjectId(interview_id)},
            {"$set": {
                f"responses.{response_data['questionIndex']}": {
                    "question": response_data["response"]["question"],
                    "response": response_data["response"]["response"],
                    "timestamp": datetime.utcnow(),
                    "analysis_status": "pending"
                }
            }}
        )

        # Return immediately to client
        return {
            "message": "Response submitted successfully, analysis in progress",
            "status": "processing"
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


@router.post("/{interview_id}/analyze")
async def analyze_interview(
        interview_id: str,
        background_tasks: BackgroundTasks,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Starting analysis for interview {interview_id}")
        logger.info(f"User ID: {current_user.id}")

        # Get the interview
        interview = await get_interview(interview_id)
        if not interview:
            logger.error(f"Interview not found: {interview_id}")
            raise HTTPException(status_code=404, detail="Interview not found")

        # Verify user owns this interview
        if interview["user_id"] != str(current_user.id):
            logger.error(f"Unauthorized access attempt by user {current_user.id} for interview {interview_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this interview")

        # Check if responses exist
        responses = interview.get("responses", {})
        if not responses:
            logger.error(f"No responses found for interview {interview_id}")
            raise HTTPException(status_code=400, detail="No responses to analyze")

        # Start background task for analysis
        background_tasks.add_task(
            process_interview_analysis,
            interview_id=interview_id,
            responses=responses
        )

        return {
            "message": "Analysis started in background",
            "status": "processing"
        }

    except HTTPException as he:
        logger.error(f"HTTP Exception in analyze_interview: {str(he)}")
        raise he
    except Exception as e:
        logger.error(f"Unexpected error in analyze_interview: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start analysis: {str(e)}"
        )


async def process_interview_analysis(interview_id: str, responses: Dict):
    """Background task to process all responses and generate overall feedback"""
    try:
        logger.info(f"Starting background analysis for interview {interview_id}")

        all_analyses = []

        # Process each response
        for idx, response_data in responses.items():
            if response_data.get("analysis_status") == "pending":
                logger.info(f"Analyzing response for question {idx}")

                try:
                    # Set timeout for analysis
                    analysis_task = analyze_response({"response": response_data})
                    analysis = await asyncio.wait_for(
                        analysis_task,
                        timeout=settings.LLM_REQUEST_TIMEOUT
                    )

                    # Update the response with analysis
                    await db.database.interviews.update_one(
                        {"_id": ObjectId(interview_id)},
                        {"$set": {
                            f"responses.{idx}.analysis": analysis,
                            f"responses.{idx}.analysis_status": "completed"
                        }}
                    )

                    all_analyses.append(analysis)
                    logger.info(f"Analysis completed for question {idx}")

                except asyncio.TimeoutError:
                    logger.error(f"Analysis timeout for question {idx}")
                    await db.database.interviews.update_one(
                        {"_id": ObjectId(interview_id)},
                        {"$set": {
                            f"responses.{idx}.analysis_status": "timeout"
                        }}
                    )
                except Exception as e:
                    logger.error(f"Analysis failed for question {idx}: {str(e)}")
                    await db.database.interviews.update_one(
                        {"_id": ObjectId(interview_id)},
                        {"$set": {
                            f"responses.{idx}.analysis_status": "failed",
                            f"responses.{idx}.analysis_error": str(e)
                        }}
                    )

        # Calculate overall scores
        if all_analyses:
            logger.info("Calculating overall scores")
            knowledge_score = sum(a["knowledge_score"] for a in all_analyses) / len(all_analyses)
            communication_score = sum(a["communication_score"] for a in all_analyses) / len(all_analyses)
            confidence_score = sum(a["confidence_score"] for a in all_analyses) / len(all_analyses)

            # Combine feedback
            combined_feedback = "\n\n".join([
                f"Question {i + 1} Feedback:\n{a['feedback']}"
                for i, a in enumerate(all_analyses)
            ])

            # Add overall summary
            overall_feedback = f"""
# Overall Interview Assessment

## Scores
- Knowledge: {knowledge_score:.1f}/100
- Communication: {communication_score:.1f}/100
- Confidence: {confidence_score:.1f}/100

## Summary
{combined_feedback}

## Improvement Areas
Based on your responses, focus on improving:
1. Knowledge areas where you scored lower
2. Communication clarity and structure
3. Confidence in your delivery
            """

            # Update the interview with overall scores and feedback
            logger.info("Updating interview with overall scores and feedback")
            await db.database.interviews.update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {
                    "knowledge_score": round(knowledge_score, 1),
                    "communication_score": round(communication_score, 1),
                    "confidence_score": round(confidence_score, 1),
                    "feedback": overall_feedback,
                    "analysis_status": "completed",
                    "analyzed_at": datetime.utcnow()
                }}
            )

            logger.info(f"Interview analysis completed for {interview_id}")
        else:
            logger.warning(f"No analyses were completed for interview {interview_id}")
            await db.database.interviews.update_one(
                {"_id": ObjectId(interview_id)},
                {"$set": {
                    "analysis_status": "failed",
                    "analysis_error": "No analyses were completed"
                }}
            )

    except Exception as e:
        logger.error(f"Error in background analysis task: {str(e)}", exc_info=True)
        await db.database.interviews.update_one(
            {"_id": ObjectId(interview_id)},
            {"$set": {
                "analysis_status": "failed",
                "analysis_error": str(e)
            }}
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
            "responses": interview.get("responses", {}),
            "analysis_status": interview.get("analysis_status", "unknown"),
            "analyzed_at": interview.get("analyzed_at")
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


@router.get("/status/{interview_id}")
async def get_analysis_status(
        interview_id: str,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Checking analysis status for interview {interview_id}")

        # Get the interview
        interview = await get_interview(interview_id)
        if not interview:
            logger.error(f"Interview not found: {interview_id}")
            raise HTTPException(status_code=404, detail="Interview not found")

        # Verify user owns this interview
        if interview["user_id"] != str(current_user.id):
            logger.error(f"Unauthorized access attempt by user {current_user.id} for interview {interview_id}")
            raise HTTPException(status_code=403, detail="Not authorized to access this interview")

        # Get analysis status
        analysis_status = interview.get("analysis_status", "unknown")
        responses = interview.get("responses", {})

        # Count responses by status
        response_counts = {
            "total": len(responses),
            "pending": sum(1 for r in responses.values() if r.get("analysis_status") == "pending"),
            "completed": sum(1 for r in responses.values() if r.get("analysis_status") == "completed"),
            "failed": sum(1 for r in responses.values() if r.get("analysis_status") in ["failed", "timeout"])
        }

        return {
            "interview_id": interview_id,
            "analysis_status": analysis_status,
            "response_counts": response_counts,
            "analyzed_at": interview.get("analyzed_at")
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error checking analysis status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check analysis status: {str(e)}"
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
                "responses": interview.get("responses", {}),
                "analysis_status": interview.get("analysis_status", "unknown")
            })

        logger.info(f"Found {len(interviews)} recent interviews")

        # Calculate average scores
        if interviews:
            logger.info("Calculating average scores")
            # Only include interviews with completed analysis
            completed_interviews = [i for i in interviews if i.get("knowledge_score") is not None]

            if completed_interviews:
                avg_knowledge = sum(i["knowledge_score"] for i in completed_interviews) / len(completed_interviews)
                avg_communication = sum(i["communication_score"] for i in completed_interviews) / len(
                    completed_interviews)
                avg_confidence = sum(i["confidence_score"] for i in completed_interviews) / len(completed_interviews)

                logger.info(
                    f"Average scores - Knowledge: {avg_knowledge:.2f}, Communication: {avg_communication:.2f}, Confidence: {avg_confidence:.2f}")
            else:
                logger.info("No completed interviews found, setting average scores to 0")
                avg_knowledge = avg_communication = avg_confidence = 0
        else:
            logger.info("No interviews found, setting average scores to 0")
            avg_knowledge = avg_communication = avg_confidence = 0

        return {
            "recent_interviews": interviews,
            "average_scores": {
                "knowledge": round(avg_knowledge, 2) if 'avg_knowledge' in locals() else 0,
                "communication": round(avg_communication, 2) if 'avg_communication' in locals() else 0,
                "confidence": round(avg_confidence, 2) if 'avg_confidence' in locals() else 0
            }
        }
    except Exception as e:
        logger.error(f"Unexpected error in get_recent_feedback_summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch summary: {str(e)}"
        )