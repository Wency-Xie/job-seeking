import { readLocalProfile } from "./profile-source.js";
const status=document.querySelector("#status"),fill=document.querySelector("#fill"),identity=document.querySelector("#identity");
let activeTab;
let connectionError="";
const retry=document.querySelector("#retry");
const bounded=(promise,ms=4000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error("连接超时，请重试")),ms))]);
const runKey="jobSeekingOS.applicationSync.lastRun.v1";
const show=text=>status.textContent=text;
const saveRun=text=>localStorage.setItem(runKey,`${new Date().toLocaleTimeString("zh-CN")} ${text}`);
async function send(tabId,message){
  const results=await chrome.scripting.executeScript({target:{tabId},func:async message=>{
    if(typeof globalThis.jobSeekingAutomaticCommand!=="function")return {ok:false,error:"填写组件未加载，请重新打开助手"};
    return await globalThis.jobSeekingAutomaticCommand(message);
  },args:[message]});
  const result=results?.find(entry=>entry.frameId===0)?.result||results?.[0]?.result;
  if(!result)throw Error("招聘页面未返回执行结果，请保持当前页面打开后重试");
  return result;
}
async function readProfile(includeIdentity){
  try{return await readLocalProfile(includeIdentity);}
  catch(error){connectionError=error.message;return null;}
}

async function init(){
  fill.disabled=true;retry.disabled=true;show("正在连接已确认档案…");
  document.querySelector("#version").textContent=`v${chrome.runtime.getManifest().version}`;
  try{
    const [tab]=await bounded(chrome.tabs.query({active:true,currentWindow:true}));activeTab=tab;
    const hostname=tab?.url?new URL(tab.url).hostname:"";
    document.querySelector("#destination").textContent=hostname||"未识别";
    if(!tab?.id||!/^https:\/\//.test(tab.url||"")){show("请在招聘网站表单中打开助手。");return;}
    if(!["wuxiapptec.zhiye.com","app.mokahr.com","genomics.zhiye.com"].includes(hostname)){show("当前网站尚未经过适配核对。请先记录表单结构，避免错填。");return;}
    const source=await bounded(readProfile(false),12000);
    if(!source){show(connectionError||"无法连接档案，请重新连接。");return;}
    show(`已直连本机确认档案 · ${new Date(source.confirmedAt).toLocaleString("zh-CN")}。${hostname==="app.mokahr.com"?"Moka 为候选适配，可填写部分文本字段；国家／地区、籍贯、年月选择和教育背景仍需手动补充。":hostname==="genomics.zhiye.com"?"华大 BGI 为候选适配，尝试个人信息及多条经历的精确字段，结果需逐项核对。":"可以开始填写。"}`);fill.disabled=false;
  }catch(error){show(`连接失败：${error.message}。请确认本地工作台已启动，然后重新连接。`);}
  finally{retry.disabled=false;}
}
retry.addEventListener("click",init);
fill.addEventListener("click",async()=>{saveRun("已点击自动填写");fill.disabled=true;try{const source=await bounded(readProfile(identity.checked),12000);if(!source)throw Error(connectionError||"档案无法读取");await chrome.scripting.executeScript({target:{tabId:activeTab.id},files:["autofill-plan.js","automatic-adapter.js"]});show("正在逐项填写，请保持此面板和招聘页面打开。进度显示在页面右下角。");const started=await bounded(send(activeTab.id,{type:"JOBSEEKING_AUTO_START",profile:source.profile}),12000);if(!started?.ok)throw Error(started?.error||"页面未响应");for(let index=0;index<started.count;index++){const step=await bounded(send(activeTab.id,{type:"JOBSEEKING_AUTO_STEP",index}),45000);if(!step?.ok)throw Error(`第 ${index+1} 项：${step?.error||"页面未响应"}`);}const result=await bounded(send(activeTab.id,{type:"JOBSEEKING_AUTO_FINISH"}),12000);if(!result?.ok)throw Error(result?.error||"汇总失败");saveRun("已完成填写");show("填写已结束。请在招聘页面右下角核对结果和待补字段。");fill.disabled=false;}catch(error){saveRun(`填写中断：${error.message}`);show(`填写中断：${error.message}。已填字段保留；请查看页面并重试剩余字段。`);fill.disabled=false;}});
init().catch(()=>show("连接失败，请重新打开助手。"));
