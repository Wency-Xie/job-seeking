#!/usr/bin/env python3
"""Validate, rescore and write a review-only Matcher proposal for one job."""

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from matcher_common import SKILL_VERSION, calculate_result, canonical_sha256, effective_jd, find_job, profile_completeness, read_confirmed_profile


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--shadow-output", type=Path, help="validate and write outside the job directory for read-only shadow testing")
    args = parser.parse_args()
    workspace = args.workspace.resolve()
    job_file, job = find_job(workspace, args.job_id)
    current_jd = effective_jd(job)
    profile, profile_version, profile_sha = read_confirmed_profile(workspace)
    bundle = json.loads(args.input.read_text(encoding="utf-8"))
    if bundle.get("skillVersion") != SKILL_VERSION or bundle.get("schemaVersion") != 1:
        parser.error("input Skill or schema version does not match matcher-assistant v0.1.0")
    source = bundle.get("source") or {}
    expected = {
        "jobId": args.job_id,
        "jdSha256": canonical_sha256(current_jd),
        "profileVersion": profile_version,
        "profileSha256": profile_sha,
        "profileCompleteness": profile_completeness(profile),
    }
    for key, value in expected.items():
        if source.get(key) != value:
            parser.error(f"stale or mismatched source metadata: {key}")
    if (bundle.get("job") or {}).get("jd") != current_jd:
        parser.error("input JD differs from the current job JD")
    result = calculate_result(bundle)
    analysis = bundle["analysis"]
    proposal = {
        "schemaVersion": 1,
        "kind": "matcher",
        "status": "review_required",
        "skillVersion": SKILL_VERSION,
        "jobId": args.job_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generatedBy": "Codex",
        "source": source,
        "job": {"company": str(job.get("company") or ""), "title": str(job.get("title") or "")},
        "analysis": analysis,
        "result": result,
        "guardrails": {"mutatesJob": False, "mutatesApplicationIntent": False, "mutatesApplicationStatus": False},
    }
    encoded = (json.dumps(proposal, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if len(encoded) > 300_000:
        parser.error("proposal exceeds 300 KB")
    if args.shadow_output:
        destination = args.shadow_output.resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)
    else:
        directory = job_file.parent / "assistants" / "matcher"
        directory.mkdir(parents=True, exist_ok=True)
        destination = directory / "proposal.json"
        if destination.exists():
            parser.error("an unreviewed Matcher proposal already exists; review or dismiss it first")
    temp = destination.parent / f".{destination.name}-{os.getpid()}.tmp"
    try:
        temp.write_bytes(encoded)
        os.replace(temp, destination)
    finally:
        temp.unlink(missing_ok=True)
    print(destination)


if __name__ == "__main__":
    main()

