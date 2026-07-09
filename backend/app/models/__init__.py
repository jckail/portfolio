from .aboutme import AboutMe
from .contact import Contact
from .data_loader import load_aboutme, load_all, load_contact, load_experience, load_projects, load_skills
from .experience import Experience, ExperienceHighlight
from .projects import ProjectDetail, Projects
from .skills import SkillDetail, Skills


def get_all_models():
    """
    Aggregates all model dictionaries into a single JSON object.
    Returns a dictionary containing all model data.
    """
    return {
        "about_me": load_aboutme(),
        "contact": load_contact(),
        "experience": load_experience(),
        "projects": load_projects(),
        "skills": load_skills()
    }


__all__ = [
    # Models
    'Experience',
    'ExperienceHighlight',
    'Projects',
    'ProjectDetail',
    'Skills',
    'SkillDetail',
    'AboutMe',
    'Contact',
    # Data loaders
    'load_experience',
    'load_projects',
    'load_skills',
    'load_aboutme',
    'load_contact',
    'load_all'
]
