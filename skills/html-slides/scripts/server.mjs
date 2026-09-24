import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.avif':'image/avif','.mp4':'video/mp4','.m4v':'video/mp4','.webm':'video/webm','.ogv':'video/ogg','.mp3':'audio/mpeg','.m4a':'audio/mp4','.wav':'audio/wav','.ogg':'audio/ogg','.flac':'audio/flac','.vtt':'text/vtt; charset=utf-8','.pdf':'application/pdf','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.json':'application/json','.wasm':'application/wasm','.glb':'model/gltf-binary','.gltf':'model/gltf+json'};
export function createPreviewServer(directory) {
  const root=fs.realpathSync(directory);
  const inside=file=>{const rel=path.relative(root,file); return !rel.startsWith('..')&&!path.isAbsolute(rel);};
  return http.createServer((req,res)=>{
    if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
    try {
      const url=decodeURIComponent(req.url.split('?')[0]);
      let file=path.resolve(root,'.'+url);
      if(!inside(file)) {res.writeHead(403);res.end();return;}
      if(fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
      file=fs.realpathSync(file);
      if(!inside(file)) {res.writeHead(403);res.end();return;}
      const stat=fs.statSync(file);
      if(!stat.isFile()) throw new Error('not a file');
      const headers={'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
      let start=0,end=stat.size-1,status=200;
      // Single byte ranges cover browser seeking. Ignore multi-range requests.
      if(req.headers.range && !req.headers.range.includes(',') && req.method==='GET') {
        const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(m && (m[1]||m[2])) {
          if(m[1]) { start=Number(m[1]); end=m[2]?Math.min(Number(m[2]),end):end; }
          else start=Math.max(0,stat.size-Number(m[2]));
          if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size) {
            res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;
          }
          status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
        }
      }
      headers['Content-Length']=Math.max(0,end-start+1);
      res.writeHead(status,headers);
      if(req.method==='HEAD'||!stat.size) {res.end();return;}
      const stream=fs.createReadStream(file,{start,end});
      stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
    } catch(e) {res.writeHead(e instanceof URIError?400:404);res.end('Not found');}
  });
}
