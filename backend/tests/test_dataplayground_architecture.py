"""Reject misleading execution histories and invalid architecture lineage."""

from copy import deepcopy

import pytest
from pydantic import ValidationError

from backend.app.models.dataplayground import LabCatalog
from backend.app.models.dataplayground_architecture import Architecture
from backend.app.services.dataplayground import load_catalog


@pytest.fixture()
def architecture():
    def task(identifier, dependencies, attempts=1):
        return dict(id=identifier, name=identifier, description="Synthetic task", depends_on=dependencies,
                    source="playground/pipeline.py", output="Synthetic records", max_attempts=attempts,
                    idempotency="The same inputs produce the same output.")

    def entry(identifier, attempt=1, status="success"):
        return dict(task_id=identifier, attempt=attempt, status=status, detail="Synthetic execution result")

    def run(identifier, trace, published):
        return dict(id=identifier, name=identifier, description="Synthetic run", trace=trace,
                    published=published, fingerprint="a" * 64 if published else None)

    def model(identifier, dependencies):
        return dict(id=identifier, name=identifier, kind="table", description="Synthetic model",
                    grain="One record per ID", materialization="SQLite", source="playground/analytics.py",
                    columns=[dict(name="id", type="TEXT", nullable=False, key="primary", description="Record ID")],
                    depends_on=dependencies, sql="SELECT id FROM records", contracts=["IDs are unique"])

    return dict(
        dags=[dict(id="lab", name="Lab", description="Synthetic DAG",
                   tasks=[task("generate", []), task("validate", ["generate"]), task("analytics", ["validate"], 2)],
                   runs=[
                       run("normal", [entry("generate"), entry("validate"), entry("analytics")], True),
                       run("retry", [entry("generate"), entry("validate"), entry("analytics", 1, "failed"),
                                     entry("analytics", 2)], True),
                       run("failure", [entry("generate"), entry("validate", 1, "failed"),
                                       entry("analytics", 0, "blocked")], False),
                   ])],
        models=[model("events", []), model("daily", ["events"])],
        decisions=[dict(id="sqlite", title="SQLite", choice="Local SQL", tradeoff="Single process",
                        evidence="Queries execute in tests", production_path="Use a managed warehouse")],
    )


def test_valid_success_retry_and_blocked_histories(architecture):
    assert Architecture.model_validate(architecture).model_dump() == architecture


def test_permanent_failure_can_block_before_retry_policy_is_exhausted(architecture):
    dag = architecture["dags"][0]
    dag["tasks"][1]["max_attempts"] = 2
    result = Architecture.model_validate(architecture)
    assert result.dags[0].runs[-1].trace[1].attempt == 1
    assert result.dags[0].runs[-1].trace[-1].status == "blocked"


def test_catalog_architecture_is_optional_and_preserves_schema_one(architecture):
    catalog = load_catalog().model_dump()
    catalog.pop("architecture", None)
    assert LabCatalog.model_validate(catalog).architecture is None
    catalog["architecture"] = None
    assert LabCatalog.model_validate(catalog).architecture is None
    catalog["architecture"] = architecture
    parsed = LabCatalog.model_validate(catalog)
    assert (parsed.schema_version, parsed.engine_version) == (1, "1.0.0")
    assert parsed.architecture.dags[0].id == "lab"


@pytest.mark.parametrize("collection", ["dags", "models", "decisions"])
def test_duplicate_top_level_ids(architecture, collection):
    architecture[collection].append(deepcopy(architecture[collection][0]))
    with pytest.raises(ValidationError, match="Duplicate"):
        Architecture.model_validate(architecture)


@pytest.mark.parametrize("kind", ["tasks", "models"])
@pytest.mark.parametrize("change", ["duplicate", "missing", "self", "cycle", "repeat_dependency"])
def test_dependency_identifiers_and_cycles(architecture, kind, change):
    records = architecture["dags"][0]["tasks"] if kind == "tasks" else architecture["models"]
    if change == "duplicate":
        records.append(deepcopy(records[0]))
    elif change == "missing":
        records[0]["depends_on"] = ["missing"]
    elif change == "self":
        records[0]["depends_on"] = [records[0]["id"]]
    elif change == "cycle":
        records[0]["depends_on"] = [records[1]["id"]]
    else:
        records[1]["depends_on"] *= 2
    with pytest.raises(ValidationError):
        Architecture.model_validate(architecture)


