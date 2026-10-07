# Portfolio recruiter audit — October 6, 2026

Read-only research for the portfolio assistant overhaul. Observations below were checked against the live site and public context on this date. Recommendations are judgment, not evidence that these changes will produce interviews. No paid model calls, contact submissions, or external communications were made.

## Main finding

Jordan already has a strong staff engineering story: founding the Agent Platform team, agent harnesses and evaluation infrastructure, growing data engineering to 15+, and measurable infrastructure improvements at Prove and Meta. The portfolio asks visitors to sift through a long timeline and a large technology catalogue before seeing project evidence. The largest improvement is to expose technical judgment and selected evidence earlier, then make contacting Jordan effortless.

## Verified live observations

- [Home](https://jordankail.ai/) renders the correct Agent Platform title, strong summary, contact/resume/GitHub/LinkedIn links, and seven primary skills. The introductory summary is roughly 70 words, followed by two more generic personal/professional paragraphs.
- Content order is About → eight-role Experience → nine Projects → Skills → Resume. AI Billing, explicitly a proof of concept, is first; goPilot is near the end. Most project cards explain functionality and stack, rather than constraints, design decisions, evaluation results, and Jordan's individual contribution.
- The skills catalogue contains 124 items across 11 categories, including historical Java/Scala. This differs intentionally from the narrower curated skills in [public context](https://jordankail.ai/context.json). Long lists compete with the strongest current positioning.
- Some strongest approved metrics are in context/PDF or expanded details rather than primary role summaries: Prove API latency 40s to 12ms and operating costs down 95%; Meta compute efficiency up 66% and storage costs down 25%. These are published claims, not independently corroborated measurements.
- Contact dialog shows a public email, country, optional phone request, and email/subject/message form. Phone-request copy explicitly says Jordan receives the visitor's email address. No submission was tested.
- Good foundations are already present: skip link, semantic headings, labelled skill controls, section navigation, direct resume access, explicit public MCP/GraphQL/JSON interfaces, and honest client-support caveats on [assistant connection instructions](https://jordankail.ai/agents.html).
- Browser inspection was desktop at 1440×1114. This research does not establish mobile layout, contrast compliance, keyboard focus behavior, screen-reader streaming behavior, performance, demo uptime, or contact delivery. Treat those as acceptance checks, not defects already proven.

## Six live examples and the pattern to borrow

| Primary personal site | Observed pattern | Concrete adaptation |
|---|---|---|
| [Brittany Chiang](https://brittanychiang.com/) | Short specialized value proposition; dated roles; technology tags; project links, screenshots and external coverage; skip link. | Keep a short agent-platform proposition, then expose three strongest evidence cards with role and outcome. |
| [Eugene Yan](https://eugeneyan.com/) | Separate writing, talks and selected prototypes; dated technical material on evaluation and system design. | Add a small Engineering Notes area demonstrating reasoning, with two substantive posts rather than a news feed. |
| [Eugene's AlignEval case study](https://eugeneyan.com/writing/aligneval/) | Walkthrough with sample data, screenshots, implementation choices and limitations. | Publish one agent evaluation case study with a reproducible fixture, failure examples, architecture and measured results if available. |
| [Chip Huyen](https://huyenchip.com/) | Clear production-AI focus; selected public tools; technical teaching/writing; direct contact invitation. | Compress hero copy and keep a plainly labelled Email Jordan route alongside the form. |
| [Andrej Karpathy](https://karpathy.ai/) | Chronological scope of work with links to concrete educational and technical artifacts. | State individual ownership and team scope, and link verifiable artifacts without implying credit for an entire employer's product. |
| [Simon Willison](https://simonwillison.net/) | Dated experiments, TILs, source links and interactive tools. | Show a concise engineering notebook of decisions and experiments, with reproducible links and dates. |
| [Julia Evans](https://jvns.ca/) | Topic-based archive of approachable systems explanations and debugging investigations. | Write one clear explanation of a real agent failure, replay trace, or graph retrieval tradeoff that shows staff-level teaching ability. |

These are structural examples, not designs to copy or proof their sites caused their careers. Six distinct people were reviewed; the AlignEval article is an additional detailed example from Eugene.

## What current lab roles reward

- [OpenAI Codex Core Agents](https://openai.com/careers/software-engineer-codex-core-agents-san-francisco/) emphasizes tool orchestration, code execution, persistent state/memory, reliability, cost/latency, distributed systems and developer platforms. Rust and isolation experience are additional signals. This posting is titled Software Engineer, not Staff.
- [OpenAI Agent Infrastructure](https://openai.com/careers/software-engineer-agent-infrastructure-san-francisco/) emphasizes research collaboration, large-scale agent runtime infrastructure, APIs, infrastructure as code, performance and virtualization. Do not claim Jordan has low-level sandbox expertise merely because Kubernetes is listed.
- [Anthropic Staff+ Claude Managed Agents](https://job-boards.greenhouse.io/anthropic/jobs/5395767008) asks for durable sessions, streaming, sandbox orchestration, production ownership, harness evolution supported by evals, developer APIs, tracing, and cost efficiency.
- [Anthropic Claude Code Model Performance](https://job-boards.greenhouse.io/anthropic/jobs/5098025008) explicitly describes a Staff role: technical direction, evaluation frameworks, research tooling, mentoring, architectural judgment and ownership of critical systems.

Inference: Jordan's current published agent harness/eval/platform work maps naturally to these themes. Showing design choices, operating constraints, evaluation methodology and individual ownership will substantiate the fit better than adding more framework names.

## Prioritized proposals to consider

| Priority | Proposal | Acceptance boundary |
|---|---|---|
| P0 | Assistant becomes a recruiter concierge: answer from approved facts; surface citations; find relevant experience/projects; provide resume and contact options; draft a tailored introduction. | Correct sources and working links; no invented availability, salary, qualifications or commitments; visitor reviews any contact draft before sending. |
| P0 | Add suggested prompts: “What agent systems has Jordan built?”, “Show staff-level impact”, “How do I contact Jordan?”, “Match this role to his experience.” | Useful first turn without requiring signup; role match separates published evidence from unknowns; direct contact works even when the model is unavailable. |
| P1 | Shorten hero and add a Selected Impact strip, followed by three selected case studies before the full history. | Uses only approved metrics and accurately labels team vs individual results; readable first screen on a phone. |
| P1 | Publish focused case studies for agent runtime/evaluation, an infrastructure migration, and one public agent project. | Each has problem, constraints, Jordan's role, architecture, a key tradeoff, verification, result, limitations, and source/demo. Employer details require approved public wording; no proprietary diagrams or invented numbers. |
| P1 | Curate projects by relevance and honest status: Live / Prototype / Archived / Employer work. | Verify every demo and repo before labelling; show code, screenshots, architecture and date; hide stale links behind archive rather than presenting them as live. |
| P1 | Surface four skill families linked to evidence; collapse the historic catalogue by default. | AI agents/evals; distributed platforms; knowledge/graphs; Python/Go/Rust/SQL. Keep historical facts accessible without making years of tool use the main pitch. |
| P1 | Add direct email and a compact recruiter contact form with role/company/job URL and message. | Accessible controls; explicit delivery receipt; spam/rate protections; no forced phone request, booking promises or calendar access. |
| P2 | Add two or three engineering essays and a concise staff-impact page. | Actual decisions/failures/tradeoffs, updated dates and evidence; distinguish open-source prototypes from production employer systems. |
| P2 | Verify mobile and accessibility across hero, project dialogs, assistant and contact. | 360/390px layouts, no horizontal overflow, keyboard-only flow, Escape/focus return, visible focus, reduced motion, contrast, screen-reader response announcements, and useful error/retry states. |

## Assistant tooling recommendation

Use bounded, deterministic tools for public profile lookup, experience/project search, source citations, resume links and contact options. A role-fit tool can summarize evidence against visitor-provided text without opening arbitrary URLs or asserting employment eligibility. Contact drafting should return a draft plus a form/mail link; actual sending needs an explicit visitor action and the existing site's delivery protections. Do not give this public assistant unrestricted browsing, shell execution, private vault access or general email capability.

For evaluation, cover factual questions, unknown/private questions, role matching, project links, resume/contact requests, prompt injection, model/tool failures and contact promises. A helpful assistant admits when no public evidence exists and offers a precise next action.

## Retrieval and limitations

Read the existing Main task log `Tasks/JCK-201 Build agent-first portfolio and recruiter MCP.md` and its graph neighborhood; existing scope already includes a recruiter-usable on-site agent and SDK assessment. Parent owns issue verification and durable tracking; this artifact makes no Linear/vault mutations. Hindsight search failed with localhost:9077 connection refused and contributed no recalled facts. Web crawler could not open Jordan's domain, so live observations used connected Chrome plus a successful direct HTTPS retrieval of context.json and agents.html. No claims of full accessibility or end-to-end contact testing are made.
