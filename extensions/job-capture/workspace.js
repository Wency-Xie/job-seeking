const DEFAULT_WORKSPACE_ORIGIN="http://127.0.0.1:4173";
function normalizeWorkspaceOrigin(value){
  const url=new URL(String(value||"").trim());
  const localHttp=url.protocol==="http:"&&["127.0.0.1","localhost"].includes(url.hostname);
  if(url.protocol!=="https:"&&!localHttp)throw new Error("工作台须使用 HTTPS；本机 127.0.0.1 或 localhost 可使用 HTTP。");
  if(url.username||url.password)throw new Error("工作台地址不能包含账号或密码。");
  return url.origin;
}
async function readWorkspaceOrigin(){
  const saved=await chrome.storage.local.get("workspaceOrigin");
  try{return normalizeWorkspaceOrigin(saved.workspaceOrigin||DEFAULT_WORKSPACE_ORIGIN);}
  catch{return DEFAULT_WORKSPACE_ORIGIN;}
}
