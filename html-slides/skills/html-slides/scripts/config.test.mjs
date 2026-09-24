import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadConfig} from './config.mjs';

test('keyboard defaults, custom keys, disable option and conflicts',()=>{
  const project=fs.mkdtempSync(path.join(os.tmpdir(),'slides-keys-'));
  const file=path.join(project,'slides.config.json');
  try{
    assert.deepEqual(loadConfig(project).keyboard.next,['Space','ArrowRight']);
    assert.deepEqual(loadConfig(project).keyboard.prev,['ArrowLeft']);
    assert.deepEqual(loadConfig(project).keyboard.first,[]);
    fs.writeFileSync(file,JSON.stringify({keyboard:false}));
    assert.equal(loadConfig(project).keyboard,false);
    fs.writeFileSync(file,JSON.stringify({keyboard:{next:['Space','ArrowDown'],prev:['ArrowLeft'],notes:['KeyN']}}));
    assert.deepEqual(loadConfig(project).keyboard.next,['Space','ArrowDown']);
    assert.deepEqual(loadConfig(project).keyboard.notes,['KeyN']);
    fs.writeFileSync(file,JSON.stringify({keyboard:{prev:['Space']}}));
    assert.throws(()=>loadConfig(project),/重复分配/);
    fs.writeFileSync(file,JSON.stringify({keyboard:{next:['Escape']}}));
    assert.throws(()=>loadConfig(project),/有效按键/);
  }finally{fs.rmSync(project,{recursive:true,force:true});}
});
