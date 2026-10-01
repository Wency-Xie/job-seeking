(() => {
  if (globalThis.__jobSeekingAutomatic) chrome.runtime.onMessage.removeListener(globalThis.__jobSeekingAutomatic);
  const clean=s=>String(s||"").replace(/[＊*：:\s]/g,"").replaceAll("／","/");
  const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility!=="hidden";
  const sections=["个人信息","求职意向","教育经历","教育背景","实习经历","项目经历","论文/专著","获奖情况","在校职务","技能","语言能力","附加问题","简历附件","应聘者诚信声明","声明"];
  const pause=()=>new Promise(resolve=>setTimeout(resolve,180));
  // Some controls commit on mouse down; dispatch one complete activation, not retries.
  function activate(node){
    const box=node.getBoundingClientRect();
    const init={bubbles:true,cancelable:true,view:window,button:0,clientX:box.left+box.width/2,clientY:box.top+box.height/2};
    if(typeof PointerEvent!=="undefined")node.dispatchEvent(new PointerEvent("pointerdown",{...init,pointerId:1,pointerType:"mouse",isPrimary:true,buttons:1}));
    node.dispatchEvent(new MouseEvent("mousedown",{...init,buttons:1}));
    if(typeof PointerEvent!=="undefined")node.dispatchEvent(new PointerEvent("pointerup",{...init,pointerId:1,pointerType:"mouse",isPrimary:true,buttons:0}));
    node.dispatchEvent(new MouseEvent("mouseup",{...init,buttons:0}));
    node.click();
  }
  async function waitFor(read,timeout=1800){const end=Date.now()+timeout;let result;do{result=read();if(result)return result;await new Promise(resolve=>setTimeout(resolve,90));}while(Date.now()<end);return null;}
  let running=false;
  let report=[];
  let placeFailure="";
  const attemptedRows=new Set();
  function landmarks(){
    const map={};
    for(const name of sections){const nodes=[...document.querySelectorAll("h1,h2,h3,h4,div,span")].filter(el=>visible(el)&&clean(el.textContent)===clean(name)&&!el.closest("nav,aside")&&el.getBoundingClientRect().width>65);
      nodes.sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left||a.children.length-b.children.length);
      if(nodes[0])map[name]=nodes[0].getBoundingClientRect().top;
    }return map;
  }
  function inSection(el,section,map){const top=el.getBoundingClientRect().top;const start=map[section];if(start===undefined)return false;const end=Math.min(...Object.values(map).filter(y=>y>start+10),Infinity);return top>=start&&top<end;}
  function candidates(item){
    const map=landmarks();
    const labels=[...document.querySelectorAll("label,span,div")].filter(el=>visible(el)&&clean(el.textContent)===clean(item.label)&&inSection(el,item.section,map));
    const result=[];
    for(const el of document.querySelectorAll("input,textarea,select,[role=combobox]")){
      if(!visible(el)||el.disabled||["hidden","file","submit","button","password","checkbox","radio"].includes(el.type)||!inSection(el,item.section,map))continue;
      let match=clean(el.getAttribute("aria-label"))===clean(item.label)||[...(el.labels||[])].some(l=>clean(l.textContent)===clean(item.label));
      const box=el.getBoundingClientRect();
      if(!match)match=labels.some(label=>{const r=label.getBoundingClientRect();return r.right<=box.left+15&&box.left-r.right<230&&Math.abs((r.top+r.bottom-box.top-box.bottom)/2)<38;});
      if(match)result.push(el);
    }
    return result.sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top).filter((el,index,all)=>!all.slice(0,index).some(other=>other.contains(el)||el.contains(other)));
  }
  function mokaCandidates(item){
    const map=landmarks();
    const fieldNames=new Set(["姓名","手机号码","邮箱","性别","出生日期(年龄)","最高学历","籍贯","到岗时间","期望薪资","期望城市","起止时间","结束时间","公司名称","职位名称","工作职责"]);
    const labels=[...document.querySelectorAll("label,span,div")].filter(node=>visible(node)&&node.children.length<2&&clean(node.textContent)===clean(item.label)&&inSection(node,item.section,map));
    const controls=[...document.querySelectorAll("input,textarea,select,[role=combobox]")].filter(el=>visible(el)&&!el.disabled&&!el.readOnly&&!["hidden","file","submit","button","password","checkbox","radio"].includes(el.type)&&inSection(el,item.section,map));
    return controls.filter(el=>{
      const direct=clean(el.getAttribute("aria-label"))===clean(item.label)||[...(el.labels||[])].some(label=>clean(label.textContent)===clean(item.label));
      if(direct)return true;
      const box=el.getBoundingClientRect();
      const nearby=labels.filter(label=>{
        const r=label.getBoundingClientRect();
        const above=r.bottom<=box.top+12&&box.top-r.bottom<75&&r.left<box.right&&r.right>box.left;
        const left=r.right<=box.left+12&&box.left-r.right<180&&Math.abs((r.top+r.bottom-box.top-box.bottom)/2)<24;
        return above||left;
      });
      if(!nearby.length)return false;
      const allLabels=[...document.querySelectorAll("label,span,div")].filter(node=>visible(node)&&node.children.length<2&&node!==el&&fieldNames.has(clean(node.textContent)));
      const score=node=>{const r=node.getBoundingClientRect();const above=r.bottom<=box.top+12&&box.top-r.bottom<75&&r.left<box.right&&r.right>box.left;const left=r.right<=box.left+12&&box.left-r.right<180&&Math.abs((r.top+r.bottom-box.top-box.bottom)/2)<24;return above?box.top-r.bottom:left?box.left-r.right+25:Infinity;};
      const nearest=allLabels.map(node=>({node,score:score(node)})).filter(x=>Number.isFinite(x.score)).sort((a,b)=>a.score-b.score)[0];
      return nearest&&clean(nearest.node.textContent)===clean(item.label);
    }).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
  }
  function bgiCandidates(item){
    const map=landmarks();
    const names=new Set(["姓名","性别","出生日期","手机号码","邮箱","毕业时间","最高学历","目前专业成绩排名","目前综合成绩排名","三方协议领取时间","英语等级","英语口语能力","掌握其他外语","海外留学经历","意向工作地","其他意向地","毕业后到岗时间","期望薪资","婚姻状况","体重(公斤)","身高(厘米)","户口所在地","户口类型","国籍","证件号码","籍贯","民族","政治面貌","紧急联系人","紧急联系电话","与紧急联系人关系","如何获取到华大校招信息？","学校名称","开始时间","结束时间","专业名称","学习形式","学历","学位","备注","单位名称","证明人","实习内容","项目名称","项目描述","项目中职责"]);
    const labels=[...document.querySelectorAll("label,span,div")].filter(node=>visible(node)&&node.children.length<2&&names.has(clean(node.textContent))&&inSection(node,item.section,map));
    return [...document.querySelectorAll("input,textarea")].filter(el=>{
      if(!visible(el)||el.disabled||(el.readOnly&&item.kind!=="date")||!["text","email","tel","textarea"].includes(el.type||el.tagName.toLowerCase())||!inSection(el,item.section,map))return false;
      // The sticky site search can overlap a scrolled form section on screen.
      if(el.closest("header,nav,aside")||/搜索职位|搜索岗位/.test(el.getAttribute("placeholder")||""))return false;
      const box=el.getBoundingClientRect();
      const direct=[...(el.labels||[])].some(label=>clean(label.textContent)===clean(item.label))||clean(el.getAttribute("aria-label"))===clean(item.label);
      if(direct)return true;
      const nearest=labels.map(label=>{
        const r=label.getBoundingClientRect();
        const sameRow=Math.abs((r.top+r.bottom-box.top-box.bottom)/2)<24&&r.right<=box.left+15&&box.left-r.right<180;
        const above=r.bottom<=box.top+10&&box.top-r.bottom<42&&r.left<box.right&&r.right>box.left;
        return {label,score:sameRow?box.left-r.right:above?box.top-r.bottom+100:Infinity};
      }).sort((a,b)=>a.score-b.score)[0];
      return nearest&&Number.isFinite(nearest.score)&&clean(nearest.label.textContent)===clean(item.label);
    }).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
  }
  function projectControls(){
    // On this form, project name and role share one horizontal line. Match each control to its nearest label,
    // not to every label within a broad distance; duplicate wrapper labels previously made role look like row 2.
    const map=landmarks();
    const labels=[...document.querySelectorAll("label,span,div")].filter(el=>visible(el)&&["项目名称","职务","开始时间","结束时间","项目描述"].includes(clean(el.textContent))&&inSection(el,"项目经历",map));
    const controls=[...document.querySelectorAll("input,textarea")].filter(el=>visible(el)&&!el.disabled&&!["hidden","file","checkbox","radio"].includes(el.type)&&inSection(el,"项目经历",map));
    return controls.map(el=>{
      const box=el.getBoundingClientRect();
      const label=labels.map(node=>({node,rect:node.getBoundingClientRect()})).filter(({rect})=>rect.right<=box.left+15&&box.left-rect.right<230&&Math.abs((rect.top+rect.bottom-box.top-box.bottom)/2)<38).sort((a,b)=>(box.left-a.rect.right)-(box.left-b.rect.right))[0]?.node;
      return {el,label:clean(label?.textContent)};
    });
  }
  function projectNameInputs(){return projectControls().filter(({label,el})=>label==="项目名称"&&el.tagName==="INPUT").map(({el})=>el).sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);}
  function projectField(item){
    const names=projectNameInputs();
    if(item.label==="项目名称")return names[item.row];
    const start=names[item.row]?.getBoundingClientRect().top;
    if(start===undefined)return;
    const end=names[item.row+1]?.getBoundingClientRect().top??landmarks()["论文/专著"]??Infinity;
    return projectControls().find(({el,label})=>{const top=el.getBoundingClientRect().top;return label===item.label&&top>=start-10&&top<end-10;})?.el;
  }
  function overlay(){let el=document.getElementById("jobseeking-autofill-progress");if(el)return el;el=document.createElement("div");el.id="jobseeking-autofill-progress";el.setAttribute("role","status");el.style.cssText="position:fixed;bottom:85px;right:24px;z-index:2147483647;width:310px;max-height:55vh;overflow:auto;padding:20px;background:#f4f7f6;border:1px solid #278b77;border-radius:8px;color:#172a33;font:14px/1.6 sans-serif;box-shadow:0 8px 24px #0002";document.body.append(el);return el;}
  function progress(text,done=false){const el=overlay();el.replaceChildren();const title=document.createElement("strong");title.textContent=(done?"自动填写结果":"正在填写网申")+" · v"+chrome.runtime.getManifest().version;const p=document.createElement("p");p.textContent=text;el.append(title,p);if(done){const details=document.createElement("details");const summary=document.createElement("summary");summary.textContent="查看需核对的字段";details.append(summary);for(const row of report.filter(r=>r.status!=="filled"&&r.status!=="existing")){const line=document.createElement("p");line.textContent=`${row.section} ${row.row+1} · ${row.label}：${row.reason}`;details.append(line);}el.append(details);const close=document.createElement("button");close.textContent="关闭";close.onclick=()=>el.remove();el.append(close);}}
  function write(el,value){const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:el.tagName==="SELECT"?HTMLSelectElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,"value")?.set;if(!setter)return false;setter.call(el,value);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));el.dispatchEvent(new Event("blur",{bubbles:true}));return el.value===value;}
  function equivalent(a,b){a=clean(a);b=clean(b);const aliases={"硕士":"硕士研究生","本科":"大学本科","国家级":"国家","省部级":"省级","校级":"院校级","一般":"了解","是":"有","否":"无","有":"是","无":"否"};return a===b||aliases[a]===b||aliases[b]===a;}
  function nearNodes(anchor,pred){
    const r=anchor.getBoundingClientRect();
    return [...document.querySelectorAll("button,label,li,span,div,td,[role=option],[role=gridcell]")].filter(el=>{
      if(el.children.length>2||el.closest("#jobseeking-autofill-progress"))return false;
      const b=el.getBoundingClientRect();
      if(!(b.left>=r.left-120&&b.left<=r.right+500&&b.top>=r.top-430&&b.top<=r.bottom+550))return false;
      return visible(el)&&pred(el);
    }).sort((a,b)=>a.children.length-b.children.length||Math.abs(a.getBoundingClientRect().top-r.bottom)-Math.abs(b.getBoundingClientRect().top-r.bottom));
  }
  function displayed(el,value){
    const wanted=clean(value);
    for(let node=el,depth=0;node&&depth<5;node=node.parentElement,depth++){
      const box=node.getBoundingClientRect();
      if(box.height>145)break;
      const text=clean(node.value||node.textContent);
      if(text.includes(wanted)&&!text.includes("请选择"))return true;
    }
    return false;
  }
  async function choose(el,value){
    const values=value.split("｜").map(v=>v.trim()).filter(Boolean);
    if(el.tagName==="SELECT"){const option=[...el.options].find(o=>values.some(v=>equivalent(o.textContent,v)||equivalent(o.value,v)));return option?write(el,option.value):false;}
    el.scrollIntoView({block:"center"});activate(el);await pause();
    const matches=nearNodes(el,node=>node.children.length<2&&values.some(v=>equivalent(node.textContent,v)||clean(v).startsWith(clean(node.textContent)+"（")));
    const choice=matches[0];if(!choice){activate(document.body);return false;}
    (choice.closest('[role="option"],li,[class*="option-item"],[class*="OptionItem"]')||choice).click();await pause();
    const confirm=nearNodes(choice,node=>node.children.length<2&&clean(node.textContent)==="确定")[0];
    if(confirm&&Math.abs(confirm.getBoundingClientRect().top-choice.getBoundingClientRect().top)<360){activate(confirm);await pause();}
    const ok=values.some(v=>displayed(el,v)||displayed(el,({"是":"有","否":"无"})[v]||v));
    activate(document.body);return ok;
  }
  function placeSearchTerm(value){
    const text=String(value||"").trim();
    const city=text.match(/(?:省|自治区|特别行政区)[\s,，、/／\-—·]*([^省区]+?(?:市|州|县|区))$/);
    return (city?.[1]||text).replace(/^[\s,，、/／\-—·]+/,"");
  }
  function nearbyVisible(anchor,selector,pred){
    const r=anchor.getBoundingClientRect();
    return [...document.querySelectorAll(selector)].filter(node=>{
      if(!visible(node)||node.closest("#jobseeking-autofill-progress"))return false;
      const b=node.getBoundingClientRect();
      return b.left>=r.left-140&&b.left<=r.right+550&&b.top>=r.top-480&&b.top<=r.bottom+600&&pred(node);
    }).sort((a,b)=>{
      const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
      return Math.abs(x.top-r.top)+Math.abs(x.left-r.left)-Math.abs(y.top-r.top)-Math.abs(y.left-r.left);
    });
  }
  function searchPopup(anchor){
    let popup=anchor.parentElement;
    while(popup&&popup!==document.body){
      const text=popup.textContent||"";
      if(text.includes("取消")&&text.includes("确定")&&popup.querySelector('input[placeholder*="搜索"]'))return popup;
      popup=popup.parentElement;
    }
    return null;
  }
  function popupAction(popup,label){
    return popup&&[...popup.querySelectorAll('button,[role="button"],label,span,div')].find(node=>visible(node)&&node.children.length<2&&clean(node.textContent)===label);
  }
  function closePicker(anchor){
    const cancel=popupAction(searchPopup(anchor),"取消");
    if(cancel)activate(cancel.closest('button,[role="button"]')||cancel);
    else activate(document.body);
  }
  function dismissOpenPlacePicker(){
    const search=[...document.querySelectorAll('input[placeholder*="搜索"]')].find(visible);
    if(search)closePicker(search);
  }
  function popupOption(popup,text,anchor){
    const source=popup||document;
    const matches=[...source.querySelectorAll('label,li,[role="option"],span,div')].filter(node=>visible(node)&&node.children.length<3&&equivalent(node.textContent,text)&&(!anchor||node.getBoundingClientRect().top>anchor.getBoundingClientRect().bottom-5));
    return matches.sort((a,b)=>a.children.length-b.children.length)[0];
  }
  async function chooseSearchPopup(el,value,label){
    const term=placeSearchTerm(value);
    placeFailure="地点检索词为空";
    if(!term)return false;
    el.scrollIntoView({block:"center"});activate(el);await pause();
    const search=await waitFor(()=>nearbyVisible(el,'input[placeholder]',input=>input!==el&&!input.disabled&&/搜索|查找/.test(input.placeholder||""))[0]);
    if(!search){placeFailure="未找到地点搜索框";closePicker(el);return false;}
    const popup=searchPopup(search);
    if(!popup){placeFailure="未找到地点选择弹窗";closePicker(search);return false;}
    const province=String(value).match(/(?:[^\s,，、/／\-—·]+?(?:省|自治区|特别行政区))/)?.[0]||({"长沙市":"湖南省","邵阳市":"湖南省"})[term];
    if(label!=="民族"&&province){
      const searchSetter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      if(searchSetter&&search.value){searchSetter.call(search,"");search.dispatchEvent(new Event("input",{bubbles:true}));}
      const provinceOption=await waitFor(()=>popupOption(popup,province,search));
      if(!provinceOption){placeFailure=`未找到“${province}”省级选项`;closePicker(search);return false;}
      activate(provinceOption);
      const cityOption=await waitFor(()=>popupOption(popup,term,search));
      if(!cityOption){placeFailure=`选择“${province}”后未找到“${term}”`;closePicker(search);return false;}
      let cityControl=cityOption;
      for(let parent=cityOption.parentElement,depth=0;parent&&depth<3;parent=parent.parentElement,depth++){
        const input=parent.querySelector('input[type="radio"],input[type="checkbox"]');
        if(input){cityControl=input;break;}
      }
      activate(cityControl);
      const selected=await waitFor(()=>/已选地区1\/1/.test(clean(popup.textContent)));
      if(!selected){placeFailure=`“${term}”未加入已选地区`;closePicker(search);return false;}
      const confirm=popupAction(popup,"确定");
      if(!confirm){placeFailure="未找到地点确定按钮";closePicker(search);return false;}
      activate(confirm.closest('button,[role="button"]')||confirm);
      const ok=await waitFor(()=>clean(String(el.value||"")).includes(clean(term))||displayed(el,term));
      if(!ok){placeFailure=`点击确定后表单未回读“${term}”`;closePicker(search);}
      return Boolean(ok);
    }
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
    if(!setter){placeFailure="地点搜索框未接受检索词";closePicker(search);return false;}
    setter.call(search,term);
    search.dispatchEvent(new Event("input",{bubbles:true}));
    if(search.value!==term){placeFailure="地点搜索框未接受检索词";closePicker(search);return false;}
    const option=await waitFor(()=>popupOption(popup,term,search));
    if(!option){placeFailure=`未找到“${term}”选项`;closePicker(search);return false;}
    let choice=option.closest('label,[role="option"],li')||option;
    for(let parent=option.parentElement,depth=0;parent&&depth<3;parent=parent.parentElement,depth++){
      const input=parent.querySelector('input[type="radio"],input[type="checkbox"]');
      if(input){choice=input;break;}
    }
    activate(choice);
    const selected=await waitFor(()=>/已选1\/1/.test(clean(popup.textContent)));
    if(!selected){placeFailure=`“${term}”未加入已选内容`;closePicker(search);return false;}
    const confirm=popupAction(popup,"确定");
    if(!confirm){placeFailure="未找到地点确定按钮";closePicker(search);return false;}
    activate(confirm.closest('button,[role="button"]')||confirm);
    const ok=await waitFor(()=>clean(String(el.value||"")).includes(clean(term))||displayed(el,term));
    if(!ok){placeFailure=`点击确定后表单未回读“${term}”`;if(searchPopup(search))closePicker(search);}
    return ok;
  }
  function calendarCells(el,text){
    return nearbyVisible(el,'td,[role="gridcell"]',node=>node.children.length<2&&clean(node.textContent)===text);
  }
  async function chooseMonth(el,value){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return false;
    const [year,month]=value.split("-");
    el.scrollIntoView({block:"center"});activate(el);await pause();
    const monthText=`${Number(month)}月`;
    const currentYear=await waitFor(()=>nearbyVisible(el,'button,[role="button"]',node=>/^20\d{2}年?$/.test(clean(node.textContent))).sort((a,b)=>Number(clean(b.textContent).endsWith("年"))-Number(clean(a.textContent).endsWith("年")))[0]);
    if(!currentYear){activate(document.body);return false;}
    if(clean(currentYear.textContent).slice(0,4)!==year){
      activate(currentYear);
      const targetYear=await waitFor(()=>calendarCells(el,year)[0]);
      if(!targetYear){activate(document.body);return false;}
      activate(targetYear.querySelector('a,button,[role="button"],span')||targetYear);await pause();
    }
    if(!calendarCells(el,monthText).length){
      // Beisen keeps the year grid open after changing years. Its month header
      // becomes clickable after the picker has rendered the selected year.
      const monthHeader=await waitFor(()=>nearbyVisible(el,'button,[role="button"]',node=>/^(?:1[0-2]|[1-9])月$/.test(clean(node.textContent)))[0],3500);
      if(monthHeader){activate(monthHeader);await pause();}
    }
    const targetMonth=await waitFor(()=>calendarCells(el,monthText)[0]);
    if(!targetMonth){activate(document.body);return false;}
    activate(targetMonth.querySelector('a,button,[role="button"],span')||targetMonth);
    const confirmed=await waitFor(()=>{
      const actual=String(el.value||el.getAttribute("aria-valuetext")||"").trim();
      const match=actual.match(/(20\d{2})\D{0,3}(1[0-2]|0?[1-9])(?:\D|$)/);
      return match&&match[1]===year&&Number(match[2])===Number(month);
    });
    if(!confirmed)activate(document.body);
    return Boolean(confirmed);
  }
  function cleanupLegacyAward(profile,item,el){
    if(item.section!=="获奖情况"||item.label!=="描述该荣誉或奖励")return;
    const line=String(profile.awards||"").split("\n")[item.row];if(!line)return;
    const parts=line.split("｜");
    const old=[parts[0],parts[2],parts.slice(3).join("｜").replaceAll("\\n","\n")].filter(Boolean).join("；");
    if(old&&String(el.value||"").trim()===old)write(el,"");
  }
  function cleanupLegacyBgiProject(profile,item,el){
    if(location.hostname!=="genomics.zhiye.com"||item.section!=="项目经历"||item.label!=="项目描述")return;
    const line=String(profile.projectExperience||"").split("\n")[item.row];
    const parts=line?.split("｜")||[];
    if(parts.length<5)return;
    const oldDescription=parts.slice(4).join("｜").replaceAll("\\n","\n").trim();
    const newDescription=(parts[3]||"").replaceAll("\\n","\n").trim();
    if(oldDescription&&newDescription&&oldDescription!==newDescription&&String(el.value||"").trim()===oldDescription)write(el,"");
  }
  async function addOneRow(section){
    const buttons=[...document.querySelectorAll("button,a,span,div")].filter(el=>visible(el)&&clean(el.textContent)===clean(`添加${section}`)&&el.children.length<2);
    const button=buttons.find(el=>el.tagName==="BUTTON"||el.tagName==="A")||buttons[0];
    if(!button)return false;
    activate(button);await pause();return true;
  }
  function fillGender(value){
    const map=landmarks();
    if([...document.querySelectorAll('input[type="radio"]')].some(el=>inSection(el,"个人信息",map)&&el.checked))return "existing";
    const radio=[...document.querySelectorAll('input[type="radio"]')].find(el=>inSection(el,"个人信息",map)&&equivalent(el.value,value));
    if(radio){radio.click();return radio.checked;}
    const labels=[...document.querySelectorAll("label,span")].filter(el=>visible(el)&&clean(el.textContent)===clean(value)&&inSection(el,"个人信息",map)&&el.children.length<2);
    if(labels.length!==1)return false;
    labels[0].click();return true;
  }
  async function ensureRow(section,row){
    const primary={"教育经历":"学校名称","实习经历":"单位名称","项目经历":"项目名称","在校职务":"职务名称","技能":"技能名称","获奖情况":"描述该荣誉或奖励","论文/专著":"论文题目"};
    const label=primary[section];if(!label)return;
    const bgi=location.hostname==="genomics.zhiye.com";
    let count=bgi?bgiCandidates({section,label}).length:section==="项目经历"?projectNameInputs().length:candidates({section,label}).length;
    const key=`${section}:${row}`;
    if(count<=row&&attemptedRows.has(key))return false;
    attemptedRows.add(key);
    for(let attempt=0;count<=row&&attempt<row+1;attempt++){
      if(!await addOneRow(section))break;
      const next=bgi?bgiCandidates({section,label}).length:section==="项目经历"?projectNameInputs().length:candidates({section,label}).length;
      if(next<=count)break;
      count=next;
    }
    return count>row;
  }
  let activeProfile=null,activePlan=[];
  function finishReport(){
    const filled=report.filter(r=>r.status==="filled").length;
    const existing=report.filter(r=>r.status==="existing").length;
    progress(`填入 ${filled} 项，保留已有 ${existing} 项，需核对 ${report.length-filled-existing} 项。附件、岗位问题与最终提交请本人完成。`,true);
    running=false;
    return {ok:true,finished:true,results:report};
  }
  async function processStep(index){
    if(!running||!activePlan.length)return {ok:false,error:"未启动填写"};
    const item=activePlan[index];
    if(!item)return {ok:false,error:"无效字段序号"};
    progress(`正在处理 ${index+1}/${activePlan.length}：${item.section} · ${item.label}`);
    try{
      if(item.row>0&&["wuxiapptec.zhiye.com","genomics.zhiye.com"].includes(location.hostname)){
        const present=await ensureRow(item.section,item.row);
        if(!present){report.push({...item,value:undefined,status:"skipped",reason:`未能创建第 ${item.row+1} 条${item.section}`});return {ok:true,index};}
      }
      if(item.section==="项目经历"&&item.row>0&&location.hostname==="wuxiapptec.zhiye.com"){
        const expected=activePlan.find(row=>row.section===item.section&&row.row===item.row&&row.label==="项目名称")?.value;
        const actual=projectNameInputs()[item.row]?.value?.trim();
        if(expected&&actual&&!equivalent(actual,expected)){report.push({...item,value:undefined,status:"skipped",reason:"第 2 条项目名称与档案不符"});return {ok:true,index};}
      }
      const moka=location.hostname==="app.mokahr.com";
      const bgi=location.hostname==="genomics.zhiye.com";
      if(bgi&&["教育经历","实习经历","项目经历"].includes(item.section)){
        const primary={"教育经历":"学校名称","实习经历":"单位名称","项目经历":"项目名称"}[item.section];
        const expected=activePlan.find(row=>row.section===item.section&&row.row===item.row&&row.label===primary)?.value;
        const actual=bgiCandidates({section:item.section,label:primary})[item.row]?.value?.trim();
        if(expected&&actual&&!equivalent(actual,expected)){report.push({...item,value:undefined,status:"skipped",reason:"已有经历名称与档案不符，保留整条记录"});return {ok:true,index};}
      }
      const mokaMatches=moka?mokaCandidates(item):[];
      if(moka&&mokaMatches.length!==1){report.push({...item,value:undefined,status:"skipped",reason:"字段定位不唯一或未识别，需人工核对"});return {ok:true,index};}
      const bgiMatches=bgi?bgiCandidates(item):[];
      if(bgi&&item.label!=="性别"&&bgiMatches.length<=item.row){report.push({...item,value:undefined,status:"skipped",reason:"BGI 字段定位不唯一或未识别，需人工核对"});return {ok:true,index};}
      let el=bgi?bgiMatches[item.row]:moka?mokaMatches[0]:item.section==="项目经历"?projectField(item):candidates(item)[item.row];
      if(!el&&item.section==="个人信息"&&item.label==="性别"){
        const ok=fillGender(item.value);
        report.push({section:item.section,row:item.row,label:item.label,status:ok==="existing"?"existing":ok?"filled":"skipped",reason:ok==="existing"?"保留已有内容":ok?"已选择，请核对":"未识别到对应控件"});
        return {ok:true,index};
      }
      if(!el){report.push({...item,value:undefined,status:"skipped",reason:"未识别到对应控件"});return {ok:true,index};}
      if(moka&&((item.label==="邮箱"&&el.type!=="email")||(item.label==="手机号码"&&!["tel","text"].includes(el.type))||(item.kind==="choice")||(item.kind==="date")||item.row>0)){
        report.push({...item,value:undefined,status:"skipped",reason:"该控件或重复经历尚未通过实站核对"});return {ok:true,index};
      }
      cleanupLegacyAward(activeProfile,item,el);
      cleanupLegacyBgiProject(activeProfile,item,el);
      if(item.kind==="missing"){report.push({...item,status:"skipped",reason:item.reason});return {ok:true,index};}
      const current=String(el.value||"").trim();
      if(current&&!/^(请选择|请选择.*|Select.*)$/.test(current)){report.push({...item,value:undefined,status:"existing",reason:"保留已有内容"});return {ok:true,index};}
      let ok=false;let reason="控件未接受填写，请核对";
      if(item.kind==="choice"){
        const isPlace=location.hostname==="wuxiapptec.zhiye.com"&&["民族","籍贯","学校所在地"].includes(item.label);
        ok=isPlace?await chooseSearchPopup(el,item.value,item.label):await choose(el,item.value);
        if(isPlace&&!ok)reason=placeFailure||reason;
      }
      else if(item.kind==="date"){
        if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(item.value))reason="档案缺少完整年月";
        else if(el.type==="date")reason="网站要求具体日期，档案仅有年月";
        else if(["wuxiapptec.zhiye.com","genomics.zhiye.com"].includes(location.hostname)){
          ok=await chooseMonth(el,item.value);
          if(!ok)reason="年月选择器未确认该值，请手动核对";
        } else if(el.readOnly)reason="该日期控件需要专用适配";
        else ok=write(el,item.value);
      } else if(!el.readOnly)ok=write(el,item.value);
      report.push({section:item.section,row:item.row,label:item.label,status:ok?"filled":"skipped",reason:ok?"已填入，请核对":reason});
      return {ok:true,index};
    }catch(error){
      report.push({...item,value:undefined,status:"skipped",reason:`本字段处理失败：${error.message||"未知错误"}`});
      return {ok:true,index};
    }
  }
  const listener=(message,_sender,respond)=>{
    if(message?.type==="JOBSEEKING_AUTO_STATUS"){respond({ok:true,running,results:report});return;}
    if(message?.type==="JOBSEEKING_AUTO_START"){
      if(running){respond({ok:false,error:"正在填写"});return;}
      if(!["wuxiapptec.zhiye.com","app.mokahr.com","genomics.zhiye.com"].includes(location.hostname)){respond({ok:false,error:"当前网站尚未经过适配核对，仅支持已测试站点"});return;}
      if(location.hostname==="wuxiapptec.zhiye.com")dismissOpenPlacePicker();
      activeProfile=message.profile||{};activePlan=location.hostname==="app.mokahr.com"?globalThis.jobSeekingMokaPlan(activeProfile):location.hostname==="genomics.zhiye.com"?globalThis.jobSeekingBgiPlan(activeProfile):globalThis.jobSeekingPlan(activeProfile);report=[];attemptedRows.clear();running=true;
      progress(`已识别 ${activePlan.length} 项，开始逐项填写…`);
      respond({ok:true,count:activePlan.length});return;
    }
    if(message?.type==="JOBSEEKING_AUTO_STEP"){
      void processStep(message.index).then(respond).catch(error=>respond({ok:false,error:error.message||"处理失败"}));
      return true;
    }
    if(message?.type==="JOBSEEKING_AUTO_FINISH"){respond(finishReport());return;}
  };
  globalThis.jobSeekingAutomaticCommand=message=>new Promise(resolve=>{
    try { listener(message,{},resolve); }
    catch(error){running=false;resolve({ok:false,error:error.message||"填写组件执行失败"});}
  });
  globalThis.__jobSeekingAutomatic=listener;chrome.runtime.onMessage.addListener(listener);
})();
