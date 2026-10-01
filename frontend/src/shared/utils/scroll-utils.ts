const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll a section's top to just below the fixed header.
 *
 * The header offset lives in CSS (`scroll-margin-top` on `section[id]`, see
 * main-content.css), so one scrollIntoView is enough. The previous version
 * scrolled, then 100ms later issued a second smooth scroll computed from
 * --header-height, which no longer matched the rendered header height.
 */
export const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start'
  });
};
