const allowedOrigins=new Set(["http://127.0.0.1:4173","http://127.0.0.1:4174"]);
async function requestCapture(message,origin){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(`${origin}/api/jobs/capture`,{method:message.type==="find-capture-matches"?"POST":"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(message.type==="find-capture-matches"?message.capture:{capture:message.capture,targetId:message.targetId,confirmed:true}),signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"岗位保存失败");
    return data;
  }finally{clearTimeout(timeout);}
}
function readableError(error){
  if(error?.name==="AbortError")return "连接 4173 超时，请确认工作台已启动。";
  if(/failed to fetch|load failed|network|fetch failed/i.test(error?.message||""))return "无法连接 4173，请先启动 JobSeekingOS。";
  return error?.message||"无法保存岗位。";
}
chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  if(message?.type==="open-reviewed-capture"){
    const origin=allowedOrigins.has(message.workspaceOrigin)?message.workspaceOrigin:"http://127.0.0.1:4173";
    const payload=encodeURIComponent(JSON.stringify({capture:message.capture,targetId:message.targetId,workspaceOrigin:origin}));
    chrome.tabs.create({url:`${origin}/capture-import#${payload}`});
    sendResponse?.({ok:true,opened:true});
    return;
  }
  if(!["find-capture-matches","save-reviewed-capture"].includes(message?.type))return;
  (async()=>{
    const origin=allowedOrigins.has(message.workspaceOrigin)?message.workspaceOrigin:"http://127.0.0.1:4173";
    const data=await requestCapture(message,origin);
    if(message.type==="save-reviewed-capture"){
      const jobId=data.job?.id;
      const url=new URL(`${origin}/candidates?view=rank`);
      if(jobId)url.searchParams.set("newJob",jobId);
      url.hash="candidate-rank-start";
      chrome.tabs.create({url:url.toString()});
    }
    sendResponse?.({ok:true,...data});
  })().catch(error=>sendResponse?.({ok:false,error:readableError(error)}));
  return true;
});
