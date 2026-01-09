import aiosmtplib
from email.message import EmailMessage
import os
from app.db.mongodb import db

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "your_email@gmail.com")
SMTP_PASS = os.getenv("SMTP_PASS", "your_email_password")

async def send_email(to_email: str, subject: str, body: str):
    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)
    await aiosmtplib.send(
        message,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASS,
        start_tls=True,
    )

async def notify_user_by_email(user_id: str, subject: str, body: str):
    user = await db["users"].find_one({"id": user_id})
    if user and "email" in user:
        await send_email(user["email"], subject, body)
