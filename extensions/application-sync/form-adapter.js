(() => {
  if (typeof globalThis.__jobSeekingFormAdapter === "function") {
    chrome.runtime.onMessage.removeListener(globalThis.__jobSeekingFormAdapter);
  }
  const inputs = () => [...document.querySelectorAll("input, textarea")].filter(el =>
    !["hidden", "password", "file", "checkbox", "radio", "submit", "button"].includes(el.type) && !el.disabled && !el.readOnly && (!el.getClientRects || el.getClientRects().length > 0)
  );
  const clean = text => String(text || "").replace(/\s+/g, " ").trim();
  const knownLabels = new Set(["姓名","手机号","邮箱","电子邮箱","电子邮件","自我评价","个人评价","学校名称","毕业学校","专业名称","所学专业","当前城市","现居城市","最高学历","毕业届别","技能名称"]);
  const normalize = text => clean(text).replace(/[＊*：:]/g, "").trim();
  const recognized = text => {
    const label = normalize(text);
    return knownLabels.has(label) ? label : "";
  };
  function labelFor(el) {
    const direct = recognized(el.labels?.[0]?.textContent) || recognized(el.getAttribute("aria-label"));
    if (direct) return direct;
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const label = recognized(labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent || "").join(" "));
      if (label) return label;
    }
    let wrap = el.parentElement;
    for (let depth = 0; wrap && depth < 5; depth++, wrap = wrap.parentElement) {
      if (wrap.querySelectorAll("input,textarea").length > 1) break;
      for (const node of wrap.querySelectorAll("label, [class*='label'], [class*='Label']")) {
        if (node.contains(el)) continue;
        const label = recognized(node.textContent);
        if (label) return label;
      }
      for (const node of wrap.children) {
        if (node.contains(el)) continue;
        const label = recognized(node.textContent);
        if (label) return label;
      }
      const sibling = el.previousElementSibling;
      const label = recognized(sibling?.textContent);
      if (label) return label;
    }
    if (typeof location !== "undefined" && location.hostname === "wuxiapptec.zhiye.com") {
      const box = el.getBoundingClientRect();
      let nearest = {label:"", distance:Infinity};
      for (const node of document.querySelectorAll("label, span, div")) {
        if (node.contains(el)) continue;
        const label = recognized(node.textContent);
        if (!label) continue;
        if (!node.getClientRects().length) continue;
        const candidate = node.getBoundingClientRect();
        const vertical = Math.abs((candidate.top + candidate.bottom) / 2 - (box.top + box.bottom) / 2);
        if (vertical > 32 || candidate.right > box.left + 12) continue;
        const distance = vertical * 3 + Math.max(0, box.left - candidate.right);
        if (distance < nearest.distance) nearest = {label, distance};
      }
      if (nearest.label) return nearest.label;
    }
    return "";
  }
  const fields = () => inputs().map((el, index) => ({index, label:labelFor(el), type:el.type || "text", value:el.value || ""}));
  const listener = (message, _sender, respond) => {
    if (message?.type === "JOBSEEKING_SCAN") return respond({ok:true, fields:fields()});
    if (message?.type !== "JOBSEEKING_FILL") return;
    const results = [];
    for (const item of message.items || []) {
      const el = inputs()[item.index];
      if (!el || labelFor(el) !== item.label || el.value?.trim()) {results.push({label:item.label, ok:false, reason:"字段已变化或已有内容"});continue;}
      const setter = Object.getOwnPropertyDescriptor(el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")?.set;
      if (!setter) {results.push({label:item.label, ok:false, reason:"无法填写此控件"});continue;}
      setter.call(el, item.value);
      el.dispatchEvent(new Event("input", {bubbles:true}));
      el.dispatchEvent(new Event("change", {bubbles:true}));
      results.push({label:item.label, ok:el.value === item.value, reason:el.value === item.value ? "已写入" : "页面未接受该值"});
    }
    respond({ok:true, results});
  };
  globalThis.__jobSeekingFormAdapter = listener;
  chrome.runtime.onMessage.addListener(listener);
})();
