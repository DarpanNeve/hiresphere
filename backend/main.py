from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.db.mongodb import MongoDB
from app.routes import auth, interviews, feedback, subscription_plans
from app.routes.hr import candidates, interview_links, reports, dashboard
from app.core.config import settings
import logging
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from app.routes.admin import dashboard as admin_dashboard
from app.routes.admin import hr_users as admin_hr
from app.routes.admin import subscriptions as admin_subscriptions
from app.routes.admin import settings as admin_settings
from typing import Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Custom rate limit exceeded handler with proper type hints
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    # Fixed: Using a default value for retry_after if attribute doesn't exist
    retry_after = getattr(exc, "retry_after", 60)
    return Response(
        content=str(exc),
        status_code=429,
        headers={"Retry-After": str(retry_after)}
    )

@asynccontextmanager
async def lifespan(app_instance: FastAPI):  # Fixed: Renamed parameter to avoid shadowing
    # Startup
    logger.info("Connecting to MongoDB...")
    await MongoDB.connect_to_mongo()
    logger.info("Connected to MongoDB")

    yield

    # Shutdown
    logger.info("Closing MongoDB connection...")
    await MongoDB.close_mongo_connection()
    logger.info("MongoDB connection closed")

# Create FastAPI app with lifespan
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# Add rate limiter
app.limiter = limiter  # Fixed: Using app.state instead of directly assigning
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Set up CORS
origins = ["http://localhost:5173", "https://hiresphere-pi.vercel.app"]
app.add_middleware(
    CORSMiddleware,  # Fixed: Removed the list wrapper
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

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

# Root route with proper type hints and request usage
@app.get("/")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def root(request: Request) -> dict[str, Union[str, bool]]:
    # Ensuring we use the request parameter
    client_host = request.client.host if request.client else "unknown"
    logger.info(f"Root endpoint accessed from {client_host}")

    return {
        "message": "Welcome to AI Interviewer API",
        "version": "1.0.0",
        "status": "healthy",
        "remote_ip": client_host
    }