"""
Helper module for counting records in the skills list.
"""
from .skills_updated import skills

def count_skills():
    """
    Returns the total number of skills in the skills list.
    
    Returns:
        int: The total number of skills
    """
    return len(skills)
