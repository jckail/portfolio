from .old_models.aboutme import about_me
from .old_models.contact import contact
from .old_models.experience import experience
from .old_models.projects import projects
from .old_models.skills import skills

def get_all_models():
    """
    Aggregates all model dictionaries into a single JSON object.
    Returns a dictionary containing all model data.
    """
    return {
        "about_me": about_me,
        "contact": contact,
        "experience": experience,
        "projects": projects,
        "skills": skills
    }
