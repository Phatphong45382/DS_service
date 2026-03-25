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

    def _parse_body(self, report_text: str) -> str:
        """Convert plain text report to structured HTML blocks."""
        import re
        lines = report_text.split("\n")
        html_parts = []
        in_list = False

        for line in lines:
            stripped = line.strip()
            if not stripped:
                if in_list:
                    html_parts.append("</ul>")
                    in_list = False
                continue

            # === Section Header ===
            if stripped.startswith("===") or (stripped.endswith("===") and len(stripped) > 6):
                if in_list:
                    html_parts.append("</ul>")
                    in_list = False
                title = stripped.strip("= ").strip()
                html_parts.append(
                    f'<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px 16px;margin:20px 0 12px 0;border-radius:0 8px 8px 0">'
                    f'<h2 style="color:#1e40af;margin:0;font-size:16px;font-weight:700">{title}</h2></div>'
                )
                continue

            # --- Sub Header ---
            if stripped.startswith("---") or (stripped.endswith("---") and len(stripped) > 6):
                if in_list:
                    html_parts.append("</ul>")
                    in_list = False
                title = stripped.strip("- ").strip()
                html_parts.append(
                    f'<h3 style="color:#4f46e5;margin:16px 0 8px 0;font-size:14px;font-weight:600;'
                    f'border-bottom:1px solid #e2e8f0;padding-bottom:4px">{title}</h3>'
                )
                continue

            # Bullet points (•, -, *)
            if stripped[0] in "•-*":
                if not in_list:
                    html_parts.append(
                        '<ul style="margin:4px 0;padding-left:0;list-style:none">'
                    )
                    in_list = True
                content = stripped.lstrip("•-* ").strip()
                content = self._apply_inline(content)
                html_parts.append(
                    f'<li style="padding:6px 12px;margin:4px 0;background:#f8fafc;border-radius:6px;'
                    f'font-size:14px;border-left:3px solid #6366f1">{content}</li>'
                )
                continue

            # Regular text / numbered lines
            if in_list:
                html_parts.append("</ul>")
                in_list = False

            # Numbered list (1. 2. 3.)
            if re.match(r"^\d+[\.\)]\s", stripped):
                content = re.sub(r"^\d+[\.\)]\s*", "", stripped)
                content = self._apply_inline(content)
                num = re.match(r"^(\d+)", stripped).group(1)
                html_parts.append(
                    f'<div style="display:flex;align-items:flex-start;gap:10px;margin:6px 0;padding:8px 12px;'
                    f'background:#faf5ff;border-radius:8px">'
                    f'<span style="background:#7c3aed;color:#fff;border-radius:50%;min-width:24px;height:24px;'
                    f'display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">{num}</span>'
                    f'<span style="font-size:14px;color:#334155;line-height:1.6">{content}</span></div>'
                )
                continue

            # Normal paragraph
            content = self._apply_inline(stripped)
            html_parts.append(f'<p style="margin:8px 0;font-size:14px;color:#334155;line-height:1.7">{content}</p>')

        if in_list:
            html_parts.append("</ul>")

        return "\n".join(html_parts)

    def _apply_inline(self, text: str) -> str:
        """Convert **bold** and markdown-style inline formatting."""
        import re
        # **bold**
        text = re.sub(r"\*\*(.+?)\*\*", r'<strong style="color:#1e293b">\1</strong>', text)
        # Highlight numbers with units (e.g. 25,700,000 หน่วย or +80.8%)
        text = re.sub(
            r"([\+\-]?\d[\d,]*\.?\d*\s*(?:%|หน่วย|บาท|ล้าน|พัน))",
            r'<span style="color:#4f46e5;font-weight:600">\1</span>',
            text,
        )
        return text

    def _build_html(self, subject: str, report_text: str) -> str:
        now = datetime.now().strftime("%d/%m/%Y %H:%M")
        body_html = self._parse_body(report_text)

        return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,sans-serif">
  <div style="max-width:640px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#4f46e5,#7c3aed);padding:32px 32px 28px 32px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td>
          <h1 style="color:#ffffff;margin:0 0 6px 0;font-size:22px;font-weight:700;letter-spacing:-0.3px">{subject}</h1>
          <p style="color:#c7d2fe;margin:0;font-size:12px">
            📊 Generated by AI &nbsp;|&nbsp; {now}
          </p>
        </td>
        <td width="48" style="vertical-align:top;text-align:right">
          <div style="width:44px;height:44px;background:rgba(255,255,255,0.15);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:22px">📈</div>
        </td>
      </tr></table>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px 20px 32px;color:#334155;font-size:14px;line-height:1.7">
      {body_html}
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="color:#94a3b8;font-size:11px">Sales AI Report</td>
        <td style="color:#94a3b8;font-size:11px;text-align:right">Powered by Gemini AI ✨</td>
      </tr></table>
    </div>

  </div>
</body>
</html>"""


email_service = EmailService()
