"""Cached loaders for ``data/labs/*.json`` and ``data/forwards.json``.

Validation here is the single gate: slug rules, filename == slug, uniqueness
across labs and forwards, and ``project_key`` existing in ``projects.json``.
A violation raises ``LabDataError`` (startup fails, and so does CI) instead of
serving a route that would misbehave.
"""
from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import dataclass
from functools import cache
from pathlib import Path

from .models.data_loader import DATA_DIR, load_projects
from .models.labs import Forward, Lab

LABS_DIR = DATA_DIR / "labs"
FORWARDS_FILE = DATA_DIR / "forwards.json"


class LabDataError(ValueError):
    """The lab or forward data breaks a platform rule."""


@dataclass(frozen=True, slots=True)
class Catalog:
    labs: dict[str, Lab]
    forwards: dict[str, Forward]


def _read(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise LabDataError(f"{path.name}: cannot read JSON ({type(exc).__name__})") from exc


def _validated[T: Lab | Forward](model: type[T], raw: object, where: str) -> T:
    try:
        return model.model_validate(raw)
    except ValueError as exc:
        raise LabDataError(f"{where}: {exc}") from exc


def build_catalog(labs_dir: Path, forwards_file: Path, project_keys: Sequence[str]) -> Catalog:
    """Validate and assemble the catalog from explicit locations (testable)."""
    known = set(project_keys)
    labs: dict[str, Lab] = {}
    if labs_dir.is_dir():
        for path in sorted(labs_dir.glob("*.json")):
            lab = _validated(Lab, _read(path), path.name)
            if path.stem != lab.slug:
                raise LabDataError(f"{path.name}: file name must equal slug '{lab.slug}'")
            if lab.project_key not in known:
                raise LabDataError(f"{path.name}: unknown project_key '{lab.project_key}'")
            labs[lab.slug] = lab

    forwards: dict[str, Forward] = {}
    if forwards_file.is_file():
        raw = _read(forwards_file)
        if not isinstance(raw, list):
            raise LabDataError("forwards.json: must be a list")
        for index, item in enumerate(raw):
            forward = _validated(Forward, item, f"forwards.json[{index}]")
            if forward.slug in forwards or forward.slug in labs:
                raise LabDataError(f"forwards.json[{index}]: duplicate slug '{forward.slug}'")
            if forward.project_key not in known:
                raise LabDataError(f"forwards.json[{index}]: unknown project_key '{forward.project_key}'")
            forwards[forward.slug] = forward

    # Display order follows projects.json, then slug.
    order = {key: i for i, key in enumerate(project_keys)}
    labs = dict(sorted(labs.items(), key=lambda kv: (order[kv[1].project_key], kv[0])))
    return Catalog(labs=labs, forwards=forwards)


@cache
def load_catalog() -> Catalog:
    return build_catalog(LABS_DIR, FORWARDS_FILE, list(load_projects().root))


def load_labs() -> dict[str, Lab]:
    return load_catalog().labs


def load_forwards() -> dict[str, Forward]:
    return load_catalog().forwards


def hosted_lab_slug(route_path: str) -> str | None:
    """The hosted slug a request path names (``/slug`` or ``/slug/``), if any."""
    slug = route_path[1:].removesuffix("/")
    return slug if slug in load_catalog().labs else None


def clear_caches() -> None:
    load_catalog.cache_clear()
