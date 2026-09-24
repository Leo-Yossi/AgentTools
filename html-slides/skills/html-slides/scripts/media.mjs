const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const remote = s => /^https?:\/\//i.test(s);
function url(value, key) {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u0020]/.test(value)) throw new Error(`media.${key} 必须是 URL 或路径（空格请写成 %20）`);
  if (/^(?:[a-z][\w+.-]*:|\/\/|\/)/i.test(value) && !remote(value)) throw new Error(`media.${key} 仅支持相对路径或 HTTP(S)`);
  return value;
}
export function renderMedia(raw, options = {}) {
  let m;
  try { m=JSON.parse(raw); } catch { throw new Error('media 代码块必须使用合法 JSON'); }
  if (!m || Array.isArray(m) || typeof m !== 'object') throw new Error('media 应为 JSON 对象');
  const allowed=['type','src','title','caption','poster','fallback','autoplay','muted','loop','start','end','tracks','fit','height','zoom'];
  for(const k of Object.keys(m)) if(!allowed.includes(k)) throw new Error(`未知 media 字段：${k}`);
  if(!['image','video','audio','web','pdf','file'].includes(m.type)) throw new Error(`不支持的 media.type：${m.type}`);
  url(m.src,'src');
  for(const k of ['title','caption','fallback']) if(m[k] !== undefined && typeof m[k] !== 'string') throw new Error(`media.${k} 应为文本`);
  for(const k of ['autoplay','muted','loop','zoom']) if(m[k] !== undefined && typeof m[k] !== 'boolean') throw new Error(`media.${k} 应为布尔值`);
  for(const k of ['start','end']) if(m[k] !== undefined && (!Number.isFinite(m[k]) || m[k]<0)) throw new Error(`media.${k} 应为非负秒数`);
  if(m.end !== undefined && m.end <= (m.start || 0)) throw new Error('media.end 必须大于 start');
  if(m.fit !== undefined && !['contain','cover'].includes(m.fit)) throw new Error('media.fit 仅支持 contain 或 cover');
  if(m.height !== undefined && (!Number.isInteger(m.height) || m.height<100 || m.height>1200)) throw new Error('media.height 应为 100–1200 像素');
  if(m.poster) { url(m.poster,'poster'); if(remote(m.poster) && options.network !== 'online') throw new Error('离线版 poster 必须是本地图片'); }
  const title=m.title || {image:'图片',video:'视频',audio:'音频',web:'交互网页',pdf:'PDF 文档',file:'附件'}[m.type];
  const online=remote(m.src);
  const link=`<a href="${esc(m.src)}" target="_blank" rel="noopener">${m.type==='file'?'打开附件':'单独打开'}：${esc(title)}</a>`;
  const poster=m.poster?`<img src="${esc(m.poster)}" alt="${esc(title)}" class="media-poster">`:'';
  const fallback=`<p class="media-fallback">${esc(m.fallback || (online?'此内容需要联网；若无法嵌入，请单独打开。':'若无法播放或显示，请单独打开文件。'))} ${link}</p>`;
  let content;
  if(online && options.network !== 'online' && m.type!=='file') {
    if(!m.poster && !m.fallback) throw new Error('离线版远程媒体必须提供本地 poster 或 fallback 说明');
    content=poster+fallback;
  } else if(m.type==='image') {
    content=`<img src="${esc(m.src)}" alt="${esc(title)}" style="object-fit:${m.fit||'contain'}" ${m.zoom===false?'':'data-zoom tabindex="0" role="button" aria-label="放大图片"'}>${m.caption?'':`<figcaption>${esc(title)}</figcaption>`}`;
  } else if(['video','audio'].includes(m.type)) {
    const tracks=m.tracks || [];
    if(!Array.isArray(tracks)) throw new Error('media.tracks 应为数组');
    const trackHtml=tracks.map(t=>{
      if(!t || typeof t.lang!=='string' || !t.lang.trim() || (t.default !== undefined && typeof t.default!=='boolean')) throw new Error('字幕需要 src、lang，可选 default 布尔值');
      return `<track kind="subtitles" src="${esc(url(t.src,'tracks.src'))}" srclang="${esc(t.lang)}" label="${esc(t.label||t.lang)}"${t.default?' default':''}>`;
    }).join('');
    content=`<${m.type} controls preload="metadata" ${m.type==='video'?'playsinline':''} src="${esc(m.src)}"${m.poster&&m.type==='video'?` poster="${esc(m.poster)}"`:''}${m.muted?' muted':''}${m.autoplay?' data-autoplay="true"':''}${m.loop?' loop':''}${m.start!==undefined?` data-start="${m.start}"`:''}${m.end!==undefined?` data-end="${m.end}"`:''}>${trackHtml}</${m.type}><p class="media-status" role="status"></p>${fallback}`;
  } else if(['web','pdf'].includes(m.type)) {
    content=`${poster}<iframe data-src="${esc(m.src)}" ${online?'data-online="true"':''} title="${esc(title)}" height="${m.height||440}" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>${online?'<button type="button" data-load-frame>加载在线内容</button>':''}${fallback}`;
  } else content=fallback;
  options.media?.push({type:m.type,src:m.src,title,remote:online,mode:online&&options.network!=='online'?'fallback':'embedded'});
  return `<figure class="media media-${m.type}">${content}${m.caption?`<figcaption>${esc(m.caption)}</figcaption>`:''}</figure>\n`;
}
