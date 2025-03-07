from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.routes import auth, interviews, feedback
from app.routes.hr import candidates, interview_links, reports, subscription
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.PROJECT_NAME)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection events
@app.on_event("startup")
async def startup_db_client():
    logger.info("Connecting to MongoDB...")
    await connect_to_mongo()
    logger.info("Connected to MongoDB")

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Closing MongoDB connection...")
    await close_mongo_connection()
    logger.info("MongoDB connection closed")

# Include routers
app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_STR}/auth",
    tags=["authentication"]
)

app.include_router(
    interviews.router,
    prefix=f"{settings.API_V1_STR}/interviews",
    tags=["interviews"]
)

app.include_router(
    feedback.router,
    prefix=f"{settings.API_V1_STR}/feedback",
    tags=["feedback"]
)

# HR routes
app.include_router(
    candidates.router,
    prefix=f"{settings.API_V1_STR}/hr/candidates",
    tags=["hr", "candidates"]
)

app.include_router(
    interview_links.router,
    prefix=f"{settings.API_V1_STR}/hr/interview-links",
    tags=["hr", "interview-links"]
)

app.include_router(
    reports.router,
    prefix=f"{settings.API_V1_STR}/hr/reports",
    tags=["hr", "reports"]
)

app.include_router(
    subscription.router,
    prefix=f"{settings.API_V1_STR}/hr/subscription",
    tags=["hr", "subscription"]
)

# Public interview routes
app.include_router(
    interview_links.public_router,
    prefix=f"{settings.API_V1_STR}/public/interview",
    tags=["public", "interview"]
)

@app.get("/")
async def root():
    return {"message": "Welcome to AI Interviewer API"}