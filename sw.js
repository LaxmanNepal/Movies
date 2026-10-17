const CACHE='moviehub-shell-v3';
const SHELL=['./','./index.html','./moviehub.css','./app.js','./enhancements.js','./data.json','./manifest.json','./icons/icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('moviehub-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  const clean=new URL(req.url);clean.search='';
  const isApp=clean.pathname.endsWith('/app.js')||clean.pathname.endsWith('/index.html')||clean.pathname.endsWith('/');
  if(req.mode==='navigate'||isApp){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
      if(res.ok)caches.open(CACHE).then(cache=>cache.put(clean.href,res.clone()));
      return res;
    }).catch(()=>caches.match(clean.href)));
    return;
  }
  if(clean.pathname.endsWith('/data.json')){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
      if(res.ok)caches.open(CACHE).then(cache=>cache.put(clean.href,res.clone()));
      return res;
    }).catch(()=>caches.match(clean.href)));
    return;
  }
  event.respondWith(caches.match(clean.href).then(cached=>cached||fetch(req).then(res=>{
    if(res.ok)caches.open(CACHE).then(cache=>cache.put(clean.href,res.clone()));
    return res;
  })));
});