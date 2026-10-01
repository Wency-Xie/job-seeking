#!/usr/bin/env python3
"""Prepare a private, versioned source bundle for one Matcher run."""

import argparse
import json
from pathlib import Path

from matcher_common import SKILL_VERSION, canonical_sha256, effective_jd, find_job, profile_completeness, read_confirmed_profile


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    _, job = find_job(args.workspace.resolve(), args.job_id)
    jd = effective_jd(job)
    if len(jd) < 30:
        parser.error("job needs a complete JD before Matcher can run")
    profile, profile_version, profile_sha = read_confirmed_profile(args.workspace.resolve())
    jd_sha = canonical_sha256(jd)
    bundle = {
        "schemaVersion": 1,
        "skillVersion": SKILL_VERSION,
        "source": {
            "jobId": args.job_id,
            "jdVersion": f"sha256:{jd_sha[:16]}",
            "jdSha256": jd_sha,
            "profileVersion": profile_version,
            "profileSha256": profile_sha,
            "profileCompleteness": profile_completeness(profile),
        },
        "job": {"company": str(job.get("company") or ""), "title": str(job.get("title") or ""), "jd": jd},
        "confirmedProfile": profile,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()

