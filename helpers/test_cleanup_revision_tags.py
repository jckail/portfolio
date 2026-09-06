import copy
import json
import subprocess
import unittest
from cleanup_revision_tags import CleanupError, cleanup, inspect_service


class TagTests(unittest.TestCase):
    def setUp(self):
        self.doc = {"metadata": {"name": "app", "generation": 3}, "status": {
            "observedGeneration": 3, "conditions": [{"type": "Ready", "status": "True"}], "traffic": [
                {"revisionName": "app-new", "percent": 100},
                {"revisionName": "app-new", "tag": "gh-aaaaaaa"},
                {"revisionName": "app-old", "tag": "gh-bbbbbbb"},
                {"revisionName": "app-old", "tag": "keep-custom"},
                {"revisionName": "app-new", "tag": "gh-ccccccc"},
                {"revisionName": "app-old", "tag": "gh-not-hex"}]}}
        self.calls = []

    def inspect(self):
        return inspect_service(self.doc, "app", "gh-aaaaaaa", "app-new")

    def test_selects_only_stale_automated_tag(self):
        self.assertEqual(self.inspect()[0], ["gh-bbbbbbb"])

    def test_unobserved_generation_rejected(self):
        self.doc["status"]["observedGeneration"] = 2
        with self.assertRaises(CleanupError): self.inspect()

    def test_invalid_generation_rejected(self):
        for value in [None, True, "3", 0]:
            self.doc["metadata"]["generation"] = value
            with self.assertRaises(CleanupError): self.inspect()

    def test_wrong_service(self):
        self.doc["metadata"]["name"] = "other"
        with self.assertRaises(CleanupError): self.inspect()

    def test_not_ready(self):
        self.doc["status"]["conditions"][0]["status"] = "Unknown"
        with self.assertRaises(CleanupError): self.inspect()

    def test_missing_traffic(self):
        del self.doc["status"]["traffic"]
        with self.assertRaises(CleanupError): self.inspect()

    def test_split_traffic(self):
        self.doc["status"]["traffic"][0]["percent"] = 90
        self.doc["status"]["traffic"][2]["percent"] = 10
        with self.assertRaises(CleanupError): self.inspect()

    def test_missing_current_tag(self):
        self.doc["status"]["traffic"].pop(1)
        with self.assertRaises(CleanupError): self.inspect()

    def test_reassigned_current_tag(self):
        self.doc["status"]["traffic"][1]["revisionName"] = "app-old"
        with self.assertRaises(CleanupError): self.inspect()

    def test_duplicate_tag(self):
        self.doc["status"]["traffic"].append(copy.deepcopy(self.doc["status"]["traffic"][2]))
        with self.assertRaises(CleanupError): self.inspect()

    def test_malformed_percentage(self):
        for bad in [True, "100", -1, 101, None]:
            with self.subTest(value=bad):
                self.doc["status"]["traffic"][0]["percent"] = bad
                with self.assertRaises(CleanupError): self.inspect()

    def test_exact_tag_only_command_and_readback(self):
        def run(args):
            self.calls.append(args)
            if "update-traffic" in args:
                self.doc["status"]["traffic"].pop(2)
                return ""
            return json.dumps(self.doc)
        self.assertEqual(cleanup(run, "app", "project", "region", "gh-aaaaaaa", "app-new"), ["gh-bbbbbbb"])
        self.assertEqual(self.calls[2], ["gcloud", "run", "services", "update-traffic", "app", "--project", "project", "--region", "region", "--remove-tags=gh-bbbbbbb", "--quiet"])
        self.assertEqual(len(self.calls), 4)

    def test_concurrent_change_before_mutation(self):
        def run(args):
            self.calls.append(args)
            if len(self.calls) == 2: self.doc["status"]["traffic"].pop(2)
            return json.dumps(self.doc)
        with self.assertRaises(CleanupError): cleanup(run, "app", "p", "r", "gh-aaaaaaa", "app-new")
        self.assertEqual(len(self.calls), 2)

    def test_noop_does_not_mutate(self):
        self.doc["status"]["traffic"].pop(2)
        def run(args): self.calls.append(args); return json.dumps(self.doc)
        self.assertEqual(cleanup(run, "app", "p", "r", "gh-aaaaaaa", "app-new"), [])
        self.assertEqual(len(self.calls), 1)

    def test_failed_command_is_not_retried(self):
        def run(args):
            self.calls.append(args)
            if "update-traffic" in args: raise subprocess.CalledProcessError(1, args)
            return json.dumps(self.doc)
        with self.assertRaises(subprocess.CalledProcessError): cleanup(run, "app", "p", "r", "gh-aaaaaaa", "app-new")
        self.assertEqual(len(self.calls), 3)

    def test_readback_retained_tag_fails(self):
        def run(args): return json.dumps(self.doc)
        with self.assertRaises(CleanupError): cleanup(run, "app", "p", "r", "gh-aaaaaaa", "app-new")

    def test_malformed_json_fails_before_mutation(self):
        def run(args): self.calls.append(args); return "not-json"
        with self.assertRaises(ValueError): cleanup(run, "app", "p", "r", "gh-aaaaaaa", "app-new")
        self.assertEqual(len(self.calls), 1)

    def test_failed_canary_selects_only_exact_tag(self):
        self.assertEqual(inspect_service(self.doc, "app", "gh-bbbbbbb", "app-old", True)[0], ["gh-bbbbbbb"])

    def test_failed_canary_receiving_traffic_noop(self):
        self.assertEqual(inspect_service(self.doc, "app", "gh-aaaaaaa", "app-new", True)[0], [])

    def test_failed_canary_reassigned_tag_rejected(self):
        with self.assertRaises(CleanupError):
            inspect_service(self.doc, "app", "gh-aaaaaaa", "app-old", True)

    def test_failed_canary_missing_tag_noop(self):
        self.doc["status"]["traffic"].pop(2)
        self.assertEqual(inspect_service(self.doc, "app", "gh-bbbbbbb", "app-old", True)[0], [])

    def test_failed_canary_command_preserves_custom_tags(self):
        def run(args):
            self.calls.append(args)
            if "update-traffic" in args:
                self.doc["status"]["traffic"].pop(2)
                return ""
            return json.dumps(self.doc)
        self.assertEqual(cleanup(run, "app", "p", "r", "gh-bbbbbbb", "app-old", True), ["gh-bbbbbbb"])
        self.assertEqual(self.doc["status"]["traffic"][2]["tag"], "keep-custom")
        self.assertEqual(len(self.calls), 4)


if __name__ == "__main__":
    unittest.main()
