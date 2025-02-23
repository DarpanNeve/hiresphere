from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from app.db.base_class import Base

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    topic = Column(String, nullable=False)
    duration = Column(Integer)  # in seconds
    knowledge_score = Column(Float)
    communication_score = Column(Float)
    confidence_score = Column(Float)
    feedback = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())