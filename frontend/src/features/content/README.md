# Resume Feature

The resume feature handles all resume-related functionality including data display, sections, and PDF generation.

## Components

### `resume.tsx`
Main resume component that orchestrates all resume sections.

### `resume-provider.tsx`
Context provider for resume data and operations.

### Sections
- `about-me.tsx`: About section
- `experience.tsx`: Work experience section
- `skills.tsx`: Skills section
- `projects.tsx`: Projects section
- `my-resume.tsx`: Resume download section

## State Management

Uses `resume-store.ts` for managing:
- Resume data
- Loading states
- Error states
- PDF generation

## Styles

Each component has its own CSS module:
- `experience.css`
- `skills.css`
- `projects.css`
- etc.

## Types

Defined in `types.ts`:
```typescript
interface ResumeData {
  name: string;
  title: string;
  aboutMe: string;
  experience: Experience[];
  technicalSkills: Record<string, string[]>;
  projects: Project[];
  // ...
}
```

## Usage

```tsx
import { useResume } from '@/features/content/components/resume-provider';

function MyComponent() {
  const { resumeData, isLoading, error } = useResume();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>{resumeData.name}</div>;
}
```

## Testing

Run tests:
```bash
npm test -- --watch src/features/resume
```

## API Integration

The feature integrates with these backend endpoints:
- GET `/api/resume_data`: Fetch resume data
- GET `/api/resume`: Download PDF version
- GET `/api/resume_file_name`: Get PDF filename
