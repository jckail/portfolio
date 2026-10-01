"""Load the portfolio JSON files in ``backend/app/data`` into Pydantic models.

Each loader parses and validates its file once per process; restart the
process to pick up an edit. Failures are logged with detail and surface to
clients as a generic 500, never as a path or parser message.
"""

import json
import logging
from functools import cache
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel

from .aboutme import AboutMe
from .contact import Contact
from .experience import Experience
from .projects import Projects
from .skills import Skills

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"

# Details (paths, parser messages) go to the log; clients get a generic error.
_GENERIC_DETAIL = "Unable to load site content"


def load_json_data(file_path: str | Path) -> Any:
    """Read and parse one JSON file."""
    try:
        with open(file_path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        logger.exception("Error loading JSON from %s", file_path)
        raise HTTPException(status_code=500, detail=_GENERIC_DETAIL)


def load_model[T: BaseModel](model_class: type[T], json_file: str) -> T:
    """Load ``DATA_DIR / json_file`` into ``model_class``."""
    data = load_json_data(DATA_DIR / json_file)
    try:
        return model_class.model_validate(data)
    except Exception:
        logger.exception("Error loading model %s from %s", model_class.__name__, json_file)
        raise HTTPException(status_code=500, detail=_GENERIC_DETAIL)


# functools.cache does not memoise a raised exception, so a failed load is
# retried on the next call, exactly like the hand-rolled cache it replaces.
@cache
def load_experience() -> Experience:
    return load_model(Experience, "experience.json")


@cache
def load_projects() -> Projects:
    return load_model(Projects, "projects.json")


@cache
def load_skills() -> Skills:
    return load_model(Skills, "skills.json")


@cache
def load_aboutme() -> AboutMe:
    return load_model(AboutMe, "aboutme.json")


@cache
def load_contact() -> Contact:
    return load_model(Contact, "contact.json")
