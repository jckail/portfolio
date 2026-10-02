# Portfolio UX audit corrections

Review branch `fix/superdesign-portfolio-ux` is based on merged Portfolio commit `5fd6e11`. It changes the home page and shared UI; it does not change the concurrently maintained Data Playground workbench.

## Corrected findings

- S1: resume filename/HTTP failures reject the download promise, so the component records failure rather than successful-download analytics. The preview URL remains the stable API URL rather than a revoked download object URL.
- S2: contact submission success uses a status announcement; contact and resume failures use alerts. Starting another contact attempt clears the previous success state.
- S3: resizing copies and restores the doodle bitmap, preserving the drawing and its stroke count.
- S5: `/index.html` is recognized as the home-page alias already served by the backend.
- S6: the section drawer announces its highlighted location with `aria-current`.
- S7/D1: footer, palette and assistant request doodle visibility through one shared action. The page owns visibility; the board scrolls once mounted through the reduced-motion-aware helper. Reopening an already visible board still navigates to it.
- D2/D3: command search is a combobox with stable option IDs and an active descendant. Options remain outside sequential Tab navigation, and arrow selection scrolls the active option into view.
- D4: ordinary page shortcuts ignore the shared modal stack and focused controls inside other modal dialogs, including MUI dialogs. Ctrl/Cmd+K remains the intentional global palette control.

## Separate workbench findings

S4 (consent withdrawal), L1 (cold vector fragment) and L2 (task heading order) concern the Data Playground workbench. They need current-source/browser assessment by its existing owner. The source now has a dedicated six-view workbench shell, a legacy-fragment-to-view resolver, and an active-view mount scroll; the earlier single-page screenshot is historical evidence. No workbench fix or passing workbench browser result is claimed here.

## Verification

Focused regression files cover failed resume outcomes and analytics, announced contact responses, bitmap restore, home visibility ownership and reduced motion, palette option state/scroll, assistant actions, alias routing, section current state and modal shortcut scope. Full-source ESLint, TypeScript and `git diff --check` passed. Thirty-nine focused tests passed across ten files. The full frontend suite did not execute: the shared heavy-check wrapper exhausted its120-second lock wait and returned exit75. It was not retried or bypassed. No production build, backend suite or deployment was performed.

For browser review, an isolated Vite preview uses port5186. Its temporary config allows only public production API GETs, rejects all mutation methods, disables chat availability, and has no websocket proxy. The preview config and dependency symlink are local helpers and are excluded from this patch. The root session owns the single browser tab and final browser verification.
