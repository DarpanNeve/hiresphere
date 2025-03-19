from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler) -> ObjectId:
        if not isinstance(v, (str, ObjectId)):
            raise TypeError('ObjectId required')
        if not ObjectId.is_valid(str(v)):
            raise ValueError("Invalid ObjectId")
        return ObjectId(str(v))

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema: dict[str, Any]) -> dict[str, Any]:
        field_schema.update(type="string")
        return field_schema


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "candidate"  # Default role
    organization_id: Optional[str] = None
    created_by: Optional[str] = None
    status: Optional[str] = "active"
    company_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(UserBase):
    password: Optional[str] = None


class UserInDBBase(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    hashed_password: str

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
        arbitrary_types_allowed = True
        from_attributes = True

    @classmethod
    def from_db(cls, data: dict):
        if data is None:
            return None
        # Convert ObjectId to string for _id field
        if "_id" in data:
            data["_id"] = PyObjectId(data["_id"])
        if "organization_id" in data and data["organization_id"]:
            data["organization_id"] = str(data["organization_id"])
        if "created_by" in data and data["created_by"]:
            data["created_by"] = str(data["created_by"])
        return cls(**data)


class User(UserInDBBase):
    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
        arbitrary_types_allowed = True
        from_attributes = True