# Pydantic Models Migration

This directory contains Pydantic models that replace the previous dictionary-based data structures. These models provide type safety, validation, and better IDE support.

## Models Overview

- `Experience`: Professional experience data model
- `Projects`: Portfolio projects data model
- `Skills`: Technical skills data model
- `AboutMe`: Personal information data model

## Usage

### Direct Model Usage

```python
from app.models.pydantic_models import Experience, Projects, Skills, AboutMe

# Create a new experience entry
experience = Experience(
    prove={
        "company": "Prove Identity",
        "title": "Staff Data Engineer",
        # ... other fields
    },
    # ... other companies
)

# Create a new project
project = Projects(
    super_teacher={
        "title": "Super Teacher",
        "description": "AI app for teachers",
        # ... other fields
    },
    # ... other projects
)

# Create skills entry
skills = Skills.model_validate({
    "python": {
        "display_name": "Python",
        "image": "python.svg",
        # ... other fields
    }
})

# Create about me entry
about_me = AboutMe(
    greeting="👋 Hi, I'm an engineer",
    description="With over 12 years of experience...",
    # ... other fields
)
```

### Migration from Old Models

Use the migration helper to convert existing dictionary data to Pydantic models:

```python
from app.models.migration_helper import migrate_all, migrate_experience, migrate_projects, migrate_skills, migrate_aboutme

# Migrate all models at once
all_models = migrate_all()

# Or migrate individual models
experience_model = migrate_experience()
projects_model = migrate_projects()
skills_model = migrate_skills()
aboutme_model = migrate_aboutme()
```

## Benefits

1. **Type Safety**: Catch type-related errors at runtime
2. **Validation**: Automatic data validation based on model definitions
3. **IDE Support**: Better autocomplete and type hints
4. **Documentation**: Self-documenting models with field descriptions
5. **Serialization**: Easy conversion to/from JSON and other formats

## Model Structure

### Experience Model
- Company-specific details including title, date, location, highlights
- Nested structure for detailed information

### Projects Model
- Project details including title, description, links
- Support for multiple projects with consistent structure

### Skills Model
- Detailed skill information including experience level and categories
- Uses RootModel for dictionary-like access with validation

### AboutMe Model
- Personal information and biography
- Structured format for consistent presentation

## Migration Notes

1. All existing dictionary data is compatible with these models
2. Models include validation to ensure data consistency
3. Use the migration helper for safe conversion of existing data
4. Models are designed to be backward compatible with existing frontend expectations

## Best Practices

1. Always use type hints when working with these models
2. Validate data using model methods before using it
3. Use the provided helper functions for migration
4. Keep model definitions updated as data structure evolves
