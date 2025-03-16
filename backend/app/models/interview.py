from datetime import datetime
from bson import ObjectId

class Interview:
    def __init__(
            self,
            id: ObjectId,
            user_id: ObjectId,
            topic: str,
            duration: int = None,
            knowledge_score: float = None,
            communication_score: float = None,
            confidence_score: float = None,
            feedback: str = None,
            body_language_analysis: dict = None,
            created_at: datetime = None
    ):
        self.id = id
        self.user_id = user_id
        self.topic = topic
        self.duration = duration
        self.knowledge_score = knowledge_score
        self.communication_score = communication_score
        self.confidence_score = confidence_score
        self.feedback = feedback
        self.body_language_analysis = body_language_analysis or {}
        self.created_at = created_at or datetime.utcnow()

    @classmethod
    def from_db(cls, data: dict):
        if data is None:
            return None
        return cls(
            id=data["_id"],
            user_id=data["user_id"],
            topic=data["topic"],
            duration=data.get("duration"),
            knowledge_score=data.get("knowledge_score"),
            communication_score=data.get("communication_score"),
            confidence_score=data.get("confidence_score"),
            feedback=data.get("feedback"),
            body_language_analysis=data.get("body_language_analysis", {}),
            created_at=data.get("created_at")
        )

    def to_db(self) -> dict:
        return {
            "user_id": self.user_id,
            "topic": self.topic,
            "duration": self.duration,
            "knowledge_score": self.knowledge_score,
            "communication_score": self.communication_score,
            "confidence_score": self.confidence_score,
            "feedback": self.feedback,
            "body_language_analysis": self.body_language_analysis,
            "created_at": self.created_at
        }

    def update_body_language_analysis(self, analysis: dict):
        """Update the body language analysis data"""
        if not self.body_language_analysis:
            self.body_language_analysis = {}

        # Merge new analysis with existing data
        self.body_language_analysis.update({
            "expressions": analysis.get("expressions", {}),
            "posture": analysis.get("posture", {}),
            "confidence": analysis.get("confidence", {}),
            "updated_at": datetime.utcnow()
        })

        # Calculate average confidence score
        confidence_scores = [
            score for score in [
                analysis.get("confidence", {}).get("overall", 0),
                self.confidence_score
            ] if score is not None
        ]

        if confidence_scores:
            self.confidence_score = sum(confidence_scores) / len(confidence_scores)