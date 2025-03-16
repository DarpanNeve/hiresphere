from typing import Optional
from datetime import datetime
from bson import ObjectId
from app.db.mongodb import db
from app.schemas.user import User
from app.core.security import get_password_hash


async def get_user_by_email(email: str) -> Optional[User]:
    """Get a user by their email address."""
    try:
        user_data = await db.database.users.find_one({"email": email})
        if user_data:
            return User.from_db(user_data)
        return None
    except Exception as e:
        raise Exception(f"Failed to fetch user by email: {str(e)}")


async def create_user(user_in: dict) -> User:
    """Create a new user."""
    try:
        # Check if user already exists
        existing_user = await get_user_by_email(user_in["email"])
        if existing_user:
            raise ValueError("Email already registered")

        # Create user data
        user_data = {
            "email": user_in["email"],
            "hashed_password": get_password_hash(user_in["password"]),
            "full_name": user_in.get("full_name"),
            "role": user_in.get("role", "candidate"),
            "organization_id": ObjectId(user_in["organization_id"]) if user_in.get("organization_id") else None,
            "created_by": ObjectId(user_in["created_by"]) if user_in.get("created_by") else None,
            "status": "active",
            "company_name": user_in.get("company_name"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # Insert into database
        result = await db.database.users.insert_one(user_data)
        user_data["_id"] = result.inserted_id

        return User.from_db(user_data)
    except Exception as e:
        raise Exception(f"Failed to create user: {str(e)}")


async def update_user(user_id: str, user_data: dict) -> Optional[User]:
    """Update a user's information."""
    try:
        # Handle password update
        if "password" in user_data:
            user_data["hashed_password"] = get_password_hash(user_data.pop("password"))

        user_data["updated_at"] = datetime.utcnow()

        # Update user
        result = await db.database.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": user_data},
            return_document=True
        )

        if result:
            return User.from_db(result)
        return None
    except Exception as e:
        raise Exception(f"Failed to update user: {str(e)}")


async def get_user_by_id(user_id: str) -> Optional[User]:
    """Get a user by their ID."""
    try:
        user_data = await db.database.users.find_one({"_id": ObjectId(user_id)})
        if user_data:
            return User.from_db(user_data)
        return None
    except Exception as e:
        raise Exception(f"Failed to fetch user by ID: {str(e)}")


async def delete_user(user_id: str) -> bool:
    """Delete a user."""
    try:
        result = await db.database.users.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0
    except Exception as e:
        raise Exception(f"Failed to delete user: {str(e)}")


async def get_organization_users(organization_id: str, role: Optional[str] = None) -> list[User]:
    """Get all users in an organization, optionally filtered by role."""
    try:
        query = {"organization_id": ObjectId(organization_id)}
        if role:
            query["role"] = role

        cursor = db.database.users.find(query)
        users = []
        async for user_data in cursor:
            users.append(User.from_db(user_data))
        return users
    except Exception as e:
        raise Exception(f"Failed to fetch organization users: {str(e)}")