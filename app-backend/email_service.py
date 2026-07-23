import smtplib
from email.mime.text import MIMEText
import os

def send_email(to_email: str, subject: str, body: str):
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = os.getenv("SMTP_USERNAME")
    msg["To"] = to_email

    with smtplib.SMTP_SSL(os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT"))) as server:
        server.login(os.getenv("SMTP_USERNAME"), os.getenv("SMTP_APP_PASSWORD"))
        server.send_message(msg)