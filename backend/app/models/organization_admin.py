from datetime import datetime
from bson import ObjectId

class OrganizationAdmin:
    def __init__(
        self,
        id: ObjectId,
        organization_id: ObjectId,
        user_id: ObjectId,
        is_primary: bool = False,
        created_at: datetime = None,
        updated_at: datetime = None
    ):
        self.id = id
        self.organization_id = organization_id
        self.user_id = user_id
        self.is_primary = is_primary
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def from_db(cls, data: dict):
        if data is None:
            return None
        return cls(
            id=data["_id"],
            organization_id=data["organization_id"],
            user_id=data["user_id"],
            is_primary=data.get("is_primary", False),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )

    def to_db(self) -> dict:
        return {
            "organization_id": self.organization_id,
            "user_id": self.user_id,
            "is_primary": self.is_primary,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }