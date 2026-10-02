# Portfolio UX audit corrections

Review branch `fix/superdesign-portfolio-ux` is based on merged Portfolio commit `5fd6e11`. It changes the home page and shared UI, plus two isolated workbench corrections in files verified untouched by the active workbench owner.

## Corrected findings

- S1: resume filename/HTTP failures reject the download promise, so the component records failure rather than successful-download analytics. The preview URL remains the stable API URL rather than a revoked download object URL.
- S2: contact submission success uses a status announcement; contact and resume failures use alerts. Starting another contact attempt clears the previous success state.
- S3: resizing copies and restores the doodle bitmap, preserving the drawing and its stroke count.
- S4: the workbench footer opens the existing shared consent portal, letting visitors withdraw a saved choice on the independently mounted lab page.
- S5: `/index.html` is recognized as the home-page alias already served by the backend.
- S6: the section drawer announces its highlighted location with `aria-current`.
- S7/D1: footer, palette and assistant request doodle visibility through one shared action. The page owns visibility; the board expands its height immediately, retaining an opacity fade, and scrolls on the next animation frame through the reduced-motion-aware helper after modal cleanup. Reopening an already visible board still navigates to it.
- D2/D3: command search is a combobox with stable option IDs and an active descendant. Options remain outside sequential Tab navigation, and arrow selection scrolls the active option into view.
- D4: ordinary page shortcuts ignore the shared modal stack and focused controls inside other modal dialogs, including MUI dialogs. Ctrl/Cmd+K remains the intentional global palette control.

## Separate workbench findings

L2: task detail uses a level-three heading beneath the Workflow execution level-two heading, correcting the skipped level. L1 (cold vector fragment) is superseded and passed the current cold-navigation browser assessment: the source now has a six-view workbench shell, a legacy-fragment-to-view resolver and an active-view mount scroll. The root classified the original fragment finding as superseded by the new workbench shell; no new fragment behavior fix is claimed. Active owner's data-copilot, incident-guide and backend runtime changes remain untouched.

## Verification

Focused regression files cover failed resume outcomes and analytics, announced contact responses, bitmap restore, home visibility ownership and reduced motion, palette option state/scroll, assistant actions, alias routing, section current state and modal shortcut scope. Full-source ESLint, TypeScript and `git diff --check` passed. The initial39 focused tests passed across ten files; after the browser-driven navigation timing correction and minimal workbench changes,21 tests passed across four affected regression files, followed by three passing home integration tests including palette-close scroll-lock sequencing. These include57 distinct tests exercised across twelve files during this task. The full frontend suite did not execute: the shared heavy-check wrapper exhausted its120-second lock wait and returned exit75. It was not retried or bypassed. No production build, backend suite or deployment was performed.

For browser review, an isolated Vite preview uses port5186. Its temporary config allows only public production API GETs, rejects all mutation methods, disables chat availability, and has no websocket proxy. The preview config and dependency symlink are local helpers and are excluded from this patch. The root session owns the single browser tab and final browser verification. Its local timing retest confirmed palette opening now ends at `#doodle`, with the board top87.6px below the viewport top, visible and non-inert.

Root browser verification: cold `/dataplayground#lab-vectors` selected Explore and placed the vector section at73.7px from the top on a414px viewport, with no page overflow. Cookie settings opened the named consent region on the independently mounted workbench. Command palette final party option stayed visible and exposed its active descendant. Local `/index.html` rendered home. Open doodle landed at87.6px below the header and remained non-inert. A synthetic bitmap mark persisted across an actual canvas resize from325×717 to349×792; this is bitmap-resize verification, not a claimed pointer-drawing gesture. Screenshot capture timed out; full rendered visual review remains incomplete.
