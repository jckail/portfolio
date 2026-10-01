"""Machine-readable renditions of the portfolio content.

Everything here is generated from the same JSON the SPA renders (the cached
loaders in ``models/data_loader.py``), so a crawler, an LLM agent and a human
see the same facts and nothing can drift out of date:

* ``snapshot_html``   semantic HTML placed inside ``#root`` of index.html, for
                      clients that do not run JavaScript. React replaces it on
                      mount.
* ``jsonld``          schema.org graph (Person, WebSite, ProfilePage).
* ``llms_txt`` / ``llms_full_txt``   the llms.txt convention (llmstxt.org).
* ``resume_json``     JSON Resume 1.0.0 (jsonresume.org).
* ``sitemap_xml``     sitemap with ``lastmod``.

Each builder is cached for the life of the process (content is fixed until the
next deploy) and returns bytes. No phone number is ever included, and the
email address only appears where it was already public (JSON-LD, resume.json).
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import cache
from html import escape
from pathlib import Path

from ..models.data_loader import DATA_DIR, load_aboutme, load_contact, load_experience, load_projects, load_skills
from ..models.experience import ExperienceHighlight
from ..models.skills import SkillDetail

# The one public identity of the site. Other hostnames serve the same app but
# every absolute URL we publish points here.
CANONICAL_ORIGIN = "https://www.jckail.com"
RESUME_PDF_PATH = "/api/resume"
SHARE_IMAGE_PATH = "/images/og-image.png"
JSON_RESUME_SCHEMA = "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json"

SNAPSHOT_ID = "seo-snapshot"


def absolute(path: str) -> str:
    return CANONICAL_ORIGIN + path


# --- Dates -----------------------------------------------------------------------

_RANGE = re.compile(r"^\s*(\d{1,2})/(\d{4})\s*(?:[-–]\s*(?:(\d{1,2})/(\d{4})|(present|current|now))\s*)?$", re.I)


@dataclass(frozen=True, slots=True)
class DateRange:
    """An employment range from "MM/YYYY - MM/YYYY|Present"; ISO strings are YYYY-MM."""

    start: str | None
    end: str | None
    current: bool
    start_label: str = ""
    end_label: str = ""


def parse_date_range(text: str) -> DateRange:
    match = _RANGE.match(text or "")
    if match is None:
        return DateRange(None, None, False)
    sm, sy, em, ey, present = match.groups()
    start = f"{int(sy):04d}-{int(sm):02d}"
    start_label = f"{int(sm):02d}/{sy}"
    if present:
        return DateRange(start, None, True, start_label, "Present")
    if em and ey:
        return DateRange(start, f"{int(ey):04d}-{int(em):02d}", False, start_label, f"{int(em):02d}/{ey}")
    return DateRange(start, None, False, start_label, "")


# --- Shared data views -----------------------------------------------------------


def _full_name() -> str:
    contact = load_contact()
    return f"{contact.firstName} {contact.lastName}".strip()


def _experience() -> list[tuple[str, ExperienceHighlight]]:
    return list(load_experience().root.items())


def _current_role() -> tuple[str, str]:
    """(title, company) of the role marked Present, else the contact title."""
    for _, job in _experience():
        if parse_date_range(job.date).current:
            return job.title, job.company
    return load_contact().title, ""


def _headline() -> str:
    title, company = _current_role()
    return f"{title} at {company}" if company else title


# Mirrors OLDER_ROLE_HIGHLIGHTS in frontend/.../experience.tsx (a test keeps
# them equal): older roles show this many bullets on the timeline card.
OLDER_ROLE_HIGHLIGHTS = 2


def _visible_highlights(index: int, job: ExperienceHighlight) -> list[str]:
    """The bullets a visitor can read: the timeline card's, then the dialog's.

    The current role (and the first entry) shows every ``highlights`` bullet on
    its card; older roles show the first few and the dialog lists
    ``more_highlights``. A ``highlights`` bullet cut from the card and absent
    from the dialog is displayed nowhere, so it is left out here too.
    """
    current = index == 0 or parse_date_range(job.date).current
    shown = job.highlights if current else job.highlights[:OLDER_ROLE_HIGHLIGHTS]
    seen: set[str] = set()
    out: list[str] = []
    for line in [*shown, *job.more_highlights]:
        line = line.strip()
        if line and line not in seen:
            seen.add(line)
            out.append(line)
    return out


def _tech_labels(keys: list[str]) -> str:
    """Experience stacks hold skill keys; show each skill's display name."""
    skills = load_skills().root
    return ", ".join(skills[k].display_name if k in skills else k for k in keys)


def _skills_by_category() -> dict[str, list[SkillDetail]]:
    groups: dict[str, list[SkillDetail]] = {}
    for skill in load_skills().root.values():
        groups.setdefault(skill.general_category, []).append(skill)
    return groups


