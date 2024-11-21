from pydantic import BaseModel, HttpUrl, Field, RootModel
from typing import Dict, List, Optional

class SkillDetail(BaseModel):
    """Model for individual skill details."""
    display_name: str = Field(..., description="Display name of the skill")
    image: str = Field(..., description="Path to skill icon/image")
    professional_experience: bool = Field(..., description="Whether there is professional experience with this skill")
    years_of_experience: int = Field(..., ge=0, description="Years of experience with this skill")
    tags: List[str] = Field(..., description="Tags/categories associated with the skill")
    description: str = Field(..., description="Detailed description of the skill")
    weblink: HttpUrl = Field(..., description="Official website or documentation link")
    examples: Dict = Field(default_factory=dict, description="Examples of skill usage")
    general_category: str = Field(..., description="Primary category of the skill")
    sub_category: str = Field(..., description="Sub-category of the skill")

class Skills(RootModel[Dict[str, SkillDetail]]):
    """Model for all skills."""
    
    class Config:
        json_schema_extra = {
            "example": {
                "python": {
                    "display_name": "Python",
                    "image": "python.svg",
                    "professional_experience": True,
                    "years_of_experience": 15,
                    "tags": ["language", "general-purpose", "scripting", "data-science"],
                    "description": "A high-level programming language known for its simplicity and readability",
                    "weblink": "https://www.python.org/",
                    "examples": {},
                    "general_category": "Programming Languages",
                    "sub_category": "General Purpose"
                }
            }
        }
