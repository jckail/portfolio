import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { beforeAll, vi } from 'vitest';

// Lazily loaded dialogs (React.lazy + a dynamic import that Vite has to
// transform) can take well over the 1s default when the machine is busy;
// findBy*/waitFor stop as soon as the element appears, so a larger ceiling
// only costs time when something is genuinely broken.
configure({ asyncUtilTimeout: 5000 });

beforeAll(() => {
  // jsdom does not implement scrolling
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  class IntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserver,
  });

  // Mock ResizeObserver
  class ResizeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: ResizeObserver,
  });
});
