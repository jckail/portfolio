from .aboutme import about_me
from .contact import contact
from .experience import experience
from .projects import projects
from .skills import skills

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