def _bio_paragraphs() -> list[str]:
    return [p.strip() for p in load_aboutme().brief_bio.split("\n") if p.strip()]


def _city_region() -> tuple[str, str]:
    city, _, region = load_contact().location.partition(",")
    return city.strip(), region.strip()


def _profiles() -> list[tuple[str, str, str]]:
    """(network, username, url) for the public profiles in contact.json."""
    contact = load_contact()
    out = []
    for network, url in (("GitHub", str(contact.github)), ("LinkedIn", str(contact.linkedin))):
        if url:
            out.append((network, url.rstrip("/").rsplit("/", 1)[-1], url))
    return out


def _headshot_url() -> str:
    portrait = load_aboutme().full_portrait
    return portrait if portrait.startswith("http") else absolute(portrait)


@cache
def last_modified() -> datetime:
    """Newest modification time of the content files (a deploy-time proxy)."""
    stamps = [p.stat().st_mtime for p in Path(DATA_DIR).glob("*.json")]
    return datetime.fromtimestamp(max(stamps), tz=UTC) if stamps else datetime.now(UTC)


def last_modified_date() -> str:
    return last_modified().strftime("%Y-%m-%d")


# --- HTML snapshot ---------------------------------------------------------------


def _a(url: str, label: str, rel: str = "noopener") -> str:
    # tabindex=-1: the snapshot is replaced by the app moments after load. If its
    # links were tabbable, an early Tab would land on one that React then removes,
    # dropping focus before the skip link. Still readable by crawlers and AT.
    return f'<a href="{escape(url, quote=True)}" rel="{rel}" tabindex="-1">{escape(label)}</a>'


def _time(iso: str | None, label: str) -> str:
    if not iso:
        return escape(label)
    return f'<time datetime="{escape(iso, quote=True)}">{escape(label)}</time>'


def _date_range_html(job: ExperienceHighlight) -> str:
    rng = parse_date_range(job.date)
    if rng.start is None:
        return escape(job.date)
    end = escape("Present") if rng.current else _time(rng.end, rng.end_label) if rng.end_label else ""
    start = _time(rng.start, rng.start_label)
    return f"{start} – {end}" if end else start


@cache
def snapshot_html() -> bytes:
    """Semantic, escaped HTML of the whole portfolio for non-JavaScript readers."""
    about = load_aboutme()
    contact = load_contact()
    parts: list[str] = [f'<main id="{SNAPSHOT_ID}" class="{SNAPSHOT_ID}">']

    parts.append("<header>")
    parts.append(f"<p>{escape(about.greeting)}</p>")
    parts.append(f"<h1>{escape(_full_name())}</h1>")
    parts.append(f"<p>{escape(_headline())}</p>")
    parts.append(f"<p>{escape(contact.location)}, {escape(contact.country)}</p>")
    parts.append(f"<p>{escape(about.description)}</p>")
    for paragraph in _bio_paragraphs():
        parts.append(f"<p>{escape(paragraph)}</p>")
    parts.append("</header>")

    parts.append('<section id="seo-experience"><h2>Experience</h2>')
    for index, (_, job) in enumerate(_experience()):
        parts.append("<article>")
        parts.append(f"<h3>{escape(job.title)}, {_a(str(job.link), job.company)}</h3>")
        parts.append(f"<p>{_date_range_html(job)} &middot; {escape(job.location)}</p>")
        parts.append(f"<p>{escape(job.company_description)}</p>")
        parts.append("<ul>" + "".join(f"<li>{escape(h)}</li>" for h in _visible_highlights(index, job)) + "</ul>")
        if job.tech_stack:
            parts.append(f"<p>Technologies: {escape(_tech_labels(job.tech_stack))}</p>")
        parts.append("</article>")
    parts.append("</section>")

    parts.append('<section id="seo-projects"><h2>Projects</h2>')
    for project in load_projects().root.values():
        parts.append("<article>")
        parts.append(f"<h3>{escape(project.title.strip())}</h3>")
        parts.append(f"<p>{escape(project.description)}</p>")
        parts.append(f"<p>{escape(project.description_detail)}</p>")
        links = [_a(str(project.link), "Project link")]
        if project.link2:
            links.append(_a(str(project.link2), "Live site"))
        parts.append("<p>" + " | ".join(links) + "</p>")
        if project.tech_stack:
            parts.append(f"<p>Technologies: {escape(', '.join(project.tech_stack))}</p>")
        parts.append("</article>")
    parts.append("</section>")

    parts.append('<section id="seo-skills"><h2>Skills</h2>')
    for category, skills in _skills_by_category().items():
        parts.append(f"<h3>{escape(category)}</h3>")
        parts.append("<ul>" + "".join(f"<li>{escape(s.display_name)}</li>" for s in skills) + "</ul>")
    parts.append("</section>")

    parts.append('<section id="seo-contact"><h2>Links</h2><ul>')
    for network, _, url in _profiles():
        parts.append(f"<li>{_a(url, network, 'me noopener')}</li>")
    parts.append(f"<li>{_a(RESUME_PDF_PATH, 'Resume (PDF)')}</li>")
    parts.append(f"<li>{_a('/resume.json', 'Resume (JSON Resume)')}</li>")
    parts.append(f"<li>{_a('/llms.txt', 'Summary for language models (llms.txt)')}</li>")
    parts.append("</ul></section>")

    parts.append("</main>")
    return "".join(parts).encode("utf-8")


