from pydantic import BaseModel, HttpUrl, EmailStr, Field

class Contact(BaseModel):
    """Model for contact information."""
    firstName: str = Field(..., description="First name")
    lastName: str = Field(..., description="Last name")
    title: str = Field(..., description="Professional title")
    email: EmailStr = Field(..., description="Email address")
    phone: str = Field(..., description="Phone number")
    website: HttpUrl = Field(..., description="Personal website URL")
    location: str = Field(..., description="City and state/region")
    country: str = Field(..., description="Country of residence")
    github: HttpUrl = Field(..., description="GitHub profile URL")
    linkedin: HttpUrl = Field(..., description="LinkedIn profile URL")

    class Config:
        json_schema_extra = {
            "example": {
                "firstName": "Jordan",
                "lastName": "Kail",
                "title": "AI/Data Engineer",
                "email": "jckail13@gmail.com",
                "phone": "571-218-5000",
                "website": "https://jordan-kail.com/",
                "location": "Denver, CO",
                "country": "United States",
                "github": "https://github.com/jckail",
                "linkedin": "https://www.linkedin.com/in/jckail/"
            }
        }
