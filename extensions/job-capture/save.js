const status=document.getElementById("status");
const retry=document.getElementById("retry");
const params=new URLSearchParams(location.hash.slice(1));
const error=params.get("error");
if(error){
  status.textContent=error;
  retry.hidden=false;
  retry.textContent="返回岗位页重新导入";
  retry.addEventListener("click",event=>{event.preventDefault();history.back();});
}else{
  status.textContent="正在写入当前工作台，通常只需要 1–2 秒…";
}
