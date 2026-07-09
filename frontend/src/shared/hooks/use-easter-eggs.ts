import { useEffect } from 'react';

import { useThemeStore } from '../stores/theme-store';

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

/**
 * Easter eggs that activate party mode:
 * - Konami code (↑↑↓↓←→←→BA)
 * - Secret query `?party=1` or hash `#party`
 */
export function useEasterEggs() {
  const setTheme = useThemeStore(state => state.setTheme);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('party') === '1' || window.location.hash === '#party') {
      setTheme('party');
    }
  }, [setTheme]);

  useEffect(() => {
    let index = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const expected = KONAMI[index];
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === expected || key === expected.toLowerCase()) {
        index += 1;
        if (index === KONAMI.length) {
          index = 0;
          setTheme('party');
          // Soft celebration flash
          document.documentElement.classList.add('party-burst');
          window.setTimeout(() => {
            document.documentElement.classList.remove('party-burst');
          }, 1200);
        }
      } else {
        index = key === KONAMI[0] ? 1 : 0;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setTheme]);
}
