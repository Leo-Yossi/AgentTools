import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('./slides.mjs',import.meta.url));

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check) {
  for(let i=0;i<100;i++){
    try{const value=await check();if(value)return value;}catch{}
    await pause(100);
  }
  throw new Error('Timed out waiting for live rebuild');
}
test('serve automatically rebuilds Markdown, keeps last good page on error, then recovers',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'slides-watch-'));
  const project=path.join(root,'talk');
  assert.equal(spawnSync(process.execPath,[cli,'init',project],{encoding:'utf8'}).status,0);
  const markdown=path.join(project,'slides/deck.md');
  fs.writeFileSync(markdown,'# Before\n\nFirst version');
  const free=net.createServer();await new Promise(resolve=>free.listen(0,'127.0.0.1',resolve));
  const port=free.address().port;await new Promise(resolve=>free.close(resolve));
  const child=spawn(process.execPath,[cli,'serve',project,'--port',String(port)],{stdio:['ignore','pipe','pipe']});
  let diagnostics='';child.stdout.on('data',data=>diagnostics+=data);child.stderr.on('data',data=>diagnostics+=data);
  const base=`http://127.0.0.1:${port}`;
  try{
    const initial=await until(async()=>{const response=await fetch(base+'/__slides/status');return response.ok?response.json():null;});
    assert.equal(initial.error,null);
    const first=await(await fetch(base+'/deck.html')).text();
    assert.match(first,/Before/);assert.match(first,/__slides\/watch\.js/);
    assert.match(await(await fetch(base+'/__slides/watch.js')).text(),/location\.reload/);
    fs.writeFileSync(markdown,'# After\n\nSaved change');
    const updated=await until(async()=>{
      const state=await(await fetch(base+'/__slides/status')).json();
      return state.version>initial.version?state:null;
    });
    assert.equal(updated.error,null);
    assert.match(await(await fetch(base+'/deck.html')).text(),/Saved change/);
    fs.writeFileSync(markdown,'# Too dense\n\n'+Array.from({length:12},(_,i)=>`- 这一条内容过长 ${i}，需要换到下一页`).join('\n'));
    const failed=await until(async()=>{
      const state=await(await fetch(base+'/__slides/status')).json();
      return state.error?state:null;
    });
    assert.equal(failed.version,updated.version);
    assert.match(failed.error,/页面内容过多/);
    assert.match(await(await fetch(base+'/deck.html')).text(),/Saved change/);
    fs.writeFileSync(markdown,'# Final\n\nFixed');
    const recovered=await until(async()=>{
      const state=await(await fetch(base+'/__slides/status')).json();
      return state.version>failed.version?state:null;
    });
    assert.equal(recovered.error,null);
    assert.match(await(await fetch(base+'/deck.html')).text(),/Fixed/);
  }catch(error){error.message+='\n'+diagnostics;throw error;}
  finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));fs.rmSync(root,{recursive:true,force:true});}
});
