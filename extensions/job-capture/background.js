importScripts("workspace.js");
chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  if(message?.type!=="open-reviewed-capture")return;
  (async()=>{
    const origin=await readWorkspaceOrigin();
    const payload=encodeURIComponent(JSON.stringify({capture:message.capture,targetId:message.targetId}));
    chrome.tabs.create({url:`${origin}/capture-import#${payload}`});
    sendResponse?.({ok:true,opened:true,origin});
  })().catch(error=>sendResponse?.({ok:false,error:error?.message||"无法打开工作台。"}));
  return true;
});
