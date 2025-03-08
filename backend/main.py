from fastapi import FastAPI, Request  # Add Request here
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.routes import auth, interviews, feedback
from app.routes.hr import candidates, interview_links, reports, subscription, dashboard
from app.core.config import settings
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title=settings.PROJECT_NAME)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://hiresphere-pi.vercel.app"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

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

# Include routers with rate limiting
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

app.include_router(
    dashboard.router,
    prefix=f"{settings.API_V1_STR}/hr/dashboard",
    tags=["hr", "dashboard"]
)

# Public interview routes
app.include_router(
    interview_links.public_router,
    prefix=f"{settings.API_V1_STR}/public/interview",
    tags=["public", "interview"]
)

# Modified root route with request parameter for rate limiting
@app.get("/")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def root(request: Request):  # Add 'request: Request' here
    return {
        "message": "Welcome to AI Interviewer API",
        "version": "1.0.0",
        "status": "healthy"
    }
