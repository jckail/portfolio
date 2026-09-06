import os
import urllib.error
from unittest import mock
import unittest
from verify_deployment import EXPECTED_JOBS, GateError, Pending, verify, main

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


if __name__ == "__main__":
    unittest.main()
