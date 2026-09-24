import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compile, checkReferences } from './compiler.mjs';
const cli = fileURLToPath(new URL('./slides.mjs', import.meta.url));

test('plain Markdown and explicit page breaks preserve nested headings and fenced code',()=>{
  const r=compile('# Cover\n\n---\n\n# Body\n\n<div class="note">\n<h1>Nested heading</h1>\n</div>\n\n```html\n<h1>code</h1>\n```');
  assert.equal(r.count,2); assert.deepEqual(r.titles,['Cover','Body']);
  assert.match(r.body,/Nested heading/); assert.match(r.body,/&lt;/);
});
test('legacy wrappers and code cards do not create extra pages or nested links',()=>{
  const r=compile('<div class="slideshow"><div>\n\n# A\n\n<div class="code-card" path="demo"><div><h1><a href="demos/demo/">Card</a></h1></div></div>\n\n# B\n\nend\n\n</div></div>');
  assert.equal(r.count,2); assert.match(r.body,/demos\/demo\/index.html/);
  assert.equal((r.body.match(/<a /g)||[]).length,1);
});
test('multiple decks merge into a single presentation and keep supplementary material',()=>{
  const r=compile('Intro\n\n<div class="slideshow">\n\n# A\n\n</div>\n\n<div class="slideshow">\n\n# B\n\n</div>');
  assert.equal(r.count,2); assert.equal((r.body.match(/class="deck"/g)||[]).length,1); assert.match(r.body,/<details/);
});
test('math preserves TeX escapes and notes render Markdown',()=>{
  const r=compile('# Math\n\n$$\nF(n)=\\begin{cases}0 & n=0\\\\ 1 & n=1\\end{cases}\n$$\n\n$x_i$\n\n<div class="note">\nA **bold** note\n</div>');
  assert.match(r.body,/class="katex/); assert.match(r.body,/<strong>bold<\/strong>/);
  assert.throws(()=>compile('# X\n\n$$\nx'),/结束符/);
});
test('build remains isolated, validates resources and preserves last successful output',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'html-slides-test-'));
  const project=path.join(root,'中文 project');
  const run=(...a)=>spawnSync(process.execPath,[cli,...a],{encoding:'utf8'});
  try {
    assert.equal(run('init',project).status,0);
    assert.equal(run('build',project).status,0);
    const output=path.join(project,'dist/deck.html');
    const before=fs.readFileSync(output,'utf8');
    assert.doesNotMatch(before, /(?:src|href)="https?:/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(project,'dist/manifest.json')))[0].slides,3);
    fs.writeFileSync(path.join(project,'slides/deck.md'),'# Missing\n\n![x](assets/missing.png)');
    assert.notEqual(run('build',project).status,0);
    assert.equal(fs.readFileSync(output,'utf8'),before);
    fs.writeFileSync(path.join(project,'slides/deck.md'),'# Remote\n\n![x](https://example.com/image.png)');
    assert.notEqual(run('build',project).status,0);
    fs.writeFileSync(path.join(project,'slides/deck.md'),'# New');
    assert.equal(run('build',project).status,0);
    assert.notEqual(fs.readFileSync(output,'utf8'),before);
    assert.notEqual(run('init',project).status,0);
    assert.throws(()=>checkReferences('<img src="../secret">',path.join(root,'x.html'),root),/超出/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
