const form=document.querySelector("form");
const input=document.getElementById("workspace-origin");
const status=document.getElementById("status");
(async()=>{
  try{input.value=await readWorkspaceOrigin();}
  catch(error){status.textContent=`无法读取工作台设置：${error.message||"扩展存储不可用。"}`;}
})();
form.addEventListener("submit",async event=>{
  event.preventDefault();status.textContent="";
  try{
    const workspaceOrigin=await writeWorkspaceOrigin(input.value);
    input.value=workspaceOrigin;status.textContent="已保存。之后采集的岗位会打开这个工作台。";
  }catch(error){status.textContent=error.message||"工作台地址无效。";}
});
