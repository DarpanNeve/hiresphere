from datetime import datetime, timedelta
from bson import ObjectId
import secrets

class InterviewLink:
    def __init__(
        self,
        id: ObjectId,
        candidate_name: str,
        candidate_email: str,
        position: str,
        topic: str,
        hr_id: ObjectId,
        token: str = None,
        expires_at: datetime = None,
        completed: bool = False,
        sent_count: int = 0,
        created_at: datetime = None,
        updated_at: datetime = None
    ):
        self.id = id
        self.candidate_name = candidate_name
        self.candidate_email = candidate_email
        self.position = position
        self.topic = topic
        self.hr_id = hr_id
        self.token = token or secrets.token_urlsafe(16)
        self.expires_at = expires_at or (datetime.utcnow() + timedelta(days=7))
        self.completed = completed
        self.sent_count = sent_count
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def from_db(cls, data: dict):
        if data is None:
            return None
        return cls(
            id=data["_id"],
            candidate_name=data["candidate_name"],
            candidate_email=data["candidate_email"],
            position=data["position"],
            topic=data["topic"],
            hr_id=data["hr_id"],
            token=data.get("token"),
            expires_at=data.get("expires_at"),
            completed=data.get("completed", False),
            sent_count=data.get("sent_count", 0),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )

    def to_db(self) -> dict:
        return {
            "candidate_name": self.candidate_name,
            "candidate_email": self.candidate_email,
            "position": self.position,
            "topic": self.topic,
            "hr_id": self.hr_id,
            "token": self.token,
            "expires_at": self.expires_at,
            "completed": self.completed,
            "sent_count": self.sent_count,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def get_url(self, base_url: str = "https://ai-interviewer.com") -> str:
        return f"{base_url}/i/{self.token}"