#!/usr/bin/env python3
"""Regenerate the ATS-first resume (PDF + plain text + manifest).

Every word of the resume is derived from the site's own data files
(`backend/app/data/*.json`), so a role change is a data edit followed by one
regeneration, not a second hand-typed copy that drifts.

Layout rules, chosen for applicant-tracking systems and LLM resume parsers
(Ashby, Greenhouse, Lever, Workday, iCIMS):

    * US Letter, a single column, linear reading order
    * headings: Summary, Experience, Education, Skills, Projects; education
      is sourced from education.json without inferring a degree
    * real selectable text in an embedded, subsetted TrueType font with a
      Unicode map; no images, no tables, no header/footer content
    * "Company - Title - Location" line, then "MM/YYYY - MM/YYYY | Present"
    * URLs are written out as visible text and carry link annotations
    * no phone number (the site reveals it only after a visitor leaves an email)

reportlab is NOT a repo dependency. Run with:

    uv run --no-project --with reportlab --with pypdf python helpers/build_resume_pdf.py

The content helpers below import nothing outside the standard library, so
`backend/tests/test_resume_pdf.py` can use them without reportlab.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape

REPO = Path(__file__).resolve().parent.parent
ASSETS = REPO / "backend" / "assets"
DATA = REPO / "backend" / "app" / "data"
FONTS = Path(__file__).resolve().parent / "assets" / "fonts"

PDF_NAME = "JordanKailResume.pdf"
DASH = "–"  # en dash in date ranges
SEP = "—"  # em dash in "Company - Title - Location"
BULLET = "•"

# Projects shown on the resume, in order. Text comes from projects.json.
PROJECT_KEYS = ["super_teacher", "jobbr", "go_pilot", "ai_billing", "portfolio", "pointup", "qr_for_groups"]


# --------------------------------------------------------------------------
# content (stdlib only)
# --------------------------------------------------------------------------
def _load(name: str) -> dict:
    return json.loads((DATA / f"{name}.json").read_text(encoding="utf-8"))


def pretty_dates(raw: str) -> str:
    """'02/2025 - Present' -> '02/2025 – Present'."""
    return re.sub(r"\s+-\s+", f" {DASH} ", raw.strip())


def pretty_company(raw: str) -> str:
    """'Meta | Facebook' -> 'Meta (Facebook)'."""
    parts = [p.strip() for p in raw.split("|")]
    return parts[0] if len(parts) == 1 else f"{parts[0]} ({', '.join(parts[1:])})"


def pretty_location(raw: str) -> str:
    return "; ".join(p.strip() for p in raw.split("+"))


def bare_url(url: str) -> str:
    return re.sub(r"^https?://(www\.)?", "", url).rstrip("/")


def short_url(url: str, limit: int = 45) -> str:
    """Visible link text: the bare URL, or just the host when it would wrap mid-word."""
    bare = bare_url(url)
    return bare if len(bare) <= limit else bare.split("/")[0]


def first_sentence(text: str) -> str:
    text = " ".join(text.split())
    m = re.search(r"^.*?[.!?](?=\s|$)", text)
    return m.group(0) if m else text


def load_content() -> dict:
    """Everything the resume says, derived from the data files."""
    contact, about = _load("contact"), _load("aboutme")
    exp, projects = _load("experience"), _load("projects")

    roles = []
    for key, r in exp.items():
        roles.append(
            {
                "key": key,
                "company": pretty_company(r["company"]),
                "raw_company": r["company"],
                "title": r.get("resume_title") or r["title"],
                "dates": pretty_dates(r["date"]),
                "raw_dates": r["date"],
                "location": pretty_location(r.get("resume_location", r["location"])),
                "bullets": list(r.get("resume_highlights", r["highlights"])),
            }
        )

    # The PDF is a curated skills summary, not the entire site's technology catalog.
    skill_groups = [(group["label"], group["items"]) for group in _load("resume_skills")["groups"]]

    projs = []
    for k in PROJECT_KEYS:
        p = projects[k]
        links = [short_url(u) for u in dict.fromkeys((p.get("link"), p.get("link2"))) if u]
        projs.append(
            {
                "title": p["title"].strip(),
                "description": first_sentence(p.get("resume_description", p["description"])),
                "links": links,
                "urls": [u for u in dict.fromkeys((p.get("link"), p.get("link2"))) if u],
            }
        )

    name = f"{contact['firstName']} {contact['lastName']}"
    return {
        "name": name,
        "headline": f"{contact['title']} {SEP} AI, Agents, Data & Machine Learning",
        "email": contact["email"],
        "location": contact["location"],
        "links": [
            (bare_url(contact["linkedin"]), contact["linkedin"]),
            (bare_url(contact["github"]), contact["github"]),
            (bare_url(contact["website"]), contact["website"]),
        ],
        "summary": " ".join(about.get("resume_summary", about["description"]).split()),
        "roles": roles,
        "education": _load("education")["entries"],
        "skills": skill_groups,
        "projects": projs,
    }


def role_heading(role: dict) -> str:
    """Omit empty resume-only fields rather than printing dangling separators."""
    return f" {SEP} ".join(role[field] for field in ("company", "title", "location") if role[field])


def resume_text(c: dict | None = None) -> str:
    """Clean plain-text version, same content and order as the PDF."""
    c = c or load_content()
    out = [c["name"].upper(), c["headline"]]
    out.append(f"{c['location']} | {c['email']} | " + " | ".join(label for label, _ in c["links"]))
    out += ["", "SUMMARY", c["summary"], "", "EXPERIENCE"]
    for r in c["roles"]:
        out += ["", role_heading(r), r["dates"]]
        out += [f"{BULLET} {b}" for b in r["bullets"]]
    out += ["", "EDUCATION"]
    for entry in c["education"]:
        out += ["", f"{entry['institution']} {SEP} {entry['study']}", pretty_dates(entry["date"])]
    out += ["", "SKILLS"]
    out += [f"{label}: {', '.join(items)}" for label, items in c["skills"]]
    out += ["", "PROJECTS"]
    for p in c["projects"]:
        out += ["", p["title"] + (f" {SEP} {', '.join(p['links'])}" if p["links"] else ""), p["description"]]
    return "\n".join(out) + "\n"


def manifest(c: dict, text: str) -> dict:
    """What the PDF says, so a test can catch it going stale."""
    cur = c["roles"][0]
    return {
        "generated_by": "helpers/build_resume_pdf.py",
        "pdf": PDF_NAME,
        "current_company": cur["raw_company"],
        "current_title": cur["title"],
        "current_dates": cur["raw_dates"],
        "companies": [r["raw_company"] for r in c["roles"]],
        "roles": [{"company": r["raw_company"], "bullets": r["bullets"]} for r in c["roles"]],
        "education": c["education"],
        "sections": ["Summary", "Experience", "Education", "Skills", "Projects"],
        "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
    }


# --------------------------------------------------------------------------
# PDF (reportlab, imported lazily)
# --------------------------------------------------------------------------
def build_pdf(c: dict, out: Path) -> None:
    from reportlab.lib.colors import HexColor
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.fonts import addMapping
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.platypus import HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate

    for name, fname in [("Roboto", "Roboto-Regular"), ("Roboto-Bold", "Roboto-Bold"),
                        ("Roboto-Italic", "Roboto-Italic"), ("Roboto-BoldItalic", "Roboto-BoldItalic")]:
        pdfmetrics.registerFont(TTFont(name, str(FONTS / f"{fname}.ttf")))
    addMapping("Roboto", 0, 0, "Roboto")
    addMapping("Roboto", 1, 0, "Roboto-Bold")
    addMapping("Roboto", 0, 1, "Roboto-Italic")
    addMapping("Roboto", 1, 1, "Roboto-BoldItalic")

    ink, accent, muted = HexColor("#1a1a1a"), HexColor("#17365d"), HexColor("#444444")

    def style(name, **kw):
        base = dict(fontName="Roboto", fontSize=9, leading=11.6, textColor=ink, alignment=TA_LEFT)
        base.update(kw)
        return ParagraphStyle(name, **base)

    s_name = style("name", fontName="Roboto-Bold", fontSize=22, leading=26, textColor=accent)
    s_head = style("headline", fontName="Roboto-Bold", fontSize=11, leading=14, textColor=ink)
    s_contact = style("contact", fontSize=9, leading=12.5, textColor=muted)
    s_sec = style("sec", fontName="Roboto-Bold", fontSize=11.5, leading=14, textColor=accent, spaceBefore=6, spaceAfter=1)
    s_body = style("body", spaceAfter=2)
    s_role = style("role", fontName="Roboto-Bold", fontSize=10, leading=13, spaceBefore=4)
    s_dates = style("dates", fontSize=8.8, leading=11, textColor=muted, spaceAfter=1.2)
    s_bullet = style("bullet", leftIndent=12, bulletIndent=2, bulletFontName="Roboto", bulletFontSize=9, spaceAfter=0.5)
    s_skill = style("skill", spaceAfter=1.2)
    s_proj = style("proj", fontName="Roboto-Bold", fontSize=9.4, leading=12.5, spaceBefore=3)

    def link(label: str, url: str) -> str:
        return f'<a href="{escape(url)}" color="#17365d">{escape(label)}</a>'

    story = [Paragraph(escape(c["name"]), s_name), Paragraph(escape(c["headline"]), s_head)]
    contact_bits = [escape(c["location"]), link(c["email"], f"mailto:{c['email']}")]
    contact_bits += [link(label, url) for label, url in c["links"]]
    story.append(Paragraph(" &nbsp;|&nbsp; ".join(contact_bits), s_contact))

    def section(title: str):
        return [Paragraph(title, s_sec),
                HRFlowable(width="100%", thickness=0.8, color=accent, spaceBefore=1, spaceAfter=3)]

    story += section("Summary") + [Paragraph(escape(c["summary"]), s_body)]

    story += section("Experience")
    for r in c["roles"]:
        head = [Paragraph(escape(role_heading(r)), s_role),
                Paragraph(escape(r["dates"]), s_dates)]
        # Keep a role together so a short entry never leaves a lone bullet on the next page.
        story.append(KeepTogether(head + [
            Paragraph(escape(b), s_bullet, bulletText=BULLET) for b in r["bullets"]
        ]))

    story += section("Education")
    for entry in c["education"]:
        story.append(KeepTogether([
            Paragraph(escape(f"{entry['institution']} {SEP} {entry['study']}"), s_role),
            Paragraph(escape(pretty_dates(entry["date"])), s_dates),
        ]))

    story += section("Skills")
    for label, items in c["skills"]:
        story.append(Paragraph(f"<b>{escape(label)}:</b> {escape(', '.join(items))}", s_skill))

    story += section("Projects")
    for p in c["projects"]:
        bits = [link(label, url) for label, url in zip(p["links"], p["urls"], strict=True)]
        title = escape(p["title"]) + (f" {SEP} " + ", ".join(bits) if bits else "")
        story.append(KeepTogether([Paragraph(title, s_proj), Paragraph(escape(p["description"]), s_body)]))

    class Canvas(rl_canvas.Canvas):
        def __init__(self, *a, **kw):
            kw["lang"] = "en-US"
            kw["initialFontName"] = "Roboto"
            super().__init__(*a, **kw)
            self.setViewerPreference("DisplayDocTitle", "true")

    doc = SimpleDocTemplate(
        str(out), pagesize=letter, leftMargin=0.65 * inch, rightMargin=0.65 * inch,
        topMargin=0.5 * inch, bottomMargin=0.5 * inch,
        title=f"{c['name']} {SEP} Resume", author=c["name"],
        subject="Staff Software Engineer: AI, agents, data engineering and machine learning",
        keywords=", ".join(["AI agents", "LLM", "machine learning", "data engineering", "Python", "SQL",
                            "agent platform", "RAG", "Spark", "Kafka", "Airflow", "Kubernetes"]),
        creator="helpers/build_resume_pdf.py", producer="ReportLab",
    )
    doc.build(story, canvasmaker=Canvas)


def build(out: Path) -> None:
    c = load_content()
    text = resume_text(c)
    build_pdf(c, out)
    out.with_suffix(".txt").write_text(text, encoding="utf-8")
    out.with_suffix(".meta.json").write_text(json.dumps(manifest(c, text), indent=2, ensure_ascii=False) + "\n",
                                             encoding="utf-8")
    print(f"  wrote {out.name}, {out.with_suffix('.txt').name}, {out.with_suffix('.meta.json').name}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--out", default=str(ASSETS / PDF_NAME))
    build(Path(ap.parse_args().out))