# --- JSON-LD ---------------------------------------------------------------------


@cache
def jsonld_graph() -> dict:
    contact = load_contact()
    about = load_aboutme()
    title, company = _current_role()
    city, region = _city_region()
    person_id = absolute("/#person")

    # Primary skills first, then every professional skill, each once.
    seen: set[str] = set()
    knows: list[str] = []
    for name in [*about.primary_skills, *(s.display_name for s in load_skills().root.values() if s.professional_experience)]:
        if name.lower() not in seen:
            seen.add(name.lower())
            knows.append(name)

    person: dict = {
        "@type": "Person",
        "@id": person_id,
        "name": _full_name(),
        "url": absolute("/"),
        "jobTitle": title,
        "description": about.description,
        "image": _headshot_url(),
        "email": f"mailto:{contact.email}",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": city,
            "addressRegion": region,
            "addressCountry": "US",
        },
        "sameAs": [url for _, _, url in _profiles()],
        "knowsAbout": knows,
    }
    if company:
        job = next((j for _, j in _experience() if j.company == company), None)
        works_for: dict = {"@type": "Organization", "name": company}
        if job is not None:
            works_for["url"] = str(job.link)
        person["worksFor"] = works_for

    modified = last_modified_date()
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": absolute("/#website"),
                "url": absolute("/"),
                "name": f"{_full_name()} - {title}",
                "inLanguage": "en",
                "publisher": {"@id": person_id},
            },
            {
                "@type": "ProfilePage",
                "@id": absolute("/#profilepage"),
                "url": absolute("/"),
                "name": f"{_full_name()} - {title}",
                "dateModified": modified,
                "isPartOf": {"@id": absolute("/#website")},
                "mainEntity": {"@id": person_id},
            },
            person,
        ],
    }


@cache
def jsonld_json() -> bytes:
    """JSON-LD document as script-safe JSON (no raw ``<``, ``>`` or ``&``)."""
    from .content import script_safe

    raw = json.dumps(jsonld_graph(), ensure_ascii=False, indent=2).encode("utf-8")
    return script_safe(raw)


# --- llms.txt --------------------------------------------------------------------


def _llms_header() -> list[str]:
    about = load_aboutme()
    contact = load_contact()
    lines = [
        f"# {_full_name()}",
        "",
        f"> {_headline()}. {about.description}",
        "",
        f"Based in {contact.location}, {contact.country}. This file is generated from the same data as the website; "
        "the site is a single-page app, so use these plain-text and JSON renditions instead of scraping it.",
        "",
    ]
    return lines


@cache
def llms_txt() -> bytes:
    lines = _llms_header()
    lines += [
        "## Start here",
        "",
        f"- [Full portfolio as text]({absolute('/llms-full.txt')}): experience, projects and every skill in one document",
        f"- [Resume as JSON Resume]({absolute('/resume.json')}): structured work history, skills and projects",
        f"- [Resume as PDF]({absolute(RESUME_PDF_PATH)}): the downloadable resume",
        f"- [Portfolio website]({absolute('/')}): the interactive site",
        "",
        "## Experience",
        "",
    ]
    for _, job in _experience():
        lines.append(f"- [{job.company}]({job.link}): {job.title}, {job.date}, {job.location}")
    lines += ["", "## Projects", ""]
    for project in load_projects().root.values():
        lines.append(f"- [{project.title.strip()}]({project.link}): {project.description}")
    lines += ["", "## Profiles", ""]
    for network, _, url in _profiles():
        lines.append(f"- [{network}]({url})")
    lines += [
        "",
        "## Optional",
        "",
        f"- [About (JSON)]({absolute('/api/aboutme')})",
        f"- [Experience (JSON)]({absolute('/api/experience')})",
        f"- [Projects (JSON)]({absolute('/api/projects')})",
        f"- [Skills (JSON)]({absolute('/api/skills')})",
        "",
    ]
    return "\n".join(lines).encode("utf-8")


