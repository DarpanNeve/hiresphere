from datetime import datetime, timedelta
from bson import ObjectId
from app.db.mongodb import db
from typing import List, Dict, Any


async def get_hr_reports(hr_id: str, date_range: str, position: str, status: str):
    try:
        # Calculate date filter based on date_range
        date_filter = None
        now = datetime.utcnow()

        if date_range == "7days":
            date_filter = now - timedelta(days=7)
        elif date_range == "30days":
            date_filter = now - timedelta(days=30)
        elif date_range == "90days":
            date_filter = now - timedelta(days=90)

        # Build query
        query = {"hr_id": ObjectId(hr_id)}

        if date_filter:
            query["created_at"] = {"$gte": date_filter}

        if position != "all":
            query["position"] = position

        if status != "all":
            if status == "completed":
                query["completed"] = True
            elif status == "pending":
                query["completed"] = False
                query["expires_at"] = {"$gte": now}
            elif status == "expired":
                query["completed"] = False
                query["expires_at"] = {"$lt": now}

        # Get interview links
        cursor = db.database.interview_links.find(query).sort("created_at", -1)
        links = []

        async for link in cursor:
            # For each link, get the associated interview if it exists
            interview = None
            if link.get("completed"):
                interview = await db.database.interviews.find_one({"link_id": link["_id"]})

            # Format the report data
            report = {
                "id": str(link["_id"]),
                "candidateName": link["candidate_name"],
                "position": link["position"],
                "date": link["created_at"],
                "duration": interview.get("duration") if interview else None,
                "scores": {
                    "knowledge": interview.get("knowledge_score") if interview else None,
                    "communication": interview.get("communication_score") if interview else None,
                    "confidence": interview.get("confidence_score") if interview else None
                } if interview else None,
                "status": "completed" if link.get("completed") else "expired" if link["expires_at"] < now else "pending"
            }

            links.append(report)

        return links
    except Exception as e:
        raise Exception(f"Failed to fetch HR reports: {str(e)}")


async def get_report_stats(hr_id: str, date_range: str, position: str, status: str):
    try:
        # Get the reports first
        reports = await get_hr_reports(hr_id, date_range, position, status)

        # Calculate stats
        total_interviews = len(reports)
        completed_interviews = sum(1 for r in reports if r["status"] == "completed")

        # Calculate average scores
        knowledge_scores = [r["scores"]["knowledge"] for r in reports if r["scores"] and r["scores"]["knowledge"]]
        communication_scores = [r["scores"]["communication"] for r in reports if
                                r["scores"] and r["scores"]["communication"]]
        confidence_scores = [r["scores"]["confidence"] for r in reports if r["scores"] and r["scores"]["confidence"]]

        avg_knowledge = sum(knowledge_scores) / len(knowledge_scores) if knowledge_scores else 0
        avg_communication = sum(communication_scores) / len(communication_scores) if communication_scores else 0
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0

        # Calculate completion rate
        completion_rate = (completed_interviews / total_interviews * 100) if total_interviews > 0 else 0

        # Get position breakdown
        position_counts = {}
        for report in reports:
            pos = report["position"]
            position_counts[pos] = position_counts.get(pos, 0) + 1

        position_breakdown = [
            {"position": pos, "count": count}
            for pos, count in position_counts.items()
        ]

        return {
            "totalInterviews": total_interviews,
            "averageScores": {
                "knowledge": round(avg_knowledge, 1),
                "communication": round(avg_communication, 1),
                "confidence": round(avg_confidence, 1)
            },
            "completionRate": round(completion_rate, 1),
            "positionBreakdown": position_breakdown
        }
    except Exception as e:
        raise Exception(f"Failed to fetch report stats: {str(e)}")