from datetime import datetime
from bson import ObjectId
from app.db.mongodb import db
from app.schemas.interview import InterviewCreate


async def create_interview(interview_in: InterviewCreate, user_id: str):
    try:
        interview_data = {
            "user_id": user_id,
            "topic": interview_in.topic,
            "duration": interview_in.duration,
            "knowledge_score": interview_in.knowledge_score,
            "communication_score": interview_in.communication_score,
            "confidence_score": interview_in.confidence_score,
            "feedback": interview_in.feedback,
            "created_at": datetime.utcnow()
        }

        result = await db.database.interviews.insert_one(interview_data)
        # Convert ObjectId to string before returning
        interview_data["id"] = str(result.inserted_id)
        # Remove the _id field if it exists to avoid serialization issues
        if "_id" in interview_data:
            del interview_data["_id"]
        return interview_data
    except Exception as e:
        raise Exception(f"Failed to create interview: {str(e)}")


async def get_user_interviews(user_id: str):
    try:
        cursor = db.database.interviews.find({"user_id": user_id}).sort("created_at", -1)
        interviews = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            interviews.append(doc)
        return interviews
    except Exception as e:
        raise Exception(f"Failed to fetch user interviews: {str(e)}")


async def get_interview(interview_id: str):
    try:
        interview = await db.database.interviews.find_one({"_id": ObjectId(interview_id)})
        if interview:
            interview["id"] = str(interview["_id"])
            interview["_id"] = str(interview["_id"])  # Convert ObjectId to string
        return interview
    except Exception as e:
        raise Exception(f"Failed to fetch interview: {str(e)}")