"""Cross-record invariants for the optional seeded graph/vector catalog."""

from copy import deepcopy

import pytest
from pydantic import ValidationError

from backend.app.models.dataplayground import LabCatalog
from backend.app.models.dataplayground_exploration import Exploration
from backend.app.services.dataplayground import load_catalog


@pytest.fixture()
def exploration():
    return {
        "seed": 42,
        "description": "Independent synthetic graph and vector dataset.",
        "dimensions": ["outdoors", "technology"],
        "products": [
            {"id": "product-1", "name": "Tent", "category": "Outdoors", "description": "Synthetic tent",
             "price_cents": 5000, "vector": [1.0, 0.0]},
            {"id": "product-2", "name": "Radio", "category": "Technology", "description": "Synthetic radio",
             "price_cents": 3000, "vector": [0.6, 0.8]},
        ],
        "customers": [{"id": "customer-1", "name": "Synthetic customer", "segment": "Explorer"}],
        "purchases": [
            {"id": "purchase-1", "customer_id": "customer-1", "product_id": "product-1", "quantity": 2},
            {"id": "purchase-2", "customer_id": "customer-1", "product_id": "product-1", "quantity": 1},
        ],
        "graph": {
            "nodes": [
                {"id": "customer-1", "label": "Synthetic customer", "kind": "customer"},
                {"id": "product-1", "label": "Tent", "kind": "product"},
                {"id": "product-2", "label": "Radio", "kind": "product"},
                {"id": "category-outdoors", "label": "Outdoors", "kind": "category"},
                {"id": "category-technology", "label": "Technology", "kind": "category"},
            ],
            "edges": [
                {"source": "customer-1", "target": "product-1", "relation": "purchased", "weight": 3},
                {"source": "product-1", "target": "category-outdoors", "relation": "belongs_to", "weight": 1},
                {"source": "product-2", "target": "category-technology", "relation": "belongs_to", "weight": 1},
            ],
        },
    }


def test_valid_vectors_and_graph_aggregate_purchase_quantities(exploration):
    result = Exploration.model_validate(exploration)
    assert result.model_dump() == exploration
    assert result.graph.edges[0].weight == sum(p.quantity for p in result.purchases)


def test_optional_exploration_preserves_existing_catalog(exploration):
    body = load_catalog().model_dump()
    body.pop("exploration", None)
    assert LabCatalog.model_validate(body).exploration is None
    body["exploration"] = None
    assert LabCatalog.model_validate(body).exploration is None
    body["exploration"] = exploration
    result = LabCatalog.model_validate(body)
    assert result.schema_version == 1
    assert result.engine_version == "1.0.0"
    assert result.exploration.seed == 42


@pytest.mark.parametrize("field, value", [
    ("vector", [-1.0, 0.0]), ("vector", [1.0]), ("vector", [0.0, 0.0]), ("vector", [0.8, 0.8]),
    ("vector", [float("nan"), 0.0]), ("vector", [float("inf"), 0.0]),
    ("vector", [True, 0.0]), ("vector", ["1.0", 0.0]),
    ("price_cents", True), ("price_cents", -1), ("price_cents", 100_000_001),
])
def test_invalid_product_values(exploration, field, value):
    exploration["products"][0][field] = value
    with pytest.raises(ValidationError):
        Exploration.model_validate(exploration)


@pytest.mark.parametrize("dimensions", [[], ["outdoors", "outdoors"], ["outdoors"] * 33])
def test_invalid_dimensions(exploration, dimensions):
    exploration["dimensions"] = dimensions
    with pytest.raises(ValidationError):
        Exploration.model_validate(exploration)


@pytest.mark.parametrize("field", ["products", "customers", "purchases"])
def test_duplicate_entity_ids(exploration, field):
    exploration[field].append(deepcopy(exploration[field][0]))
    with pytest.raises(ValidationError, match="Duplicate"):
        Exploration.model_validate(exploration)


@pytest.mark.parametrize("field", ["customer_id", "product_id"])
def test_purchase_unknown_references(exploration, field):
    exploration["purchases"][0][field] = "missing"
    with pytest.raises(ValidationError, match="reference known"):
        Exploration.model_validate(exploration)


@pytest.mark.parametrize("field, value", [
    ("source", "missing"), ("target", "missing"), ("weight", 4), ("weight", 0),
    ("weight", True), ("relation", "belongs_to"),
])
def test_graph_edge_endpoints_types_and_aggregate_consistency(exploration, field, value):
    exploration["graph"]["edges"][0][field] = value
    with pytest.raises(ValidationError):
        Exploration.model_validate(exploration)


@pytest.mark.parametrize("change", ["duplicate_node", "duplicate_edge", "missing_edge", "extra_node", "wrong_label", "wrong_kind", "wrong_category"])
def test_graph_matches_entities_exactly(exploration, change):
    graph = exploration["graph"]
    if change == "duplicate_node":
        graph["nodes"].append(deepcopy(graph["nodes"][0]))
    elif change == "duplicate_edge":
        graph["edges"].append(deepcopy(graph["edges"][0]))
    elif change == "missing_edge":
        graph["edges"].pop()
    elif change == "extra_node":
        graph["nodes"].append({"id": "extra", "label": "Extra", "kind": "customer"})
    elif change == "wrong_label":
        graph["nodes"][0]["label"] = "Wrong customer"
    elif change == "wrong_kind":
        graph["nodes"][0]["kind"] = "product"
    else:
        graph["nodes"][-1]["label"] = "Wrong category"
    with pytest.raises(ValidationError):
        Exploration.model_validate(exploration)


def test_bounded_collections_unknown_fields_and_strict_seed(exploration):
    for key, value in (("seed", True), ("seed", -1), ("seed", "42"), ("unexpected", True)):
        with pytest.raises(ValidationError):
            Exploration.model_validate({**exploration, key: value})
    exploration["customers"] *= 101
    with pytest.raises(ValidationError):
        Exploration.model_validate(exploration)
