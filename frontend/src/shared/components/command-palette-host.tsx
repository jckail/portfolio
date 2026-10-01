import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';

// The palette (and its stylesheet) is only fetched the first time it opens;
// the always-mounted host is just the Ctrl/Cmd+K listener.
const CommandPalette = lazy(() => import('./command-palette'));

/** Global Ctrl/Cmd+K listener that owns palette open state. */
export const CommandPaletteHost: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Stable, so the palette's command list is not rebuilt on every render
  const close = useCallback(() => setOpen(false), []);

  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <CommandPalette open onClose={close} />
    </Suspense>
  );
};

export default CommandPaletteHost;
