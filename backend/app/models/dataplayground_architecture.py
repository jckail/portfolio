"""Bounded execution traces and model lineage for the optional architecture lab."""

from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

Identifier = Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9:_-]+$")]
Name = Annotated[str, Field(min_length=1, max_length=100)]
Text = Annotated[str, Field(min_length=1, max_length=1500)]
Dependencies = Annotated[list[Identifier], Field(max_length=50)]
Fingerprint = Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]


class ArchitectureContract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


def validate_dependencies(records: list, kind: str) -> None:
    """Check identifiers, references and cycles before inspecting execution order."""
    by_id = {record.id: record for record in records}
    if len(by_id) != len(records):
        raise ValueError(f"Duplicate {kind} IDs")
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(identifier: str) -> None:
        if identifier in visiting:
            raise ValueError(f"{kind} dependencies must be acyclic")
        if identifier in visited:
            return
        visiting.add(identifier)
        record = by_id[identifier]
        if len(set(record.depends_on)) != len(record.depends_on):
            raise ValueError(f"{kind} dependencies must be unique")
        for dependency in record.depends_on:
            if dependency == identifier or dependency not in by_id:
                raise ValueError(f"{kind} dependencies must reference other existing IDs")
            visit(dependency)
        visiting.remove(identifier)
        visited.add(identifier)

    for identifier in by_id:
        visit(identifier)


class ArchitectureTask(ArchitectureContract):
    id: Identifier
    name: Name
    depends_on: Dependencies
    description: Text
    source: Text
    output: Text
    max_attempts: int = Field(ge=1, le=10)
    idempotency: Text


class TaskAttempt(ArchitectureContract):
    task_id: Identifier
    attempt: int = Field(ge=0, le=10)
    status: Literal["success", "failed", "blocked"]
    detail: Text


class ArchitectureRun(ArchitectureContract):
    id: Identifier
    name: Name
    description: Text
    trace: Annotated[list[TaskAttempt], Field(min_length=1, max_length=500)]
    published: bool
    fingerprint: Fingerprint | None


class ArchitectureDAG(ArchitectureContract):
    id: Identifier
    name: Name
    description: Text
    tasks: Annotated[list[ArchitectureTask], Field(min_length=1, max_length=50)]
    runs: Annotated[list[ArchitectureRun], Field(min_length=1, max_length=10)]

    @model_validator(mode="after")
    def validate_runs(self) -> Self:
        validate_dependencies(self.tasks, "Task")
        tasks = {task.id: task for task in self.tasks}
        if len({run.id for run in self.runs}) != len(self.runs):
            raise ValueError("Duplicate run IDs")
        for run in self.runs:
            latest: dict[str, TaskAttempt] = {}
            for entry in run.trace:
                task = tasks.get(entry.task_id)
                if task is None:
                    raise ValueError("Trace must reference existing tasks")
                previous = latest.get(entry.task_id)
                if previous is not None and previous.status != "failed":
                    raise ValueError("Successful or blocked tasks cannot execute again")
                if entry.status == "blocked":
                    if entry.attempt != 0 or previous is not None:
                        raise ValueError("Blocked tasks must have attempt zero and no execution attempts")
                    if not any(
                        dependency in latest and latest[dependency].status in {"failed", "blocked"}
                        for dependency in task.depends_on
                    ):
                        raise ValueError("Blocked tasks require an earlier failed or blocked dependency")
                else:
                    expected_attempt = previous.attempt + 1 if previous is not None else 1
                    if entry.attempt != expected_attempt or entry.attempt > task.max_attempts:
                        raise ValueError("Trace attempts must be sequential and within task policy")
                    if any(dependency not in latest or latest[dependency].status != "success"
                           for dependency in task.depends_on):
                        raise ValueError("Executed tasks require successful dependencies earlier in the trace")
                latest[entry.task_id] = entry
            for identifier, entry in latest.items():
                if entry.status == "blocked" and not any(
                    dependency in latest and latest[dependency].status in {"failed", "blocked"}
                    for dependency in tasks[identifier].depends_on
                ):
                    raise ValueError("Blocked tasks require a dependency that remains unsuccessful")
            if run.published:
                if run.fingerprint is None or set(latest) != set(tasks) or any(
                    entry.status != "success" for entry in latest.values()
                ):
                    raise ValueError("Published runs require all tasks successful and a fingerprint")
            elif run.fingerprint is not None:
                raise ValueError("Unpublished runs must not have a fingerprint")
        return self


class ArchitectureColumn(ArchitectureContract):
    name: Name
    type: Name
    nullable: bool
    key: Literal["primary", "foreign", "none"]
    description: Text

    @model_validator(mode="after")
    def validate_primary_key(self) -> Self:
        if self.key == "primary" and self.nullable:
            raise ValueError("Primary key columns must not be nullable")
        return self


class ArchitectureModel(ArchitectureContract):
    id: Identifier
    name: Name
    kind: Literal["table", "view", "artifact"]
    description: Text
    grain: Text
    materialization: Text
    source: Text
    columns: Annotated[list[ArchitectureColumn], Field(min_length=1, max_length=100)]
    depends_on: Dependencies
    sql: Annotated[str, Field(max_length=10000)]
    contracts: Annotated[list[Text], Field(min_length=1, max_length=30)]

    @model_validator(mode="after")
    def validate_columns(self) -> Self:
        if len({column.name for column in self.columns}) != len(self.columns):
            raise ValueError("Model column names must be unique")
        return self


class ArchitectureDecision(ArchitectureContract):
    id: Identifier
    title: Name
    choice: Text
    tradeoff: Text
    evidence: Text
    production_path: Text


class Architecture(ArchitectureContract):
    dags: Annotated[list[ArchitectureDAG], Field(min_length=1, max_length=10)]
    models: Annotated[list[ArchitectureModel], Field(min_length=1, max_length=50)]
    decisions: Annotated[list[ArchitectureDecision], Field(min_length=1, max_length=30)]

    @model_validator(mode="after")
    def validate_identifiers_and_lineage(self) -> Self:
        for records, kind in ((self.dags, "DAG"), (self.decisions, "decision")):
            if len({record.id for record in records}) != len(records):
                raise ValueError(f"Duplicate {kind} IDs")
        validate_dependencies(self.models, "Model")
        return self
