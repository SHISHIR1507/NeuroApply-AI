"""
NeuroApply AI — Support / Raise Issue Routes
Lets users report issues; emails them to the support inbox via Resend.
No auth required (public so anyone can report a problem).
"""

import html
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.core.logging import get_logger

router = APIRouter(prefix="/support", tags=["support"])
logger = get_logger("support")

RESEND_ENDPOINT = "https://api.resend.com/emails"


class IssueRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    category: str = "Issue"
    message: str


@router.post("/issue", status_code=202)
async def raise_issue(body: IssueRequest):
    msg = (body.message or "").strip()
    if len(msg) < 5:
        raise HTTPException(status_code=400, detail="Please describe the issue in a bit more detail.")

    if not settings.resend_api_key:
        # Email not configured yet — don't 500; tell the caller cleanly.
        logger.warning("Issue submitted but RESEND_API_KEY is not set.")
        raise HTTPException(status_code=503, detail="Support email isn't configured yet. Please email us directly.")

    safe = lambda s: html.escape(s or "—")
    body_html = (
        f"<h2>🐛 New NeuroApply issue</h2>"
        f"<p><b>Category:</b> {safe(body.category)}</p>"
        f"<p><b>From:</b> {safe(body.name)} &lt;{safe(str(body.email) if body.email else '')}&gt;</p>"
        f"<hr><p style='white-space:pre-wrap'>{safe(msg)}</p>"
    )

    payload = {
        "from": settings.resend_from,
        "to": [settings.support_email],
        "subject": f"[NeuroApply] {body.category}: {msg[:60]}",
        "html": body_html,
    }
    if body.email:
        payload["reply_to"] = str(body.email)

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                RESEND_ENDPOINT,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json=payload,
            )
        if resp.status_code >= 300:
            logger.error(f"Resend error {resp.status_code}: {resp.text[:200]}")
            raise HTTPException(status_code=502, detail="Couldn't send your report — please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend request failed: {e}")
        raise HTTPException(status_code=502, detail="Couldn't reach the email service — please try again.")

    return {"status": "sent"}
