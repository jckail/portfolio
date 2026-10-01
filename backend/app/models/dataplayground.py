"""Versioned public contract for the independently reproducible Python lab."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Count = Annotated[int, Field(ge=0, strict=True)]
Fraction = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False, strict=True)]
ShortText = Annotated[str, Field(max_length=500)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class SimulationRequest(Contract):
    seed: int = Field(default=42, ge=0, le=2147483647, strict=True)
    days: int = Field(default=30, ge=7, le=90, strict=True)
    daily_signups: int = Field(default=30, ge=5, le=100, strict=True)
    activation_rate: Fraction = 0.65
    payment_rate: Fraction = 0.35
    churn_rate: float = Field(default=0.02, ge=0, le=0.2, strict=True)
    duplicate_rate: float = Field(default=0.03, ge=0, le=0.2, strict=True)
    invalid_rate: float = Field(default=0.02, ge=0, le=0.2, strict=True)


class Scenario(Contract):
    id: Annotated[str, Field(pattern=r"^[a-z0-9_-]{1,64}$")]
    name: ShortText
    description: ShortText


class Summary(Contract):
    signups: Count
    activated_users: Count
    paying_users: Count
    active_customers: Count
    revenue_cents: Count
    conversion_rate: Fraction
    churn_rate: Fraction
    quality_pass_rate: Fraction


class Daily(Contract):
    date: Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]
    signups: Count
    activations: Count
    payments: Count
    churns: Count
    revenue_cents: Count
    active_customers: Count


class FunnelStage(Contract):
    stage: ShortText
    users: Count
    rate: Fraction


class Cohort(Contract):
    cohort: ShortText
    size: Count
    retention: Annotated[list[Fraction | None], Field(max_length=14)]


class PipelineStage(Contract):
    id: ShortText
    name: ShortText
    input_count: Count
    output_count: Count
    rejected_count: Count
    description: ShortText


class QualityCheck(Contract):
    id: ShortText
    name: ShortText
    status: Literal["pass", "warn"]
    checked: Count
    failed: Count
    description: ShortText


class Event(Contract):
    event_id: ShortText
    occurred_at: ShortText
    user_id: ShortText
    event_type: Literal["signup", "activation", "payment", "churn"]
    amount_cents: Count
    channel: ShortText
    plan: ShortText


class RejectedEvent(Contract):
    event_id: ShortText
    event_type: ShortText
    reason: ShortText


class MetricLineage(Contract):
    metric: ShortText
    definition: Annotated[str, Field(max_length=1500)]
    source: ShortText
    sql: Annotated[str, Field(max_length=10000)]


class SimulationRun(Contract):
    id: ShortText
    scenario: Scenario
    config: SimulationRequest
    summary: Summary
    daily: Annotated[list[Daily], Field(min_length=7, max_length=90)]
    funnel: Annotated[list[FunnelStage], Field(min_length=1, max_length=10)]
    cohorts: Annotated[list[Cohort], Field(max_length=90)]
    pipeline: Annotated[list[PipelineStage], Field(min_length=1, max_length=10)]
    quality: Annotated[list[QualityCheck], Field(max_length=20)]
    events: Annotated[list[Event], Field(max_length=100)]
    quarantined: Annotated[list[RejectedEvent], Field(max_length=50)]
    lineage: Annotated[list[MetricLineage], Field(max_length=20)]


class ArtifactSource(Contract):
    repository: Literal["https://github.com/jckail/data_playground"]
    command: ShortText


class LabCatalog(Contract):
    schema_version: Literal[1]
    engine_version: Literal["1.0.0"]
    source: ArtifactSource
    runs: Annotated[list[SimulationRun], Field(min_length=1, max_length=10)]


class PublicLabCatalog(LabCatalog):
    live_simulation: bool
