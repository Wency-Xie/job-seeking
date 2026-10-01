#!/usr/bin/env python3
"""Shared deterministic helpers for matcher-assistant v0.1.0."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

SKILL_VERSION = "0.1.0"
CONFIRMED_KEY = "jobSeekingOS.applicationProfile.confirmed.v2"
LEVEL_SCORES = {"direct": 100, "transferable": 70, "self_reported": 30, "none": 0}
RECOMMENDATIONS = {
    "apply": "可以投递",
    "strengthen": "补强后推荐",
    "not_recommended": "暂不推荐",
    "evidence_insufficient": "证据不足",
}


def canonical_sha256(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def effective_jd(job: dict[str, Any]) -> str:
    tracker = job.get("applicationTracker") or {}
    return str(tracker.get("jdSupplementText") or job.get("jd") or "").strip()


def find_job(workspace: Path, job_id: str) -> tuple[Path, dict[str, Any]]:
    matches: list[tuple[Path, dict[str, Any]]] = []
    for file in (workspace / "jobs").glob("*/job.json"):
        try:
            job = json.loads(file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if job.get("id") == job_id:
            matches.append((file, job))
    if len(matches) != 1:
        raise ValueError("job ID must match exactly one jobs/*/job.json")
    return matches[0]


def read_confirmed_profile(workspace: Path) -> tuple[dict[str, Any], str, str]:
    path = workspace / ".workbench" / "personal-profile.json"
    master = json.loads(path.read_text(encoding="utf-8"))
    raw = (master.get("values") or {}).get(CONFIRMED_KEY)
    confirmed = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(confirmed, dict) or not isinstance(confirmed.get("profile"), dict) or not confirmed.get("confirmedAt"):
        raise ValueError("missing confirmed application profile; confirm the profile in JobSeekingOS first")
    version = str(master.get("revision") or confirmed.get("confirmedAt"))
    return confirmed["profile"], version, canonical_sha256(confirmed)


def profile_completeness(profile: dict[str, Any]) -> int:
    def present(*keys: str) -> bool:
        return any(_has_content(profile.get(key)) for key in keys)

    groups = [
        present("name", "school", "degree", "major", "graduation"),
        present("targetRole", "targetIndustry", "targetCity", "employment"),
        present("skillItems", "skills", "certificates", "language"),
        present("projectExperience", "projects", "research"),
        present("internshipExperience", "practiceExperience", "workExperience"),
        present("selfIntro", "awards", "publications", "portfolio", "achievements"),
    ]
    return round(sum(groups) / len(groups) * 100)


def _has_content(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, set, dict)):
        return bool(value)
    return True


def validate_quote(jd: str, quote: dict[str, Any]) -> None:
    text = quote.get("quote")
    start = quote.get("start")
    end = quote.get("end")
    if not isinstance(text, str) or not text or not isinstance(start, int) or not isinstance(end, int):
        raise ValueError("every source quote needs quote/start/end")
    if start < 0 or end <= start or jd[start:end] != text:
        raise ValueError(f"source quote does not match JD offsets: {text[:40]}")


def validate_analysis(bundle: dict[str, Any]) -> None:
    jd = str((bundle.get("job") or {}).get("jd") or "")
    analysis = bundle.get("analysis")
    if not isinstance(analysis, dict):
        raise ValueError("analysis object is required")
    caps = analysis.get("coreCapabilities")
    if not isinstance(caps, list) or not 1 <= len(caps) <= 5:
        raise ValueError("coreCapabilities must contain 1 to 5 items")
    ids: set[str] = set()
    for section in ("hardGates", "coreCapabilities", "implicitExpectations", "cultureSignals"):
        rows = analysis.get(section)
        if not isinstance(rows, list):
            raise ValueError(f"{section} must be a list")
        for row in rows:
            if not isinstance(row, dict) or row.get("classification") not in {"fact", "inference", "unknown"}:
                raise ValueError(f"invalid {section} classification")
            row_id = row.get("id")
            if not isinstance(row_id, str) or not row_id or row_id in ids:
                raise ValueError("analysis item IDs must be unique non-empty strings")
            ids.add(row_id)
            quotes = row.get("sourceQuotes")
            if not isinstance(quotes, list) or not quotes:
                raise ValueError(f"{section} items require sourceQuotes")
            for quote in quotes:
                validate_quote(jd, quote)
    weights = []
    for row in caps:
        weight = row.get("weight")
        level = row.get("evidenceLevel")
        if not isinstance(weight, int) or weight <= 0:
            raise ValueError("core capability weights must be positive integers")
        if level not in LEVEL_SCORES:
            raise ValueError("invalid evidenceLevel")
        weights.append(weight)
        evidence = row.get("evidence")
        if not isinstance(evidence, list):
            raise ValueError("core capability evidence must be a list")
        if level == "none" and evidence:
            raise ValueError("evidenceLevel none cannot contain evidence")
        if level != "none" and not evidence:
            raise ValueError("non-empty evidence is required for scored evidence levels")
        for item in evidence:
            if not isinstance(item, dict) or not all(isinstance(item.get(key), str) and item.get(key).strip() for key in ("profilePath", "excerpt", "reasoning")):
                raise ValueError("invalid profile evidence item")
            if len(item["excerpt"]) > 240:
                raise ValueError("profile evidence excerpt exceeds 240 characters")
    if sum(weights) != 100:
        raise ValueError("core capability weights must sum to 100")
    for gate in analysis.get("hardGates", []):
        if gate.get("candidateStatus") not in {"met", "not_met", "unknown"}:
            raise ValueError("hard gate candidateStatus must be met/not_met/unknown")


def calculate_result(bundle: dict[str, Any]) -> dict[str, Any]:
    validate_analysis(bundle)
    source = bundle["source"]
    caps = bundle["analysis"]["coreCapabilities"]
    score = round(sum(LEVEL_SCORES[row["evidenceLevel"]] * row["weight"] for row in caps) / 100)
    completeness = int(source["profileCompleteness"])
    unmet = [row["id"] for row in bundle["analysis"]["hardGates"] if row.get("candidateStatus") == "not_met"]
    if completeness < 60:
        code = "evidence_insufficient"
    elif unmet:
        code = "not_recommended"
    elif score >= 80:
        code = "apply"
    elif score >= 60:
        code = "strengthen"
    else:
        code = "not_recommended"
    return {"matchScore": score, "recommendation": code, "recommendationLabel": RECOMMENDATIONS[code], "unmetHardGateIds": unmet}

