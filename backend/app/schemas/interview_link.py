from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, Any
from datetime import datetime
from bson import ObjectId
from pydantic_core import core_schema

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

class InterviewLinkBase(BaseModel):
    candidate_name: str = Field(..., min_length=1)
    candidate_email: EmailStr
    position: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1)

class InterviewLinkCreate(InterviewLinkBase):
    expires_in: int = Field(default=7, ge=1, le=30)  # Days, between 1 and 30

class InterviewLinkUpdate(BaseModel):
    candidate_name: Optional[str] = Field(None, min_length=1)
    candidate_email: Optional[EmailStr] = None
    position: Optional[str] = Field(None, min_length=1)
    topic: Optional[str] = Field(None, min_length=1)
    expires_at: Optional[datetime] = None

class InterviewLink(InterviewLinkBase):
    id: str = Field(alias="_id")  # Changed from PyObjectId to str
    token: str
    expires_at: datetime
    completed: bool = False
    sent_count: int = 0
    created_at: datetime
    updated_at: datetime
    hr_id: str  # Changed from PyObjectId to str
    url: str = ""
    is_expired: bool = False

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
        arbitrary_types_allowed = True
        from_attributes = True

class PublicInterviewStart(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr

class PublicInterviewResponse(BaseModel):
    question: str = Field(..., min_length=1)
    response: str = Field(..., min_length=1)

class PublicInterviewComplete(BaseModel):
    candidateInfo: dict
    responses: list[dict]