(() => {
  if (location.hostname !== "127.0.0.1") return;
  if (location.port !== "4173") return;
  const key = "jobSeekingOS.applicationProfile.confirmed.v2";
  const settingsKey = "jobSeekingOS.applicationSync.settings.v1";
  const allowed = new Set(["name","phone","email","city","gender","birth","school","degree","major","graduation","skillItems","educationExperience","internshipExperience","projectExperience","practiceExperience","englishProficiency","englishCertificates","englishCertificateDetails","selfIntro"]);
  const defaults = ["name","school","degree","major","graduation","skillItems","englishProficiency","englishCertificates","englishCertificateDetails","selfIntro"];
  const sensitive = new Set(["phone","email","gender","birth"]);
  function readConfirmed(message, fallback) {
    try {
      const saved = fallback || JSON.parse(localStorage.getItem(key) || "null");
      if (!saved?.profile || !saved?.confirmedAt) return {ok:false, error:"请先确认网申档案。"};
      if (message.mode === "automatic") {
        const fields = {};
        const relevant = new Set(["name","phone","email","city","gender","birth","nationality","ethnicity","nativePlace","identityNumber","expectedGraduation","selfIntro","educationExperience","internshipExperience","projectExperience","practiceExperience","skillItems","awards","publications","languageItems","hasInternship","hasCampusRole","hasAwards","hasPublishedPaper","englishProficiency","englishCertificates","englishCertificateDetails"]);
        const extras = /^extra_(educationExperience|skillItems|awards|publications)_\d+_(location|country|certificate|level|issuer|status|authorOrder|impactFactor)$/;
        for (const [name,value] of Object.entries(saved.profile)) {
          if (typeof value !== "string" || !(relevant.has(name) || extras.test(name))) continue;
          if (name === "identityNumber" && message.includeIdentity !== true) continue;
          fields[name] = value;
        }
        return {ok:true, confirmedAt:saved.confirmedAt, profile:fields};
      }
      const settings = JSON.parse(localStorage.getItem(settingsKey) || "null");
      const selected = Array.isArray(settings?.fields) ? settings.fields : defaults;
      const fields = {};
      const names = selected.filter(name => allowed.has(name) && (!sensitive.has(name) || message.includeSensitive === true));
      for (const name of names)
        fields[name] = typeof saved.profile[name] === "string" ? saved.profile[name] : "";
      return {ok:true, confirmedAt:saved.confirmedAt, profile:fields, selected:selected.filter(name => allowed.has(name)), sensitiveSelected:selected.some(name => sensitive.has(name))};
    } catch { return {ok:false, error:"确认档案读取失败。"}; }
  }
  if(globalThis.__jobSeekingProfileBridge) chrome.runtime.onMessage.removeListener(globalThis.__jobSeekingProfileBridge);
  const listener=(message, _sender, respond) => {
    if(message?.type !== "JOBSEEKING_READ_CONFIRMED" && message?.type !== "JOBSEEKING_AUTO_READ")return;
    const local=readConfirmed(message);
    if(local.ok){respond(local);return;}
    fetch("/api/local-profile",{cache:"no-store",signal:AbortSignal.timeout(3000)})
      .then(response=>{if(!response.ok)throw Error("本机档案服务不可用");return response.json();})
      .then(data=>{const saved=JSON.parse(data.master?.values?.[key]||"null");respond(saved?readConfirmed(message,saved):local);})
      .catch(()=>respond({ok:false,error:"未读到已确认档案，请打开网申档案页并确认保存，再重新连接。"}));
    return true;
  };
  globalThis.__jobSeekingProfileBridge=listener;
  chrome.runtime.onMessage.addListener(listener);
})();
