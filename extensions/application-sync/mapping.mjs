const aliases = new Map([
  ["姓名", {source:"name"}], ["手机号", {source:"phone", sensitive:true}],
  ["邮箱", {source:"email", sensitive:true}], ["电子邮箱", {source:"email", sensitive:true}], ["电子邮件", {source:"email", sensitive:true}],
  ["自我评价", {source:"selfIntro"}], ["个人评价", {source:"selfIntro"}],
  ["学校名称", {source:"school"}], ["毕业学校", {source:"school"}],
  ["专业名称", {source:"major"}], ["所学专业", {source:"major"}],
  ["当前城市", {source:"city"}], ["现居城市", {source:"city"}],
  ["最高学历", {source:"degree"}], ["毕业届别", {source:"graduation"}],
  ["英语熟练程度", {source:"englishProficiency"}], ["英文熟练程度", {source:"englishProficiency"}],
  ["英语水平", {source:"englishProficiency"}], ["英文水平", {source:"englishProficiency"}],
  ["英语考试证书", {source:"englishCertificates"}], ["英语证书", {source:"englishCertificates"}],
  ["英语成绩证书补充", {source:"englishCertificateDetails"}], ["英语成绩", {source:"englishCertificateDetails"}],
  ["技能名称", {source:"firstSkill"}]
]);
export function firstSkill(value) {
  for (const line of String(value || "").split("\n")) {
    const [name = ""] = line.split("｜");
    if (name.trim()) return name.trim();
  }
  return "";
}
export function matchFields(fields, profile, includeSensitive = false) {
  return fields.flatMap(field => {
    const label = String(field.label || "").replace(/[\s*：:]/g, "");
    const rule = aliases.get(label);
    if (!rule || (rule.sensitive && !includeSensitive) || field.value?.trim()) return [];
    const value = rule.source === "firstSkill" ? firstSkill(profile.skillItems) : String(profile[rule.source] || "").trim();
    if (!value || field.type === "password" || field.type === "hidden") return [];
    return [{index:field.index, label:field.label, source:rule.source, value, sensitive:Boolean(rule.sensitive)}];
  });
}
