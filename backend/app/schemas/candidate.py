from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from pydantic_core import core_schema
from typing import Any

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


class CandidateBase(BaseModel):
    name: str
    email: EmailStr
    position: str
    status: Optional[str] = "pending"

class CandidateCreate(CandidateBase):
    pass

class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    position: Optional[str] = None
    status: Optional[str] = None

class Candidate(CandidateBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    interview_count: int = 0
    last_activity: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    hr_id: PyObjectId

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
        arbitrary_types_allowed = True
        from_attributes = True