@cache
def llms_full_txt() -> bytes:
    contact = load_contact()
    lines = _llms_header()
    lines += ["## About", ""]
    lines += [p + "\n" for p in _bio_paragraphs()]
    lines += ["## Experience", ""]
    for index, (_, job) in enumerate(_experience()):
        lines += [
            f"### {job.title}, {job.company}",
            "",
            f"{job.date} | {job.location} | {job.link}",
            "",
            job.company_description,
            "",
        ]
        lines += [f"- {h}" for h in _visible_highlights(index, job)]
        if job.tech_stack:
            lines += ["", f"Technologies: {_tech_labels(job.tech_stack)}"]
        lines.append("")
    lines += ["## Projects", ""]
    for project in load_projects().root.values():
        lines += [f"### {project.title.strip()}", "", project.description, "", project.description_detail, ""]
        lines.append(f"Link: {project.link}" + (f" | Live: {project.link2}" if project.link2 else ""))
        if project.tech_stack:
            lines.append(f"Technologies: {', '.join(project.tech_stack)}")
        lines.append("")
    lines += ["## Skills", ""]
    for category, skills in _skills_by_category().items():
        lines += [f"### {category}", ""]
        for skill in skills:
            lines.append(f"- **{skill.display_name}** ({skill.sub_category}): {skill.description}")
        lines.append("")
    lines += ["## Links", ""]
    for network, _, url in _profiles():
        lines.append(f"- {network}: {url}")
    lines += [
        f"- Website: {absolute('/')}",
        f"- Resume (PDF): {absolute(RESUME_PDF_PATH)}",
        f"- Resume (JSON Resume): {absolute('/resume.json')}",
        f"- Location: {contact.location}, {contact.country}",
        "",
    ]
    return "\n".join(lines).encode("utf-8")


# --- JSON Resume -----------------------------------------------------------------


@cache
def resume_json() -> bytes:
    contact = load_contact()
    about = load_aboutme()
    city, region = _city_region()
    work = []
    for index, (_, job) in enumerate(_experience()):
        rng = parse_date_range(job.date)
        item: dict = {
            "name": job.company,
            "location": job.location,
            "position": job.title,
            "url": str(job.link),
            "highlights": _visible_highlights(index, job),
        }
        if rng.start:
            item["startDate"] = rng.start
        if rng.end:
            item["endDate"] = rng.end
        work.append(item)

    projects = []
    for project in load_projects().root.values():
        projects.append(
            {
                "name": project.title.strip(),
                "description": project.description,
                "highlights": [project.description_detail],
                "keywords": list(project.tech_stack),
                "url": str(project.link),
            }
        )

    skills = [
        {"name": category, "keywords": [s.display_name for s in group]}
        for category, group in _skills_by_category().items()
    ]

    document = {
        "$schema": JSON_RESUME_SCHEMA,
        "basics": {
            "name": _full_name(),
            "label": _headline(),
            "image": _headshot_url(),
            "email": contact.email,
            "url": absolute("/"),
            "summary": about.description,
            "location": {"city": city, "region": region, "countryCode": "US"},
            "profiles": [{"network": n, "username": u, "url": url} for n, u, url in _profiles()],
        },
        "work": work,
        "projects": projects,
        "skills": skills,
        "meta": {
            "canonical": absolute("/resume.json"),
            "version": "v1.0.0",
            "lastModified": last_modified().strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
    }
    return json.dumps(document, ensure_ascii=False, indent=2).encode("utf-8")


# --- sitemap.xml -----------------------------------------------------------------


def _resume_pdf_date() -> str | None:
    try:
        path = Path(__file__).parent.parent.parent / "assets" / load_aboutme().resume_name
        return datetime.fromtimestamp(path.stat().st_mtime, tz=UTC).strftime("%Y-%m-%d")
    except OSError:
        return None


@cache
def sitemap_xml() -> bytes:
    modified = last_modified_date()
    entries = [
        ("/", modified, "monthly", "1.0"),
        ("/llms.txt", modified, "monthly", "0.5"),
        ("/llms-full.txt", modified, "monthly", "0.5"),
        ("/resume.json", modified, "monthly", "0.6"),
        (RESUME_PDF_PATH, _resume_pdf_date() or modified, "monthly", "0.6"),
    ]
    rows = [
        f"  <url>\n    <loc>{escape(absolute(path))}</loc>\n    <lastmod>{lastmod}</lastmod>\n"
        f"    <changefreq>{freq}</changefreq>\n    <priority>{priority}</priority>\n  </url>"
        for path, lastmod, freq, priority in entries
    ]
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n"
    )
    return body.encode("utf-8")


def warm() -> None:
    for build in (snapshot_html, jsonld_json, llms_txt, llms_full_txt, resume_json, sitemap_xml):
        build()
