import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { compile, escape, checkReferences } from './compiler.mjs';
import { createPreviewServer } from './server.mjs';
import { loadConfig } from './config.mjs';
import { watchProject } from './watch.mjs';

const require = createRequire(import.meta.url);
const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [command, projectArg, ...args] = process.argv.slice(2);
const help = `用法：node <skill>/scripts/slides.mjs init|build|serve <项目目录> [--port 8080] [--no-watch]\nserve 默认在保存 Markdown/素材后自动构建并刷新网页；--no-watch 只预览已构建的 dist/`;
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw new Error(`不支持符号链接：${p}`);
    return e.isDirectory() ? files(p) : [p];
  });
}
function copy(from, to) {
  if (!fs.existsSync(from)) return;
  for (const file of files(from)) {
    const dest = path.join(to,path.relative(from,file));
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(file,dest);
  }
}
function build(project) {
  const {network,keyboard}=loadConfig(project);
  const source = path.join(project, 'slides');
  if (!fs.existsSync(source)) throw new Error('缺少 slides/，请先 init 或创建项目目录');
  const inputs = fs.readdirSync(source).filter(f => f.endsWith('.md')).sort();
  if (!inputs.length) throw new Error('slides/ 中没有 Markdown 文件');
  if (inputs.includes('index.md') && inputs.length > 1) throw new Error('多课件项目请将 index.md 改名，index.html 留给目录页');
  // Validate a temporary build before replacing the last good output.
  const stage = fs.mkdtempSync(path.join(project, '.slides-build-'));
  try {
    copy(path.join(project, 'assets'), path.join(stage, 'assets'));
    copy(path.join(project, 'demos'), path.join(stage, 'demos'));
    const vendor = path.join(stage, '_slides'); fs.mkdirSync(vendor);
    fs.copyFileSync(path.join(SKILL,'assets/style.css'), path.join(vendor,'style.css'));
    fs.copyFileSync(path.join(SKILL,'assets/runtime.js'), path.join(vendor,'runtime.js'));
    fs.writeFileSync(path.join(vendor,'keyboard.js'),`window.__slidesKeyboard=${JSON.stringify(keyboard)};\n`);
    const katexRoot = path.dirname(require.resolve('katex/package.json'));
    fs.copyFileSync(path.join(katexRoot,'dist/katex.min.css'), path.join(vendor,'katex.min.css'));
    copy(path.join(katexRoot,'dist/fonts'), path.join(vendor,'fonts'));
    fs.copyFileSync(path.join(path.dirname(require.resolve('highlight.js/package.json')),'styles/github.css'),path.join(vendor,'highlight.css'));
    fs.copyFileSync(path.join(katexRoot,'LICENSE'), path.join(vendor,'KATEX-LICENSE.txt'));
    fs.copyFileSync(path.join(path.dirname(require.resolve('highlight.js/package.json')),'LICENSE'),path.join(vendor,'HIGHLIGHT-LICENSE.txt'));
    if (fs.existsSync(path.join(project,'theme.css'))) fs.copyFileSync(path.join(project,'theme.css'),path.join(vendor,'theme.css'));
    const manifest = [];
    for (const input of inputs) {
      const result = compile(fs.readFileSync(path.join(source,input),'utf8'),{network});
      const output = input.slice(0,-3) + '.html';
      fs.writeFileSync(path.join(stage,output), `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(result.title)}</title><link rel="stylesheet" href="_slides/katex.min.css"><link rel="stylesheet" href="_slides/highlight.css"><link rel="stylesheet" href="_slides/style.css">${fs.existsSync(path.join(vendor,'theme.css')) ? '<link rel="stylesheet" href="_slides/theme.css">' : ''}</head><body><main id="app">${result.body}</main><nav class="controls" aria-label="幻灯片控制"><button data-action="prev" aria-label="上一页">←</button><span id="slide-counter" aria-live="polite"></span><button data-action="next" aria-label="下一页">→</button><button data-action="notes">讲稿</button><button data-action="fullscreen">全屏</button></nav><script src="_slides/keyboard.js"></script><script src="_slides/runtime.js"></script></body></html>`);
      manifest.push({source:input, file:output, title:result.title, slides:result.count, titles:result.titles,network,keyboard,media:result.media});
    }
    if (!inputs.includes('index.md')) fs.writeFileSync(path.join(stage,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>课件目录</title><link rel="stylesheet" href="_slides/style.css"><main class="preamble"><h1>课件目录</h1><ul>${manifest.map(m=>`<li><a href="${escape(encodeURIComponent(m.file))}">${escape(m.title)}</a>（${m.slides} 页）</li>`).join('')}</ul></main></html>`);
    const remote=new Set();
    for (const f of files(stage)) if (/\.(html|css|svg)$/.test(f)) checkReferences(fs.readFileSync(f,'utf8'),f,stage,{network,remote});
    const resources=files(stage).filter(f=>!f.includes(path.sep+'_slides'+path.sep)).map(f=>({file:path.relative(stage,f).replaceAll(path.sep,'/'),bytes:fs.statSync(f).size}));
    fs.writeFileSync(path.join(stage,'media-report.json'),JSON.stringify({network,remoteResources:[...remote],resources,limits:['静态扫描不分析任意 JavaScript 网络请求','编码兼容性、字幕、远程嵌入须在目标浏览器验证']},null,2));
    fs.writeFileSync(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2));
    const dist = path.join(project,'dist');
    const backup = path.join(project,`.slides-previous-${Date.now()}`);
    // Refuse to replace an arbitrary existing directory without our ownership marker.
    if (fs.existsSync(dist) && !fs.existsSync(path.join(dist,'.html-slides-output'))) throw new Error('dist 已存在且不是本工具生成，请先改名保留');
    fs.writeFileSync(path.join(stage,'.html-slides-output'),'html-slides v1\n');
    if (fs.existsSync(dist)) fs.renameSync(dist,backup);
    try { fs.renameSync(stage,dist); } catch (error) { if (fs.existsSync(backup)) fs.renameSync(backup,dist); throw error; }
    if (fs.existsSync(backup)) fs.rmSync(backup,{recursive:true});
    for (const m of manifest) console.log(`${m.source} → ${path.join(dist,m.file)} (${m.slides} 页)`);
  } finally { if (fs.existsSync(stage)) fs.rmSync(stage,{recursive:true}); }
}
function serve(project) {
  let port=8080,watch=true;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--watch')watch=true;
    else if(args[i]==='--no-watch')watch=false;
    else if(args[i]==='--port' && args[i+1])port=Number(args[++i]);
    else throw new Error(help);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口应为 1–65535');
  const root = path.join(project,'dist');
  let status;
  if(watch){
    status={version:0,error:null};
    try{build(project);status.version++;}catch(error){status.error=error.message;console.error(error.message);}
  }
  if (!fs.existsSync(root)) throw new Error('请先 build');
  const server = createPreviewServer(root,watch?{status:()=>status}:{});
  if(watch)watchProject(project,()=>{
    try{build(project);status.version++;status.error=null;console.log('已更新网页');}
    catch(error){status.error=error.message;console.error(`编译失败：${error.message}`);}
  });
  server.on('error',e=>{ console.error(e.message); process.exitCode=1; });
  server.listen(port,'127.0.0.1',()=>console.log(`预览：http://127.0.0.1:${port}/ ${watch?'（保存后自动更新；Ctrl+C 停止）':'（Ctrl+C 停止）'}`));
}
try {
  if (!projectArg || !['init','build','serve'].includes(command)) throw new Error(help);
  const project = path.resolve(projectArg);
  if (project === SKILL || project.startsWith(SKILL + path.sep)) throw new Error('课件项目应放在 skill 目录之外');
  if (command !== 'serve' && args.length) throw new Error(help);
  if (command === 'init') {
    if (fs.existsSync(project) && fs.readdirSync(project).length) throw new Error('init 需要不存在或空的项目目录，避免覆盖已有内容');
    for (const dir of ['slides','assets','demos']) fs.mkdirSync(path.join(project,dir),{recursive:true});
    fs.copyFileSync(path.join(SKILL,'assets/starter.md'),path.join(project,'slides/deck.md'));
    fs.writeFileSync(path.join(project,'brief.md'),'# 演示需求\n\n- 受众：待讨论\n- 目标：待讨论\n- 时长与页数：待讨论\n- 视觉风格：简洁教学风格\n- 快捷键：待确认（建议空格/右方向键下一页、左方向键上一页）\n- 待确认的问题：\n');
    console.log(`已创建项目：${project}`);
  } else if (command === 'build') build(project);
  else serve(project);
} catch(e) { console.error(e.message); process.exitCode=1; }
