"""JCK-270: local byte/contract qualification, NEVER deployment authority.

AdmittedPins must arrive through an independently reviewed caller channel. This
module cannot authenticate that caller, a runner, or a JSON assertion. It does
not certify live main, processes, registry state, signatures or branch controls.
No CLI, environment lookup, subprocess, network, signer or provider adapter.
"""
import hashlib
import json
import os
import re
import stat
from dataclasses import dataclass, field

# ci.yml: frontend30-70, backend95-138, terraform171-185, docker198-283.
# Environment receipts cover installs OR independently admitted exact-lock reuse.
REQUIRED_STAGE_IDS = frozenset({
    "frontend-environment", "frontend-audit", "frontend-lint", "frontend-types",
    "frontend-boundary", "frontend-css", "frontend-coverage", "frontend-build",
    "copilot-environment", "copilot-audit", "copilot-test", "python-environment",
    "python-audit", "dev-audit", "deploy-helper", "tags-helper", "backend-lint",
    "backend-compile", "backend-coverage", "auth-floor", "terraform-key-guard",
    "terraform-fmt", "terraform-init", "terraform-validate", "image-build",
    "image-scan", "image-smoke", "browser", "lighthouse",
})
CHUNK_BYTES = 1024 * 1024
JSON_BYTES = CHUNK_BYTES
MAX_LOG_BYTES = 64 * CHUNK_BYTES
MAX_ARCHIVE_BYTES = 8 * 1024 * CHUNK_BYTES
MAX_SAFE_INT = 2**53 - 1


class ReceiptError(ValueError):
    """Short categories only: never include receipt/log/argument contents."""


@dataclass(frozen=True)
class FilePin:
    path: str
    sha256: str
    size: int
    device: int
    inode: int


@dataclass(frozen=True)
class StagePin:
    cwd: str
    argv: tuple[str, ...]
    tools: tuple[tuple[str, str], ...]
    inputs: tuple[tuple[str, str], ...]
    log: FilePin
    timeout_ms: int


@dataclass(frozen=True)
class AdmittedPins:
    repository: str
    commit: str
    tree: str
    current_main: str
    policy_sha256: str
    run_nonce: str
    root_uid: int
    root_device: int
    root_inode: int
    receipt: FilePin
    source_files: tuple[tuple[str, str], ...]
    locks: tuple[tuple[str, str], ...]
    stages: tuple[tuple[str, StagePin], ...]
    image_id: str
    archive: FilePin
    context: FilePin
    scan_report: FilePin
    lifecycle: FilePin
    scanner_version: str
    scanner_db_sha256: str
    scanner_db_time: int
    max_age_seconds: int
    max_scan_age_seconds: int
    max_total_bytes: int


@dataclass(frozen=True)
class Qualification:
    commit: str
    tree: str
    receipt_sha256: str
    archive_sha256: str
    qualified_local: bool = field(default=True, init=False)
    deployment_authorized: bool = field(default=False, init=False)
    branch_protection_satisfied: bool = field(default=False, init=False)
    remote_ready: bool = field(default=False, init=False)


def _require(condition, code):
    if not condition:
        raise ReceiptError(code)


def _integer(value, minimum=0, maximum=MAX_SAFE_INT):
    _require(type(value) is int and minimum <= value <= maximum, "integer")


def _digest(value, length=64):
    _require(type(value) is str and re.fullmatch(r"[a-f0-9]{" + str(length) + r"}", value), "digest")


def _pairs(pairs, *, hashes=False):
    _require(type(pairs) is tuple and 0 < len(pairs) <= 256, "pins")
    result = {}
    for pair in pairs:
        _require(type(pair) is tuple and len(pair) == 2, "pins")
        name, value = pair
        _require(type(name) is str and 0 < len(name) <= 256 and name not in result, "pins")
        _require(type(value) is str and 0 < len(value) <= 4096, "pins")
        if hashes:
            _digest(value)
        result[name] = value
    return result


def _shape(value, keys):
    _require(type(value) is dict and set(value) == set(keys.split()), "schema")


