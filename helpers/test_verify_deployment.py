import json
import os
import subprocess
import unittest
import urllib.error
from unittest import mock

from verify_deployment import CI_CONTEXT, CI_URL_PREFIX, GateError, Pending, main, verify
from verify_runtime import RuntimeProbeError, verify_runtime

SHA = "a" * 40
REPO = "jckail/portfolio"


class GuardTests(unittest.TestCase):
    def setUp(self):
        self.status = dict(id=100, context=CI_CONTEXT, state="success", target_url=CI_URL_PREFIX + "workflows/x")
        self.statuses = [self.status]
        self.heads = [SHA, SHA]

    def get(self, path):
        if path.endswith("/git/ref/heads/main"):
            return {"object": {"sha": self.heads.pop(0)}}
        if path.endswith(f"/commits/{SHA}/statuses?per_page=100"):
            return self.statuses
        self.fail("Unexpected endpoint: " + path)

    def test_exact_success(self):
        self.assertEqual(verify(self.get, REPO, SHA), 100)

    def test_stale_before_start(self):
        self.heads[0] = "b" * 40
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_main_moves_during_check(self):
        self.heads[1] = "b" * 40
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_missing_status_waits(self):
        self.statuses = [dict(self.status, context="depot-ci / frontend")]
        with self.assertRaises(Pending): verify(self.get, REPO, SHA)

    def test_latest_failure_not_older_success(self):
        self.statuses = [dict(self.status, id=101, state="failure"), self.status]
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_latest_pending_not_older_success(self):
        self.statuses = [dict(self.status, id=101, state="pending"), self.status]
        with self.assertRaises(Pending): verify(self.get, REPO, SHA)

    def test_latest_success_after_older_failure(self):
        self.statuses = [dict(self.status, id=101), dict(self.status, id=99, state="failure")]
        self.assertEqual(verify(self.get, REPO, SHA), 101)

    def test_unsuccessful_states(self):
        for state in ["failure", "error"]:
            with self.subTest(state=state):
                self.setUp(); self.status["state"] = state
                with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_foreign_status_source_rejected(self):
        self.status["target_url"] = "https://example.com/depot"
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_incomplete_status_pagination(self):
        self.statuses = [dict(self.status, context="other", id=n) for n in range(100)]
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_api_failure_does_not_authorize(self):
        with mock.patch.dict(os.environ, {"GITHUB_REPOSITORY": REPO, "GITHUB_SHA": SHA, "GH_TOKEN": "test-only"}), \
             mock.patch("sys.argv", ["verify_deployment.py"]), \
             mock.patch("urllib.request.urlopen", side_effect=urllib.error.HTTPError("https://api.github.com", 403, "forbidden", {}, None)):
            with self.assertRaises(urllib.error.URLError):
                main()

    def test_pending_times_out_closed(self):
        with mock.patch.dict(os.environ, {"GITHUB_REPOSITORY": REPO, "GITHUB_SHA": SHA, "GH_TOKEN": "test-only"}), \
             mock.patch("sys.argv", ["verify_deployment.py"]), \
             mock.patch("verify_deployment.verify", side_effect=Pending("pending")):
            with self.assertRaises(GateError):
                main()


class RuntimeTests(unittest.TestCase):
    def result(self, *, sha=SHA, state="healthy", status="200", returncode=0):
        body = json.dumps({"status": state, "checks": {"version": {"hash": sha}}})
        return mock.Mock(returncode=returncode, stdout=body + "\n" + status)

    def verify(self, runner, attempts=1):
        verify_runtime("https://candidate.run.app", SHA, attempts, run=runner, sleep=lambda _: None)

    def test_exact_healthy_and_degraded_liveness(self):
        for state in ("healthy", "degraded"):
            with self.subTest(state=state):
                self.verify(mock.Mock(return_value=self.result(state=state)))

    def test_wrong_commit_malformed_body_non200_and_curl_failure_rejected(self):
        adverse = [self.result(sha="b" * 40), self.result(status="503"), self.result(returncode=28),
                   self.result(state="unhealthy"), mock.Mock(returncode=0, stdout="<html>ok</html>\n200"),
                   mock.Mock(returncode=0, stdout="[]\n200"), mock.Mock(returncode=0, stdout='{"status":"healthy"}\n200')]
        for result in adverse:
            with self.subTest(result=result.stdout), self.assertRaises(RuntimeProbeError):
                self.verify(mock.Mock(return_value=result))

    def test_connection_errors_and_timeout_exhaust_bounded_retries(self):
        for error in (OSError("unavailable"), subprocess.TimeoutExpired("curl", 15)):
            runner = mock.Mock(side_effect=error)
            with self.subTest(error=type(error).__name__), self.assertRaises(RuntimeProbeError):
                self.verify(runner, attempts=2)
            self.assertEqual(runner.call_count, 2)

    def test_old_revision_during_promotion_retried_until_expected_commit(self):
        runner = mock.Mock(side_effect=[self.result(sha="b" * 40), self.result()])
        self.verify(runner, attempts=2)
        self.assertEqual(runner.call_count, 2)

    def test_probe_has_connection_total_and_process_deadlines(self):
        runner = mock.Mock(return_value=self.result())
        self.verify(runner)
        command = runner.call_args.args[0]
        self.assertEqual(command[command.index("--connect-timeout") + 1], "5")
        self.assertEqual(command[command.index("--max-time") + 1], "10")
        self.assertEqual(runner.call_args.kwargs["timeout"], 15)
        self.assertEqual(command[-1], "https://candidate.run.app/api/health")

    def test_invalid_commit_or_origin_never_probed(self):
        runner = mock.Mock()
        for url, sha in (("http://candidate.run.app", SHA), ("https://user:pass@candidate.run.app", SHA),
                         ("https://candidate.run.app/?token=private", SHA), ("https://candidate.run.app", "main")):
            with self.subTest(url=url), self.assertRaises(RuntimeProbeError):
                verify_runtime(url, sha, run=runner)
        runner.assert_not_called()

    def test_invalid_attempt_limits_never_probed(self):
        runner = mock.Mock()
        for attempts in (0, 13, True):
            with self.subTest(attempts=attempts), self.assertRaises(RuntimeProbeError):
                verify_runtime("https://candidate.run.app", SHA, attempts, run=runner)
        runner.assert_not_called()


if __name__ == "__main__":
    unittest.main()
