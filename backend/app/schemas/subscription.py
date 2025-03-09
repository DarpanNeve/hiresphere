from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId

class SubscriptionPlan(str, Enum):
    TRIAL = "trial"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"

class SubscriptionFeatures(BaseModel):
    max_hr_accounts: int
    max_interviews: int
    max_candidates: int
    custom_branding: bool = False
    api_access: bool = False
    priority_support: bool = False

class PaymentMethodUpdate(BaseModel):
    type: str
    card_number: str
    expiry_month: str
    expiry_year: str
    cvc: str
    cardholder_name: str

class SubscriptionCreate(BaseModel):
    plan: SubscriptionPlan
    payment_method: Optional[Dict[str, Any]] = None

class SubscriptionUpdate(BaseModel):
    plan: Optional[SubscriptionPlan] = None
    status: Optional[SubscriptionStatus] = None
    features: Optional[SubscriptionFeatures] = None
    end_date: Optional[datetime] = None
    payment_method: Optional[Dict[str, Any]] = None

class Subscription(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    plan: SubscriptionPlan
    status: SubscriptionStatus
    features: SubscriptionFeatures
    start_date: datetime
    end_date: datetime
    payment_method: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
        arbitrary_types_allowed = True