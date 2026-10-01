type RecruitingPlatform = "beisen" | "moka" | "moseeker" | "bytedance" | "zhipin" | "generic";
type VerificationStatus = "specialized-rule-unverified" | "generic-unverified" | "human-reviewed";

interface LegacyCaptureInput {
  company?: unknown;
  title?: unknown;
  base?: unknown;
  recruitmentType?: unknown;
  jd?: unknown;
  sourceUrl?: unknown;
  jobCode?: unknown;
}

interface CapturedJob {
  schemaVersion: "1.0.0";
  platform: RecruitingPlatform;
  company: string;
  jobTitle: string;
  jobId: string;
  location: string;
  recruitmentType: string;
  batch: string;
  deadline: string;
  responsibilities: string;
  requirements: string;
  fullJdText: string;
  sourceUrl: string;
  capturedAt: string;
  adapterVersion: string;
  verificationStatus: VerificationStatus;
  // Compatibility fields consumed by JobSeekingOS 4173 today.
  title: string;
  base: string;
  jd: string;
  jobCode: string;
}

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function detectRecruitingPlatform(sourceUrl: string): RecruitingPlatform {
  let hostname = "";
  try {
    hostname = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    return "generic";
  }
  if (hostname.endsWith(".zhiye.com")) return "beisen";
  if (hostname === "app.mokahr.com") return "moka";
  if (hostname === "moseeker.com" || hostname.endsWith(".moseeker.com")) return "moseeker";
  if (hostname === "jobs.bytedance.com") return "bytedance";
  if (hostname === "zhipin.com" || hostname.endsWith(".zhipin.com")) return "zhipin";
  return "generic";
}

function splitJd(fullJdText: string): { responsibilities: string; requirements: string } {
  const text = String(fullJdText || "").replace(/\r\n?/g, "\n").trim();
  const requirement = text.search(/(?:^|\n)\s*(?:任职要求|任职资格|岗位要求|职位要求|任职条件)\s*[：:]?\s*(?:\n|$)/m);
  if (requirement < 0) return { responsibilities: text, requirements: "" };
  return {
    responsibilities: text.slice(0, requirement).trim(),
    requirements: text.slice(requirement).trim(),
  };
}

function normalizeCapturedJob(input: LegacyCaptureInput, adapterVersion: string): CapturedJob {
  const sourceUrl = clean(input.sourceUrl);
  const platform = detectRecruitingPlatform(sourceUrl);
  const fullJdText = String(input.jd ?? "").replace(/\r\n?/g, "\n").trim();
  const sections = splitJd(fullJdText);
  const jobTitle = clean(input.title);
  const jobId = clean(input.jobCode);
  const location = clean(input.base);
  const knownPlatforms: RecruitingPlatform[] = ["beisen", "moka", "moseeker"];
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

