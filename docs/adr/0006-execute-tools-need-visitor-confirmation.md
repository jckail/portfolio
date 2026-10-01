# 0006: Execute tools are never run by the model

**Status:** Accepted (2026-10)

## Context

The assistant can search the portfolio and drive the UI, and visitors asked it
to also contact Jordan, share his phone number and request a meeting. Those
actions send mail from the site's sender address, or disclose contact data. A
model that can trigger them on its own can be steered by anything in its
context (page text, a pasted message, a replayed transcript) into spamming the
owner, disclosing the number to anyone, or sending content the visitor never
saw.

## Decision

Tools have two kinds (`backend/app/services/chat_tools.py`):

- **read**: no side effect the visitor did not ask for. Browser tools
  (`navigate_section`, `open_modal`, `download_resume`, `set_theme`) are
  validated against an allowlist and forwarded as `action` frames.
  `search_portfolio` runs on the server over the portfolio JSON.
- **execute**: `contact_jordan`, `request_phone`, `request_meeting`. A model call
  only creates a **pending action**: random id, bound to that connection,
  single use, 10 minute lifetime, at most 5 open. The server sends a
  `confirm_action` frame; the SPA shows a card with the draft. Only a
  `confirm_action` frame from the visitor, with **an email address they typed**,
  runs the handler. Cancelling or ignoring the card does nothing.

Further rules: the confirmed arguments are re-validated and never silently
trimmed (the model's proposal may be trimmed); header fields are forced to a
single line; the same rate limiters as the REST contact routes apply; the
phone number is returned only in the `action_result` frame, after the owner
was notified who asked; unknown, replayed, foreign or expired ids get a bounded
number of replies. The model is told the action is pending and must not claim
success. No event or log line contains an email address, message text or the
phone number.

## Consequences

- A prompt-injected or hallucinated tool call cannot send mail or reveal data;
  at worst it shows a card the visitor can ignore.
- Visitors must give an email address to reach the owner through chat, which is
  the same bar as the contact form.
- A new execute tool needs a schema in `EXECUTE_TOOLS`, an entry in
  `TOOL_KINDS`, a validator in `validate_execute_args` and tests in
  `test_chat_tools.py` and `test_chat_tools_ws.py`. Skipping the card is not an
  option.
- The frame contract (`confirm_action`, `cancel_action`, `action_result`) is
  documented in `backend/README.md`.
