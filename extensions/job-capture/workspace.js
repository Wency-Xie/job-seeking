const DEFAULT_WORKSPACE_ORIGIN="http://127.0.0.1:4173";
function getExtensionStorageLocal(){
  const browserStorage=globalThis.browser?.storage?.local;
  if(browserStorage)return browserStorage;
  const chromeStorage=globalThis.chrome?.storage?.local;
  if(chromeStorage)return chromeStorage;
  throw new Error("当前浏览器未提供扩展本地存储。请在扩展管理页重新加载 v0.5.4；单纯刷新招聘页面无效。");
}
async function readExtensionStorage(key){
  return await getExtensionStorageLocal().get(key);
}
async function writeExtensionStorage(values){
  await getExtensionStorageLocal().set(values);
}
function normalizeWorkspaceOrigin(value){
  const url=new URL(String(value||"").trim());
  const localHttp=url.protocol==="http:"&&["127.0.0.1","localhost"].includes(url.hostname);
  if(url.protocol!=="https:"&&!localHttp)throw new Error("工作台须使用 HTTPS；本机 127.0.0.1 或 localhost 可使用 HTTP。");
  if(url.username||url.password)throw new Error("工作台地址不能包含账号或密码。");
  return url.origin;
}
async function readWorkspaceOrigin(){
  const saved=await readExtensionStorage("workspaceOrigin");
  try{return normalizeWorkspaceOrigin(saved.workspaceOrigin||DEFAULT_WORKSPACE_ORIGIN);}
  catch{return DEFAULT_WORKSPACE_ORIGIN;}
}
async function writeWorkspaceOrigin(value){
  const workspaceOrigin=normalizeWorkspaceOrigin(value);
  await writeExtensionStorage({workspaceOrigin});
  return workspaceOrigin;
}
