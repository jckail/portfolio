"""Hosted lab demos and forwarded apps (see docs/apps.md).

A *hosted lab* is an interactive demo served by this site at ``/<slug>``. A
*forward* is an app that lives at its own domain; ``/<slug>`` answers 302.
Both are strict: a data file that breaks a rule fails the load (and CI) rather
than shipping a half-working route.
"""
from __future__ import annotations

import re
from datetime import date
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator

SLUG_PATTERN = re.compile(r"^[a-z][a-z0-9]{2,30}$")

# Never usable as a lab or forward slug: they are API, asset or discovery
# paths, or belong to another feature.
RESERVED_SLUGS = frozenset(
    {
        "api", "admin", "assets", "fonts", "images", "ws", "docs", "static", "dataplayground",
        "health", "robots", "sitemap", "llms", "resume", "favicon",
    }
)

_CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")


def validate_slug(value: str) -> str:
    if not SLUG_PATTERN.fullmatch(value):
        raise ValueError("slug must match ^[a-z][a-z0-9]{2,30}$")
    if value in RESERVED_SLUGS:
        raise ValueError(f"slug '{value}' is reserved")
    return value


def _https_url(value: str, *, what: str) -> str:
    if _CONTROL.search(value) or value != value.strip() or " " in value or "\\" in value:
        raise ValueError(f"{what} must be a clean URL")
    parts = urlsplit(value)
    if parts.scheme != "https" or not parts.hostname:
        raise ValueError(f"{what} must be an https URL")
    if parts.username is not None or parts.password is not None:
        raise ValueError(f"{what} must not contain credentials")
    try:
        port = parts.port
    except ValueError:
        raise ValueError(f"{what} has an invalid port") from None
    if port is not None:
        raise ValueError(f"{what} must not contain a port")
    return value


def _clean_text(value: str, *, limit: int) -> str:
    if not value.strip() or value != value.strip():
        raise ValueError("text must be non-empty and trimmed")
    if len(value) > limit:
        raise ValueError(f"text must be at most {limit} characters")
    if _CONTROL.search(value):
        raise ValueError("text must not contain control characters")
    return value


class Lab(BaseModel):
    """One hosted lab: the facts the server renders and the shell shows."""

    model_config = ConfigDict(extra="forbid")

    slug: str
    project_key: str = Field(min_length=1)
    title: str = Field(max_length=90)
    description: str = Field(max_length=300)
    intro: list[str] = Field(min_length=1, max_length=4)
    features: list[str] = Field(min_length=3, max_length=8)
    repo: str
    demo_notice: str = Field(max_length=400)
    updated: str

    @field_validator("slug")
    @classmethod
    def _slug(cls, value: str) -> str:
        return validate_slug(value)

    @field_validator("title")
    @classmethod
    def _title(cls, value: str) -> str:
        return _clean_text(value, limit=90)

    @field_validator("description")
    @classmethod
    def _description(cls, value: str) -> str:
        return _clean_text(value, limit=300)

    @field_validator("intro")
    @classmethod
    def _intro(cls, value: list[str]) -> list[str]:
        return [_clean_text(p, limit=1200) for p in value]

    @field_validator("features")
    @classmethod
    def _features(cls, value: list[str]) -> list[str]:
        return [_clean_text(f, limit=160) for f in value]

    @field_validator("repo")
    @classmethod
    def _repo(cls, value: str) -> str:
        _https_url(value, what="repo")
        parts = urlsplit(value)
        if parts.hostname != "github.com" or len([s for s in parts.path.split("/") if s]) != 2:
            raise ValueError("repo must be https://github.com/<owner>/<name>")
        return value

    @field_validator("demo_notice")
    @classmethod
    def _notice(cls, value: str) -> str:
        _clean_text(value, limit=400)
        lowered = value.lower()
        if "synthetic" not in lowered or "browser" not in lowered:
            raise ValueError("demo_notice must say the data is synthetic and runs in the browser")
        return value

    @field_validator("updated")
    @classmethod
    def _updated(cls, value: str) -> str:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise ValueError("updated must be YYYY-MM-DD")
        date.fromisoformat(value)
        return value


class Forward(BaseModel):
    """An app at its own domain; ``/<slug>`` answers 302 with ``target``."""

    model_config = ConfigDict(extra="forbid")

    slug: str
    target: str
    project_key: str = Field(min_length=1)

    @field_validator("slug")
    @classmethod
    def _slug(cls, value: str) -> str:
        return validate_slug(value)

    @field_validator("target")
    @classmethod
    def _target(cls, value: str) -> str:
        return _https_url(value, what="target")
