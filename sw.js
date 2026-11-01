// Offline cache for the Jiangnan Guide. Version changes whenever the guide changes.
// Opens instantly from the saved copy, then checks for a newer guide in the background.
const CACHE='jiangnan-20261101-1523';
const TILES='jn-tiles-v2';
const FILES=["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
// Keep the saved map pieces across updates; drop only old copies of the guide.
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==TILES&&k!=='jn-meta').map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
function tell(msg){self.clients.matchAll({type:'window'}).then(cs=>cs.forEach(c=>c.postMessage(msg)));}
function markUpdated(){caches.open('jn-meta').then(m=>m.put('updated',new Response(String(Date.now()))));tell({type:'jn-updated'});}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // Map pieces: saved copy first, otherwise fetch and keep it for next time.
  if(url.hostname==='tile.openstreetmap.org'){
    e.respondWith(caches.match(e.request.url).then(hit=>hit||fetch(e.request.url,{mode:'cors'}).then(r=>{if(r.ok){const copy=r.clone();caches.open(TILES).then(c=>c.put(e.request.url,copy));}return r;}).catch(()=>fetch(e.request))));
    return;
  }
  if(url.origin!==location.origin)return;
  // The guide itself: saved copy at once (fast, also offline); fetch a fresh copy in the background
  // and tell the page if it changed, so it can offer a one-tap reload.
  const nav=e.request.mode==='navigate',key=nav?'index.html':e.request;
  const work=caches.open(CACHE).then(c=>c.match(key,{ignoreSearch:true}).then(hit=>{
    const old=hit?hit.clone():null;
    const net=fetch(nav?new Request(e.request.url,{cache:'no-cache',credentials:'same-origin'}):e.request).then(r=>{
      if(!r.ok)return hit||r;
      const forCache=r.clone(),forCompare=r.clone();
      const saved=c.put(key,forCache);
      if(old&&nav)Promise.all([old.text(),forCompare.text(),saved]).then(v=>{if(v[0]!==v[1])markUpdated();});
      return r;
    }).catch(()=>hit);
    return {hit:hit,net:net};
  }));
  e.respondWith(work.then(w=>w.hit||w.net));
  e.waitUntil(work.then(w=>w.net).then(()=>new Promise(r=>setTimeout(r,500))));
});
