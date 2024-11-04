# Theme Feature

The theme feature manages application theming, including theme switching and the particles background.

## Components

### `theme-provider.tsx`
Context provider for theme state and operations.

### `particles-provider.tsx`
Manages the interactive particles background.

## Configuration

### Particles Config
```typescript
const particlesConfig = {
  particles: {
    number: { value: 80 },
    color: { value: '#000000' },
    // ...
  },
  // ...
};
```

## Styles

### Theme Variables
```css
:root[data-theme='light'] {
  --background-color: #ffffff;
  --text-color: #000000;
  // ...
}

:root[data-theme='dark'] {
  --background-color: #000000;
  --text-color: #ffffff;
  // ...
}
```

## Usage

```tsx
import { useTheme } from '@/features/theme/stores/theme-store';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

## Testing

Run tests:
```bash
npm test -- --watch src/features/theme
```

## Best Practices

1. Theme Switching
   - Use CSS variables for theme values
   - Ensure smooth transitions
   - Handle system preference

2. Particles Background
   - Adjust colors based on theme
   - Optimize performance
   - Handle window resize
