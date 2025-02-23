from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InterviewBase(BaseModel):
    topic: str
    duration: Optional[int] = None
    knowledge_score: Optional[float] = None
    communication_score: Optional[float] = None
    confidence_score: Optional[float] = None
    feedback: Optional[str] = None

class InterviewCreate(InterviewBase):
    pass

class InterviewUpdate(InterviewBase):
    pass

class Interview(InterviewBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True