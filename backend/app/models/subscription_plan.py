from datetime import datetime
from bson import ObjectId

class SubscriptionPlan:
    def __init__(
        self,
        id: ObjectId,
        name: str,
        price: float,
        billing_period: str = "monthly",
        features: list[str] = None,
        max_hr_accounts: int = 1,
        max_interviews: int = 10,
        max_candidates: int = 20,
        is_popular: bool = False,
        created_at: datetime = None,
        updated_at: datetime = None
    ):
        self.id = id
        self.name = name
        self.price = price
        self.billing_period = billing_period
        self.features = features or []
        self.max_hr_accounts = max_hr_accounts
        self.max_interviews = max_interviews
        self.max_candidates = max_candidates
        self.is_popular = is_popular
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def from_db(cls, data: dict):
        if data is None:
            return None
        return cls(
            id=data["_id"],
            name=data["name"],
            price=data["price"],
            billing_period=data.get("billing_period", "monthly"),
            features=data.get("features", []),
            max_hr_accounts=data.get("max_hr_accounts", 1),
            max_interviews=data.get("max_interviews", 10),
            max_candidates=data.get("max_candidates", 20),
            is_popular=data.get("is_popular", False),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )

    def to_db(self) -> dict:
        return {
            "name": self.name,
            "price": self.price,
            "billing_period": self.billing_period,
            "features": self.features,
            "max_hr_accounts": self.max_hr_accounts,
            "max_interviews": self.max_interviews,
            "max_candidates": self.max_candidates,
            "is_popular": self.is_popular,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }