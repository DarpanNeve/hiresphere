from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pydantic_core import core_schema
from enum import Enum

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls,
        _source_type: Any,
        _handler: Any,
    ) -> core_schema.CoreSchema:
        return core_schema.str_schema(
            pattern=r'^[0-9a-f]{24}$',
            serialization=core_schema.plain_serializer_function_ser_schema(lambda x: str(x))
        )

class SubscriptionPlan(str, Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"

class SubscriptionBase(BaseModel):
    plan: SubscriptionPlan
    status: SubscriptionStatus
    start_date: datetime
    end_date: datetime

class SubscriptionCreate(BaseModel):
    plan: SubscriptionPlan
    payment_method: Dict[str, Any] = {}

class SubscriptionUpdate(BaseModel):
    plan: Optional[SubscriptionPlan] = None
    status: Optional[SubscriptionStatus] = None
    end_date: Optional[datetime] = None
    payment_method: Optional[Dict[str, Any]] = None

class Subscription(SubscriptionBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    payment_method: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime
    days_remaining: int = 0

    model_config = {
        "json_encoders": {PyObjectId: str},
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "from_attributes": True
    }

class PaymentMethodUpdate(BaseModel):
    type: str
    card_number: str
    expiry_month: int
    expiry_year: int
    cvc: str
    cardholder_name: str