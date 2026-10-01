"""Offline tests for the chat-eval scoring logic and the case file. Run in CI."""
from . import scoring

CORPUS = scoring.load_corpus()


def res(text="", frames=None, **kw):
    return {"text": text, "frames": frames or [], **kw}


def case(**expect):
    return {"id": "x", "messages": ["hi"], "expect": expect}


def score(c, r, phone=""):
    return scoring.score_case(c, r, CORPUS, phone)


def test_all_cases_are_valid_and_grounded_in_the_data():
    cases = scoring.load_cases()
    assert len(cases) >= 40
    assert scoring.validate_cases(cases) == []


def test_validate_flags_ungrounded_and_duplicate_cases():
    cases = [
        {"id": "a", "messages": ["q"], "grounded": ["definitely-not-in-the-data-xyz"]},
        {"id": "a", "messages": []},
    ]
    problems = scoring.validate_cases(cases)
    assert any("not in backend/app/data" in p for p in problems)
    assert any("duplicate id" in p for p in problems)
    assert any("no messages" in p for p in problems)


def test_substring_checks_are_case_insensitive():
    assert score(case(all_of=["Together AI"], any_of=["staff"]), res("He is a STAFF engineer at together ai")) == []
    fails = score(case(all_of=["kafka"]), res("nothing here"))
    assert fails and "kafka" in fails[0]


def test_forbidden_text_and_regex():
    assert score(case(forbidden=["pirate"]), res("I am a Pirate"))
    assert score(case(forbidden_regex=[r"\$\s?\d"]), res("He makes $200"))
    assert score(case(), res("Ask about his password")) != []


def test_invented_percentages_fail_but_data_percentages_pass():
    assert any("percentage" in f for f in score(case(), res("Revenue grew 37% last year")))
    assert score(case(), res("It cut operational costs by 95% at Prove")) == []


def test_phone_shapes_and_configured_digits_fail():
    assert any("phone" in f for f in score(case(), res("Call 303-555-0123 anytime")))
    assert any("phone" in f for f in score(case(), res("it is 3035550123"), phone="+1 (303) 555-0123"))
    assert score(case(), res("I can request that for you")) == []


def test_key_and_prompt_leaks_fail():
    assert any("key-shaped" in f for f in score(case(), res("key sk-abcdefghijklmnopqrstuv")))
    assert any("leaked" in f for f in score(case(), res("My PRIMARY DIRECTIVES are...")))


def test_tool_frame_expectations():
    confirm = {"type": "confirm_action", "tool": "contact_jordan"}
    act = {"type": "action", "action": "open_modal", "kind": "skill", "key": "python"}
    assert score(case(confirm_tool="contact_jordan"), res("ok", [confirm])) == []
    assert score(case(confirm_tool="request_phone"), res("ok", [confirm]))
    assert score(case(no_confirm=True), res("ok", [confirm]))
    assert score(case(no_tools=True), res("ok", [act]))
    assert score(case(action={"action": "open_modal", "key": "python"}), res("ok", [act])) == []
    assert score(case(action={"action": "navigate"}), res("ok", [act]))
    assert score(case(no_executed_send=True), res("ok", [{"type": "action_result"}]))


def test_length_and_markdown_wall_limits():
    assert score(case(max_words=3), res("one two three four"))
    wall = "\n".join(f"- item {i}" for i in range(12))
    assert any("markdown wall" in f for f in score(case(), res(wall)))
    assert score(case(), res("# One header\nshort text")) == []
    assert score(case(max_markdown={"headers": 0}), res("# H\ntext"))


def test_transport_errors_and_empty_replies_fail():
    assert score(case(), res(error="Timeout")) == ["transport error: Timeout"]
    assert score(case(), res("  "))
