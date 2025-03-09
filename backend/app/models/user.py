from datetime import datetime
from bson import ObjectId

class User:
    def __init__(
        self,
        id: ObjectId,
        email: str,
        hashed_password: str,
        full_name: str = None,
        created_at: datetime = None,
        updated_at: datetime = None
    ):
        self.id = id
        self.email = email
        self.hashed_password = hashed_password
        self.full_name = full_name
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def from_db(cls, data: dict):
        if data is None:
            return None
        return cls(
            id=data["_id"],
            email=data["email"],
            hashed_password=data["hashed_password"],
            full_name=data.get("full_name"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )

    def to_db(self) -> dict:
        return {
            "email": self.email,
            "hashed_password": self.hashed_password,
            "full_name": self.full_name,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }