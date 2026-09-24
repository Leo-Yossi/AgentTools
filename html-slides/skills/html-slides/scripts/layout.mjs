// Conservative budget for readable 16:9 slides. It catches dense content
// before a browser needs to scroll or hide it.
const children = n => n.childNodes || [];
const hasClass = (n, name) => (n.attrs?.find(a => a.name === 'class')?.value || '').split(/\s+/).includes(name);
function visibleText(n) {
  if (hasClass(n, 'speaker-notes') || hasClass(n, 'katex') || ['script','style'].includes(n.tagName)) return '';
  return n.value || children(n).map(visibleText).join('');
}
const width = value => [...value.trim()].reduce((sum, char) => sum + (/[^\x00-\xff]/.test(char) ? 1 : .55), 0);
const lines = n => Math.max(1, Math.ceil(width(visibleText(n)) / 43));
function cost(n) {
  if (hasClass(n, 'speaker-notes')) return 0;
  if (['media-video','media-web','media-pdf'].some(name => hasClass(n,name))) return 8;
  if (hasClass(n,'media-image')) return 7;
  if (hasClass(n,'media-audio')) return 3;
  if (hasClass(n,'media-file')) return 2;
  if (hasClass(n,'code-card')) return 4;
  if (hasClass(n,'note')) return 2 + lines(n);
  if (hasClass(n,'katex-display')) return 3;
  if (n.tagName === 'h1') return 0;
  if (['h2','h3'].includes(n.tagName)) return 2;
  if (n.tagName === 'pre') return 1 + Math.ceil(visibleText(n).split('\n').length * .7);
  if (n.tagName === 'table') {
    let rows = 0;
    const visit = node => { if (node.tagName === 'tr') rows++; else children(node).forEach(visit); };
    visit(n);
    return 2 + rows * 1.5;
  }
  if (['img','iframe','video'].includes(n.tagName)) return 8;
  if (n.tagName === 'audio') return 3;
  if (n.tagName === 'li' || n.tagName === 'p' || n.tagName === 'blockquote') return 1 + lines(n);
  if (n.nodeName === '#text') return n.value.trim() ? 1 + lines(n) : 0;
  return children(n).reduce((sum,item) => sum + cost(item), 0);
}
export function checkSlideDensity(pages, titles, limit = 13) {
  const problems = [];
  pages.forEach((page,i) => {
    const points = Math.round(page.reduce((sum,item) => sum + cost(item), 0) * 10) / 10;
    if (points > limit) problems.push(`第 ${i+1} 页「${titles[i]}」内容量 ${points}/${limit}`);
  });
  if (problems.length) throw new Error(`页面内容过多：\n${problems.join('\n')}\n请删减文字、移入讲稿，或用一级标题 / --- 拆成更多页。`);
}
