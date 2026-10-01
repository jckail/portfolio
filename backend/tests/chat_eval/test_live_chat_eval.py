"""Live evaluation against a running backend. Deselected by default (marker `live`).

    CHAT_EVAL_URL=ws://localhost:9170 pytest backend/tests/chat_eval -m live
"""
import os

import pytest

from . import run_eval

pytestmark = pytest.mark.live


@pytest.mark.skipif(not os.environ.get("CHAT_EVAL_URL"), reason="CHAT_EVAL_URL not set")
def test_chat_assistant_eval_suite():
    assert run_eval.main(["--url", os.environ["CHAT_EVAL_URL"]]) == 0
