#!/usr/bin/env python3
"""Regenerate JordanKailResume.pdf.

The previous PDF was an Enhancv export that could only be updated by hand, so
it silently drifted from `backend/app/data/experience.json` (it still showed
Prove Identity as the current role long after that stopped being true, and
`backend/tests/test_data.py` only asserts the file exists, so CI never
noticed).

This script rebuilds the same two-column layout from content declared below,
so a role change is a code review rather than a trip to a third-party editor.
Geometry, colours and the icon font are taken from the original export:

    page            A4, 595.92 x 842.88 pt
    left column     x 24.7 .. 339   (experience)
    right column    x 361.2 .. 571  (skills, projects)
    accent          #0403ff   body #384347   headings #000000
    body 8pt / role 10pt / section 12pt / name 20pt

Arial is substituted with Helvetica, which is metrically equivalent and built
into reportlab. The `resumeicons` glyphs are the subset font extracted from
the original PDF, so the phone/email/location/link/project marks are the
originals rather than lookalikes.

Usage:
    python helpers/build_resume_pdf.py [-o backend/assets/JordanKailResume.pdf]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

REPO = Path(__file__).resolve().parent.parent
ASSETS = REPO / "backend" / "assets"

PAGE_W, PAGE_H = 595.92, 842.88
LEFT_X, LEFT_R = 24.7, 339.0
RIGHT_X, RIGHT_R = 361.2, 571.0

ACCENT = HexColor("#0403ff")
BODY = HexColor("#384347")
HEAD = HexColor("#000000")
RULE = HexColor("#c8ccce")

F_REG, F_BOLD, F_ITAL = "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"
F_ICON = "ResumeIcons"

# Glyphs in the extracted icon font, named for what they draw.
ICON_PHONE, ICON_EMAIL, ICON_PIN, ICON_LINK = "E", "", "", "q"

NAME = "Jordan Kail"
TAGLINE = "AI | Data | Machine Learning"
PHONE, EMAIL, LOCATION = "571-218-5000", "jckail13@gmail.com", "Denver, CO"
LINKS = ["github.com/jckail", "linkedin.com/in/jckail"]
SITE = "jordan-kail.com"

EXPERIENCE = [
    {
        "company": "Together AI",
        "title": "Staff Software Engineer",
        "dates": "02/2025 - Present",
        "where": "San Francisco, CA",
        "bullets": [
            "Staff engineer on the data platform behind Together's AI acceleration cloud: the pipelines, "
            "storage, and telemetry that turn inference and training traffic into product, reliability, "
            "and capacity signal.",
            "Build internal agent tooling and evaluation harnesses so engineering teams can develop, "
            "test, and ship LLM-powered agents against Together's own inference stack.",
            "Design data infrastructure for large-scale training and inference workloads, spanning dataset "
            "curation, lineage, and quality controls for open-model work.",
        ],
    },
    {
        "company": "Prove Identity",
        "title": "Staff Software Engineer - Data",
        "dates": "06/2023 - 01/2025",
        "where": "Remote, USA",
        "bullets": [
            "Spearheaded a company-wide refactor from on-prem Java + Oracle to cloud-based Go + Postgres, "
            "reducing core product API response time to 12ms and operational expenses by 95%.",
            "Built AI-driven Retrieval-Augmented Generation (RAG) chatbots with Airflow, LangChain, and "
            "OpenAI, automating 150+ human-hours weekly.",
        ],
    },
    {
        "company": "Meta | Facebook",
        "title": "Senior Data Engineer",
        "dates": "01/2021 - 09/2022",
        "where": "Menlo Park, CA | Seattle, WA | Remote, USA",
        "bullets": [
            "Led data engineering efforts for Facebook Public Groups and Community Chats, managing a team "
            "of 10+ engineers.",
            "Developed and deployed 100+ ML pipelines with Airflow, Spark, and PyTorch, leveraging NLP "
            "and computer vision to optimize ad targeting and notifications for billions of users.",
            "Designed an automated framework to dynamically generate thousands of async Spark data "
            "pipelines, increasing compute efficiency by 66%.",
        ],
    },
    {
        "company": "Deloitte",
        "title": "Consultant - AI & Advanced Analytics",
        "dates": "12/2018 - 12/2020",
        "where": "Menlo Park, CA | Seattle, WA",
        "bullets": [
            "Automated ~31% of human processed healthcare claims using transformer ML models, saving "
            "250,000+ hours annually.",
            "Cut daily processing time for exabyte-scale video reliability metrics by 90% while "
            "expanding metric coverage.",
            "Led 20+ consultants on Fortune 50 engagements, translating client needs into actionable "
            "requirements and ensuring timely delivery.",
        ],
    },
    {
        "company": "Wide Open West",
        "title": "Senior Data Engineer",
        "dates": "11/2017 - 12/2018",
        "where": "Denver, CO",
        "bullets": [
            "Built ML applications using custom classification and churn models, driving a 22% YoY "
            "increase in customer package upgrades.",
            "Led a team of 5 data practitioners, providing BI and data insights to sales, product, and "
            "engineering teams company-wide.",
        ],
    },
    {
        "company": "Common Spirit Health",
        "title": "Data Engineer",
        "dates": "09/2016 - 11/2017",
        "where": "Denver, CO",
        "bullets": [
            "Architected and delivered new rest APIs and data lakes, improving data processing time for "
            "external partner data products from 7 days to 5 minutes.",
        ],
    },
    {
        "company": "AcuStream (acquired by R1)",
        "title": "Software Engineer - Data",
        "dates": "04/2013 - 09/2016",
        "where": "Boulder, CO",
        "bullets": [
            "Built a custom invoicing system leveraging rule-based algorithms and machine learning, "
            "driving over $300M in annual recurring revenue.",
        ],
    },
]

SKILLS = [
    ("Programming", "Python, SQL, JavaScript, TypeScript, Go, Rust, Scala"),
    ("AI & ML", "OpenAI, Anthropic, LangChain, Llama.cpp, Ollama, Llama Index, PyTorch, TensorFlow, "
                "Hugging Face, Vector Databases, Embeddings, Agents, Evals, RAG, Cuda, Scikit-Learn"),
    ("Big Data", "Airflow, Kafka, Spark, Flink, DBT, Snowflake, Databricks, Iceberg, Redis, ProtoBuff, "
                 "Neo4J, MongoDB, Postgres, PySpark, Streamlit"),
    ("Web Development", "Docker, Kubernetes, FastAPI, Flask, Django, Svelte, React, Node.js, HTML, "
                        "GraphQL, Gin, NoSQL, Json"),
    ("Amazon Web Services (AWS)", "EMR, EKS, SageMaker, S3, Redshift, Glue, MWAA, RDS, Kinesis, "
                                  "Firehose, DynamoDB, Bedrock"),
    ("Google Cloud Platform (GCP)", "BigQuery, Compute Engine, Dataflow, AutoML, Vertex AI Studio, "
                                    "PubSub, Cloud Run, Looker, Firebase"),
]

PROJECTS = [
    (";", "AI Teaching Assistant - Super Teacher",
     "Full stack AI powered web application to help teachers manage their students and provide "
     "recommendations and insights.",
     ["github.com/jckail/superteacher", "the-super-teacher.com"]),
    ("T", "AI Integrated Professional Portfolio",
     "Custom full stack react web application with integrated AI showcasing my experience, projects "
     "and skills.",
     ["github.com/jckail/portfolio", "jckail.com"]),
    ("}", "Loyalty Management App - PointUp.io",
     'AI web app for managing "All of your hotel, credit card, and airline loyalty points in one place".',
     ["github.com/jckail/point_bot", "pointup.io"]),
    ("H", "TechCrunch - Join Group via QR Code",
     "Created the ability for Facebook group admins to invite users to their groups by generating a QR "
     "Code. Used by millions daily.",
     ["https://tny.app/lybucwkc"]),
    ("S", "AI Agent Job Matching - Jobbr",
     "Created a custom AI agent that matches a resume to available jobs at tech companies.",
     ["github.com/jckail/Jobbr"]),
]


def register_icon_font(font_path: Path) -> bool:
    try:
        pdfmetrics.registerFont(TTFont(F_ICON, str(font_path)))
        return True
    except Exception:
        return False


def wrap(text: str, font: str, size: float, width: float) -> list[str]:
    """Greedy wrap on the real glyph metrics reportlab will use."""
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if pdfmetrics.stringWidth(trial, font, size) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


class Resume:
    def __init__(self, path: Path, icons: bool):
        self.c = canvas.Canvas(str(path), pagesize=(PAGE_W, PAGE_H))
        self.c.setTitle("Jordan Kail - Resume")
        self.c.setAuthor("Jordan Kail")
        self.c.setSubject("Staff Software Engineer - AI, Data, Machine Learning")
        self.icons = icons

    def icon(self, ch: str, x: float, y: float, size: float, color=ACCENT) -> None:
        if not self.icons:
            return
        self.c.setFont(F_ICON, size)
        self.c.setFillColor(color)
        self.c.drawString(x, PAGE_H - y, ch)

    def text(self, s: str, x: float, y: float, font: str, size: float, color) -> None:
        self.c.setFont(font, size)
        self.c.setFillColor(color)
        self.c.drawString(x, PAGE_H - y, s)

    def rule(self, x0: float, x1: float, y: float, color=RULE, w: float = 0.6) -> None:
        self.c.setStrokeColor(color)
        self.c.setLineWidth(w)
        self.c.line(x0, PAGE_H - y, x1, PAGE_H - y)

    def paragraph(self, s: str, x: float, y: float, width: float, font: str,
                  size: float, color, leading: float) -> float:
        for line in wrap(s, font, size, width):
            self.text(line, x, y, font, size, color)
            y += leading
        return y

    def section(self, title: str, x: float, x1: float, y: float) -> float:
        self.text(title, x, y, F_BOLD, 12, HEAD)
        self.rule(x, x1, y + 5.5, HEAD, 1.1)
        return y + 20

    # ---- header -------------------------------------------------------
    def header(self) -> float:
        self.text(NAME, LEFT_X, 34, F_BOLD, 20, HEAD)
        self.text(TAGLINE, LEFT_X + 1.7, 55, F_BOLD, 10, ACCENT)

        y = 76
        x = LEFT_X
        self.icon(ICON_PHONE, x, y, 7.6)
        x += 11
        self.text(PHONE, x, y, F_BOLD, 8, BODY)
        x += pdfmetrics.stringWidth(PHONE, F_BOLD, 8) + 10
        self.icon(ICON_EMAIL, x, y, 8)
        x += 11
        self.text(EMAIL, x, y, F_BOLD, 8, BODY)
        x += pdfmetrics.stringWidth(EMAIL, F_BOLD, 8) + 10
        self.icon(ICON_PIN, x, y, 7.6)
        x += 10
        self.text(LOCATION, x, y, F_BOLD, 8, BODY)

        y = 96
        x = LEFT_X
        for link in LINKS:
            self.icon(ICON_LINK, x, y, 7.6)
            x += 10
            self.text(link, x, y, F_BOLD, 8, BODY)
            x += pdfmetrics.stringWidth(link, F_BOLD, 8) + 14

        qr = ASSETS / "jordan_kail_qr_code.png"
        if qr.exists():
            self.c.drawImage(str(qr), 495.2, PAGE_H - 86.9, width=75.6, height=75.6, mask="auto")
        self.icon(ICON_LINK, 497.3, 97, 7.6)
        self.text(SITE, 507, 97, F_BOLD, 8, BODY)
        return 121

    # ---- columns ------------------------------------------------------
    def experience(self, y: float) -> float:
        y = self.section("EXPERIENCE", LEFT_X, LEFT_R, y)
        width = LEFT_R - LEFT_X - 10
        for i, job in enumerate(EXPERIENCE):
            if i:
                self.rule(LEFT_X, LEFT_R, y - 7)
                y += 3
            self.text(job["company"], LEFT_X, y, F_BOLD, 10, HEAD)
            y += 14.4
            self.text(job["title"], LEFT_X, y, F_BOLD, 10, ACCENT)
            y += 14.2
            meta = f'{job["dates"]}   |   {job["where"]}'
            self.text(meta, LEFT_X + 10, y, F_REG, 8, BODY)
            y += 11.3
            for b in job["bullets"]:
                self.text("•", LEFT_X + 2.6, y, F_REG, 8.2, BODY)
                y = self.paragraph(b, LEFT_X + 10, y, width, F_REG, 8, BODY, 10.8)
            y += 3.5
        return y

    def skills(self, y: float) -> float:
        y = self.section("SKILLS", RIGHT_X, RIGHT_R, y)
        width = RIGHT_R - RIGHT_X
        for name, items in SKILLS:
            self.text(name, RIGHT_X, y, F_BOLD, 10, ACCENT)
            y += 17.5
            y = self.paragraph(items, RIGHT_X, y, width, F_REG, 8, BODY, 11.1)
            y += 8
        return y

    def projects(self, y: float) -> float:
        y = self.section("PROJECTS", RIGHT_X, RIGHT_R, y)
        tx = RIGHT_X + 22
        width = RIGHT_R - tx
        for glyph, title, desc, links in PROJECTS:
            self.icon(glyph, RIGHT_X + 1.6, y + 2.3, 15.9)
            self.text(title, tx, y, F_BOLD, 10, HEAD)
            y += 14
            y = self.paragraph(desc, tx, y, width, F_REG, 8, BODY, 11.2)
            for link in links:
                self.text(link, tx, y, F_ITAL, 8, BODY)
                y += 11.2
            y += 7
        return y

    def save(self) -> None:
        self.c.showPage()
        self.c.save()


def write_manifest(out: Path) -> None:
    """Record what this PDF says, so a test can catch it going stale.

    The previous resume was a third-party export that drifted from the site
    for months without anything failing, because the only test asserted the
    file existed. This manifest lets CI compare the PDF's current role
    against experience.json.
    """
    current = EXPERIENCE[0]
    manifest = {
        "generated_by": "helpers/build_resume_pdf.py",
        "pdf": out.name,
        "current_company": current["company"],
        "current_title": current["title"],
        "current_dates": current["dates"],
        "companies": [j["company"] for j in EXPERIENCE],
    }
    path = out.with_suffix(".meta.json")
    path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"  wrote {path.name}")


def build(out: Path, icon_font: Path) -> None:
    r = Resume(out, register_icon_font(icon_font))
    top = r.header()
    left_end = r.experience(top)
    right_end = r.projects(r.skills(top) + 3)
    r.save()
    write_manifest(out)
    print(f"  left column ends at  {left_end:6.1f} pt")
    print(f"  right column ends at {right_end:6.1f} pt")
    print(f"  page height          {PAGE_H:6.1f} pt")
    if max(left_end, right_end) > PAGE_H - 12:
        print("  WARNING: content overflows the page")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--out", default=str(ASSETS / "JordanKailResume.pdf"))
    ap.add_argument("--icon-font", default=str(Path(__file__).resolve().parent / "assets" / "resumeicons.ttf"))
    a = ap.parse_args()
    build(Path(a.out), Path(a.icon_font))