def _bounded_json(data):
    def object_pairs(pairs):
        result = {}
        for key, value in pairs:
            _require(key not in result, "duplicate-key")
            result[key] = value
        return result

    def invalid_constant(_):
        raise ReceiptError("nonfinite-json")

    try:
        document = json.loads(data, object_pairs_hook=object_pairs, parse_constant=invalid_constant)
    except (ValueError, UnicodeError, RecursionError) as error:
        raise ReceiptError("json") from error

    def walk(value, depth=0):
        _require(depth <= 16, "json-depth")
        if type(value) is dict:
            _require(len(value) <= 256, "json-width")
            for key, child in value.items():
                _require(type(key) is str and len(key) <= 256, "json-key")
                walk(child, depth + 1)
        elif type(value) is list:
            _require(len(value) <= 256, "json-width")
            for child in value:
                walk(child, depth + 1)
        elif type(value) is str:
            _require(len(value) <= 4096, "json-string")
        else:
            _require(value is None or type(value) in (bool, int), "json-type")
            if type(value) is int:
                _integer(value, -MAX_SAFE_INT)
    walk(document)
    return document


def _identity(st):
    return (st.st_dev, st.st_ino, st.st_size, st.st_mtime_ns, st.st_ctime_ns, st.st_nlink)


class _Reader:
    def __init__(self, root_fd, expected):
        self.root_fd, self.expected = root_fd, expected
        self.seen, self.bytes = set(), 0

    def read(self, pin, cap, *, collect=False):
        _require(type(pin) is FilePin, "file-pin")
        _digest(pin.sha256)
        for value in (pin.size, pin.device, pin.inode):
            _integer(value)
        _require(pin.size <= cap, "file-cap")
        _require(type(pin.path) is str and len(pin.path) <= 512, "path")
        parts = pin.path.split("/")
        _require(all(re.fullmatch(r"[A-Za-z0-9_.-]+", p) and p not in (".", "..") for p in parts), "path")
        parent = os.dup(self.root_fd)
        file_fd = None
        try:
            for component in parts[:-1]:
                child = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
                st = os.fstat(child)
                if not (st.st_uid == self.expected.root_uid and stat.S_IMODE(st.st_mode) == 0o700):
                    os.close(child)
                    raise ReceiptError("directory")
                os.close(parent)
                parent = child
            file_fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
            before = os.fstat(file_fd)
            _require(stat.S_ISREG(before.st_mode) and stat.S_IMODE(before.st_mode) == 0o600
                     and before.st_uid == self.expected.root_uid and before.st_nlink == 1, "file-mode")
            _require((before.st_dev, before.st_ino, before.st_size) == (pin.device, pin.inode, pin.size), "file-identity")
            key = (before.st_dev, before.st_ino)
            _require(key not in self.seen, "file-alias")
            self.seen.add(key)
            digest, chunks, count = hashlib.sha256(), [], 0
            while True:
                chunk = os.read(file_fd, min(CHUNK_BYTES, cap - count + 1))
                if not chunk:
                    break
                count += len(chunk)
                self.bytes += len(chunk)
                _require(count <= cap and count <= pin.size and self.bytes <= self.expected.max_total_bytes, "read-cap")
                digest.update(chunk)
                if collect:
                    chunks.append(chunk)
            _require(count == pin.size and _identity(before) == _identity(os.fstat(file_fd)), "file-mutated")
            _require(digest.hexdigest() == pin.sha256, "file-digest")
            return b"".join(chunks) if collect else None
        except OSError as error:
            raise ReceiptError("file-access") from error
        finally:
            if file_fd is not None:
                os.close(file_fd)
            os.close(parent)


def _file_ref(ref, pin):
    _shape(ref, "path sha256 size device inode")
    _require(ref == {"path": pin.path, "sha256": pin.sha256, "size": pin.size,
                     "device": pin.device, "inode": pin.inode}, "file-reference")
    for key in ("size", "device", "inode"):
        _integer(ref[key])


