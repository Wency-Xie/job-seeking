import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from matcher_common import CONFIRMED_KEY, calculate_result, canonical_sha256, profile_completeness, validate_analysis


class MatcherTest(unittest.TestCase):
    def load_example(self):
        return json.loads((ROOT / "examples" / "synthetic-input.json").read_text(encoding="utf-8"))

    def test_synthetic_score_is_deterministic(self):
        result = calculate_result(self.load_example())
        self.assertEqual(result["matchScore"], 88)
        self.assertEqual(result["recommendation"], "apply")

    def test_low_completeness_is_evidence_insufficient(self):
        bundle = self.load_example()
        bundle["source"]["profileCompleteness"] = 50
        self.assertEqual(calculate_result(bundle)["recommendation"], "evidence_insufficient")

    def test_unmet_gate_overrides_high_score(self):
        bundle = self.load_example()
        bundle["analysis"]["hardGates"][0]["candidateStatus"] = "not_met"
        self.assertEqual(calculate_result(bundle)["recommendation"], "not_recommended")

    def test_weights_must_sum_to_one_hundred(self):
        bundle = self.load_example()
        bundle["analysis"]["coreCapabilities"][0]["weight"] = 50
        with self.assertRaisesRegex(ValueError, "sum to 100"):
            validate_analysis(bundle)

    def test_profile_completeness_is_field_coverage_not_quality(self):
        profile = {"name": "测试", "targetRole": "AI", "skillItems": ["Python"], "projectExperience": "项目"}
        self.assertEqual(profile_completeness(profile), 67)

    def test_shadow_proposal_does_not_mutate_job(self):
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Path(tmp)
            job_dir = workspace / "jobs" / "synthetic"
            workbench = workspace / ".workbench"
            job_dir.mkdir(parents=True)
            workbench.mkdir()
            bundle = self.load_example()
            job = {"id": "synthetic-job", "company": "合成样例公司", "title": "医疗 AI 应用工程师", "jd": bundle["job"]["jd"]}
            confirmed = {"confirmedAt": "2026-10-01T00:00:00Z", "profile": {"name": "测试", "targetRole": "AI", "skillItems": ["Python"], "projectExperience": "项目", "internshipExperience": "实习"}}
            master = {"revision": "profile-revision-1", "values": {CONFIRMED_KEY: json.dumps(confirmed, ensure_ascii=False)}}
            job_file = job_dir / "job.json"
            job_file.write_text(json.dumps(job, ensure_ascii=False), encoding="utf-8")
            (workbench / "personal-profile.json").write_text(json.dumps(master, ensure_ascii=False), encoding="utf-8")
            before = job_file.read_bytes()
            bundle["source"].update({
                "jobId": job["id"],
                "jdSha256": canonical_sha256(job["jd"]),
                "profileVersion": master["revision"],
                "profileSha256": canonical_sha256(confirmed),
                "profileCompleteness": 83,
            })
            analysis = workspace / "analysis.json"
            shadow = workspace / "shadow" / "proposal.json"
            analysis.write_text(json.dumps(bundle, ensure_ascii=False), encoding="utf-8")
            subprocess.run([sys.executable, str(ROOT / "scripts" / "propose_matcher.py"), "--workspace", str(workspace), "--job-id", job["id"], "--input", str(analysis), "--shadow-output", str(shadow)], check=True, capture_output=True, text=True)
            self.assertTrue(shadow.exists())
            self.assertEqual(job_file.read_bytes(), before)
            self.assertFalse((job_dir / "assistants").exists())
            proposal = json.loads(shadow.read_text(encoding="utf-8"))
            self.assertNotIn("confirmedProfile", proposal)
            self.assertTrue(proposal["guardrails"]["mutatesJob"] is False)


if __name__ == "__main__":
    unittest.main()
