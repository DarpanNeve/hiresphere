from datetime import datetime
from bson import ObjectId
from app.db.mongodb import db
from app.schemas.candidate import CandidateCreate, CandidateUpdate


async def create_candidate(candidate_in: CandidateCreate, hr_id: str):
    try:
        candidate_data = {
            "name": candidate_in.name,
            "email": candidate_in.email,
            "position": candidate_in.position,
            "status": candidate_in.status,
            "interview_count": 0,
            "last_activity": None,
            "hr_id": ObjectId(hr_id),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await db.database.candidates.insert_one(candidate_data)
        candidate_data["_id"] = result.inserted_id

        # Convert ObjectId to string for response
        candidate_data["_id"] = str(candidate_data["_id"])
        candidate_data["hr_id"] = str(candidate_data["hr_id"])

        return candidate_data
    except Exception as e:
        raise Exception(f"Failed to create candidate: {str(e)}")


async def get_candidates(hr_id: str):
    try:
        cursor = db.database.candidates.find({"hr_id": ObjectId(hr_id)}).sort("created_at", -1)
        candidates = []
        async for doc in cursor:
            # Convert ObjectId to string
            doc["_id"] = str(doc["_id"])
            doc["hr_id"] = str(doc["hr_id"])
            candidates.append(doc)
        return candidates
    except Exception as e:
        raise Exception(f"Failed to fetch candidates: {str(e)}")


async def get_candidate(candidate_id: str):
    try:
        candidate = await db.database.candidates.find_one({"_id": ObjectId(candidate_id)})
        if candidate:
            # Convert ObjectId to string
            candidate["_id"] = str(candidate["_id"])
            candidate["hr_id"] = str(candidate["hr_id"])
        return candidate
    except Exception as e:
        raise Exception(f"Failed to fetch candidate: {str(e)}")


async def update_candidate(candidate_id: str, candidate_in: CandidateUpdate):
    try:
        update_data = {k: v for k, v in candidate_in.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()

        if not update_data:
            # No fields to update
            return await get_candidate(candidate_id)

        await db.database.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": update_data}
        )

        return await get_candidate(candidate_id)
    except Exception as e:
        raise Exception(f"Failed to update candidate: {str(e)}")


async def delete_candidate(candidate_id: str):
    try:
        await db.database.candidates.delete_one({"_id": ObjectId(candidate_id)})
        return True
    except Exception as e:
        raise Exception(f"Failed to delete candidate: {str(e)}")


async def update_candidate_activity(candidate_id: str):
    try:
        await db.database.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {
                "$set": {"last_activity": datetime.utcnow()},
                "$inc": {"interview_count": 1}
            }
        )
        return True
    except Exception as e:
        raise Exception(f"Failed to update candidate activity: {str(e)}")