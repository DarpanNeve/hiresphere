from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.routes import auth, interviews, feedback, subscription_plans
from app.routes.hr import candidates, interview_links, reports, dashboard
from app.core.config import settings
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from app.routes.admin import dashboard as admin_dashboard
from app.routes.admin import hr_users as admin_hr
from app.routes.admin import subscriptions as admin_subscriptions
from app.routes.admin import settings as admin_settings

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
    allow_origins=["http://localhost:5173", "https://hiresphere-pi.vercel.app"],
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

# Public routes
app.include_router(
    subscription_plans.router,
    prefix=f"{settings.API_V1_STR}/subscription-plans",
    tags=["subscription-plans"]
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
    dashboard.router,
    prefix=f"{settings.API_V1_STR}/hr/dashboard",
    tags=["hr", "dashboard"]
)

# Admin routes
app.include_router(
    admin_dashboard.router,
    prefix=f"{settings.API_V1_STR}/admin/dashboard",
    tags=["admin", "dashboard"]
)

app.include_router(
    admin_hr.router,
    prefix=f"{settings.API_V1_STR}/admin/hr-users",
    tags=["admin", "hr-management"]
)

app.include_router(
    admin_subscriptions.router,
    prefix=f"{settings.API_V1_STR}/admin/subscriptions",
    tags=["admin", "subscriptions"]
)

app.include_router(
    admin_settings.router,
    prefix=f"{settings.API_V1_STR}/admin/settings",
    tags=["admin", "settings"]
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
async def root(request: Request):
    return {
        "message": "Welcome to AI Interviewer API",
        "version": "1.0.0",
        "status": "healthy"
    }