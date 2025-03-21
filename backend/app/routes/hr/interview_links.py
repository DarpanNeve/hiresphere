from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging
from app.core.auth import get_current_user
from app.schemas.interview_link import InterviewLink, InterviewLinkCreate, InterviewLinkUpdate, PublicInterviewStart, \
    PublicInterviewComplete
from app.schemas.user import User
from app.services.interview_link import (
    create_interview_link, get_interview_links, get_interview_link,
    update_interview_link, delete_interview_link, resend_interview_email,
    validate_interview_link, start_public_interview, complete_public_interview
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
public_router = APIRouter()


@router.post("/", response_model=InterviewLink)
async def create_link(
        link_in: InterviewLinkCreate,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Creating new interview link for HR user {current_user.id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        link = await create_interview_link(link_in, str(current_user.id))

        # Convert ObjectId to string before returning
        link["_id"] = str(link["_id"])
        link["hr_id"] = str(link["hr_id"])

        logger.info(f"Created interview link with ID: {link['_id']}")
        return link
    except Exception as e:
        logger.error(f"Failed to create interview link: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create interview link: {str(e)}"
        )


@router.get("/", response_model=List[InterviewLink])
async def list_links(current_user: User = Depends(get_current_user)):
    try:
        logger.info(f"Fetching interview links for HR user {current_user.id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        links = await get_interview_links(str(current_user.id))

        # Convert ObjectId to string for each link
        for link in links:
            link["_id"] = str(link["_id"])
            link["hr_id"] = str(link["hr_id"])

        logger.info(f"Found {len(links)} interview links")
        return links
    except Exception as e:
        logger.error(f"Failed to fetch interview links: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch interview links: {str(e)}"
        )


@router.get("/{link_id}", response_model=InterviewLink)
async def get_link_details(
        link_id: str,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Fetching interview link details for ID: {link_id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        link = await get_interview_link(link_id)
        if not link:
            logger.error(f"Interview link not found: {link_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview link not found"
            )

        # Check if link belongs to this HR user
        if str(link["hr_id"]) != str(current_user.id):
            logger.error(f"Unauthorized access attempt by HR user {current_user.id} for link {link_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this interview link"
            )

        # Convert ObjectId to string
        link["_id"] = str(link["_id"])
        link["hr_id"] = str(link["hr_id"])

        logger.info(f"Successfully retrieved interview link details for ID: {link_id}")
        return link
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to fetch interview link details: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch interview link details: {str(e)}"
        )


@router.delete("/{link_id}")
async def remove_link(
        link_id: str,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Deleting interview link {link_id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Check if link exists and belongs to this HR user
        existing_link = await get_interview_link(link_id)
        if not existing_link:
            logger.error(f"Interview link not found: {link_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview link not found"
            )

        if str(existing_link["hr_id"]) != str(current_user.id):
            logger.error(f"Unauthorized access attempt by HR user {current_user.id} for link {link_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this interview link"
            )

        await delete_interview_link(link_id)
        logger.info(f"Successfully deleted interview link {link_id}")

        return {"message": "Interview link deleted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to delete interview link: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete interview link: {str(e)}"
        )


@router.post("/{link_id}/resend")
async def resend_email(
        link_id: str,
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"Resending email for interview link {link_id}")

        # Check if user has HR role
        if not hasattr(current_user, 'role') or current_user.role not in ['hr', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this resource"
            )

        # Check if link exists and belongs to this HR user
        existing_link = await get_interview_link(link_id)
        if not existing_link:
            logger.error(f"Interview link not found: {link_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview link not found"
            )

        if str(existing_link["hr_id"]) != str(current_user.id):
            logger.error(f"Unauthorized access attempt by HR user {current_user.id} for link {link_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to resend email for this interview link"
            )

        updated_link = await resend_interview_email(link_id)

        # Convert ObjectId to string
        updated_link["_id"] = str(updated_link["_id"])
        updated_link["hr_id"] = str(updated_link["hr_id"])

        logger.info(f"Successfully resent email for interview link {link_id}")

        return {"message": "Email sent successfully", "sent_count": updated_link["sent_count"]}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to resend email: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend email: {str(e)}"
        )


# Public interview routes (no authentication required)
@public_router.get("/{token}/validate")
async def validate_link(token: str):
    try:
        logger.info(f"Validating interview link with token: {token}")

        link_data = await validate_interview_link(token)
        if not link_data:
            logger.error(f"Invalid interview link token: {token}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid interview link"
            )

        logger.info(f"Successfully validated interview link with token: {token}")
        return link_data
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to validate interview link: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate interview link: {str(e)}"
        )


@public_router.post("/{token}/start")
async def start_interview(token: str, candidate_info: PublicInterviewStart):
    try:
        logger.info(f"Starting public interview with token: {token}")

        result = await start_public_interview(token, candidate_info)
        logger.info(f"Successfully started public interview with token: {token}")

        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to start public interview: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start public interview: {str(e)}"
        )


@public_router.post("/{token}/complete")
async def complete_interview(token: str, data: PublicInterviewComplete):
    try:
        logger.info(f"Completing public interview with token: {token}")

        result = await complete_public_interview(token, data)
        logger.info(f"Successfully completed public interview with token: {token}")

        return {"message": "Interview completed successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to complete public interview: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete public interview: {str(e)}"
        )