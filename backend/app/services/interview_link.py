from datetime import datetime, timedelta
from bson import ObjectId
from app.db.mongodb import db
from app.schemas.interview_link import InterviewLinkCreate, InterviewLinkUpdate, PublicInterviewStart, \
    PublicInterviewComplete
from app.services.openai import generate_questions
from app.services.email import send_interview_email


async def create_interview_link(link_in: InterviewLinkCreate, hr_id: str):
    try:
        # Calculate expiry date
        expires_at = datetime.utcnow() + timedelta(days=link_in.expires_in)

        # Generate unique token
        import secrets
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
        link_data["id"] = str(result.inserted_id)
        link_data["_id"] = result.inserted_id

        # Add URL to response
        link_data["url"] = f"https://hiresphere-pi.vercel.app/i/{token}"
        link_data["is_expired"] = False

        # Send email to candidate
        await send_interview_email(
            candidate_email=link_in.candidate_email,
            candidate_name=link_in.candidate_name,
            interview_link=link_data["url"],
            position=link_in.position
        )

        return link_data
    except Exception as e:
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
            doc["url"] = f"https://hiresphere-pi.vercel.app/i/{doc['token']}"
            doc["is_expired"] = doc["expires_at"] < now
            links.append(doc)

        return links
    except Exception as e:
        raise Exception(f"Failed to fetch interview links: {str(e)}")


async def get_interview_link(link_id: str):
    try:
        link = await db.database.interview_links.find_one({"_id": ObjectId(link_id)})
        if link:
            link["id"] = str(link["_id"])
            link["url"] = f"https://hiresphere-pi.vercel.app/i/{link['token']}"
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
            link["url"] = f"https://hiresphere-eita.onrender.com/i/{token}"
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
        # Get the link data
        link = await get_interview_link(link_id)
        if not link:
            raise Exception("Interview link not found")

        # Send the email
        await send_interview_email(
            candidate_email=link["candidate_email"],
            candidate_name=link["candidate_name"],
            interview_link=link["url"],
            position=link["position"]
        )

        # Update sent count
        await db.database.interview_links.update_one(
            {"_id": ObjectId(link_id)},
            {
                "$inc": {"sent_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

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

        # Generate dynamic questions based on the topic and position
        questions = await generate_questions(
            topic=link["topic"],
            position=link["position"],
            seniority="mid-level"  # This could be made configurable
        )

        # Store the questions in the database for this interview
        await db.database.interview_links.update_one(
            {"token": token},
            {
                "$set": {
                    "questions": questions,
                    "candidate_info": {
                        "name": candidate_info.name,
                        "email": candidate_info.email
                    },
                    "started_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return {
            "questions": [q["question"] for q in questions]
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

        # Create an interview record with the responses
        interview_data = {
            "link_id": link["_id"],
            "hr_id": link["hr_id"],
            "candidate_name": data.candidateInfo["name"],
            "candidate_email": data.candidateInfo["email"],
            "position": link["position"],
            "topic": link["topic"],
            "questions": link.get("questions", []),
            "responses": data.responses,
            "completed_at": datetime.utcnow(),
            "created_at": link.get("started_at") or datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await db.database.interviews.insert_one(interview_data)

        # Mark the link as completed
        await db.database.interview_links.update_one(
            {"token": token},
            {
                "$set": {
                    "completed": True,
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return True
    except Exception as e:
        raise Exception(f"Failed to complete public interview: {str(e)}")