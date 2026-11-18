const form=document.querySelector("form");
const input=document.getElementById("workspace-origin");
const status=document.getElementById("status");
(async()=>{input.value=await readWorkspaceOrigin();})();
form.addEventListener("submit",async event=>{
  event.preventDefault();status.textContent="";
  try{
    const workspaceOrigin=normalizeWorkspaceOrigin(input.value);
    await chrome.storage.local.set({workspaceOrigin});
    input.value=workspaceOrigin;status.textContent="已保存。之后采集的岗位会打开这个工作台。";
  }catch(error){status.textContent=error.message||"工作台地址无效。";}
});
