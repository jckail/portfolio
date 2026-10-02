"""Public contracts for the isolated, process-local operating workbench."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class RuntimeContract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class SessionRequest(RuntimeContract):
    scenario_id: str = Field(default="baseline", pattern=r"^[a-z0-9_-]{1,64}$")


class QueryRequest(RuntimeContract):
    sql: str = Field(min_length=1, max_length=20000)
    row_limit: int = Field(default=100, ge=1, le=500)


class RuntimeAction(RuntimeContract):
    action: Literal[
        "producer_start",
        "producer_stop",
        "produce",
        "consumer_pause",
        "consumer_resume",
        "consumer_drain",
        "consumer_replay",
        "dag_run",
        "models_run",
        "reset",
    ]
    batch_size: int = Field(default=10, ge=1, le=100)
    rate_per_second: int = Field(default=5, ge=1, le=50)
    partitions: int = Field(default=3, ge=1, le=8)
    limit: int = Field(default=100, ge=1, le=500)
    failure: Literal["none", "transient", "permanent"] = "none"
    duplicate_rate: float = Field(default=0.0, ge=0, le=0.2)
    invalid_rate: float = Field(default=0.0, ge=0, le=0.2)


class QueryResult(RuntimeContract):
    columns: list[str]
    rows: list[list[str | int | float | None]]
    row_count: int
    truncated: bool
    elapsed_ms: float


class RuntimeColumn(RuntimeContract):
    name: str
    type: str
    nullable: bool
    key: str


class RuntimeTable(RuntimeContract):
    name: str
    row_count: int
    columns: list[RuntimeColumn]
    source: str


class PartitionState(RuntimeContract):
    partition: int
    produced_offset: int
    consumed_offset: int
    backlog: int


class StreamingState(RuntimeContract):
    producer_running: bool
    consumer_paused: bool
    batch_size: int
    rate_per_second: int
    partitions: list[PartitionState]
    produced: int
    consumed: int
    inserted: int
    duplicates: int
    quarantined: int
    accepted: int
    duplicate_rate: float
    invalid_rate: float
    consumer_batch_size: int
    consumer_rate_per_second: int
    backlog: int
    capacity: int


class RuntimeLog(RuntimeContract):
    sequence: int
    component: str
    status: str
    detail: str


class RuntimeTrace(RuntimeContract):
    task_id: str
    attempt: int
    status: Literal["success", "failed", "blocked"]
    detail: str


class ModelTest(RuntimeContract):
    name: str
    status: Literal["pass", "fail"]
    failed_rows: int
    sql: str


class ModelRun(RuntimeContract):
    name: str
    status: Literal["success", "failed"]
    row_count: int
    sql: str
    source: str
    tests: list[ModelTest]


class FlowLink(RuntimeContract):
    source: str
    target: str
    value: int


class RuntimeState(RuntimeContract):
    scenario_id: str
    runtime: str = (
        "Process-local educational runtime: SQLite and a partitioned event log; no Kafka daemon or dbt service."
    )
    source: str = "Catalog event sample and independent synthetic commerce fixtures."
    expires_in_seconds: int
    tables: list[RuntimeTable]
    streaming: StreamingState
    dag_trace: list[RuntimeTrace]
    dag_published: bool
    dag_fingerprint: str | None
    model_runs: list[ModelRun]
    logs: list[RuntimeLog]
    flow: list[FlowLink]


class SessionResponse(RuntimeContract):
    token: Annotated[str, Field(min_length=32, max_length=100)]
    expires_in_seconds: int
    state: RuntimeState
