"""Inert, synthetic tempfile contracts; no app, Docker, provider or subprocess."""
import hashlib
import json
import os
import tempfile
import traceback
import unittest
from dataclasses import asdict, replace
from pathlib import Path
from unittest import mock

import local_release_receipt as gate


class ReceiptTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.root.chmod(0o700)
        self.fd = os.open(self.root, os.O_RDONLY | os.O_DIRECTORY)
        self.addCleanup(os.close, self.fd)
        self.now = 10000
        stages, pins = [], []
        image_order = ["image-build", "image-scan", "image-smoke", "browser", "lighthouse"]
        ordered = sorted(gate.REQUIRED_STAGE_IDS - set(image_order)) + image_order
        for index, name in enumerate(ordered):
            log = self.write(f"log-{index}.txt", b"synthetic successful log\n")
            pin = gate.StagePin(".", ("synthetic-tool", name), (("synthetic-tool", "1.2.3"),),
                                (("source", "a" * 64),), log, 60000)
            pins.append((name, pin))
            stages.append(dict(id=name, cwd=pin.cwd, argv=list(pin.argv), tools=dict(pin.tools),
                               inputs=dict(pin.inputs), started=9900 + index, finished=9901 + index, duration_ms=1000,
                               timeout_ms=60000, exit_code=0, signal=None, timed_out=False, log=asdict(log)))
        archive = self.write("image.tar", b"inert archive bytes, never extracted")
        context = self.write("context.tar", b"synthetic tracked-only source")
        scan = self.write("scan.json", b'{"synthetic":true}')
        lifecycle = self.write("lifecycle.json", b'{"synthetic":true}')
        self.doc = dict(schema="portfolio.local-receipt.v1", repository="jckail/portfolio",
                        commit="a" * 40, tree="b" * 40, current_main="a" * 40, policy_sha256="c" * 64,
                        run_nonce="independent-admission-1234", source_files={"source": "a" * 64},
                        locks={"lock": "d" * 64}, started=9900, finished=9950, stages=stages,
                        image=dict(id="sha256:" + "e" * 64, platform="linux/amd64", commit="a" * 40,
                                   tree="b" * 40, archive=asdict(archive), context=asdict(context),
                                   scan_report=asdict(scan), scanner_version="1.2.3", scanner_db_sha256="f" * 64,
                                   scanner_db_time=9890, scanned_at=9900 + ordered.index("image-scan"),
                                   scan_input_sha256=archive.sha256,
                                   severity=["CRITICAL", "HIGH"], ignore_unfixed=True, findings=0, scan_exit=0),
                        lifecycle=dict(settled=True, receipt=asdict(lifecycle)))
        receipt = self.write("receipt.json", json.dumps(self.doc).encode())
        st = os.fstat(self.fd)
        self.expected = gate.AdmittedPins("jckail/portfolio", "a" * 40, "b" * 40, "a" * 40,
                                         "c" * 64, "independent-admission-1234", st.st_uid, st.st_dev,
                                         st.st_ino, receipt, (("source", "a" * 64),), (("lock", "d" * 64),),
                                         tuple(pins), "sha256:" + "e" * 64, archive, context, scan, lifecycle,
                                         "1.2.3", "f" * 64, 9890, 300, 300, 16 * gate.CHUNK_BYTES)

    def write(self, name, data):
        target = self.root / name
        if target.exists():
            target.unlink()
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(fd, "wb", closefd=False) as stream:
                stream.write(data)
        finally:
            os.close(fd)
        st = target.stat()
        return gate.FilePin(name, hashlib.sha256(data).hexdigest(), len(data), st.st_dev, st.st_ino)

    def repin_receipt(self, raw=None):
        # This synthetic caller is independent of evaluate; adversarial semantic
        # tests repin bytes so they exercise schema/contracts rather than only SHA.
        pin = self.write("receipt.json", raw if raw is not None else json.dumps(self.doc).encode())
        self.expected = replace(self.expected, receipt=pin)

    def evaluate(self, **kwargs):
        return gate.evaluate("receipt.json", expected=kwargs.get("expected", self.expected),
                             trusted_now=kwargs.get("now", self.now), rootdirfd=self.fd)

    def reject(self):
        with self.assertRaises(gate.ReceiptError):
            self.evaluate()
        os.fstat(self.fd)  # The caller's root descriptor must remain open.

    def test_valid_qualification_never_grants_authority(self):
        result = self.evaluate()
        self.assertTrue(result.qualified_local)
        self.assertFalse(result.deployment_authorized)
        self.assertFalse(result.branch_protection_satisfied)
        self.assertFalse(result.remote_ready)

    def test_no_evidence_derived_admission_or_empty_stage_policy(self):
        for expected in (None, self.doc, replace(self.expected, stages=())):
            with self.subTest(expected_type=type(expected).__name__), self.assertRaises(gate.ReceiptError):
                self.evaluate(expected=expected)

    def test_source_and_policy_mismatches(self):
        for key in ("repository", "commit", "tree", "current_main", "policy_sha256", "run_nonce"):
            with self.subTest(key=key):
                prior = self.doc[key]
                self.doc[key] = "wrong"
                self.repin_receipt()
                self.reject()
                self.doc[key] = prior

    def test_missing_extra_and_duplicate_stages(self):
        original = self.doc["stages"]
        for stages in (original[:-1], original + [original[0]], [original[0]] * len(original)):
            self.doc["stages"] = stages
            self.repin_receipt()
            self.reject()
        self.doc["stages"] = original

    def test_closed_schema_duplicate_keys_nonfinite_depth_and_malformed(self):
        raws = (b'{"schema":1,"schema":2}', b'{"x":NaN}', b'[]', b'{', b'[' * 20 + b'0' + b']' * 20)
        for raw in raws:
            with self.subTest(raw=raw):
                self.repin_receipt(raw)
                self.reject()
        self.doc["extra"] = "not admitted"
        self.repin_receipt()
        self.reject()

    def test_stage_command_tool_input_outcome_and_boolean_integer(self):
        stage = self.doc["stages"][0]
        for key, value in (("argv", ["true"]), ("cwd", "elsewhere"), ("tools", {"synthetic-tool": "1.2.4"}),
                           ("inputs", {}), ("exit_code", 1), ("signal", "SIGTERM"), ("timed_out", True),
                           ("duration_ms", 60001), ("exit_code", False), ("timeout_ms", "60000")):
            with self.subTest(key=key, value=value):
                prior = stage[key]
                stage[key] = value
                self.repin_receipt()
                self.reject()
                stage[key] = prior

    def test_stale_future_and_unadmitted_main(self):
        for now in (9800, 11000, True):
            with self.subTest(now=now), self.assertRaises(gate.ReceiptError):
                self.evaluate(now=now)
        with self.assertRaises(gate.ReceiptError):
            self.evaluate(expected=replace(self.expected, current_main="f" * 40))

    def test_archive_scan_and_lifecycle_contracts(self):
        for key, value in (("scan_input_sha256", "a" * 64), ("platform", "linux/arm64"),
                           ("scanner_db_time", 1), ("findings", 1), ("scan_exit", 1),
                           ("ignore_unfixed", 1), ("severity", ["CRITICAL"])):
            with self.subTest(key=key):
                prior = self.doc["image"][key]
                self.doc["image"][key] = value
                self.repin_receipt()
                self.reject()
                self.doc["image"][key] = prior
        self.doc["lifecycle"]["settled"] = False
        self.repin_receipt()
        self.reject()

    def test_missing_file_wrong_mode_and_hardlink(self):
        log = self.root / self.expected.stages[0][1].log.path
        log.chmod(0o644)
        self.reject()
        log.chmod(0o600)
        os.link(log, self.root / "alias")
        self.reject()
        (self.root / "alias").unlink()
        log.unlink()
        self.reject()

    def test_symlink_file_and_directory_rejected(self):
        log = self.root / self.expected.stages[0][1].log.path
        contents = log.read_bytes()
        log.unlink()
        other = self.root / "real"
        other.write_bytes(contents)
        other.chmod(0o600)
        log.symlink_to(other)
        self.reject()
        (self.root / "dir").symlink_to(self.root, target_is_directory=True)
        bad = replace(self.expected.receipt, path="dir/receipt.json")
        with self.assertRaises(gate.ReceiptError):
            gate.evaluate(bad.path, expected=replace(self.expected, receipt=bad), trusted_now=self.now, rootdirfd=self.fd)

    def test_path_escape_and_wrong_inode(self):
        for path in ("../receipt.json", "/receipt.json", "a//receipt.json", "./receipt.json", "a%2freceipt.json"):
            pin = replace(self.expected.receipt, path=path)
            with self.subTest(path=path), self.assertRaises(gate.ReceiptError):
                gate.evaluate(path, expected=replace(self.expected, receipt=pin), trusted_now=self.now, rootdirfd=self.fd)
        self.expected = replace(self.expected, receipt=replace(self.expected.receipt, inode=0))
        self.reject()

    def test_mutation_during_stream_is_rejected(self):
        real_read = os.read
        archive = self.root / self.expected.archive.path
        changed = False

        def read(fd, count):
            nonlocal changed
            data = real_read(fd, count)
            if not changed and os.fstat(fd).st_ino == self.expected.archive.inode and data:
                changed = True
                with archive.open("ab") as stream:
                    stream.write(b"late mutation")
            return data

        with mock.patch.object(gate.os, "read", side_effect=read):
            self.reject()
        self.assertTrue(changed)

    def test_chunk_limits_and_total_cap(self):
        real_read = os.read
        calls = []

        def read(fd, count):
            calls.append(count)
            return real_read(fd, count)

        with mock.patch.object(gate.os, "read", side_effect=read):
            self.evaluate()
        self.assertTrue(calls)
        self.assertLessEqual(max(calls), gate.CHUNK_BYTES)
        self.expected = replace(self.expected, max_total_bytes=1)
        self.reject()

    def test_json_cap_and_changed_archive_bytes(self):
        self.repin_receipt(b" " * (gate.JSON_BYTES + 1))
        self.reject()
        self.repin_receipt()
        (self.root / self.expected.archive.path).write_bytes(b"wrong archive")
        self.reject()

    def test_public_tracebacks_suppress_private_exception_context(self):
        marker = "synthetic-private-content-7722"
        for raw in (b'{"x":"' + marker.encode() + b'",}', marker.encode() + b'\xff'):
            self.repin_receipt(raw)
            try:
                self.evaluate()
            except gate.ReceiptError as error:
                rendered = "".join(traceback.format_exception(error))
                self.assertNotIn(marker, rendered)
                self.assertNotIn("JSONDecodeError", rendered)
                self.assertNotIn("UnicodeDecodeError", rendered)
                self.assertTrue(error.__suppress_context__)
            else:
                self.fail("Invalid private JSON was accepted")
        pin = replace(self.expected.receipt, path=marker)
        try:
            gate.evaluate(marker, expected=replace(self.expected, receipt=pin),
                          trusted_now=self.now, rootdirfd=self.fd)
        except gate.ReceiptError as error:
            self.assertNotIn(marker, "".join(traceback.format_exception(error)))
            self.assertTrue(error.__suppress_context__)
        else:
            self.fail("Missing private filename was accepted")

    def test_duration_and_serial_order_use_admitted_policy(self):
        first, second = self.doc["stages"][:2]
        first["duration_ms"] = 0
        self.repin_receipt()
        self.reject()  # zero reported duration cannot hide an integer-second span
        first["duration_ms"] = 1000
        second["started"] = first["started"]
        second["finished"] = first["finished"]
        self.repin_receipt()
        self.reject()  # individually valid windows, but overlap
        second["started"] += 1
        second["finished"] += 1
        self.doc["stages"].reverse()
        self.repin_receipt()
        self.assertTrue(self.evaluate().qualified_local)  # array order is irrelevant
        pins = list(self.expected.stages)
        names = [name for name, _ in pins]
        build, scan = names.index("image-build"), names.index("image-scan")
        pins[build], pins[scan] = pins[scan], pins[build]
        with self.assertRaises(gate.ReceiptError):
            self.evaluate(expected=replace(self.expected, stages=tuple(pins)))

    def test_scan_is_within_actual_scan_window(self):
        self.doc["image"]["scanned_at"] = self.doc["finished"]
        self.repin_receipt()
        self.reject()

    def test_zero_duration_cannot_cover_sixty_second_window(self):
        first = self.doc["stages"][0]
        first["finished"] = first["started"] + 60
        first["duration_ms"] = 0
        self.doc["finished"] = first["finished"] + 10
        self.repin_receipt()
        self.reject()

    def test_build_scan_windows_cannot_be_reversed(self):
        stages = {stage["id"]: stage for stage in self.doc["stages"]}
        build, scan = stages["image-build"], stages["image-scan"]
        for key in ("started", "finished"):
            build[key], scan[key] = scan[key], build[key]
        self.doc["image"]["scanned_at"] = scan["started"]
        self.repin_receipt()
        self.reject()

    def test_same_second_zero_duration_adjacent_stages_are_valid(self):
        first, second = self.doc["stages"][:2]
        for stage in (first, second):
            stage["started"] = stage["finished"] = 9900
            stage["duration_ms"] = 0
        self.repin_receipt()
        self.assertTrue(self.evaluate().qualified_local)


if __name__ == "__main__":
    unittest.main()
