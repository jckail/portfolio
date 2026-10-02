"""Bounded public requests and observable copilot results."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Turn(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=4000)


class CopilotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    message: str = Field(min_length=1, max_length=4000)
    history: list[Turn] = Field(default_factory=list, max_length=12)


class ConfirmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    id: str = Field(min_length=16, max_length=100)


class CopilotResponse(BaseModel):
    text: str
    events: list[dict]
    proposals: list[dict]
    limited: bool = False
