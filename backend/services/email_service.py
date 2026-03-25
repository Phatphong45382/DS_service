import smtplib
import logging
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional

from ..config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def send_report(
        self,
        to_email: str,
        subject: str,
        report_text: str,
    ) -> dict:
        """Send AI-generated report.
        Uses Resend API if RESEND_API_KEY is set, otherwise falls back to Gmail SMTP.
        Returns {"ok": True} on success, {"ok": False, "error": "..."} on failure.
        """
        if settings.RESEND_API_KEY:
            return self._send_via_resend(to_email, subject, report_text)
        return self._send_via_smtp(to_email, subject, report_text)

    # ─── Resend API (for deployed environments) ───

    def _send_via_resend(self, to_email: str, subject: str, report_text: str) -> dict:
        try:
            html_body = self._build_html(subject, report_text)
            resp = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"Sales AI Report <{settings.RESEND_FROM}>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html_body,
                    "text": report_text,
                },
                timeout=15,
            )
            if resp.status_code == 200:
                logger.info(f"Report email sent via Resend to {to_email}")
                return {"ok": True}
            else:
                error_msg = resp.json().get("message", resp.text)
                logger.error(f"Resend API error: {resp.status_code} {error_msg}")
                return {"ok": False, "error": f"Resend API error: {error_msg}"}
        except Exception as e:
            logger.error(f"Resend send error: {e}", exc_info=True)
            return {"ok": False, "error": str(e)}

    # ─── Gmail SMTP (for local development) ───

    def _send_via_smtp(self, to_email: str, subject: str, report_text: str) -> dict:
        try:
            if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
                return {"ok": False, "error": "SMTP_USER or SMTP_PASSWORD not configured"}

            msg = MIMEMultipart("alternative")
            msg["From"] = f"Sales AI Report <{settings.SMTP_USER}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            msg.attach(MIMEText(report_text, "plain", "utf-8"))

            html_body = self._build_html(subject, report_text)
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

            logger.info(f"Report email sent via SMTP to {to_email}")
            return {"ok": True}
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP auth error: {e}", exc_info=True)
            return {"ok": False, "error": f"Gmail authentication failed: {e.smtp_error.decode() if isinstance(e.smtp_error, bytes) else e.smtp_error}"}
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {e}", exc_info=True)
            return {"ok": False, "error": f"SMTP error: {e}"}
        except Exception as e:
            logger.error(f"Email send error: {e}", exc_info=True)
            return {"ok": False, "error": str(e)}

    def _build_html(self, subject: str, report_text: str) -> str:
        now = datetime.now().strftime("%d/%m/%Y %H:%M")
        # Convert bullet points and newlines to HTML
        lines = report_text.split("\n")
        html_lines = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                html_lines.append("<br/>")
            elif stripped.startswith("•") or stripped.startswith("-"):
                html_lines.append(f"<li style='margin-bottom:4px'>{stripped.lstrip('•- ')}</li>")
            elif stripped.startswith("===") or stripped.startswith("---"):
                title = stripped.strip("=- ")
                html_lines.append(f"<h3 style='color:#1e40af;margin:16px 0 8px 0;font-size:15px'>{title}</h3>")
            else:
                html_lines.append(f"<p style='margin:4px 0'>{stripped}</p>")

        body_html = "\n".join(html_lines)

        return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f8fafc;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#1e40af,#4f46e5);padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">{subject}</h1>
      <p style="color:#bfdbfe;margin:4px 0 0 0;font-size:13px">Generated by Gemini AI | {now}</p>
    </div>
    <div style="padding:24px 32px;color:#334155;font-size:14px;line-height:1.7">
      {body_html}
    </div>
    <div style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;text-align:center">
      <p style="color:#94a3b8;font-size:11px;margin:0">Sales AI Report | Powered by Gemini 2.5 Flash Lite</p>
    </div>
  </div>
</body>
</html>"""


email_service = EmailService()
