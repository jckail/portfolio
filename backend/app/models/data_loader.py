"""
Utility module for loading JSON data into Pydantic models.
This module provides functions to load data from JSON files in the data directory
and convert them into their corresponding Pydantic models.
"""

import json
from pathlib import Path
from typing import TypeVar, Type, Any
from fastapi import HTTPException
from .experience import Experience
from .projects import Projects
from .skills import Skills
from .aboutme import AboutMe
from .contact import Contact

T = TypeVar('T')

def load_json_data(file_path: str) -> dict:
    """Load data from a JSON file."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading JSON from {file_path}: {str(e)}"
        )

def load_model(model_class: Type[T], json_file: str) -> T:
    """Load JSON data into a specified Pydantic model."""
    data_dir = Path(__file__).parent.parent / 'data'
    file_path = data_dir / json_file
    
    try:
        data = load_json_data(str(file_path))
        return model_class.model_validate(data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading model {model_class.__name__} from {json_file}: {str(e)}"
        )

def load_experience() -> Experience:
    """Load experience data from JSON."""
    return load_model(Experience, 'experience.json')

def load_projects() -> Projects:
    """Load projects data from JSON."""
    return load_model(Projects, 'projects.json')

def load_skills() -> Skills:
    """Load skills data from JSON."""
    return load_model(Skills, 'skills.json')

def load_aboutme() -> AboutMe:
    """Load about me data from JSON."""
    return load_model(AboutMe, 'aboutme.json')

def load_contact() -> Contact:
    """Load contact data from JSON."""
    return load_model(Contact, 'contact.json')

def load_all() -> dict[str, Any]:
    """Load all models from their respective JSON files."""
    try:
        return {
            'experience': load_experience(),
            'projects': load_projects(),
            'skills': load_skills(),
            'aboutme': load_aboutme(),
            'contact': load_contact()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading all models: {str(e)}"
        )
