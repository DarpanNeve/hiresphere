from datetime import datetime
from bson import ObjectId

class Candidate:
    def __init__(
        self,
        id: ObjectId,
        name: str,
        email: str,
        position: str,
        status: str = "pending",
        interview_count: int = 0,
        last_activity: datetime = None,
        created_at: datetime = None,
        updated_at: datetime = None,
        hr_id: ObjectId = None
    ):
        self.id = id
        self.name = name
        self.email = email
        self.position = position
        self.status = status
        self.interview_count = interview_count
        self.last_activity = last_activity
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.hr_id = hr_id

    @classmethod
    def from_db(cls, data: dict):
        if data is None:
            return None
        return cls(
            id=data["_id"],
            name=data["name"],
            email=data["email"],
            position=data["position"],
            status=data.get("status", "pending"),
            interview_count=data.get("interview_count", 0),
            last_activity=data.get("last_activity"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            hr_id=data.get("hr_id")
        )

    def to_db(self) -> dict:
        return {
            "name": self.name,
            "email": self.email,
            "position": self.position,
            "status": self.status,
            "interview_count": self.interview_count,
            "last_activity": self.last_activity,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "hr_id": self.hr_id
        }