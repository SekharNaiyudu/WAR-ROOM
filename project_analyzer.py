"""Safe static analysis for hackathon project ZIP submissions.
No project file is extracted or executed by this module.
"""
from __future__ import annotations

import ast
import io
import json
import re
import zipfile
from collections import Counter
from pathlib import PurePosixPath

MAX_UPLOAD_BYTES = 200 * 1024 * 1024
MAX_ARCHIVE_FILES = 50_000
MAX_UNCOMPRESSED_BYTES = 300 * 1024 * 1024
MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024

SKIP_DIRECTORIES = {"node_modules", ".git", "venv", ".venv", "dist", "build", "__pycache__", ".next", "coverage", "vendor"}
LANGUAGES = {
    ".py": "Python", ".js": "JavaScript", ".jsx": "React", ".ts": "TypeScript", ".tsx": "React",
    ".java": "Java", ".kt": "Kotlin", ".dart": "Dart", ".go": "Go", ".rs": "Rust",
    ".c": "C", ".cpp": "C++", ".cs": "C#", ".php": "PHP", ".rb": "Ruby", ".swift": "Swift",
}
MANIFESTS = {"package.json", "requirements.txt", "pyproject.toml", "pom.xml", "build.gradle", "build.gradle.kts", "pubspec.yaml", "go.mod", "cargo.toml"}


def _issue(items: list[dict], severity: str, message: str, path: str | None = None) -> None:
    if len(items) < 40:
        items.append({"severity": severity, "message": message, "path": path})


def _safe_path(name: str) -> bool:
    path = PurePosixPath(name.replace("\\", "/"))
    return not path.is_absolute() and ".." not in path.parts


def analyze_project_zip(payload: bytes, filename: str) -> dict:
    if len(payload) > MAX_UPLOAD_BYTES:
        raise ValueError("Upload exceeds the 200 MB analyzer limit. Exclude dependencies, build output and datasets.")
    try:
        archive = zipfile.ZipFile(io.BytesIO(payload))
    except zipfile.BadZipFile as error:
        raise ValueError("The uploaded file is not a valid ZIP archive.") from error

    entries = archive.infolist()
    if len(entries) > MAX_ARCHIVE_FILES:
        raise ValueError("ZIP contains too many files. Exclude node_modules, .git and build folders.")
    if sum(entry.file_size for entry in entries) > MAX_UNCOMPRESSED_BYTES:
        raise ValueError("ZIP expands beyond the 300 MB inspection safety limit.")

    issues: list[dict] = []
    files: list[str] = []
    languages: Counter[str] = Counter()
    source_files = 0
    source_lines = 0
    tests = False
    api_signal = False
    debug_count = 0
    todo_count = 0

    for entry in entries:
        name = entry.filename.replace("\\", "/")
        if not _safe_path(name):
            raise ValueError("ZIP contains an unsafe file path.")
        parts = PurePosixPath(name).parts
        if entry.is_dir() or any(part.lower() in SKIP_DIRECTORIES for part in parts):
            continue
        files.append(name)
        lowered_name = name.lower()
        tests = tests or "test" in lowered_name or "spec" in lowered_name
        suffix = PurePosixPath(name).suffix.lower()
        if suffix not in LANGUAGES:
            continue
        source_files += 1
        languages[LANGUAGES[suffix]] += 1
        if entry.file_size > MAX_SOURCE_FILE_BYTES:
            _issue(issues, "warning", "Source file exceeds 2 MB and was not read.", name)
            continue
        text = archive.read(entry).decode("utf-8", errors="ignore")
        line_count = len(text.splitlines())
        source_lines += line_count
        lowered = text.lower()

        if line_count > 800:
            _issue(issues, "warning", f"Large source file ({line_count} lines); split responsibilities.", name)
        markers = sum(lowered.count(token) for token in ("todo", "fixme", "xxx", "hack"))
        todo_count += markers
        if markers:
            _issue(issues, "warning", f"Contains {markers} unfinished TODO/FIXME/HACK marker(s).", name)
        if any(token in lowered for token in ("console.log(", "debugger;", "debug=true", "print(")):
            debug_count += 1
            _issue(issues, "warning", "Debug output is present in submitted source.", name)
        if any(token in lowered for token in ("api_key=", "api-key=", "secret=", "password=", "private key", "begin rsa private key")):
            _issue(issues, "critical", "Possible hard-coded credential or private key.", name)
        if any(token in lowered for token in ("app.get(", "app.post(", "app.put(", "app.delete(", "router.", "@app.", "express(", "flask(")):
            api_signal = True
        if suffix == ".py":
            try:
                ast.parse(text)
            except SyntaxError as error:
                _issue(issues, "critical", f"Python syntax error near line {error.lineno}.", name)
        if suffix in {".js", ".jsx", ".ts", ".tsx"} and text.count("{") != text.count("}"):
            _issue(issues, "critical", "Unbalanced braces; possible JavaScript/TypeScript syntax error.", name)

    lower_files = {path.lower() for path in files}
    has_readme = any(PurePosixPath(path).name.lower().startswith("readme") for path in files)
    manifest = next((name for name in MANIFESTS if name in lower_files), None)
    if not has_readme:
        _issue(issues, "critical", "README is missing; judges cannot reproduce the project.")
    if not manifest:
        _issue(issues, "warning", "No dependency manifest was detected.")
    if not tests:
        _issue(issues, "critical", "No test files were detected.")
    if source_files < 3:
        _issue(issues, "critical", "Too little source code to demonstrate a complete project.")
    if source_files > 4 and not api_signal:
        _issue(issues, "warning", "No backend/API integration signal was detected.")

    critical = sum(item["severity"] == "critical" for item in issues)
    warnings = sum(item["severity"] == "warning" for item in issues)
    scores = {
        "functionality": max(0, 30 - (critical * 6) - warnings),
        "code_quality": max(0, 20 - (critical * 4) - (warnings * 2)),
        "documentation": 15 if has_readme and manifest else 7 if has_readme else 0,
        "testing": 10 if tests else 0,
        "security": max(0, 15 - (critical * 5)),
        "architecture": 10 if source_files >= 8 and api_signal else 6 if source_files >= 5 else 2,
    }
    score = sum(scores.values())
    verdict = "approved" if score >= 80 and not critical else "conditional" if score >= 60 and critical < 2 else "rejected"
    return {
        "filename": filename,
        "score": score,
        "verdict": verdict,
        "scores": scores,
        "issues": issues,
        "summary": {"files_scanned": len(files), "source_files": source_files, "source_lines": source_lines, "languages": dict(languages), "readme": has_readme, "manifest": manifest, "tests": tests, "api_signal": api_signal, "todo_markers": todo_count, "debug_files": debug_count},
        "analysis_version": "strict-static-v1",
    }
