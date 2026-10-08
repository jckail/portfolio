"""Public, tightly bounded AI recommendations for the contact form."""
from collections.abc import Callable

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from pydantic import BaseModel, ConfigDict, Field

from backend.app.services.contact_draft import ContactIntent, DraftUnavailable, recommend_contact_message
from backend.app.utils.rate_limit import SlidingWindowLimiter, client_ip

_NO_STORE = {"Cache-Control": "no-store"}
_draft_limiter = SlidingWindowLimiter(3, 3600, global_max_events=24, name="contact_draft")
_daily_limiter = SlidingWindowLimiter(6, 86400, global_max_events=120, name="contact_draft_daily")


class NoStoreRoute(APIRoute):
    def get_route_handler(self) -> Callable:
        handler = super().get_route_handler()

        async def no_store(request: Request) -> Response:
            try:
                response = await handler(request)
            except RequestValidationError:
                raise HTTPException(422, "Choose opportunity, collaboration or question.", headers=_NO_STORE) from None
            response.headers.update(_NO_STORE)
            return response
        return no_store


router = APIRouter(prefix="/contact", route_class=NoStoreRoute)


class ContactDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    intent: ContactIntent


class ContactDraftResponse(BaseModel):
    message: str = Field(min_length=1, max_length=1200)


@router.post("/draft", response_model=ContactDraftResponse)
async def contact_draft(request: Request, body: ContactDraftRequest) -> ContactDraftResponse:
    key = client_ip(request)
    # Charge atomically before awaiting. Limits are per process, like other
    # public cost endpoints; no identity is logged or persisted.
    for limiter in (_draft_limiter, _daily_limiter):
        if not limiter.check(key):
            limiter.report_blocked()
            raise HTTPException(
                429, "Recommendations are busy. Please edit the starter message.", headers=_NO_STORE,
            )
    for limiter in (_draft_limiter, _daily_limiter):
        limiter.record(key)
    try:
        message = await recommend_contact_message(body.intent)
    except DraftUnavailable:
        raise HTTPException(
            503, "AI recommendation unavailable. Please edit the starter message.", headers=_NO_STORE,
        ) from None
    return ContactDraftResponse(message=message)