@pytest.mark.parametrize("change", [
    "unknown_task", "zero_attempt", "skipped_attempt", "over_policy", "dependency_order", "repeat_success",
    "repeat_blocked", "blocked_nonzero", "blocked_without_failure", "block_then_dependency_recovers",
    "published_failure", "published_missing_task", "missing_fingerprint", "unpublished_fingerprint",
    "bad_fingerprint", "duplicate_run", "retry_gap", "retry_after_exhaustion",
])
def test_trace_chronology_attempts_and_publication(architecture, change):
    dag = architecture["dags"][0]
    normal, retry, failure = dag["runs"]
    if change == "unknown_task":
        normal["trace"][0]["task_id"] = "missing"
    elif change == "zero_attempt":
        normal["trace"][0]["attempt"] = 0
    elif change == "skipped_attempt":
        normal["trace"][2]["attempt"] = 2
    elif change == "over_policy":
        normal["trace"][0]["attempt"] = 2
    elif change == "dependency_order":
        normal["trace"].reverse()
    elif change == "repeat_success":
        normal["trace"].append(deepcopy(normal["trace"][-1]))
    elif change == "repeat_blocked":
        failure["trace"].append(deepcopy(failure["trace"][-1]))
    elif change == "blocked_nonzero":
        failure["trace"][-1]["attempt"] = 1
    elif change == "blocked_without_failure":
        failure["trace"][1]["status"] = "success"
    elif change == "block_then_dependency_recovers":
        dag["tasks"][1]["max_attempts"] = 2
        recovery = deepcopy(normal["trace"][1])
        recovery["attempt"] = 2
        failure["trace"].append(recovery)
    elif change == "published_failure":
        failure.update(published=True, fingerprint="b" * 64)
    elif change == "published_missing_task":
        normal["trace"].pop()
    elif change == "missing_fingerprint":
        normal["fingerprint"] = None
    elif change == "unpublished_fingerprint":
        failure["fingerprint"] = "b" * 64
    elif change == "bad_fingerprint":
        normal["fingerprint"] = "x" * 64
    elif change == "duplicate_run":
        dag["runs"].append(deepcopy(normal))
    elif change == "retry_gap":
        retry["trace"][-1]["attempt"] = 3
    else:
        dag["tasks"][-1]["max_attempts"] = 1
    with pytest.raises(ValidationError):
        Architecture.model_validate(architecture)


@pytest.mark.parametrize("change", ["duplicate_column", "nullable_primary", "invalid_key"])
def test_column_contracts(architecture, change):
    columns = architecture["models"][0]["columns"]
    if change == "duplicate_column":
        columns.append(deepcopy(columns[0]))
    elif change == "nullable_primary":
        columns[0]["nullable"] = True
    else:
        columns[0]["key"] = "unique"
    with pytest.raises(ValidationError):
        Architecture.model_validate(architecture)


@pytest.mark.parametrize("value", [True, "2", 1.5, float("nan"), float("inf"), 0, 11])
def test_strict_bounded_attempt_policy(architecture, value):
    architecture["dags"][0]["tasks"][0]["max_attempts"] = value
    with pytest.raises(ValidationError):
        Architecture.model_validate(architecture)


@pytest.mark.parametrize("change", ["empty", "too_many", "long_text", "long_sql", "unknown", "string_boolean",
                                    "empty_trace", "long_trace", "long_columns", "bad_id"])
def test_collection_text_and_type_bounds(architecture, change):
    if change == "empty":
        architecture["models"] = []
    elif change == "too_many":
        architecture["models"] *= 51
    elif change == "long_text":
        architecture["decisions"][0]["evidence"] = "x" * 1501
    elif change == "long_sql":
        architecture["models"][0]["sql"] = "x" * 10001
    elif change == "unknown":
        architecture["dags"][0]["tasks"][0]["unexpected"] = True
    elif change == "string_boolean":
        architecture["models"][0]["columns"][0]["nullable"] = "false"
    elif change == "empty_trace":
        architecture["dags"][0]["runs"][0]["trace"] = []
    elif change == "long_trace":
        architecture["dags"][0]["runs"][0]["trace"] *= 167
    elif change == "long_columns":
        architecture["models"][0]["columns"] *= 101
    else:
        architecture["models"][0]["id"] = "invalid id"
    with pytest.raises(ValidationError):
        Architecture.model_validate(architecture)
