import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


async def send_interview_email(
    candidate_email: str,
    candidate_name: str,
    interview_link: str,
    position: str,
    company_name: str = "AI Interviewer",
):
    try:
        # Create message
        msg = MIMEMultipart()
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = candidate_email
        msg["Subject"] = f"Your Interview Link for {position} at {company_name}"

        # Email body
        body = f"""
        Dear {candidate_name},

        You have been invited to complete an online interview for the {position} position at {company_name}.

        Please click the following link to start your interview:
        {interview_link}

        This link will expire in 7 days. Please complete your interview before then.

        Best regards,
        {company_name} Hiring Team
        """

        msg.attach(MIMEText(body, "plain"))

        # Connect to SMTP server and send email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Interview invitation email sent to {candidate_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send interview email: {str(e)}")
        return False
