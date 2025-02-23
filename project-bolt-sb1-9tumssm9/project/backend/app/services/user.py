from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.auth import get_password_hash
from app.db.session import get_db

async def get_user_by_email(email: str, db: Session = next(get_db())):
    return db.query(User).filter(User.email == email).first()

async def create_user(user_in: UserCreate, db: Session = next(get_db())):
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user