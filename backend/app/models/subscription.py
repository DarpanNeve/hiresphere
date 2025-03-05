from datetime import datetime, timedelta
from bson import ObjectId
from enum import Enum


class SubscriptionPlan(str, Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"


class Subscription:
    def __init__(
            self,
            id: ObjectId,
            user_id: ObjectId,
            plan: SubscriptionPlan,
            status: SubscriptionStatus,
            start_date: datetime,
            end_date: datetime,
            payment_method: dict = None,
            created_at: datetime = None,
            updated_at: datetime = None
    ):
        self.id = id
        self.user_id = user_id
        self.plan = plan
        self.status = status
        self.start_date = start_date
        self.end_date = end_date
        self.payment_method = payment_method or {}
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def from_db(cls, data: dict):
        if data is None:
            return None
        return cls(
            id=data["_id"],
            user_id=data["user_id"],
            plan=data["plan"],
            status=data["status"],
            start_date=data["start_date"],
            end_date=data["end_date"],
            payment_method=data.get("payment_method", {}),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )

    def to_db(self) -> dict:
        return {
            "user_id": self.user_id,
            "plan": self.plan,
            "status": self.status,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "payment_method": self.payment_method,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def days_remaining(self) -> int:
        if self.status == SubscriptionStatus.EXPIRED:
            return 0

        days = (self.end_date - datetime.utcnow()).days
        return max(0, days)

    def is_active(self) -> bool:
        return (
                self.status in [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] and
                datetime.utcnow() < self.end_date
        )

    @staticmethod
    def create_trial(user_id: ObjectId) -> 'Subscription':
        now = datetime.utcnow()
        return Subscription(
            id=ObjectId(),
            user_id=user_id,
            plan=SubscriptionPlan.STARTER,
            status=SubscriptionStatus.TRIAL,
            start_date=now,
            end_date=now + timedelta(days=14),
            created_at=now,
            updated_at=now
        )