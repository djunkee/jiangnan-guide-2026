// Offline cache for the Jiangnan Guide. Version changes whenever the guide changes.
const CACHE='jiangnan-20261101-1158';
const TILES='jn-tiles-v1';
const FILES=["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
// Keep the saved map pieces across updates; drop only old copies of the guide.
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // Map pieces: saved copy first, otherwise fetch and keep it for next time.
  if(url.hostname.endsWith('basemaps.cartocdn.com')){
    e.respondWith(caches.match(e.request.url).then(hit=>hit||fetch(e.request.url,{mode:'cors'}).then(r=>{if(r.ok){const copy=r.clone();caches.open(TILES).then(c=>c.put(e.request.url,copy));}return r;}).catch(()=>fetch(e.request))));
    return;
  }
  if(url.origin!==location.origin)return;
  // The guide itself: network first so updates arrive when online; saved copy when offline (e.g. in China).
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
