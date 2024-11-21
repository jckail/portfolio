"""
Helper module to migrate from dictionary-based models to Pydantic models.
This module provides utility functions to convert existing dictionary data
to the new Pydantic model format while ensuring data validation.
"""

from typing import Dict, Any

from .old_models import aboutme
from ..pydantic_models import (
    Experience,
    Projects,
    Skills,
    AboutMe
)
from .. import experience, projects, skills

def migrate_experience() -> Experience:
    """Migrate experience data to Pydantic model."""
    try:
        # The dictionary is directly imported as 'experience'
        return Experience(**experience)
    except Exception as e:
        print(f"Error migrating experience data: {str(e)}")
        raise

def migrate_projects() -> Projects:
    """Migrate projects data to Pydantic model."""
    try:
        # The dictionary is directly imported as 'projects'
        return Projects(**projects)
    except Exception as e:
        print(f"Error migrating projects data: {str(e)}")
        raise

def migrate_skills() -> Skills:
    """Migrate skills data to Pydantic model."""
    try:
        # The dictionary is directly imported as 'skills'
        return Skills.model_validate(skills)
    except Exception as e:
        print(f"Error migrating skills data: {str(e)}")
        raise

def migrate_aboutme() -> AboutMe:
    """Migrate about me data to Pydantic model."""
    try:
        # The dictionary is imported as 'about_me'
        return AboutMe(**aboutme.about_me)
    except Exception as e:
        print(f"Error migrating about me data: {str(e)}")
        raise

def migrate_all() -> Dict[str, Any]:
    """Migrate all data to Pydantic models."""
    return {
        'experience': migrate_experience(),
        'projects': migrate_projects(),
        'skills': migrate_skills(),
        'aboutme': migrate_aboutme()
    }

# Example usage:
if __name__ == "__main__":
    try:
        # Migrate individual models
        experience_model = migrate_experience()
        projects_model = migrate_projects()
        skills_model = migrate_skills()
        aboutme_model = migrate_aboutme()

        print("✅ Successfully migrated all models")

        # Or migrate all at once
        all_models = migrate_all()
        print("✅ Successfully validated all data")

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
