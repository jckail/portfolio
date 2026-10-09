# Writing at jckail.com/blog

The blog is a server-rendered, dependency-free public document. It works without
JavaScript, with themed reading views, per-post metadata, an RSS feed, and sitemap
discovery. JavaScript only controls the optional light/dark switch. The portfolio
and blog share the `portfolio-theme-preference` setting.

## Publish a post

1. Create `backend/app/data/blog/your-slug.md` locally or in GitHub's file editor.
2. Add its metadata to `backend/app/data/blog/posts.json`: `slug`, `title`,
   `description`, `published` (ISO date), and `draft: true`.
3. Review the writing in a pull request. Set `draft: false` when ready to publish.
4. Merge after CI passes. The existing deployment workflow publishes the page,
   updates `/blog/feed.xml`, and adds the article to `/sitemap.xml`.

Use lowercase ASCII slugs separated with hyphens. Keep slugs stable after
publication so links and RSS identifiers remain valid. Drafts and future-dated
entries return 404 and are excluded from listings, RSS, and sitemap. Future-dated
posts become eligible at midnight UTC on their publication date. Edits and
unpublishing require a deployment; allow the five-minute public cache lifetime
and stale revalidation window for changes.

Supported Markdown: paragraphs, headings, `-` lists, fenced code, inline code,
bold text, and HTTP(S)/root-relative/fragment links. The article title is the H1;
Markdown headings start at H2. Raw HTML is displayed as text. Images, tables,
embedded scripts, tracking pixels, and arbitrary iframes are not supported.

`first-post.md` is an unpublished authoring example, not a post attributed to Jordan.
Replace its text and metadata before publishing. No browser admin/editor or
third-party account is necessary for the GitHub workflow.

## Optional Substack import

No Substack account or publication exists yet; nothing is connected or fetched.
When Jordan creates one, download his own publication's RSS feed/export as an RSS
XML file. The helper imports that **local file** as unpublished drafts:

[Substack's official RSS instructions](https://support.substack.com/hc/en-us/articles/360038239391-Is-there-an-RSS-feed-for-my-publication)
describe the publication feed at `https://your-publication.substack.com/feed`.

```bash
python helpers/import_substack.py /path/to/feed.xml --publication https://your-publication.substack.com
python helpers/import_substack.py /path/to/feed.xml --publication https://your-publication.substack.com --write
```

The first command previews. The second writes new drafts only. It never fetches a
URL, overwrites a post, or publishes automatically. Re-importing the same source
URLs skips them. The exact publication origin is required; a custom HTTPS domain
is supported. Limits: 2 MB, 100 entries, no XML entity declarations.

The importer converts feed HTML to plain paragraphs, discarding scripts/styles
and embedded media. Review formatting, code, links, and excerpt completeness in
the resulting Markdown, especially when the RSS feed contains excerpts rather
than full articles. It is deliberately a **one-way, reviewed import**, not live
bidirectional synchronization. Updates to existing posts stay manual.

Imported metadata preserves `source_url`, which becomes the article's canonical
URL and an attribution link. Imported pages are omitted from the local sitemap
to avoid advertising duplicates; the blog index and RSS still link to the local
reading page. Remove `source_url` only if the portfolio is intentionally the
original publication. Only import content Jordan owns and approves for public
republication. A future scheduled sync must explicitly select the publication,
publication policy, and how edits/deletions are reconciled.

Checks: `pytest backend/tests/test_blog.py backend/tests/test_blog_import.py -q --no-cov`.
