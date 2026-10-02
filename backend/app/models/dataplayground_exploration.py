"""Bounded synthetic graph and vector exploration, additive to catalog schema 1."""

import math
from collections import defaultdict
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

Identifier = Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9:_-]+$")]
Label = Annotated[str, Field(min_length=1, max_length=100)]
Description = Annotated[str, Field(min_length=1, max_length=1500)]
VectorValue = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False, strict=True)]


class ExplorationContract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Product(ExplorationContract):
    id: Identifier
    name: Label
    category: Label
    description: Description
    price_cents: int = Field(ge=0, le=100_000_000)
    vector: Annotated[list[VectorValue], Field(min_length=1, max_length=32)]


class Customer(ExplorationContract):
    id: Identifier
    name: Label
    segment: Label


class Purchase(ExplorationContract):
    id: Identifier
    customer_id: Identifier
    product_id: Identifier
    quantity: int = Field(ge=1, le=100)


class GraphNode(ExplorationContract):
    id: Identifier
    label: Label
    kind: Literal["customer", "product", "category"]


class GraphEdge(ExplorationContract):
    source: Identifier
    target: Identifier
    relation: Literal["purchased", "belongs_to"]
    weight: int = Field(ge=1, le=100_000)


class ExplorationGraph(ExplorationContract):
    nodes: Annotated[list[GraphNode], Field(min_length=1, max_length=300)]
    edges: Annotated[list[GraphEdge], Field(max_length=2000)]


class Exploration(ExplorationContract):
    seed: int = Field(ge=0, le=2147483647)
    description: Description
    dimensions: Annotated[list[Label], Field(min_length=1, max_length=32)]
    products: Annotated[list[Product], Field(min_length=1, max_length=100)]
    customers: Annotated[list[Customer], Field(min_length=1, max_length=100)]
    purchases: Annotated[list[Purchase], Field(max_length=1000)]
    graph: ExplorationGraph

    @model_validator(mode="after")
    def validate_references_and_vectors(self) -> Self:
        if len(set(self.dimensions)) != len(self.dimensions):
            raise ValueError("Vector dimension names must be unique")
        for values, kind in ((self.products, "product"), (self.customers, "customer"),
                             (self.purchases, "purchase"), (self.graph.nodes, "graph node")):
            if len({value.id for value in values}) != len(values):
                raise ValueError(f"Duplicate {kind} IDs")
        products = {value.id: value for value in self.products}
        customers = {value.id: value for value in self.customers}
        if products.keys() & customers.keys():
            raise ValueError("Product and customer IDs must be disjoint")
        for product in self.products:
            if len(product.vector) != len(self.dimensions):
                raise ValueError("Product vectors must match the dimension count")
            if not math.isclose(math.fsum(v * v for v in product.vector), 1.0, rel_tol=0, abs_tol=1e-5):
                raise ValueError("Product vectors must have unit norm")

        nodes = {node.id: node for node in self.graph.nodes}
        for values, kind in ((products, "product"), (customers, "customer")):
            for identifier, value in values.items():
                node = nodes.get(identifier)
                if node is None or node.kind != kind or node.label != value.name:
                    raise ValueError("Graph nodes must match product and customer IDs, kinds, and names")
        category_nodes = [node for node in self.graph.nodes if node.kind == "category"]
        categories = {node.label: node.id for node in category_nodes}
        if len(categories) != len(category_nodes) or set(categories) != {p.category for p in self.products}:
            raise ValueError("Graph categories must match product categories exactly")
        if len(nodes) != len(products) + len(customers) + len(categories):
            raise ValueError("Graph must contain exactly the referenced entity nodes")

        expected: dict[tuple[str, str, str], int] = defaultdict(int)
        for purchase in self.purchases:
            if purchase.customer_id not in customers or purchase.product_id not in products:
                raise ValueError("Purchases must reference known customers and products")
            expected[(purchase.customer_id, purchase.product_id, "purchased")] += purchase.quantity
        for product in self.products:
            expected[(product.id, categories[product.category], "belongs_to")] = 1
        actual = {}
        for edge in self.graph.edges:
            if edge.source not in nodes or edge.target not in nodes:
                raise ValueError("Graph edges must reference known nodes")
            key = (edge.source, edge.target, edge.relation)
            if key in actual:
                raise ValueError("Graph edges must be unique per source, target, and relation")
            actual[key] = edge.weight
        if actual != expected:
            raise ValueError("Graph edges must reproduce purchases and product category membership")
        return self
