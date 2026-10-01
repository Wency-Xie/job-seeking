"use strict";
function clean(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}
function detectRecruitingPlatform(sourceUrl) {
    let hostname = "";
    try {
        hostname = new URL(sourceUrl).hostname.toLowerCase();
    }
    catch {
        return "generic";
    }
    if (hostname.endsWith(".zhiye.com"))
        return "beisen";
    if (hostname === "app.mokahr.com")
        return "moka";
    if (hostname === "moseeker.com" || hostname.endsWith(".moseeker.com"))
        return "moseeker";
    if (hostname === "jobs.bytedance.com")
        return "bytedance";
    if (hostname === "zhipin.com" || hostname.endsWith(".zhipin.com"))
        return "zhipin";
    return "generic";
}
function splitJd(fullJdText) {
    const text = String(fullJdText || "").replace(/\r\n?/g, "\n").trim();
    const requirement = text.search(/(?:^|\n)\s*(?:任职要求|任职资格|岗位要求|职位要求|任职条件)\s*[：:]?\s*(?:\n|$)/m);
    if (requirement < 0)
        return { responsibilities: text, requirements: "" };
    return {
        responsibilities: text.slice(0, requirement).trim(),
        requirements: text.slice(requirement).trim(),
    };
}
function normalizeCapturedJob(input, adapterVersion) {
    const sourceUrl = clean(input.sourceUrl);
    const platform = detectRecruitingPlatform(sourceUrl);
    const fullJdText = String(input.jd ?? "").replace(/\r\n?/g, "\n").trim();
    const sections = splitJd(fullJdText);
    const jobTitle = clean(input.title);
    const jobId = clean(input.jobCode);
    const location = clean(input.base);
    const knownPlatforms = ["beisen", "moka", "moseeker"];
    return {
        schemaVersion: "1.0.0",
        platform,
        company: clean(input.company),
        jobTitle,
        jobId,
        location,
        recruitmentType: clean(input.recruitmentType),
        batch: clean(input.recruitmentType),
        deadline: "",
        responsibilities: sections.responsibilities,
        requirements: sections.requirements,
        fullJdText,
        sourceUrl,
        capturedAt: new Date().toISOString(),
        adapterVersion,
        verificationStatus: knownPlatforms.includes(platform) ? "specialized-rule-unverified" : "generic-unverified",
        title: jobTitle,
        base: location,
        jd: fullJdText,
        jobCode: jobId,
    };
}
const JobSeekingContracts = Object.freeze({
    detectRecruitingPlatform,
    normalizeCapturedJob,
    splitJd,
});
