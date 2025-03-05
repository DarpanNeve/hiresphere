from typing import Optional
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import db
from app.schemas.user import UserCreate, User
from app.core.security import get_password_hash


async def get_user_by_email(email: str) -> Optional[User]:
    user = await db.database.users.find_one({"email": email})
    if user:
        # Convert _id to string to match Pydantic model expectations
        user["_id"] = str(user["_id"])
        return User.model_validate(user)
    return None


async def create_user(user_in: UserCreate) -> User:
    user_data = {
        "email": user_in.email,
        "hashed_password": get_password_hash(user_in.password),
        "full_name": user_in.full_name,
        "role": user_in.role,  # Include role in user data
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db.database.users.insert_one(user_data)
    user_data["_id"] = str(result.inserted_id)
    return User.model_validate(user_data)


async def update_user(user_id: str, user_in: dict) -> Optional[User]:
    user_data = {k: v for k, v in user_in.items() if v is not None}

    if "password" in user_data:
        user_data["hashed_password"] = get_password_hash(user_data.pop("password"))

    user_data["updated_at"] = datetime.utcnow()

    await db.database.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": user_data}
    )

    updated_user = await db.database.users.find_one({"_id": ObjectId(user_id)})
    if updated_user:
        updated_user["_id"] = str(updated_user["_id"])
        return User.model_validate(updated_user)
    return None


async def get_user_by_id(user_id: str) -> Optional[User]:
    user = await db.database.users.find_one({"_id": ObjectId(user_id)})
    if user:
        user["_id"] = str(user["_id"])
        return User.model_validate(user)
    return None


async def delete_user(user_id: str) -> bool:
    result = await db.database.users.delete_one({"_id": ObjectId(user_id)})
    return result.deleted_count > 0