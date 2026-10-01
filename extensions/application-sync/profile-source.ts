export type WorkspaceOrigin = "http://127.0.0.1:4174" | "http://127.0.0.1:4173";

export type ConfirmedProfile = Record<string, string>;

export type ProfileSource = {
  ok: true;
  confirmedAt: string;
  profile: ConfirmedProfile;
  workspaceOrigin: WorkspaceOrigin;
};

type LocalProfileResponse = {
  master?: { values?: Record<string, string> };
};

const relevant = new Set([
  "name", "phone", "email", "city", "gender", "birth", "nationality", "ethnicity",
  "nativePlace", "identityNumber", "expectedGraduation", "selfIntro", "educationExperience",
  "internshipExperience", "projectExperience", "practiceExperience", "skillItems", "awards",
  "publications", "languageItems", "hasInternship", "hasCampusRole", "hasAwards",
  "hasPublishedPaper", "englishProficiency", "englishCertificates", "englishCertificateDetails",
]);

const extras = /^extra_(educationExperience|skillItems|awards|publications)_\d+_(location|country|certificate|level|issuer|status|authorOrder|impactFactor)$/;

export async function readLocalProfile(
  includeIdentity = false,
  workspaceOrigin: WorkspaceOrigin = "http://127.0.0.1:4174",
  fetcher: typeof fetch = fetch,
): Promise<ProfileSource> {
  let response: Response;
  try {
    response = await fetcher(`${workspaceOrigin}/api/local-profile`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    throw Error(`无法连接本机档案服务（${workspaceOrigin.endsWith("4174") ? "4174 开发测试" : "4173 个人验收"}）。`);
  }
  if (!response.ok) throw Error(`本机档案服务返回错误（${response.status}），请重新连接。`);

  let saved: { profile?: Record<string, unknown>; confirmedAt?: string } | null;
  try {
    const data = await response.json() as LocalProfileResponse;
    saved = JSON.parse(data.master?.values?.["jobSeekingOS.applicationProfile.confirmed.v2"] || "null");
  } catch {
    throw Error("本机确认档案格式异常，请到网申档案页检查并重新确认。");
  }
  if (!saved?.profile || !saved.confirmedAt) throw Error("本机尚无已确认档案，请到网申档案页确认保存。");

  const fields: ConfirmedProfile = {};
  for (const [name, value] of Object.entries(saved.profile)) {
    if (typeof value !== "string" || !(relevant.has(name) || extras.test(name))) continue;
    if (name === "identityNumber" && includeIdentity !== true) continue;
    fields[name] = value;
  }
  return { ok: true, confirmedAt: saved.confirmedAt, profile: fields, workspaceOrigin };
}
