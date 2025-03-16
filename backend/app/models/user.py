from datetime import datetime
from bson import ObjectId
from typing import Optional, List, Dict

class User:
    def __init__(
        self,
        id: ObjectId,
        email: str,
        hashed_password: str,
        full_name: str = None,
        role: str = "candidate",  # candidate, admin, hr
        organization_id: ObjectId = None,  # Reference to organization
        created_by: ObjectId = None,  # Reference to admin who created this user
        status: str = "active",
        company_name: str = None,
        # Public profile fields
        headline: str = None,
        bio: str = None,
        skills: List[str] = None,
        experience: List[Dict] = None,
        education: List[Dict] = None,
        profile_visibility: str = "private",  # private, public, organization
        created_at: datetime = None,
        updated_at: datetime = None
    ):
        self.id = id
        self.email = email
        self.hashed_password = hashed_password
        self.full_name = full_name
        self.role = role
        self.organization_id = organization_id
        self.created_by = created_by
        self.status = status
        self.company_name = company_name
        self.headline = headline
        self.bio = bio
        self.skills = skills or []
        self.experience = experience or []
        self.education = education or []
        self.profile_visibility = profile_visibility
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @classmethod
    def from_db(cls, data: dict):
        if data is None:
            return None
        return cls(
            id=data["_id"],
            email=data["email"],
            hashed_password=data["hashed_password"],
            full_name=data.get("full_name"),
            role=data.get("role", "candidate"),
            organization_id=data.get("organization_id"),
            created_by=data.get("created_by"),
            status=data.get("status", "active"),
            company_name=data.get("company_name"),
            headline=data.get("headline"),
            bio=data.get("bio"),
            skills=data.get("skills", []),
            experience=data.get("experience", []),
            education=data.get("education", []),
            profile_visibility=data.get("profile_visibility", "private"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )

    def to_db(self) -> dict:
        return {
            "email": self.email,
            "hashed_password": self.hashed_password,
            "full_name": self.full_name,
            "role": self.role,
            "organization_id": self.organization_id,
            "created_by": self.created_by,
            "status": self.status,
            "company_name": self.company_name,
            "headline": self.headline,
            "bio": self.bio,
            "skills": self.skills,
            "experience": self.experience,
            "education": self.education,
            "profile_visibility": self.profile_visibility,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def is_admin(self) -> bool:
        return self.role == "admin"

    def is_hr(self) -> bool:
        return self.role == "hr"

    def is_candidate(self) -> bool:
        return self.role == "candidate"

    def to_public_profile(self) -> dict:
        """Return public profile data"""
        return {
            "id": str(self.id),
            "full_name": self.full_name,
            "headline": self.headline,
            "bio": self.bio,
            "skills": self.skills,
            "experience": self.experience,
            "education": self.education,
            "profile_visibility": self.profile_visibility
        }