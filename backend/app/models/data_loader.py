"""
Utility module for loading JSON data into Pydantic models.
This module provides functions to load data from JSON files in the data directory
and convert them into their corresponding Pydantic models.
"""

import json
from pathlib import Path
from typing import TypeVar, Type, Any, Dict
from fastapi import HTTPException
from .experience import Experience
from .projects import Projects
from .skills import Skills
from .aboutme import AboutMe
from .contact import Contact

T = TypeVar('T')

class DataCache:
    _instance = None
    _cache: Dict[str, Any] = {}
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def get_or_load(self, key: str, loader_func):
        """Get data from cache or load it if not present"""
        if key not in self._cache:
            self._cache[key] = loader_func()
        return self._cache[key]
    
    def clear(self):
        """Clear the cache"""
        self._cache.clear()
    
    def invalidate(self, key: str):
        """Invalidate a specific cache entry"""
        if key in self._cache:
            del self._cache[key]

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
    cache = DataCache.get_instance()
    return cache.get_or_load('experience', lambda: load_model(Experience, 'experience.json'))

def load_projects() -> Projects:
    """Load projects data from JSON."""
    cache = DataCache.get_instance()
    return cache.get_or_load('projects', lambda: load_model(Projects, 'projects.json'))

def load_skills() -> Skills:
    """Load skills data from JSON."""
    cache = DataCache.get_instance()
    return cache.get_or_load('skills', lambda: load_model(Skills, 'skills.json'))

def load_aboutme() -> AboutMe:
    """Load about me data from JSON."""
    cache = DataCache.get_instance()
    return cache.get_or_load('aboutme', lambda: load_model(AboutMe, 'aboutme.json'))

def load_contact() -> Contact:
    """Load contact data from JSON."""
    cache = DataCache.get_instance()
    return cache.get_or_load('contact', lambda: load_model(Contact, 'contact.json'))

def load_all() -> dict[str, Any]:
    """Load all models from their respective JSON files."""
    try:
        cache = DataCache.get_instance()
        return {
            'experience': cache.get_or_load('experience', load_experience),
            'projects': cache.get_or_load('projects', load_projects),
            'skills': cache.get_or_load('skills', load_skills),
            'aboutme': cache.get_or_load('aboutme', load_aboutme),
            'contact': cache.get_or_load('contact', load_contact)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading all models: {str(e)}"
        )
