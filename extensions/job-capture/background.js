const allowedOrigins=new Set(["http://127.0.0.1:4173","http://127.0.0.1:4174"]);
chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  if(!["find-capture-matches","save-reviewed-capture"].includes(message?.type))return;
  (async()=>{
    const origin=allowedOrigins.has(message.workspaceOrigin)?message.workspaceOrigin:"http://127.0.0.1:4174";
    const api=`${origin}/api/jobs/capture`;
    const response=await fetch(api,{method:message.type==="find-capture-matches"?"POST":"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(message.type==="find-capture-matches"?message.capture:{capture:message.capture,targetId:message.targetId,confirmed:true})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"岗位保存失败");
    sendResponse({ok:true,...data});
    if(message.type==="save-reviewed-capture"){
      const jobId=data.job?.id;
      const url=new URL(`${origin}/candidates?view=rank`);
      if(jobId)url.searchParams.set("newJob",jobId);
      chrome.tabs.create({url:url.toString()});
    }
  })().catch(error=>sendResponse({ok:false,error:/failed to fetch|load failed|network|fetch failed/i.test(error.message||"")?"无法连接所选 JobSeekingOS 工作台。请确认 4174/4173 服务已启动，再重新打开采集面板；当前填写内容仍保留。":error.message||"无法连接 JobSeekingOS，请确认本地服务正在运行。"}));
  return true;
});
