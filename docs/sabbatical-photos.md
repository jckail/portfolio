# Adding photos to the Sabbatical entry

The role dialog renders a small gallery only when a role has a non-empty
`photos` list. The Sabbatical entry has none yet.

1. Put the image files under `frontend/public/images/sabbatical/`. Prefer
   WebP or JPEG, about 1200 px on the long edge and well under 300 KB each.
   Strip location metadata (EXIF) before committing: this is a public repo.
2. Add them to the `sabbatical` entry in `backend/app/data/experience.json`:

   ```json
   "photos": [
       {"src": "/images/sabbatical/example.webp", "alt": "What the image shows, for someone who cannot see it", "caption": "Optional visible caption"}
   ]
   ```

   `src` must start with `/images/`; `alt` is required and should describe the
   picture, not repeat the caption. `caption` is optional.
3. Restart the backend (loaders are cached), open `/?company=sabbatical`, and
   check the dialog in both themes at desktop and 390 px width.
4. Run `pytest backend/tests/test_data.py` (it checks the files exist) and the
   frontend experience tests.

The gallery is `ExperienceModal.tsx`; styles are at the end of
`frontend/src/styles/components/modal.css`.
