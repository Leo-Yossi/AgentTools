import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compile,checkReferences} from './compiler.mjs';
import {createPreviewServer} from './server.mjs';
const source=m=>'# Media\n\n```media\n'+JSON.stringify(m)+'\n```';
test('media renders real controls, subtitles and clip settings',()=>{
  const result=compile(source({type:'video',src:'assets/movie.mp4',title:'"sample"',start:1,end:3,autoplay:true,muted:true,tracks:[{src:'assets/zh.vtt',lang:'zh',default:true}]}));
  assert.match(result.body,/<video controls/);assert.match(result.body,/data-autoplay="true"/);
  assert.match(result.body,/<track/);assert.match(result.body,/data-end="3"/);assert.equal(result.media.length,1);
  assert.throws(()=>compile(source({type:'video',src:'x',start:5,end:3})),/end/);
  assert.throws(()=>compile(source({type:'web',src:'javascript:alert(1)'})),/HTTP/);
});
test('remote media has an offline fallback and explicit online activation',()=>{
  const spec={type:'web',src:'https://example.com/embed',fallback:'Offline summary'};
  const off=compile(source(spec));assert.doesNotMatch(off.body,/<iframe/);assert.match(off.body,/Offline summary/);
  const on=compile(source(spec),{network:'online'});assert.match(on.body,/data-online="true"/);assert.match(on.body,/data-load-frame/);assert.doesNotMatch(on.body,/<iframe[^>]*\ssrc=/);
  assert.throws(()=>compile(source({type:'web',src:spec.src})),/fallback/);
  assert.throws(()=>compile(source({...spec,typo:1})),/未知/);
});
test('legacy embeds are managed and hidden media cannot autoplay at parse time',()=>{
  const result=compile('# A\n\n<video src="assets/v.mp4" autoplay></video>\n\n<iframe src="demos/demo/"></iframe>');
  assert.doesNotMatch(result.body,/\sautoplay(?:[=>\s])/);assert.match(result.body,/data-src="demos\/demo\/index.html"/);
});
test('object, subtitle and deferred resource references are validated',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slides-refs-'));
  try {
    for(const html of ['<object data="missing.pdf"></object>','<track src="missing.vtt">','<iframe data-src="missing.html"></iframe>']) assert.throws(()=>checkReferences(html,path.join(dir,'deck.html'),dir),/找不到/);
    assert.throws(()=>checkReferences('<iframe data-src="https://example.com"></iframe>',path.join(dir,'deck.html'),dir),/离线/);
    const remote=new Set();checkReferences('<iframe data-src="https://example.com"></iframe>',path.join(dir,'deck.html'),dir,{network:'online',remote});assert.equal(remote.size,1);
  } finally {fs.rmSync(dir,{recursive:true});}
});
test('preview streams media ranges, serves captions and handles HEAD and invalid ranges',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'slides-server-'));
  fs.writeFileSync(path.join(dir,'movie.mp4'),Buffer.from('0123456789'));fs.writeFileSync(path.join(dir,'zh.vtt'),'WEBVTT\n');
  const server=createPreviewServer(dir);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const range=await fetch(base+'/movie.mp4',{headers:{Range:'bytes=2-5'}});
    assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),'bytes 2-5/10');assert.equal(await range.text(),'2345');assert.equal(range.headers.get('content-type'),'video/mp4');
    const suffix=await fetch(base+'/movie.mp4',{headers:{Range:'bytes=-3'}});assert.equal(await suffix.text(),'789');
    assert.equal((await fetch(base+'/movie.mp4',{headers:{Range:'bytes=100-'}})).status,416);
    const head=await fetch(base+'/movie.mp4',{method:'HEAD'});assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
    assert.match((await fetch(base+'/zh.vtt')).headers.get('content-type'),/text\/vtt/);
    assert.equal((await fetch(base+'/%')).status,400);
    assert.equal((await fetch(base+'/%2e%2e%5csecret')).status,403);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true});}
});
