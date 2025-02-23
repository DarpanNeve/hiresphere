from sqlalchemy.orm import Session
from app.models.interview import Interview
from app.schemas.interview import InterviewCreate
from app.db.session import get_db

async def create_interview(interview_in: InterviewCreate, user_id: int, db: Session = next(get_db())):
    interview = Interview(
        user_id=user_id,
        topic=interview_in.topic,
        duration=interview_in.duration,
        knowledge_score=interview_in.knowledge_score,
        communication_score=interview_in.communication_score,
        confidence_score=interview_in.confidence_score,
        feedback=interview_in.feedback
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview

async def get_user_interviews(user_id: int, db: Session = next(get_db())):
    return db.query(Interview).filter(Interview.user_id == user_id).order_by(Interview.created_at.desc()).all()

async def get_interview(interview_id: int, db: Session = next(get_db())):
    return db.query(Interview).filter(Interview.id == interview_id).first()