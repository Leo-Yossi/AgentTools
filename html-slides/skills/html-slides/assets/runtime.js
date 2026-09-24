(() => {
  const slides = [...document.querySelectorAll('.slide')];
  if (!slides.length) return;
  const counts = slides.map(() => 0);
  let current = 0;
  let previous = -1;
  const layoutWarning=document.createElement('div');layoutWarning.id='layout-warning';layoutWarning.hidden=true;layoutWarning.setAttribute('role','alert');document.body.append(layoutWarning);
  const mediaStatus=(media,text)=>{const status=media.closest('.media')?.querySelector('.media-status');if(status)status.textContent=text;};
  document.querySelectorAll('video,audio').forEach(media=>{
    const start=Number(media.dataset.start||0),end=Number(media.dataset.end||Infinity);
    media.addEventListener('loadedmetadata',()=>{if(start<media.duration)media.currentTime=start;else if(start)mediaStatus(media,'开始时间超出媒体长度，请调整文稿。');});
    media.addEventListener('play',()=>{
      if(!media.closest('.slide.active')) {media.pause();return;}
      if(media.currentTime<start||media.currentTime>=end)media.currentTime=start;
      mediaStatus(media,'');
    });
    media.addEventListener('timeupdate',()=>{
      if(media.loop && !media.paused && media.currentTime<start)media.currentTime=start;
      if(media.currentTime>=end){if(media.loop)media.currentTime=start;else media.pause();}
    });
    media.addEventListener('error',()=>mediaStatus(media,'媒体无法播放，请检查文件编码或单独打开。'));
  });
  function loadFrame(frame) {
    if(frame.dataset.src && !frame.getAttribute('src')) frame.src=frame.dataset.src;
    if(frame._loadButton)frame._loadButton.hidden=true;
  }
  document.querySelectorAll('iframe[data-src]').forEach(frame=>{
    if(frame.dataset.online) {
      let button=frame.nextElementSibling?.matches('[data-load-frame]')?frame.nextElementSibling:null;
      if(!button){button=document.createElement('button');button.textContent='加载在线内容';button.dataset.loadFrame='';frame.after(button);}
      button._frame=frame;frame._loadButton=button;
    }
    frame.addEventListener('load',()=>{
      if(!frame.getAttribute('src'))return;
      const origin=new URL(frame.dataset.src,location.href).origin;
      frame.contentWindow?.postMessage({type:'html-slides',event:'enter',slide:current+1},origin==='null'?'*':origin);
    });
  });
  function syncMedia() {
    if(previous===current)return;
    slides.forEach((slide,i)=>{
      if(i!==current){
        slide.querySelectorAll('audio,video').forEach(m=>m.pause());
        slide.querySelectorAll('iframe[data-src]').forEach(frame=>{
          frame.removeAttribute('src');
          if(frame._loadButton)frame._loadButton.hidden=false;
        });
      } else {
        slide.querySelectorAll('iframe[data-src]:not([data-online])').forEach(loadFrame);
        slide.querySelectorAll('video[data-autoplay],audio[data-autoplay]').forEach(m=>{
          m.play()?.catch(()=>mediaStatus(m,'浏览器未允许自动播放，请点击播放。'));
        });
      }
    });
    dispatchEvent(new CustomEvent('slidechange',{detail:{index:current,previous}}));
    previous=current;
  }
  const fragments = i => [...slides[i].querySelectorAll('.fragment')];
  function fromHash() {
    const match = location.hash.match(/^#slide-(\d+)$/);
    if (match) current = Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1));
  }
  function render() {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === current);
      slide.setAttribute('aria-hidden', String(i !== current));
      fragments(i).forEach((f,j) => f.classList.toggle('visible', j < counts[i]));
    });
    document.getElementById('slide-counter').textContent = `${current + 1} / ${slides.length}`;
    syncMedia();
    try { history.replaceState(null, '', `#slide-${current + 1}`); } catch (_) {}
    // Useful for manual review and automated layout checks, without silently shrinking text.
    requestAnimationFrame(() => {
      const slide = slides[current];
      const overflowing=slide.scrollHeight > slide.clientHeight + 2 || slide.scrollWidth > slide.clientWidth + 2;
      slide.dataset.overflow = String(overflowing);
      layoutWarning.hidden=!overflowing;
      layoutWarning.textContent=overflowing ? `第 ${current+1} 页内容超出画面，请精简或拆页` : '';
    });
  }
  function next() {
    if (counts[current] < fragments(current).length) counts[current]++;
    else current = Math.min(slides.length - 1, current + 1);
    render();
  }
  function prev() {
    if (counts[current] > 0) counts[current]--;
    else current = Math.max(0, current - 1);
    render();
  }
  function action(name) {
    if (name === 'next') next();
    if (name === 'prev') prev();
    if (name === 'notes') { document.body.classList.toggle('show-notes'); render(); }
    if (name === 'fullscreen') {
      const pending = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
      pending?.catch(() => {});
    }
  }
  document.addEventListener('keydown', e => {
    if(e.target.matches('[data-zoom]') && ['Enter',' '].includes(e.key)){e.preventDefault();e.target.click();return;}
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('dialog,input,textarea,select,button,a,video,audio,[contenteditable="true"]')) return;
    if (['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)) { e.preventDefault(); next(); }
    if (['ArrowLeft','ArrowUp','PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
    if (e.key === 'Home') { e.preventDefault(); current = 0; counts.fill(0); render(); }
    if (e.key === 'End') { e.preventDefault(); current = slides.length-1; slides.forEach((_,i)=>counts[i]=fragments(i).length); render(); }
    if (e.key.toLowerCase() === 'n') action('notes');
    if (e.key.toLowerCase() === 'f') action('fullscreen');
  });
  document.addEventListener('click', e => {
    if(e.target.closest('[data-load-frame]')) {
      const frame=e.target.closest('[data-load-frame]')._frame;if(frame)loadFrame(frame);return;
    }
    if(e.target.matches('[data-zoom]')) {
      const dialog=document.createElement('dialog');dialog.className='media-lightbox';
      const image=e.target.cloneNode();image.removeAttribute('data-zoom');image.removeAttribute('tabindex');image.removeAttribute('role');
      const close=document.createElement('button');close.textContent='关闭';close.onclick=()=>dialog.close();
      dialog.append(close,image);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();return;
    }
    const control = e.target.closest('[data-action]');
    if (control) { action(control.dataset.action); return; }
    if (!e.target.closest('.slide') || e.target.closest('a,button,input,textarea,select,iframe,video,audio,summary,.note,[contenteditable="true"]') || getSelection()?.toString()) return;
    if (e.clientX > innerWidth * .7) next();
    if (e.clientX < innerWidth * .3) prev();
  });
  addEventListener('hashchange', () => { fromHash(); render(); });
  addEventListener('resize', render);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('audio,video').forEach(m=>m.pause());});
  fromHash(); render();
})();
