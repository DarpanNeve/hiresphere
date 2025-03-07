from datetime import datetime, timedelta
from bson import ObjectId
from app.db.mongodb import db
from app.schemas.interview_link import InterviewLinkCreate, InterviewLinkUpdate, PublicInterviewStart, \
    PublicInterviewComplete
from app.services.email import send_interview_email
import secrets
import logging

logger = logging.getLogger(__name__)


async def create_interview_link(link_in: InterviewLinkCreate, hr_id: str):
    try:
        # Calculate expiry date
        expires_at = datetime.utcnow() + timedelta(days=link_in.expires_in)

        # Generate unique token
        token = secrets.token_urlsafe(16)

        link_data = {
            "candidate_name": link_in.candidate_name,
            "candidate_email": link_in.candidate_email,
            "position": link_in.position,
            "topic": link_in.topic,
            "hr_id": ObjectId(hr_id),
            "token": token,
            "expires_at": expires_at,
            "completed": False,
            "sent_count": 1,  # Initial email is sent on creation
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await db.database.interview_links.insert_one(link_data)

        # Prepare response data
        response_data = {
            "_id": str(result.inserted_id),
            "hr_id": str(link_data["hr_id"]),
            **{k: v for k, v in link_data.items() if k not in ["_id", "hr_id"]},
            "url": f"https://hiresphere-eita.onrender.com/i/{token}",
            "is_expired": False
        }

        # Send email to candidate
        await send_interview_email(
            candidate_email=link_in.candidate_email,
            candidate_name=link_in.candidate_name,
            interview_link=response_data["url"],
            position=link_in.position
        )

        return response_data
    except Exception as e:
        logger.error(f"Failed to create interview link: {str(e)}")
        raise Exception(f"Failed to create interview link: {str(e)}")


async def get_interview_links(hr_id: str):
    try:
        cursor = db.database.interview_links.find({"hr_id": ObjectId(hr_id)}).sort("created_at", -1)
        links = []
        now = datetime.utcnow()

        async for doc in cursor:
            # Convert ObjectId to string
            doc["id"] = str(doc["_id"])  # Add string ID for API response
            doc["_id"] = str(doc["_id"])
            doc["hr_id"] = str(doc["hr_id"])
            doc["url"] = f"https://ai-interviewer.com/i/{doc['token']}"
            doc["is_expired"] = doc["expires_at"] < now
            links.append(doc)

        return links
    except Exception as e:
        raise Exception(f"Failed to fetch interview links: {str(e)}")


async def get_interview_link(link_id: str):
    try:
        link = await db.database.interview_links.find_one({"_id": ObjectId(link_id)})
        if link:
            # Convert ObjectId to string
            link["id"] = str(link["_id"])  # Add string ID for API response
            link["_id"] = str(link["_id"])
            link["hr_id"] = str(link["hr_id"])
            link["url"] = f"https://ai-interviewer.com/i/{link['token']}"
            link["is_expired"] = link["expires_at"] < datetime.utcnow()
        return link
    except Exception as e:
        raise Exception(f"Failed to fetch interview link: {str(e)}")


async def get_interview_link_by_token(token: str):
    try:
        link = await db.database.interview_links.find_one({"token": token})
        if link:
            # Convert ObjectId to string
            link["id"] = str(link["_id"])  # Add string ID for API response
            link["_id"] = str(link["_id"])
            link["hr_id"] = str(link["hr_id"])
            link["url"] = f"https://ai-interviewer.com/i/{token}"
            link["is_expired"] = link["expires_at"] < datetime.utcnow()
        return link
    except Exception as e:
        raise Exception(f"Failed to fetch interview link by token: {str(e)}")


async def update_interview_link(link_id: str, link_in: InterviewLinkUpdate):
    try:
        update_data = {k: v for k, v in link_in.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        if not update_data:
            # No fields to update
            return await get_interview_link(link_id)

        await db.database.interview_links.update_one(
            {"_id": ObjectId(link_id)},
            {"$set": update_data}
        )

        return await get_interview_link(link_id)
    except Exception as e:
        raise Exception(f"Failed to update interview link: {str(e)}")


async def delete_interview_link(link_id: str):
    try:
        await db.database.interview_links.delete_one({"_id": ObjectId(link_id)})
        return True
    except Exception as e:
        raise Exception(f"Failed to delete interview link: {str(e)}")


async def resend_interview_email(link_id: str):
    try:
        # Update sent count
        await db.database.interview_links.update_one(
            {"_id": ObjectId(link_id)},
            {
                "$inc": {"sent_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        # TODO: Actually send the email (would be implemented in a real system)

        return await get_interview_link(link_id)
    except Exception as e:
        raise Exception(f"Failed to resend interview email: {str(e)}")


async def validate_interview_link(token: str):
    try:
        link = await get_interview_link_by_token(token)
        if not link:
            return None

        # Check if expired
        is_expired = link["expires_at"] < datetime.utcnow()

        return {
            "valid": True,
            "expired": is_expired,
            "position": link["position"],
            "company": "TechCorp",  # This would come from the HR user's company in a real system
            "topic": link["topic"]
        }
    except Exception as e:
        raise Exception(f"Failed to validate interview link: {str(e)}")


async def start_public_interview(token: str, candidate_info: PublicInterviewStart):
    try:
        # Validate the token
        link = await get_interview_link_by_token(token)
        if not link:
            raise Exception("Invalid interview link")

        if link["expires_at"] < datetime.utcnow():
            raise Exception("This interview link has expired")

        if link["completed"]:
            raise Exception("This interview has already been completed")

        # Generate questions based on the topic
        questions = [
            "What is your experience with this role?",
            "Describe a challenging project you worked on",
            "How do you handle difficult situations?",
            "What are your strengths and weaknesses?",
            "Why are you interested in this position?"
        ]

        return {
            "questions": questions
        }
    except Exception as e:
        raise Exception(f"Failed to start public interview: {str(e)}")


async def complete_public_interview(token: str, data: PublicInterviewComplete):
    try:
        # Validate the token
        link = await get_interview_link_by_token(token)
        if not link:
            raise Exception("Invalid interview link")

        if link["expires_at"] < datetime.utcnow():
            raise Exception("This interview link has expired")

        if link["completed"]:
            raise Exception("This interview has already been completed")

        # Mark the link as completed
        await db.database.interview_links.update_one(
            {"token": token},
            {
                "$set": {
                    "completed": True,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return True
    except Exception as e:
        raise Exception(f"Failed to complete public interview: {str(e)}")