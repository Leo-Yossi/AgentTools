(() => {
  const warning=document.createElement('pre');
  warning.id='build-warning';warning.hidden=true;
  warning.setAttribute('role','alert');
  Object.assign(warning.style,{position:'fixed',top:'8px',left:'8px',right:'8px',maxHeight:'30vh',overflow:'auto',zIndex:'9999',background:'#fff0f0',color:'#7a1111',border:'2px solid #c33',padding:'12px',whiteSpace:'pre-wrap'});
  document.body.append(warning);
  let version;
  async function check() {
    try {
      const response=await fetch('/__slides/status',{cache:'no-store'});
      if(!response.ok)throw new Error('预览服务不可用');
      const state=await response.json();
      warning.hidden=!state.error;
      warning.textContent=state.error?`Markdown 编译失败，当前显示上次成功的页面：\n${state.error}`:'';
      if(version===undefined)version=state.version;
      else if(state.version!==version)location.reload();
    } catch(error){warning.hidden=false;warning.textContent=`无法连接自动更新服务：${error.message}`;}
  }
  check();setInterval(check,800);
})();
