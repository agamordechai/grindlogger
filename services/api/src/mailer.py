"""Outgoing email via SMTP (Gmail with an app password).

Sending is synchronous; callers schedule it with FastAPI ``BackgroundTasks`` so requests don't wait on SMTP.
If SMTP isn't configured, the message is logged instead (dev and tests).
"""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from services.api.src.database.config import get_settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, text: str) -> bool:
    """Send a plain-text email. Returns True if handed to the SMTP server."""
    settings = get_settings()
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP not configured; email to %s not sent. Subject: %s\n%s", to, subject, text)
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
    except (smtplib.SMTPException, OSError):
        logger.exception("Failed to send email to %s", to)
        return False
    return True


def send_verification_email(to: str, name: str, token: str) -> bool:
    """Email the address-verification link."""
    link = f"{get_settings().public_url.rstrip('/')}/auth/verify?token={token}"
    return send_email(
        to,
        "Verify your GrindLogger email",
        f"Hi {name},\n\nConfirm your email address to finish setting up GrindLogger:\n{link}\n\n"
        "This link expires in 24 hours. If you didn't create an account, ignore this email.\n",
    )


def send_password_reset_email(to: str, name: str, token: str) -> bool:
    """Email the password-reset link."""
    link = f"{get_settings().public_url.rstrip('/')}/auth/reset?token={token}"
    return send_email(
        to,
        "Reset your GrindLogger password",
        f"Hi {name},\n\nSomeone asked to reset your GrindLogger password. Set a new one here:\n{link}\n\n"
        "This link expires in 1 hour. If this wasn't you, ignore this email; your password is unchanged.\n",
    )