def _evaluate(receipt_path, *, expected, trusted_now, rootdirfd):
    """Validate pinned local evidence only; all authority flags remain false.

    expected is caller-admitted, NOT loaded from the evidence, labels, UUID or
    environment. Receipt path is relative to an already admitted directory fd.
    The caller owns that fd; this function closes only its own duplicates/files.
    Private exclusive-writer provenance must be reviewed BEFORE pins are admitted.
    Current mode/nlink/hash cannot prove historical exclusivity or truthful runs.
    """
    _require(type(expected) is AdmittedPins, "admission")
    _integer(trusted_now)
    _integer(expected.root_uid)
    _integer(expected.root_device)
    _integer(expected.root_inode)
    _require(expected.repository == "jckail/portfolio", "repository")
    for value in (expected.commit, expected.tree, expected.current_main):
        _digest(value, 40)
    _require(expected.current_main == expected.commit, "current-main")
    _digest(expected.policy_sha256)
    _require(type(expected.run_nonce) is str and re.fullmatch(r"[A-Za-z0-9_-]{16,80}", expected.run_nonce), "nonce")
    _integer(expected.max_age_seconds, 1, 86400)
    _integer(expected.max_scan_age_seconds, 1, 86400)
    _integer(expected.max_total_bytes, 1, 16 * MAX_ARCHIVE_BYTES)
    _integer(expected.scanner_db_time)
    _digest(expected.scanner_db_sha256)
    _require(type(expected.scanner_version) is str and re.fullmatch(r"\d+\.\d+\.\d+", expected.scanner_version), "scanner")
    _require(type(expected.image_id) is str and re.fullmatch(r"sha256:[a-f0-9]{64}", expected.image_id), "image")
    source_files, locks = _pairs(expected.source_files, hashes=True), _pairs(expected.locks, hashes=True)
    _require(type(expected.stages) is tuple and len(expected.stages) == len(REQUIRED_STAGE_IDS), "stage-pins")
    stage_pins = dict(expected.stages)
    _require(set(stage_pins) == REQUIRED_STAGE_IDS, "stage-pins")
    admitted_order = [name for name, _ in expected.stages]
    image_order = ["image-build", "image-scan", "image-smoke", "browser", "lighthouse"]
    _require([name for name in admitted_order if name in image_order] == image_order, "stage-dependencies")
    for pin in stage_pins.values():
        _require(type(pin) is StagePin and pin.cwd in (".", "frontend", "copilot", "infra", "e2e"), "stage-pin")
        _require(type(pin.argv) is tuple and 0 < len(pin.argv) <= 64
                 and all(type(arg) is str and 0 < len(arg) <= 4096 and "\x00" not in arg for arg in pin.argv), "command")
        _pairs(pin.tools)
        _require(all(re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?", version)
                     for version in _pairs(pin.tools).values()), "tool-version")
        _pairs(pin.inputs, hashes=True)
        _integer(pin.timeout_ms, 1, 1200000)
    root = os.fstat(rootdirfd)
    _require(stat.S_ISDIR(root.st_mode) and stat.S_IMODE(root.st_mode) == 0o700
             and (root.st_uid, root.st_dev, root.st_ino) ==
             (expected.root_uid, expected.root_device, expected.root_inode), "root")
    _require(receipt_path == expected.receipt.path, "receipt-path")
    reader = _Reader(rootdirfd, expected)
    doc = _bounded_json(reader.read(expected.receipt, JSON_BYTES, collect=True))
    _shape(doc, "schema repository commit tree current_main policy_sha256 run_nonce source_files locks started finished stages image lifecycle")
    for key in ("repository", "commit", "tree", "current_main", "policy_sha256", "run_nonce"):
        _require(doc[key] == getattr(expected, key), "source-policy")
    _require(doc["schema"] == "portfolio.local-receipt.v1", "schema-version")
    _require(doc["source_files"] == source_files and doc["locks"] == locks, "source-inputs")
    for key in ("started", "finished"):
        _integer(doc[key])
    _require(trusted_now - expected.max_age_seconds <= doc["started"] <= doc["finished"] <= trusted_now, "freshness")
    _require(type(doc["stages"]) is list and len(doc["stages"]) == len(REQUIRED_STAGE_IDS), "stages")
    seen = set()
    for stage in doc["stages"]:
        _shape(stage, "id cwd argv tools inputs started finished duration_ms timeout_ms exit_code signal timed_out log")
        name = stage["id"]
        _require(type(name) is str and name in stage_pins and name not in seen, "stage-id")
        seen.add(name)
        pin = stage_pins[name]
        _require(stage["cwd"] == pin.cwd and type(stage["argv"]) is list and stage["argv"] == list(pin.argv)
                 and stage["tools"] == _pairs(pin.tools) and stage["inputs"] == _pairs(pin.inputs, hashes=True), "stage-contract")
        for key in ("started", "finished", "duration_ms", "timeout_ms", "exit_code"):
            _integer(stage[key])
        _require(doc["started"] <= stage["started"] <= stage["finished"] <= doc["finished"]
                 and 0 <= stage["duration_ms"] <= pin.timeout_ms
                 and abs(stage["duration_ms"] - 1000 * (stage["finished"] - stage["started"])) < 1000
                 and stage["finished"] - stage["started"] <= (pin.timeout_ms + 999) // 1000
                 and stage["timeout_ms"] == pin.timeout_ms, "stage-time")
        _require(stage["exit_code"] == 0 and stage["signal"] is None and stage["timed_out"] is False, "stage-outcome")
        _file_ref(stage["log"], pin.log)
        reader.read(pin.log, MAX_LOG_BYTES)
    # Caller-admitted order, NEVER the evidence array's presentation order.
    by_id = {stage["id"]: stage for stage in doc["stages"]}
    for before, after in zip(admitted_order[:-1], admitted_order[1:], strict=True):
        _require(by_id[before]["finished"] <= by_id[after]["started"], "stage-chronology")
    image = doc["image"]
    _shape(image, "id platform commit tree archive context scan_report scanner_version scanner_db_sha256 scanner_db_time scanned_at scan_input_sha256 severity ignore_unfixed findings scan_exit")
    _require(image["id"] == expected.image_id and image["platform"] == "linux/amd64"
             and image["commit"] == expected.commit and image["tree"] == expected.tree, "image-source")
    for key, pin, cap in (("archive", expected.archive, MAX_ARCHIVE_BYTES),
                          ("context", expected.context, MAX_ARCHIVE_BYTES), ("scan_report", expected.scan_report, 4 * JSON_BYTES)):
        _file_ref(image[key], pin)
        reader.read(pin, cap)
    _integer(image["scanner_db_time"])
    _integer(image["scanned_at"])
    _integer(image["findings"])
    _integer(image["scan_exit"])
    _require(image["scanner_version"] == expected.scanner_version
             and image["scanner_db_sha256"] == expected.scanner_db_sha256
             and image["scanner_db_time"] == expected.scanner_db_time
             and trusted_now - expected.max_scan_age_seconds <= image["scanner_db_time"] <= image["scanned_at"]
             and by_id["image-scan"]["started"] <= image["scanned_at"] <= by_id["image-scan"]["finished"],
             "scan-freshness")
    _require(image["scan_input_sha256"] == expected.archive.sha256
             and image["severity"] == ["CRITICAL", "HIGH"] and image["ignore_unfixed"] is True
             and image["findings"] == 0 and image["scan_exit"] == 0, "scan-contract")
    _shape(doc["lifecycle"], "settled receipt")
    _require(doc["lifecycle"]["settled"] is True, "lifecycle")
    _file_ref(doc["lifecycle"]["receipt"], expected.lifecycle)
    reader.read(expected.lifecycle, JSON_BYTES)
    return Qualification(expected.commit, expected.tree, expected.receipt.sha256, expected.archive.sha256)


def evaluate(receipt_path, *, expected, trusted_now, rootdirfd):
    """See _evaluate: independently admitted pins, local qualification only."""
    try:
        return _evaluate(receipt_path, expected=expected, trusted_now=trusted_now, rootdirfd=rootdirfd)
    except ReceiptError as error:
        raise ReceiptError(str(error)) from None
    except (OSError, TypeError, ValueError, KeyError, AttributeError):
        raise ReceiptError("invalid-evidence-or-pins") from None
