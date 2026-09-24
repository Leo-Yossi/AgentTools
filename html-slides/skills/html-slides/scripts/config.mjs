import fs from 'node:fs';
import path from 'node:path';

const ACTIONS=['next','prev','first','last','notes','fullscreen'];
const DEFAULT_KEYS={
  next:['Space','ArrowRight'],
  prev:['ArrowLeft'],
  first:[],last:[],notes:[],fullscreen:[]
};
const VALID_KEY=/^(Arrow(?:Up|Down|Left|Right)|Page(?:Up|Down)|Home|End|Space|Enter|Key[A-Z])$/;

export function loadConfig(project) {
  const file=path.join(project,'slides.config.json');
  const raw=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
  if(!raw || Array.isArray(raw) || typeof raw!=='object' || Object.keys(raw).some(k=>!['network','keyboard'].includes(k)))
    throw new Error('slides.config.json 仅支持 network 和 keyboard');
  const network=raw.network ?? 'offline';
  if(!['offline','online'].includes(network))throw new Error('network 仅支持 offline 或 online');
  let keyboard;
  if(raw.keyboard===false)keyboard=false;
  else {
    if(raw.keyboard !== undefined && (!raw.keyboard || Array.isArray(raw.keyboard) || typeof raw.keyboard!=='object'))
      throw new Error('keyboard 应为 false 或按键设置对象');
    keyboard={...DEFAULT_KEYS,...(raw.keyboard||{})};
    if(Object.keys(keyboard).some(k=>!ACTIONS.includes(k)))throw new Error('keyboard 含未知操作');
    const used=new Set();
    for(const action of ACTIONS){
      const keys=keyboard[action];
      if(!Array.isArray(keys)||keys.some(k=>typeof k!=='string'||!VALID_KEY.test(k)))
        throw new Error(`keyboard.${action} 应为有效按键数组（如 ArrowRight、Space、KeyN）`);
      for(const key of keys){if(used.has(key))throw new Error(`按键 ${key} 被重复分配`);used.add(key);}
    }
  }
  return {network,keyboard};
}
