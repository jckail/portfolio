import json
import os
import subprocess
import unittest
import urllib.error
from unittest import mock

from verify_deployment import EXPECTED_JOBS, GateError, Pending, main, verify
from verify_runtime import RuntimeProbeError, verify_runtime

SHA = "a" * 40
REPO = "jckail/portfolio"


class GuardTests(unittest.TestCase):
    def setUp(self):
        self.run = dict(id=100, workflow_id=7, head_sha=SHA, event="push", head_branch="main",
                        head_repository={"full_name": REPO}, status="completed", conclusion="success", run_attempt=1)
        self.runs = [self.run]
        self.jobs = [dict(name=name, head_sha=SHA, status="completed", conclusion="success") for name in EXPECTED_JOBS]
        self.heads = [SHA, SHA]
        self.detail = self.run
        self.total_extra = 0
        self.workflow_path = ".github/workflows/ci.yml"

    def get(self, path):
        if path.endswith("/git/ref/heads/main"):
            return {"object": {"sha": self.heads.pop(0)}}
        if path.endswith("/actions/workflows/ci.yml"):
            return dict(id=7, path=self.workflow_path, state="active")
        if "/workflows/7/runs?" in path:
            self.assertIn("event=push&branch=main&head_sha=" + SHA, path)
            self.assertNotIn("status=success", path)
            return dict(total_count=len(self.runs) + self.total_extra, workflow_runs=self.runs)
        if "/attempts/" in path:
            self.assertIn(f"/attempts/{self.run['run_attempt']}/jobs", path)
            return dict(total_count=len(self.jobs), jobs=self.jobs)
        if path.endswith("/actions/runs/100"):
            return self.detail
        self.fail("Unexpected endpoint: " + path)

    def test_exact_success(self):
        self.assertEqual(verify(self.get, REPO, SHA), (100, 1))

    def test_stale_before_start(self):
        self.heads[0] = "b" * 40
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_main_moves_during_check(self):
        self.heads[1] = "b" * 40
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_missing_run_waits(self):
        self.runs = []
        with self.assertRaises(Pending): verify(self.get, REPO, SHA)

    def test_latest_failure_not_older_success(self):
        self.runs.append(dict(self.run, id=101, conclusion="failure"))
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_latest_pending_not_older_success(self):
        self.runs.append(dict(self.run, id=101, status="in_progress", conclusion=None))
        with self.assertRaises(Pending): verify(self.get, REPO, SHA)

    def test_identity_mismatch(self):
        for field, value in [("workflow_id", 8), ("head_sha", "b" * 40), ("event", "pull_request"),
                             ("head_branch", "feature"), ("head_repository", {"full_name": "outsider/portfolio"})]:
            with self.subTest(field=field):
                self.setUp(); self.run[field] = value
                with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_incomplete_run_pagination(self):
        self.total_extra = 1
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_missing_expected_job(self):
        self.jobs.pop()
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_unsuccessful_jobs(self):
        for conclusion in ["skipped", "failure", "neutral", None]:
            with self.subTest(conclusion=conclusion):
                self.setUp(); self.jobs[0]["conclusion"] = conclusion
                with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_ci_rerun_changes_while_checking(self):
        self.detail = dict(self.run, run_attempt=2)
        with self.assertRaises(GateError): verify(self.get, REPO, SHA)

    def test_successful_ci_rerun_allowed(self):
        self.run["run_attempt"] = 2
        self.assertEqual(verify(self.get, REPO, SHA), (100, 2))

    def test_unexpected_workflow_path(self):
        self.workflow_path = ".github/workflows/impostor.yml"
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
