import fs from 'node:fs';
import path from 'node:path';
import MarkdownIt from 'markdown-it';
import { parseFragment, serializeOuter } from 'parse5';
import katex from 'katex';
import hljs from 'highlight.js';
import { renderMedia } from './media.mjs';
import { checkSlideDensity } from './layout.mjs';

export const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr = (n, key) => n.attrs?.find(a => a.name === key)?.value;
const hasClass = (n, key) => (attr(n, 'class') || '').split(/\s+/).includes(key);
const meaningful = n => n.nodeName !== '#comment' && (n.nodeName !== '#text' || n.value.trim());
const textOf = n => n.value || (n.childNodes || []).map(textOf).join('');
const htmlOf = nodes => nodes.map(serializeOuter).join('');
function setAttr(n, key, value) {
  const a = n.attrs.find(a => a.name === key);
  if (a) a.value = value; else n.attrs.push({ name: key, value });
}
function walk(n, fn) { fn(n); for (const c of n.childNodes || []) walk(c, fn); }

function markdown(options) {
  const md = new MarkdownIt({ html: true, linkify: true, highlight(code, lang) {
    return lang && hljs.getLanguage(lang) ? hljs.highlight(code, {language: lang}).value : '';
  }});
  const fence=md.renderer.rules.fence;
  md.renderer.rules.fence=(tokens,i,...args)=>tokens[i].info.trim()==='media'
    ? renderMedia(tokens[i].content,options) : fence(tokens,i,...args);
  // Parse TeX before Markdown can consume backslashes, underscores or double backslashes.
  md.inline.ruler.before('escape', 'math', (state, silent) => {
    const start = state.pos;
    const pairs = [['$$','$$',true], ['$','$',false], ['\\(','\\)',false], ['\\[','\\]',true]];
    for (const [open, close, display] of pairs) {
      if (!state.src.startsWith(open, start)) continue;
      if (open === '$' && /\s/.test(state.src[start + 1] || ' ')) return false;
      let end = state.src.indexOf(close, start + open.length);
      while (end >= 0 && state.src[end - 1] === '\\') end = state.src.indexOf(close, end + close.length);
      if (end < 0 || end === start + open.length) return false;
      if (!silent) {
        const token = state.push('math', '', 0);
        token.content = state.src.slice(start + open.length, end);
        token.meta = { display };
      }
      state.pos = end + close.length;
      return true;
    }
    return false;
  });
  md.block.ruler.before('fence', 'math_block', (state, start, end, silent) => {
    const line = state.src.slice(state.bMarks[start] + state.tShift[start], state.eMarks[start]).trim();
    if (line !== '$$' && line !== '\\[') return false;
    const close = line === '$$' ? '$$' : '\\]';
    let stop = start + 1;
    while (stop < end && state.src.slice(state.bMarks[stop], state.eMarks[stop]).trim() !== close) stop++;
    if (stop === end) throw new Error(`第 ${start + 1} 行公式缺少结束符 ${close}`);
    if (silent) return true;
    const token = state.push('math', '', 0);
    token.content = state.getLines(start + 1, stop, state.blkIndent, false);
    token.meta = { display: true };
    state.line = stop + 1;
    return true;
  });
  md.renderer.rules.math = (tokens, i) => katex.renderToString(tokens[i].content, {
    displayMode: tokens[i].meta.display, throwOnError: true, strict: 'ignore', trust: false
  });
  return md;
}

function unwrap(nodes) {
  const main = nodes.filter(meaningful);
  return main.length === 1 && main[0].tagName === 'div' && !main[0].attrs.length
    ? main[0].childNodes : nodes;
}

function split(nodes) {
  nodes = unwrap(nodes);
  const explicit = nodes.some(n => n.tagName === 'hr');
  const pages = []; let page = [];
  const flush = () => { if (page.some(meaningful)) pages.push(page); page = []; };
  for (const n of nodes) {
    if (explicit && n.tagName === 'hr') { flush(); continue; }
    if (!explicit && n.tagName === 'h1') flush();
    page.push(n);
  }
  flush();
  return pages;
}

