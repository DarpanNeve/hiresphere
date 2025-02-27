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
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await db.database.users.insert_one(user_data)
    user_data["_id"] = str(result.inserted_id)
    return User.model_validate(user_data)