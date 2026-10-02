"""Unpaid, grounded onsite lookup. Authentication grants no paid capability."""
from fastapi import APIRouter, HTTPException, Request

from backend.app.models.public_evidence import EvidenceAnswer, EvidenceQuery
from backend.app.services.public_evidence import evidence_answer
from backend.app.utils.rate_limit import SlidingWindowLimiter, client_ip

router = APIRouter(prefix="/assistant")
limiter = SlidingWindowLimiter(10, 60, global_max_events=100, name="public_evidence")


@router.post("/evidence", response_model=EvidenceAnswer)
async def query_evidence(body: EvidenceQuery, request: Request) -> EvidenceAnswer:
    if not limiter.allow(client_ip(request)):
        raise HTTPException(429, "Please wait a minute before searching again.")
    return evidence_answer(body.query)


@router.get("/capabilities")
async def capabilities():
    return {
        "evidence": "public_read_only", "paid_agents": False,
        "richer_demos": "not_enabled",
        "note": "Public evidence lookup is available without sign-in. Richer email-gated demos require a separate approved access and spending policy.",
    }
