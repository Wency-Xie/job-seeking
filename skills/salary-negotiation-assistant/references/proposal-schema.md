# JobSeekingOS 待审建议格式

把以下对象写为 UTF-8 JSON 临时文件，再交给 `scripts/propose_salary.py`。脚本会自动附加建议格式版本、Skill 版本、岗位 ID、生成时间和生成者，并只写 `assistants/salary/proposal.json`。

```json
{
  "summary": "本次查到什么、哪些信息仍需 HR 确认。不要宣称准备完成。",
  "fields": {
    "platformEvidence": "公开样本、链接、发布日期、可比性",
    "companyEvidence": "公司公开资料或真实 HR 沟通、日期；没有则留空",
    "city": "城市",
    "experienceLevel": "届别或经验口径",
    "selfIntroAnchor": "个人能力和真实证据；未核验的作品标待补",
    "teamPainQuestions": "业务面试的反问",
    "hrQuestions": "双选会或 HR 的待遇反问",
    "quoteScript": "仅当报价依据充分时填写；否则写待核实问题",
    "lowOfferResponse": "缓冲话术",
    "evidenceItems": [
      {
        "label": "住宿",
        "value": "HR 口头提到提供宿舍",
        "source": "HR 口头说明，日期",
        "status": "待核实",
        "question": "入住条件、费用、房型和期限是什么？"
      }
    ]
  }
}
```

可选文字字段：`networkEvidence`、`marketLow`、`marketMedian`、`marketHigh`、`hrBudget`、`strategy`、`personalFloor`、`targetLow`、`targetHigh`、`premiumEvidence`、`opportunityCost`、`notes`。只填有依据的字段；保留空缺。`evidenceItems` 标签必须与页面条目相同。所有条目状态只能是“未开始”或“待核实”；Codex 不得写 `stageReviewed`。提交前检查私密个人底线没有进入 `quoteScript`；脚本也会拒绝完全相同的底线文本被复制到对外话术。
