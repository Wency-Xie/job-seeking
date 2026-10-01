import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../extensions/job-capture/contracts.js", import.meta.url), "utf8");
const context = vm.createContext({ URL, Date });
vm.runInContext(source, context);

function normalize(input) {
  context.input = input;
  return vm.runInContext("JobSeekingContracts.normalizeCapturedJob(input, '0.4.0')", context);
}

const cases = [
  ["https://genomics.zhiye.com/campus/detail?id=1", "beisen"],
  ["https://app.mokahr.com/campus_apply/example#/job/1", "moka"],
  ["https://www.moseeker.com/position/index/pid/1", "moseeker"],
];

for (const [sourceUrl, platform] of cases) {
  const result = normalize({
    company: "示例公司",
    title: "AI 应用工程师",
    base: "上海",
    recruitmentType: "2027 届校园招聘",
    jobCode: "J001",
    sourceUrl,
    jd: "岗位职责\n负责示例项目。\n任职要求\n熟悉 Python。",
  });
  assert.equal(result.platform, platform);
  assert.equal(result.jobTitle, "AI 应用工程师");
  assert.equal(result.jobId, "J001");
  assert.equal(result.location, "上海");
  assert.match(result.requirements, /熟悉 Python/);
  assert.equal(result.verificationStatus, "specialized-rule-unverified");
  assert.equal(result.title, result.jobTitle);
  assert.equal(result.jd, result.fullJdText);
}

const generic = normalize({sourceUrl: "https://example.com/jobs/1", jd: "岗位职责\n示例内容超过三十个字符，仅用于合成测试，不代表真实岗位页面支持。"});
assert.equal(generic.platform, "generic");
assert.equal(generic.verificationStatus, "generic-unverified");

console.log("job capture contracts: 4 synthetic cases passed");
