const $=id=>document.getElementById(id);
let captures=[];
function extract() {
  const norm=value=>String(value||"").replace(/\s+/g," ").trim();
  const text=node=>norm(node?.innerText||node?.textContent);
  const host=location.hostname.toLowerCase();
  const isWuxi=host==="wuxiapptec.zhiye.com";
  const isBgi=host==="genomics.zhiye.com";
  const isMoseeker=/(?:^|\.)moseeker\.com$/.test(host)&&/^\/position\/index\/pid\/\d+/.test(location.pathname);
  // Ignore our previous review panel when collecting page text again.
  const readPage=()=>{
    const raw=document.body?.innerText||"";
    const review=document.querySelector("#jobseeking-capture-review")?.innerText;
    return review?raw.replace(review,""):raw;
  };
  const isMoka=host==="app.mokahr.com"&&/\/job\//.test(location.hash);
  const isShushu=host==="www.shushuqiuzhi.com"||host==="shushuqiuzhi.com";
  const formatDescription=value=>{
    let jd=String(value||"").replace(/\r\n?/g,"\n").replace(/\u00a0/g," ");
    if(isShushu){
      const firstSection=jd.search(/【(?:职位职责|岗位职责|工作职责|任职要求|任职资格|岗位要求|硬性专业要求)】/);
      if(/^【企业(?:在招|招聘)岗位】/.test(jd.trimStart())&&firstSection>=0&&firstSection<500)jd=jd.slice(firstSection);
      jd=jd.replace(/\s*职位归属：[^\n]*企业官方在招库\s*$/u,"");
    }
    jd=jd.replace(/(【硬性专业要求】\s*)([^【\n]+)/g,(_match,heading,majors)=>heading+majors.replace(/、[ \t]*/g,"、\n"));
    return jd
      .replace(/[ \t]*(【(?:职位职责|岗位职责|工作职责|任职要求|任职资格|岗位要求|硬性专业要求)】)[ \t]*/g,"\n\n$1\n")
      .replace(/([；。])[ \t]*(?=\d{1,2}[.．、]\s*\S)/g,"$1\n")
      .replace(/([^\d\s])[ \t]+(?=\d{1,2}[.．、]\s*[\u4e00-\u9fffA-Za-z])/g,"$1\n")
      .replace(/[ \t]*\n[ \t]*/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
  };
  const places=/^(?:上海(?:外高桥|张江|浦东)?|北京|深圳|武汉|无锡|常州|苏州|泰兴|天津|杭州|广州|南京|成都|长春)(?:市|区)?$/;
  const headers=[...document.querySelectorAll("h1,h2,h3,h4,strong,b,div,span")].filter(node=>{
    const value=text(node);
    return value.length>=5&&value.length<110&&(isWuxi?/\(J\d+\)/i.test(value)&&/2027届/.test(value):/\(J\d+\)/i.test(value))&&node.children.length<4;
  });
  const unique=new Map();
  if(isMoseeker){
    const lines=readPage().split(/\n/).map(norm).filter(Boolean);
    const pageTitle=norm(document.title);
    const titleParts=pageTitle.match(/^(.*?)\s+-\s+(.*?)\s+-\s+仟寻招聘\s*$/);
    const heading=titleParts?.[1]||text(document.querySelector("h1"));
    const company=titleParts?.[2]||lines.find(line=>/\s*[·・]\s*/.test(line))?.split(/[·・]/)[0].trim()||"";
    const jobCode=heading.match(/[（(](J\d+)[）)]/i)?.[1]||"";
    const recruitmentType=heading.match(/【([^】]*(?:校招|届|实习)[^】]*)】/)?.[1]||lines.map(line=>line.match(/^招聘类型\s*[：:]\s*(.+)$/)?.[1]).find(Boolean)||"";
    const title=heading.replace(/【[^】]*(?:校招|届|实习)[^】]*】/g,"").replace(/[（(]J\d+[）)]/ig,"").trim();
    const start=lines.findIndex(line=>/^(?:职位描述|岗位职责|工作职责)$/.test(line));
    const end=lines.findIndex((line,index)=>index>start&&/^(?:职位属性|公司福利|相关职位|其他职位|官网岗位采集)$/.test(line));
    const sections=lines.slice(start,end>start?end:undefined).filter((line,index,array)=>index===0||line!==array[index-1]);
    const meta=lines.slice(0,start>=0?start:undefined);
    const salaryAt=meta.findIndex(line=>/薪资面议|\d+\s*[-~至]\s*\d+\s*[kK万千]/.test(line));
    const salaryLine=meta[salaryAt]||"";
    const base=salaryLine.includes("/")?norm(salaryLine.slice(salaryLine.indexOf("/")+1)):meta[salaryAt+1]?.match(/^(?:上海|北京|深圳|广州|杭州|成都|武汉|南京|天津|重庆|苏州)(?:市)?$/)?.[0]||"";
    if(title&&start>=0)unique.set("moseeker",{capture:{company,title,base,recruitmentType,jd:formatDescription(sections.join("\n")),sourceUrl:location.href,jobCode},inViewport:true});
  }
  for(const header of headers){
    if(!isWuxi&&!isBgi)break;
    if(isMoseeker&&unique.size)break;
    const heading=text(header);
    const code=heading.match(/\(J\d+\)/i)?.[0].slice(1,-1);
    if(!code)continue;
    const beforeCode=norm(heading.slice(0,heading.indexOf(`(${code})`))).replace(/^20\d{2}届\s*[-－—]\s*/,"");
    const parts=beforeCode.split(/\s*[-－—]\s*/).filter(Boolean);
    const titleBase=isWuxi&&parts.length>1&&places.test(parts[parts.length-1])?parts.pop():"";
    const title=parts.join("-").trim();
    if(!title)continue;
    let card=header,found=false;
    for(let i=0;i<10&&card?.parentElement;i++){
      card=card.parentElement;
      const value=text(card);
      if(/工作职责|岗位职责|职位描述/.test(value)&&/任职资格|任职要求|岗位要求|任职条件|职位要求/.test(value)&&value.length<18000&&(value.match(/\(J\d+\)/gi)||[]).length<=2){found=true;break;}
    }
    if(!found)continue;
    const raw=card?.innerText||"";
    const start=raw.search(/工作职责|岗位职责|职位描述/),end=raw.search(/每个人最多投递|立即投递|收藏\s*查看详情/);
    const jd=start>=0?raw.slice(start,end>start?end:undefined).trim():"";
    const lines=raw.split(/\n/).map(norm).filter(Boolean);
    const base=lines.find(line=>places.test(line)||/^(?:[\u4e00-\u9fa5]{2,9}省[·\s]?)?[\u4e00-\u9fa5]{2,9}市(?:[·\s][\u4e00-\u9fa5]{2,9}区)?$/.test(line))||titleBase||"";
    const recruitmentType=lines.find(line=>/^(校园招聘|社会招聘|实习生招聘|校招|社招)$/.test(line))||(isWuxi?"2027届校园招聘":"");
    if(jd.length>=30){
      const rect=header.getBoundingClientRect();
      const inViewport=rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth;
      const viewportTop=inViewport?Math.max(0,rect.top):Infinity;
      if(!unique.has(code)||viewportTop<unique.get(code).viewportTop)unique.set(code,{capture:{company:isWuxi?"药明康德":isBgi?"华大BGI":"",title,base,recruitmentType,jd,sourceUrl:location.href,jobCode:code},inViewport,viewportTop});
    }
  }
  if(!unique.size&&isBgi){
    const lines=(document.body?.innerText||"").split(/\n/).map(norm).filter(Boolean);
    const duty=lines.findIndex(line=>/^工作职责$/.test(line));
    let position=duty-1;
    while(position>=0&&!/\(J\d+\)/i.test(lines[position]))position--;
    if(duty>=0&&position>=0){
      const heading=lines[position],code=heading.match(/\((J\d+)\)/i)?.[1]||"";
      const base=lines.slice(position+1,duty).find(line=>/^(?:[\u4e00-\u9fa5]{2,9}省[·\s]?)?[\u4e00-\u9fa5]{2,9}市(?:[·\s][\u4e00-\u9fa5]{2,9}区)?$/.test(line))||"";
      const recruitmentType=lines.slice(position+1,duty).find(line=>/^(校园招聘|社会招聘|实习生招聘)$/.test(line))||"";
      const end=lines.findIndex((line,index)=>index>duty&&/^(立即投递|收藏|查看详情)$/.test(line));
      const jd=lines.slice(duty,end>duty?end:undefined).join("\n");
      if(jd.length>=30)unique.set(code||"bgi",{capture:{company:"华大BGI",title:heading.replace(/\(J\d+\)/i,"").trim(),base,recruitmentType,jd,sourceUrl:location.href,jobCode:code},inViewport:true});
    }
  }
  if(!unique.size&&host==="jobs.bytedance.com"&&/^\/(?:campus|society)\/position\/\d+\/detail(?:\/|$)/.test(location.pathname)){
    const lines=(document.body?.innerText||"").split(/\n/).map(norm).filter(Boolean);
    const description=lines.findIndex(line=>/^职位描述$/.test(line));
    const codeAt=lines.findIndex((line,index)=>index<description&&/职位\s*ID[：:]/i.test(line));
    const headingArea=lines.slice(0,codeAt>=0?codeAt:description>=0?description:undefined);
    const title=headingArea.findLast(line=>line.length>8&&line.length<120&&/(?:实习生|工程师|研发|开发|研究员|专员|经理)/.test(line)&&!/^(?:技术人才项目|招聘动态|职位|首页)/.test(line))||norm(document.title).replace(/\s*-\s*字节跳动\s*$/,"");
    const requirements=lines.findIndex((line,index)=>index>description&&/^职位要求$/.test(line));
    const related=lines.findIndex((line,index)=>index>description&&/^相关职位$/.test(line));
    const end=lines.findIndex((line,index)=>index>description&&/^(?:投递|立即投递|申请职位|相关职位)$/.test(line));
    const jd=description>=0?lines.slice(description,end>description?end:related>description?related:undefined).join("\n"):"";
    const meta=lines.slice(0,description>=0?description:Math.min(lines.length,20));
    const code=meta.map(line=>line.match(/职位\s*ID[：:]\s*([A-Z0-9]+)/i)?.[1]).find(Boolean)||"";
    const base=meta.find(line=>/^(?:北京|上海|深圳|广州|杭州|成都|武汉|南京|西安|天津|重庆|苏州)(?:、(?:北京|上海|深圳|广州|杭州|成都|武汉|南京|西安|天津|重庆|苏州))*$/.test(line))||"";
    const recruitmentType=meta.find(line=>/^(?:日常实习|暑期实习)$/.test(line))||meta.find(line=>/^(?:校招|社会招聘|校园招聘|实习)$/.test(line))||"";
    if(title&&jd.length>=30&&requirements>description)unique.set(code||"bytedance",{capture:{company:"字节跳动",title,base,recruitmentType,jd,sourceUrl:location.href,jobCode:code},inViewport:true});
  }
  if(!unique.size&&/(?:^|\.)zhipin\.com$/.test(host)&&/\/weijd-job\//.test(location.pathname)){
    const lines=(document.body?.innerText||"").split(/\n/).map(norm).filter(Boolean);
    const description=lines.findIndex(line=>/^职位详情$/.test(line));
    const workplace=lines.findIndex((line,index)=>index>description&&/^工作地点$/.test(line));
    const other=lines.findIndex((line,index)=>index>description&&/^(?:所在公司|其他职位)$/.test(line));
    const end=workplace>description?workplace:other>description?other:undefined;
    const jd=description>=0?lines.slice(description,end).filter(line=>line!=="查看全部").join("\n"):"";
    const before=lines.slice(0,description>=0?description:undefined);
    const rawTitle=before.findLast(line=>line.length>5&&line.length<160&&/(?:工程师|实习生|研发|开发|研究员|专员|经理|校招|校园招聘)/.test(line)&&!/^(?:招聘HR|招聘求职|BOSS直聘|招聘求职找工作神器)/.test(line))||"";
    const titleAt=before.lastIndexOf(rawTitle);
    const companyLine=before.slice(titleAt+1).find(line=>/(?:有限公司|股份有限公司|集团|科技公司)/.test(line))||before.find(line=>/^招聘(?:HR|经理|专员)\s*[·・]\s*/.test(line))||"";
    const company=companyLine.replace(/^招聘(?:HR|经理|专员)\s*[·・]\s*/,"").split(/\s+(?:不需要融资|已上市|未融资|[A-D]轮)/)[0].trim();
    const title=company&&rawTitle.includes(company)?rawTitle.slice(0,rawTitle.indexOf(company)).trim():rawTitle;
    const area=before.slice(titleAt+1).find(line=>/^[\u4e00-\u9fff]{2,8}[·・]/.test(line))||"";
    const base=area.split(/[·・]/)[0]||"";
    const recruitmentType=/实习/.test(title)?"实习":/(?:校招|校园招聘|应届|\d{2}届)/.test(title)?"校园招聘":"";
    if(title&&company&&jd.length>=30)unique.set("zhipin",{capture:{company,title,base,recruitmentType,jd,sourceUrl:location.href,jobCode:""},inViewport:true});
  }
  if(!unique.size&&isMoka){
    const lines=readPage().split(/\n/).map(norm).filter(Boolean);
    const description=lines.findIndex(line=>/^职位描述$/.test(line));
    const companyInfo=lines.findIndex((line,index)=>index>description&&/^公司信息$/.test(line));
    const before=lines.slice(0,description>=0?description:0);
    const detail=before.findLastIndex(line=>/(?:^|\/)职位详情$/.test(line));
    const titleArea=detail>=0?before.slice(detail+1):before;
    const title=titleArea.findLast(line=>line.length<120&&/(?:管培生|工程师|经理|专员|研究员|实习生|【20\d{2}】)/.test(line)&&!/[|｜]|发布于|申请职位/.test(line))||text(document.querySelector("h1"));
    const company=(companyInfo>=0?lines.slice(companyInfo+1).find(line=>/有限公司|股份公司|集团/.test(line)):"")||norm(document.title).replace(/\s*[-－—|｜]?\s*(?:校园招聘|社会招聘|招聘官网|招聘门户).*$/,"");
    const end=lines.findIndex((line,index)=>index>description&&/^(?:公司信息|申请职位|立即投递|相关职位|最新职位|允许\d|官网岗位采集)/.test(line));
    const jd=description>=0?formatDescription(lines.slice(description+1,end>description?end:undefined).join("\n")):"";
    const meta=before.join("|");
    const base=[...new Set(meta.split(/[|｜]/).map(norm).filter(value=>value.length<30&&(/(?:市|省|区)$/.test(value)||/^(?:北京|上海|深圳|广州|杭州|成都|武汉|南京|天津|重庆|苏州)$/.test(value))))].join(" / ");
    const year=(title+"\n"+jd).match(/(20\d{2})届/)?.[1];
    const recruitmentType=/campus/.test(location.pathname)?(year?`${year}届校园招聘`:"校园招聘"):"";
    if(title&&jd.length>=30)unique.set("moka",{capture:{company,title,base,recruitmentType,jd,sourceUrl:location.href,jobCode:""},inViewport:true});
  }
  if(!unique.size){
    for(const script of document.querySelectorAll('script[type="application/ld+json"]')){
      let parsed;try{parsed=JSON.parse(script.textContent||"");}catch{continue;}
      const entries=Array.isArray(parsed)?parsed:[parsed];
      for(const entry of entries.flatMap(value=>value?.["@graph"]||[value])){
        if(!String(entry?.["@type"]||"").includes("JobPosting"))continue;
        const html=document.createElement("div");html.innerHTML=String(entry.description||"").replace(/<br\s*\/?>/gi,"\n").replace(/<\/(?:p|div|li|h[1-6]|ul|ol)>/gi,"\n");
        const jd=formatDescription(html.textContent||html.innerText||"");
        const locations=[].concat(entry.jobLocation||[]).map(value=>value?.address?.addressLocality||value?.address?.addressRegion||"").filter(Boolean);
        unique.set(`schema-${unique.size}`,{capture:{company:entry.hiringOrganization?.name||"",title:entry.title||"",base:locations.join(" / "),recruitmentType:entry.employmentType||"",jd,sourceUrl:location.href,jobCode:entry.identifier?.value||""},inViewport:true});
      }
    }
  }
  if(!unique.size){
    const heading=document.querySelector("h1")||document.querySelector("h2");
    const raw=readPage();
    const bodyStart=raw.search(/(?:^|\n)\s*(?:工作职责|岗位职责|职位描述|职位职责|岗位描述)\s*[：:]?\s*(?:\n|$)/m);
    const start=bodyStart>=0?bodyStart:raw.search(/工作职责|岗位职责|职位描述|职位职责|岗位描述/);
    // Generic fallback: only use the first visible job section, and stop before
    // recommendation/company/footer sections. Unknown sites still require review.
    const section=start>=0?raw.slice(start):"";
    const end=section.search(/(?:^|\n)\s*(?:相关职位|其他职位|最新职位|所在公司|公司信息|职位属性|公司福利|联系我们|立即投递|申请职位|投递|官网岗位采集)\s*(?:\n|$)/m);
    const jd=start>=0&&raw.length<18000?section.slice(0,end>=0?end:undefined).trim():"";
    const labeled=labels=>raw.match(new RegExp(`(?:^|\\n)\\s*(?:${labels})\\s*[：:]\\s*([^\\n]+)`))?.[1]?.trim()||"";
    const headingText=text(heading);
    const siteTitle=value=>/(?:招聘官网|招聘门户|校园招聘|社会招聘|职位列表|招聘职位)$/.test(value)&&!/(?:工程师|经理|管培生|专员|实习生)/.test(value);
    const before=raw.slice(0,start>=0?start:0).split(/\n/).map(norm).filter(Boolean);
    const nearbyTitle=before.findLast(line=>line.length<100&&/(?:工程师|经理|管培生|专员|研究员|实习生|分析师|设计师)/.test(line)&&!/[：:|｜]|发布于/.test(line));
    const title=labeled("职位名称|岗位名称")||(!siteTitle(headingText)?headingText:"")||nearbyTitle||(!siteTitle(document.title||"")?document.title:"")||"";
    unique.set("page",{capture:{company:isBgi?"华大BGI":labeled("公司名称|招聘公司|企业名称"),title,base:labeled("工作地点|工作城市|工作地区"),recruitmentType:labeled("招聘类型|招聘批次"),jd,sourceUrl:location.href,jobCode:labeled("职位编号|岗位编号|职位ID")||title.match(/[（(](J\d+)[）)]/i)?.[1]||""},inViewport:true});
  }
  const found=[...unique.values()];
  const visible=found.flatMap((entry,index)=>entry.inViewport?[{index,top:entry.viewportTop}]:[]).sort((a,b)=>a.top-b.top);
  const suggestedIndex=isBgi&&visible.length?visible[0].index:visible.length===1?visible[0].index:found.length===1?0:null;
  return {jobs:found.map(entry=>entry.capture),suggestedIndex};
}
function render(index){
  const item=captures[index];if(!item)return;
  $("title").textContent=item.title||"职位待补";$("meta").textContent=[item.company||"公司待补",item.base||"Base 待补",item.jobCode||"编号待补"].join(" · ");$("length").textContent=item.jd.length>=30?`已提取 ${item.jd.length} 字，请核对是否仅属于当前岗位`:`仅提取 ${item.jd.length} 字，请在原页补齐完整 JD`;
  $("preview").hidden=false;
  $("open").onclick=async()=>{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    await chrome.scripting.executeScript({target:{tabId:tab.id},func:showReview,args:[item]});
    window.close();
  };
}
function showReview(item){
  document.getElementById("jobseeking-capture-review")?.remove();
  const host=document.createElement("div");host.id="jobseeking-capture-review";
  host.style.cssText="position:fixed;z-index:2147483647;inset:0;pointer-events:none;display:flex;justify-content:flex-end;font:14px/1.6 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;color:#18323a";
  const panel=document.createElement("section");panel.style.cssText="box-sizing:border-box;width:min(560px,100vw);height:100vh;overflow:auto;pointer-events:auto;background:#f5f9f8;box-shadow:-12px 0 40px #102f3840;padding:28px";host.append(panel);
  const heading=document.createElement("header");heading.style.cssText="display:flex;justify-content:space-between;align-items:start;gap:16px;margin-bottom:18px";
  const title=document.createElement("div");title.innerHTML="<small style='color:#358474'>官网岗位采集</small><h2 style='margin:4px 0;font-size:24px'>在当前岗位页核对</h2><p style='margin:0;color:#61747a'>对照招聘页面，确认后直接加入候选岗位。</p>";heading.append(title);
  const close=document.createElement("button");close.textContent="关闭";close.onclick=()=>host.remove();heading.append(close);panel.append(heading);
  const known=["wuxiapptec.zhiye.com","genomics.zhiye.com","app.mokahr.com","www.moseeker.com","moseeker.com"].includes(new URL(item.sourceUrl).hostname);
  const sourceNote=document.createElement("p");sourceNote.style.cssText="padding:10px 12px;background:#fff5df;color:#6e5432;font-size:13px";sourceNote.textContent=known?"该网站有专用识别规则。仍需逐项核对公司、岗位及完整原文。":"未验证来源：通用提取可能抓到列表或其他岗位。请逐项对照原页，缺失字段手动补齐。";panel.append(sourceNote);
  const fields={};
  for(const [key,label] of [["company","公司"],["title","职位"],["base","Base"],["recruitmentType","招聘批次"],["jobCode","岗位编号"],["sourceUrl","来源链接"]]){
    const wrap=document.createElement("label");wrap.style.cssText="display:grid;gap:5px;margin:12px 0;color:#52686e;font-weight:600";wrap.textContent=label;
    const input=document.createElement("input");input.value=item[key]||"";input.style.cssText="box-sizing:border-box;width:100%;padding:10px;border:1px solid #bed1cc;border-radius:4px;background:white;font:inherit;color:#18323a";wrap.append(input);panel.append(wrap);fields[key]=input;
  }
  const jdWrap=document.createElement("label");jdWrap.style.cssText="display:grid;gap:5px;margin:12px 0;color:#52686e;font-weight:600";jdWrap.textContent="完整岗位原文";
  const jd=document.createElement("textarea");jd.value=item.jd||"";jd.style.cssText="box-sizing:border-box;width:100%;min-height:280px;padding:12px;border:1px solid #bed1cc;border-radius:4px;background:white;font:inherit;color:#18323a;white-space:pre-wrap";jdWrap.append(jd);panel.append(jdWrap);
  const targetWrap=document.createElement("label");targetWrap.style.cssText="display:grid;gap:5px;margin:12px 0;color:#52686e;font-weight:600";targetWrap.textContent="保存到";
  const target=document.createElement("select");target.style.cssText="box-sizing:border-box;width:100%;padding:10px;border:1px solid #bed1cc;border-radius:4px;background:white;font:inherit;color:#18323a";target.add(new Option("正在检查已有岗位…",""));target.disabled=true;targetWrap.append(target);panel.append(targetWrap);
  const status=document.createElement("p");status.style.cssText="min-height:22px;color:#a04d3a";panel.append(status);
  const submit=document.createElement("button");submit.textContent="核对无误，加入候选岗位";submit.disabled=true;submit.style.cssText="padding:12px 18px;border:0;border-radius:4px;background:#175849;color:white;font:inherit;cursor:pointer";
  submit.onclick=()=>{
    const capture={...item,...Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value.trim()])),jd:jd.value.trim()};
    if(!capture.company||!capture.title||capture.jd.length<30){status.textContent="请核对公司、职位、来源链接与至少 30 字的完整岗位原文。";return;}
    submit.disabled=true;submit.textContent="保存中…";status.textContent="";
    chrome.runtime.sendMessage({type:"save-reviewed-capture",capture,targetId:target.value||undefined},reply=>{
      if(!reply?.ok){status.textContent=reply?.error||chrome.runtime.lastError?.message||"保存失败，请重试。";submit.disabled=false;submit.textContent="核对无误，加入候选岗位";return;}
      status.style.color="#175849";status.textContent=`已保存「${reply.job.title}」，正在打开候选岗位。`;submit.textContent="已加入候选";
    });
  };panel.append(submit);document.body.append(host);
  if(!item.company||!item.title||item.jd.length<30){target.replaceChildren(new Option("新建候选岗位",""));target.disabled=false;submit.disabled=false;status.textContent="提取信息不完整；请在原页补齐公司、职位和完整 JD。";return;}
  chrome.runtime.sendMessage({type:"find-capture-matches",capture:item},reply=>{
    if(!reply?.ok){status.textContent=reply?.error||chrome.runtime.lastError?.message||"查询已有岗位失败，请重试打开采集面板。";return;}
    target.replaceChildren();target.add(new Option("新建候选岗位",""));
    for(const match of reply.matches||[])target.add(new Option(`关联已有：${match.title} · ${match.base||"Base 待补"}`,match.id));
    target.disabled=false;submit.disabled=false;
    if(reply.matches?.length)status.textContent=`找到 ${reply.matches.length} 个可能已有的岗位，请选择新建或关联。`;
  });
}
(async()=>{
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.url?.startsWith("https://"))throw new Error("请先打开 HTTPS 招聘岗位页面。");
    const result=await chrome.scripting.executeScript({target:{tabId:tab.id},func:extract});
    const extracted=result[0]?.result||{jobs:[],suggestedIndex:null};
    captures=extracted.jobs;
    if(!captures.length)throw new Error("未找到岗位。请先展开目标岗位，再打开插件。");
    if(captures.length>1){$("picker").hidden=false;$("jobs").add(new Option("请确认当前展开的岗位",""));captures.forEach((item,index)=>$("jobs").add(new Option(`${item.jobCode||"无编号"} · ${item.title||"职位待补"}`,String(index))));$("jobs").onchange=event=>{if(event.target.value!=="")render(Number(event.target.value));else $("preview").hidden=true;};}
    if(extracted.suggestedIndex!==null){
      $("message").textContent=captures.length===1?"已尝试提取当前岗位，请在原页核对。":`已定位当前可见岗位 · ${captures[extracted.suggestedIndex].jobCode}。请核对编号。`;
      if(captures.length>1)$("jobs").value=String(extracted.suggestedIndex);
      render(extracted.suggestedIndex);
    }else{
      $("message").textContent=`找到 ${captures.length} 个岗位，当前展开的岗位无法唯一识别，请按岗位编号选择。`;
      $("preview").hidden=true;
    }
  }catch(error){$("message").textContent=error.message||"读取失败，请刷新岗位页后重试。";}
})();
