#!/usr/bin/env python3
"""Write a review-only JobSeekingOS salary proposal for one advancing job."""

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

LABELS = {"固定月薪", "薪资月数", "试用期比例", "试用期月数", "年终奖", "绩效奖金", "补贴", "住宿", "工作日安排", "加班与调休", "五险一金", "假期", "股权或签字费"}
TEXT_FIELDS = {"platformEvidence", "networkEvidence", "companyEvidence", "city", "experienceLevel", "marketLow", "marketMedian", "marketHigh", "selfIntroAnchor", "teamPainQuestions", "hrQuestions", "hrBudget", "strategy", "personalFloor", "targetLow", "targetHigh", "premiumEvidence", "opportunityCost", "quoteScript", "lowOfferResponse", "notes"}
SKILL_VERSION = "0.1.0"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, required=True, help="JobSeekingOS repository root")
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--input", type=Path, required=True, help="JSON with summary and fields")
    args = parser.parse_args()

    jobs_root = (args.workspace / "jobs").resolve()
    matches = []
    for file in jobs_root.glob("*/job.json"):
        try:
            job = json.loads(file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if job.get("id") == args.job_id:
            matches.append((file, job))
    if len(matches) != 1:
        parser.error("job ID must match exactly one jobs/*/job.json")
    job_file, job = matches[0]
    tracker = job.get("applicationTracker") or {}
    status = str(job.get("status") or "")
    ended = any(term in status for term in ("拒绝", "放弃", "关闭", "结束")) or any(any(term in str(event.get("type", "")) for term in ("对方拒绝", "主动放弃", "岗位关闭")) for event in (tracker.get("processEvents") or []) if isinstance(event, dict))
    candidate = tracker.get("selected") is True or ((job.get("discoveryState") or {}).get("decision") == "discovered" and (job.get("discoveryState") or {}).get("scope") != "market_reference")
    deleted = (job.get("discoveryState") or {}).get("decision") == "deleted"
    if tracker.get("advancing") is not True or not candidate or deleted or ended or any(term in status for term in ("暂停", "暂缓")):
        parser.error("salary proposals are only allowed for jobs in 正在推进")

    source = json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(source, dict) or not isinstance(source.get("fields"), dict):
        parser.error("input must be an object with a fields object")
    fields = source["fields"]
    unknown = set(fields) - TEXT_FIELDS - {"evidenceItems"}
    if unknown:
        parser.error(f"unsupported fields: {', '.join(sorted(unknown))}")
    if any(not isinstance(value, str) for key, value in fields.items() if key != "evidenceItems"):
        parser.error("all text fields must be strings")
    evidence = fields.get("evidenceItems", [])
    if not isinstance(evidence, list):
        parser.error("evidenceItems must be a list")
    for row in evidence:
        if not isinstance(row, dict) or row.get("label") not in LABELS or any(not isinstance(row.get(key, ""), str) for key in ("value", "source", "question")):
            parser.error("invalid evidenceItems row")
        if row.get("status") not in {"未开始", "待核实"}:
            parser.error("evidence item status must be 未开始 or 待核实")
    summary = source.get("summary", "")
    if not isinstance(summary, str):
        parser.error("summary must be a string")
    floor = fields.get("personalFloor", "").strip()
    quote = fields.get("quoteScript", "")
    if floor and floor in quote:
        parser.error("quoteScript must not disclose personalFloor verbatim")
    proposal = {"version": 1, "skillVersion": SKILL_VERSION, "kind": "salary", "jobId": args.job_id, "generatedAt": datetime.now(timezone.utc).isoformat(), "generatedBy": "Codex", "summary": summary, "fields": fields}
    encoded = (json.dumps(proposal, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if len(encoded) > 250_000:
        parser.error("proposal exceeds 250 KB")
    directory = job_file.parent / "assistants" / "salary"
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / "proposal.json"
    if destination.exists():
        parser.error("an unreviewed proposal already exists; review or dismiss it in JobSeekingOS first")
    temp = directory / f".proposal-{os.getpid()}.json"
    try:
        temp.write_bytes(encoded)
        os.replace(temp, destination)
    finally:
        temp.unlink(missing_ok=True)
    print(destination)


if __name__ == "__main__":
    main()
