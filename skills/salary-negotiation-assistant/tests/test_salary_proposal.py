import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "propose_salary.py"


class SalaryProposalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.workspace = Path(self.temp.name)
        self.job_dir = self.workspace / "jobs" / "example-job"
        self.job_dir.mkdir(parents=True)
        self.job = {
            "id": "job-1",
            "status": "已投递",
            "discoveryState": {"decision": "discovered", "scope": "candidate"},
            "applicationTracker": {"selected": True, "advancing": True, "processEvents": []},
        }
        (self.job_dir / "job.json").write_text(json.dumps(self.job, ensure_ascii=False), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def run_script(self, payload):
        source = self.workspace / "input.json"
        source.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--workspace", str(self.workspace), "--job-id", "job-1", "--input", str(source)],
            text=True,
            capture_output=True,
        )

    def test_writes_review_only_versioned_proposal_without_mutating_job(self):
        before = (self.job_dir / "job.json").read_bytes()
        result = self.run_script({
            "summary": "公开样本口径有限，需向 HR 确认发薪月数。",
            "fields": {
                "city": "上海",
                "quoteScript": "想先了解岗位的预算和总包结构。",
                "personalFloor": "内部底线 18 万",
                "evidenceItems": [{"label": "住宿", "value": "", "source": "", "status": "待核实", "question": "是否提供宿舍？"}],
            },
        })
        self.assertEqual(result.returncode, 0, result.stderr)
        proposal = json.loads((self.job_dir / "assistants" / "salary" / "proposal.json").read_text(encoding="utf-8"))
        self.assertEqual(proposal["skillVersion"], "0.1.0")
        self.assertEqual(proposal["kind"], "salary")
        self.assertEqual((self.job_dir / "job.json").read_bytes(), before)
        self.assertFalse((self.job_dir / "assistants" / "salary" / "draft.json").exists())

    def test_rejects_invalid_review_state(self):
        result = self.run_script({"fields": {"evidenceItems": [{"label": "住宿", "status": "已核对"}]}})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("未开始 or 待核实", result.stderr)

    def test_rejects_verbatim_floor_in_external_script(self):
        result = self.run_script({"fields": {"personalFloor": "18 万", "quoteScript": "我的底线是 18 万"}})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must not disclose personalFloor", result.stderr)


if __name__ == "__main__":
    unittest.main()