export function compile(source, options = {}) {
  const media=[];
  const md = markdown({...options,media});
  const root = parseFragment(md.render(source));
  // markdown-it intentionally treats raw HTML blocks as raw. Render Markdown-only
  // text inside supported components (e.g. a note without surrounding blank lines).
  walk(root, n => {
    if (!hasClass(n, 'note') && !hasClass(n, 'code-card')) return;
    if (n.childNodes.every(c => c.nodeName === '#text')) n.childNodes = parseFragment(md.render(textOf(n))).childNodes;
  });
  const decks = []; const preamble = [];
  for (const n of root.childNodes) {
    if (hasClass(n, 'slideshow')) decks.push(...split(n.childNodes));
    else preamble.push(n);
  }
  const pages = decks.length ? decks : split(root.childNodes);
  if (!pages.length) throw new Error('Markdown 中没有可展示的内容');
  walk(root, n => {
    if (!hasClass(n, 'code-card')) return;
    const demo = attr(n, 'path') || '';
    if (!/^[\w-]+(?:\/[\w-]+)*$/.test(demo)) throw new Error(`无效的 Demo 路径：${demo}`);
    // Use a link only when the authored card does not already contain one.
    let linked = false;
    walk(n, c => { if (c.tagName === 'a') linked = true; });
    if (!linked) {
      n.tagName = n.nodeName = 'a';
      setAttr(n, 'href', `demos/${demo}/index.html`);
    }
    walk(n, c => { if (c.tagName === 'a') { setAttr(c, 'target', '_blank'); setAttr(c, 'rel', 'noopener'); } });
  });
  // Explicit index.html makes demos work with file:// as well as HTTP.
  walk(root, n => {
    if (['audio','video'].includes(n.tagName) && attr(n,'autoplay') !== undefined) {
      n.attrs=n.attrs.filter(a=>a.name!=='autoplay'); setAttr(n,'data-autoplay','true');
    }
    if (n.tagName === 'iframe' && attr(n,'src')) {
      const src=attr(n,'src'); setAttr(n,'data-src',src); n.attrs=n.attrs.filter(a=>a.name!=='src');
      if (/^https?:/i.test(src)) setAttr(n,'data-online','true');
    }
    for (const key of ['src','href','data-src']) {
      const value = attr(n, key);
      if (value && /^demos\/[^?#]*\/(?:[?#].*)?$/.test(value)) {
        setAttr(n, key, value.replace(/\/(?=([?#].*)?$)/, '/index.html'));
      }
    }
  });
  const titles = pages.map((p, i) => textOf(p.find(n => /^h[1-3]$/.test(n.tagName)) || {value:`第 ${i + 1} 页`}));
  checkSlideDensity(pages, titles);
  return {
    title: titles[0], titles, count: pages.length, media,
    body: `<div class="deck"><div class="slides">${pages.map((p,i) => `<section class="slide${i === 0 ? ' active' : ''}" id="slide-${i+1}" aria-label="${escape(titles[i])}">${htmlOf(p)}</section>`).join('\n')}</div></div>` +
      (decks.length && preamble.some(meaningful) ? `<details class="preamble"><summary>课件补充资料</summary>${htmlOf(preamble)}</details>` : '')
  };
}

export function localReferences(html) {
  const refs = [];
  walk(parseFragment(html), n => {
    for (const a of n.attrs || []) {
      if (['src','href','poster','data-src','xlink:href'].includes(a.name) || (n.tagName==='object' && a.name==='data')) {
        if (!(n.tagName === 'a' && a.name === 'href' && /^(https?:|mailto:|tel:|#)/i.test(a.value))) refs.push(a.value);
      }
      if(a.name==='srcdoc') refs.push(...localReferences(a.value));
      if (a.name === 'srcset') throw new Error('离线检查暂不支持 srcset，请使用本地 src 图片');
      if (a.name === 'style') refs.push(...cssReferences(a.value));
    }
    if (n.tagName === 'style') refs.push(...cssReferences(textOf(n)));
  });
  return refs;
}
export function cssReferences(css) {
  return [...css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)].map(m => m[1] || m[2]);
}
export function checkReferences(html, file, root, options = {}) {
  const refs = path.extname(file) === '.css' ? cssReferences(html) : localReferences(html);
  for (const ref of refs) {
    if (/^(data:|#)/i.test(ref)) continue;
    if (options.network === 'online' && /^https?:\/\//i.test(ref)) { options.remote?.add(ref); continue; }
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(ref)) throw new Error(`${file}: 离线资源不能引用 ${ref}`);
    const target = path.resolve(path.dirname(file), decodeURIComponent(ref.split(/[?#]/)[0]));
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative) || ref.startsWith('/')) throw new Error(`${file}: 资源路径超出输出目录：${ref}`);
    if (!fs.existsSync(target)) throw new Error(`${file}: 找不到资源 ${ref}`);
  }
}
