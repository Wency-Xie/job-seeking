# Matcher v0.1.0 分析输入与 proposal

先运行准备脚本得到 source bundle，再在同一 JSON 中增加 `analysis`：

```json
{
  "schemaVersion": 1,
  "skillVersion": "0.1.0",
  "source": {
    "jobId": "job-id",
    "jdVersion": "sha256:...",
    "jdSha256": "...",
    "profileVersion": "revision-or-confirmedAt",
    "profileSha256": "...",
    "profileCompleteness": 67
  },
  "job": { "company": "示例", "title": "示例", "jd": "完整 JD" },
  "confirmedProfile": {},
  "analysis": {
    "hardGates": [],
    "coreCapabilities": [],
    "implicitExpectations": [],
    "cultureSignals": [],
    "unknowns": [],
    "summary": "待审摘要"
  }
}
```

四层条目遵循 `jd-four-layer-schema.md`。核心能力另含：

```json
{
  "id": "cap-1",
  "statement": "能力要求",
  "classification": "fact",
  "weight": 40,
  "sourceQuotes": [{"quote":"原文","start":0,"end":2}],
  "evidenceLevel": "direct",
  "evidence": [{"profilePath":"projectExperience","excerpt":"档案原文","reasoning":"为何构成证据"}],
  "gap": "缺口或空字符串",
  "nextAction": "可执行补强动作或空字符串"
}
```

`propose_matcher.py` 会删除 `confirmedProfile` 和完整 JD，只在 proposal 中保留必要摘录、证据引用、版本、完整度、复算分数和建议。proposal 是待审建议，不能被解释为岗位状态或用户投递意向。

