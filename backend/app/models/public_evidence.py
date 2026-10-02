"""Typed public evidence contract shared by onsite and external assistants."""
from pydantic import BaseModel, ConfigDict, Field, field_validator


class EvidenceQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=1, max_length=200)

    @field_validator("query")
    @classmethod
    def nonempty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Use specific project or technology keywords.")
        return value


class EvidenceSource(BaseModel):
    id: str
    title: str
    url: str
    snippets: list[str]


class EvidenceAnswer(BaseModel):
    mode: str = "public_evidence"
    answer: str
    sources: list[EvidenceSource]
