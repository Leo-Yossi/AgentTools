import fs from 'node:fs';
import path from 'node:path';

export function watchProject(project, rebuild) {
  const watchers=new Map();
  let timer;
  const folders=()=>{
    const found=new Set([project]);
    function visit(dir) {
      if(!fs.existsSync(dir))return;
      found.add(dir);
      for(const item of fs.readdirSync(dir,{withFileTypes:true}))
        if(item.isDirectory() && !item.isSymbolicLink())visit(path.join(dir,item.name));
    }
    for(const name of ['slides','assets','demos'])visit(path.join(project,name));
    return found;
  };
  const synchronize=()=>{
    const dirs=folders();
    for(const [dir,watcher] of watchers)if(!dirs.has(dir)){watcher.close();watchers.delete(dir);}
    for(const dir of dirs)if(!watchers.has(dir)){
      const watcher=fs.watch(dir,(_event,filename)=>{
        const name=filename?.toString()||'';
        if(dir===project && name && !['slides','assets','demos','theme.css','slides.config.json'].includes(name))return;
        clearTimeout(timer);
        timer=setTimeout(()=>{try{synchronize();rebuild();}catch(error){console.error(error.message);}},180);
      });
      watcher.on('error',error=>console.error(`监听失败：${error.message}`));
      watchers.set(dir,watcher);
    }
  };
  synchronize();
  return ()=>{clearTimeout(timer);for(const watcher of watchers.values())watcher.close();watchers.clear();};
}
