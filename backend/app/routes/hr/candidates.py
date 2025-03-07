from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging
from app.core.auth import get_current_user
from app.schemas.candidate import Candidate, CandidateCreate, CandidateUpdate
from app.schemas.user import User
from app.services.candidate import create_candidate, get_candidates, get_candidate, update_candidate, delete_candidate

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=Candidate)
async def add_candidate(
        candidate_in: CandidateCreate,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Creating new candidate for HR user {current_user.id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        candidate = await create_candidate(candidate_in, str(current_user.id))
        logger.info(f"Created candidate with ID: {candidate['_id']}")

        return candidate
    except Exception as e:
        logger.error(f"Failed to create candidate: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create candidate: {str(e)}"
        )


@router.get("/", response_model=List[Candidate])
async def list_candidates(current_user: User = Depends(get_current_user)):
    try:
        logger.info(f"Fetching candidates for HR user {current_user.id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        candidates = await get_candidates(str(current_user.id))
        logger.info(f"Found {len(candidates)} candidates")

        return candidates
    except Exception as e:
        logger.error(f"Failed to fetch candidates: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch candidates: {str(e)}"
        )


@router.get("/{candidate_id}", response_model=Candidate)
async def get_candidate_details(
        candidate_id: str,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Fetching candidate details for ID: {candidate_id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        candidate = await get_candidate(candidate_id)
        if not candidate:
            logger.error(f"Candidate not found: {candidate_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )

        # Check if candidate belongs to this HR user
        if str(candidate["hr_id"]) != str(current_user.id):
            logger.error(f"Unauthorized access attempt by HR user {current_user.id} for candidate {candidate_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this candidate"
            )

        logger.info(f"Successfully retrieved candidate details for ID: {candidate_id}")
        return candidate
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to fetch candidate details: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch candidate details: {str(e)}"
        )


@router.put("/{candidate_id}", response_model=Candidate)
async def update_candidate_details(
        candidate_id: str,
        candidate_in: CandidateUpdate,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Updating candidate {candidate_id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Check if candidate exists and belongs to this HR user
        existing_candidate = await get_candidate(candidate_id)
        if not existing_candidate:
            logger.error(f"Candidate not found: {candidate_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )

        if str(existing_candidate["hr_id"]) != str(current_user.id):
            logger.error(f"Unauthorized access attempt by HR user {current_user.id} for candidate {candidate_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this candidate"
            )

        updated_candidate = await update_candidate(candidate_id, candidate_in)
        logger.info(f"Successfully updated candidate {candidate_id}")

        return updated_candidate
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to update candidate: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update candidate: {str(e)}"
        )


@router.delete("/{candidate_id}")
async def remove_candidate(
        candidate_id: str,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Deleting candidate {candidate_id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Check if candidate exists and belongs to this HR user
        existing_candidate = await get_candidate(candidate_id)
        if not existing_candidate:
            logger.error(f"Candidate not found: {candidate_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidate not found"
            )

        if str(existing_candidate["hr_id"]) != str(current_user.id):
            logger.error(f"Unauthorized access attempt by HR user {current_user.id} for candidate {candidate_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this candidate"
            )

        await delete_candidate(candidate_id)
        logger.info(f"Successfully deleted candidate {candidate_id}")

        return {"message": "Candidate deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to delete candidate: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete candidate: {str(e)}"
        )