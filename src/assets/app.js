/* Jiangnan Guide runtime: now, info sheets, day maps, Luca. Data in window.JN. */
(function(){
'use strict';
var JN=window.JN||{};var P=JN.P||{},DAYS=JN.DAYS||{},SHOPS=JN.SHOPS||[];
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var MODE={walk:{l:'Walk',c:'#5A6472',dash:'2 7',w:4},metro:{l:'Metro',c:'#2443A0',w:5},car:{l:'Didi',c:'#A35C14',w:4},ferry:{l:'Ferry',c:'#2F7F9E',dash:'8 6',w:4},boat:{l:'Boat',c:'#2F7F9E',dash:'8 6',w:4},train:{l:'Train',c:'#C1352A',dash:'12 6',w:4},bike:{l:'Bike',c:'#2B7764',dash:'6 5',w:4}};
var AMAPMODE={walk:'walk',metro:'bus',car:'car',ferry:'bus',boat:'walk',train:'bus',bike:'ride'},APPLEMODE={walk:'w',metro:'r',car:'d',ferry:'r',boat:'w',train:'r',bike:'w'};
var TILE='https://tile.openstreetmap.org/{z}/{x}/{y}.png',TILE_ATTR='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',TCACHE='jn-tiles-v2';
var ICON_I='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10.5v6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="7.2" r="1.5" fill="currentColor"/></svg>';
var PAW='<svg class="paw" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5.2" ry="4.3"/><ellipse cx="5.6" cy="10.4" rx="2.1" ry="2.7"/><ellipse cx="9.5" cy="6.6" rx="2.1" ry="2.8"/><ellipse cx="14.5" cy="6.6" rx="2.1" ry="2.8"/><ellipse cx="18.4" cy="10.4" rx="2.1" ry="2.7"/></svg>';

/* ---------- China time ---------- */
function cn(){var d=new Date();return new Date(d.getTime()+(d.getTimezoneOffset()+480)*60000)}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function mins(t){var m=/(\d{1,2}):(\d{2})/.exec(t||'');return m?(+m[1])*60+(+m[2]):null}

/* ---------- stop numbers, ratings, About buttons ---------- */
function stars(n){n=Math.max(0,Math.min(5,Math.round(n||0)));return '★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n)}
function rtHTML(r){if(!r)return '';var h='';
  if(r.verdict&&r.verdict.stars)h+='<span class="st" title="Our verdict">'+stars(r.verdict.stars)+' <em style="font-style:normal;letter-spacing:0;color:var(--muted)">our take</em></span>';
  if(r.visitor&&r.visitor.score)h+='<span>'+esc(r.visitor.score)+'/'+esc(r.visitor.of||5)+' '+esc(r.visitor.site||'')+'</span>';
  if(r.china_grade)h+='<span class="'+(r.china_grade.length>=5?'g5':'')+'">'+esc(r.china_grade.length+'A')+'</span>';
  if(r.unesco)h+='<span class="un">UNESCO</span>';
  return h}
function decorate(){
  $$('.day').forEach(function(day){
    var nums={};(DAYS[day.id]||[]).forEach(function(seg){seg.pts.forEach(function(p){if(p.n&&!nums[p.k])nums[p.k]=p.n})});
    $$('li.it.stop[data-o]',day).forEach(function(li){
      var k=li.getAttribute('data-o'),info=P[k],h4=$('h4',li);
      if(nums[k]&&h4&&!$('.sn',h4)&&!li.classList.contains('skip'))h4.insertAdjacentHTML('afterbegin','<span class="sn">'+nums[k]+'</span>');
      if(!info||!info.glance)return;
      if(info.ratings&&!$('.rt',li)){var r=rtHTML(info.ratings);if(r)h4.insertAdjacentHTML('afterend','<div class="rt">'+r+'</div>')}
      var c=$('.c',li),first=$('details.more',c)||$('details.taxi',c);
      var btn=document.createElement('button');btn.type='button';btn.className='infob';btn.innerHTML=ICON_I+'About';
      btn.addEventListener('click',function(){openSheet(k,day)});
      if(first){var row=document.createElement('div');row.className='acts';first.parentNode.insertBefore(row,first);row.appendChild(btn);
        var sib=row.nextElementSibling;while(sib&&sib.tagName==='DETAILS'){var nx=sib.nextElementSibling;row.appendChild(sib);sib=nx}}
      else c.appendChild(btn);
    });
  });
}

/* ---------- info sheet ---------- */
var sheet,pane;
function buildSheet(){sheet=document.createElement('div');sheet.className='sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
  sheet.innerHTML='<div class="pane"></div>';document.body.appendChild(sheet);pane=$('.pane',sheet);
  sheet.addEventListener('click',function(e){if(e.target===sheet)closeSheet()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeSheet();closeMap()}})}
function openSheet(k,day){var i=P[k];if(!i)return;var r=i.ratings||{},h='';
  h+='<div class="grab"><b>'+esc(i.name)+'</b><button class="x" type="button" aria-label="Close">✕</button></div>';
  h+='<div class="zhl">'+esc(i.zh||'')+(i.pinyin?'<small>'+esc(i.pinyin)+'</small>':'')+'</div>';
  if(i.glance)h+='<p class="glance">'+esc(i.glance)+'</p>';
  var rb='';var rt=rtHTML(r);if(rt)rb+='<div class="rt">'+rt+'</div>';
  if(r.verdict&&r.verdict.line)rb+='<div class="verdict"><span class="st">'+stars(r.verdict.stars)+'</span>'+esc(r.verdict.line)+'</div>';
  var tb='';if(i.time)tb+='<dt>Allow</dt><dd>'+esc(i.time)+'</dd>';if(i.best)tb+='<dt>Best</dt><dd>'+esc(i.best)+'</dd>';
  if(r.visitor&&r.visitor.score)tb+='<dt>Visitors</dt><dd>'+esc(r.visitor.score)+' of '+esc(r.visitor.of||5)+' on '+esc(r.visitor.site)+(r.visitor.count?' ('+esc(r.visitor.count)+')':'')+'</dd>';
  if(r.china_grade)tb+='<dt>China grade</dt><dd>'+esc(r.china_grade)+' ('+r.china_grade.length+'A), China’s official top tourist-site rating is 5A</dd>';
  if(r.unesco)tb+='<dt>UNESCO</dt><dd>'+esc(r.unesco)+'</dd>';
  if(tb)rb+='<dl class="tb">'+tb+'</dl>';
  if(rb)h+='<div class="rbox">'+rb+'</div>';
  if(i.highlights&&i.highlights.length){h+='<h6>What to look for</h6><ol class="hl">';i.highlights.forEach(function(x){h+='<li><div><b>'+esc(x.name)+(x.zh?'<span class="zh">'+esc(x.zh)+'</span>':'')+'</b>'+esc(x.what)+'</div></li>'});h+='</ol>'}
  if(i.history&&i.history.length){h+='<h6>History</h6>';(Array.isArray(i.history)?i.history:[i.history]).forEach(function(p){h+='<p>'+esc(p)+'</p>'})}
  if(i.meaning)h+='<h6>What it means</h6><p>'+esc(i.meaning)+'</p>';
  if(i.tips&&i.tips.length){h+='<h6>Tips</h6><ul class="tips">';i.tips.forEach(function(t){h+='<li>'+esc(t)+'</li>'});h+='</ul>'}
  if(i.facts&&i.facts.length){h+='<h6>Key facts</h6><dl class="tb">';i.facts.forEach(function(f){h+='<dt>'+esc(f[0])+'</dt><dd>'+esc(f[1])+'</dd>'});h+='</dl>'}
  if(i.sources&&i.sources.length){h+='<h6>Sources (online only)</h6><div class="src">';i.sources.forEach(function(s){h+='<a href="'+esc(s[1])+'" target="_blank" rel="noopener">'+esc(s[0])+'</a>'});h+='</div>'}
  if(JN.LUCA_SHEET&&JN.LUCA_SHEET[k])h+='<div class="luca-note">'+JN.LUCA_HEAD+'<span>'+esc(JN.LUCA_SHEET[k])+'</span></div>';
  pane.innerHTML=h;var cc=day&&getComputedStyle(day).getPropertyValue('--cc');if(cc)pane.style.setProperty('--cc',cc);
  $('.x',pane).addEventListener('click',function(){closeSheet()});sheet.hidden=false;pane.scrollTop=0;document.documentElement.style.overflow='hidden';
  try{history.pushState({sheet:1},'');sheetPushed=true}catch(e){}}
var sheetPushed=false,mapPushed=false;
function closeSheet(fromPop){if(!sheet||sheet.hidden)return;sheet.hidden=true;document.documentElement.style.overflow='';if(fromPop!==true&&sheetPushed){sheetPushed=false;try{history.back()}catch(e){}}else sheetPushed=false}

/* ---------- now ---------- */
var nowBtn,hiddenAt=0;
function markNow(scroll){
  $$('.it.now').forEach(function(e){e.classList.remove('now')});$$('.it.past').forEach(function(e){e.classList.remove('past')});
  var d=cn(),day=document.querySelector('.day[data-date="'+iso(d)+'"]');
  if(!day){if(nowBtn)nowBtn.hidden=true;return null}
  var cur=d.getHours()*60+d.getMinutes(),items=$$('.items>li.it',day),last=-1,prev=-1,best=null,firstTimed=null;
  items.forEach(function(li){var t=$('.t',li);var m=mins(t&&t.textContent);if(m==null)return;if(prev>=0&&m<prev-120)m+=1440;prev=m;
    if(!firstTimed)firstTimed=li;li._m=m;if(m<=cur)best=li});
  var tgt=best||firstTimed;if(!tgt)return null;
  var seen=false;items.forEach(function(li){if(li===best){seen=true;return}if(best&&!seen&&li._m!=null)li.classList.add('past')});
  tgt.classList.add('now');$('.t',tgt).setAttribute('data-now',best?'Now':'Next');
  var st={day:day.id,past:{},cur:null,next:null},stops=items.filter(function(li){return li.getAttribute('data-o')&&li._m!=null&&!li.classList.contains('skip')});
  stops.forEach(function(li){var k=li.getAttribute('data-o');if(li._m>cur){if(!st.next)st.next=k}else if(li===best)st.cur=k;else st.past[k]=1});
  if(st.cur)delete st.past[st.cur];NOWST=st;paintStops();
  if(nowBtn)nowBtn.hidden=false;
  if(scroll){var y=tgt.getBoundingClientRect().top+window.scrollY-((($('nav.days')||{}).offsetHeight)||60)-10;window.scrollTo(0,Math.max(0,y))}
  return tgt}
function initNow(){nowBtn=document.createElement('button');nowBtn.type='button';nowBtn.className='nowbtn';nowBtn.hidden=true;nowBtn.innerHTML=PAW.replace('class="paw"','')+'Now';
  nowBtn.addEventListener('click',function(){markNow(true)});document.body.appendChild(nowBtn);
  var t=markNow(!location.hash);
  document.addEventListener('visibilitychange',function(){if(document.hidden){hiddenAt=Date.now()}else{var away=Date.now()-hiddenAt;var open=(sheet&&!sheet.hidden)||(mapfs&&!mapfs.hidden);markNow(away>10*60000&&!open)}});
  setInterval(function(){if(!document.hidden)markNow(false)},60000)}

/* ---------- maps ---------- */
var hasL=typeof window.L!=='undefined',mapfs,fsMap,fsLayers,curDay,curSeg=0,meMarker,meWatch,showShops=true;
function tl(){return L.tileLayer(TILE,{maxZoom:19,attribution:TILE_ATTR,crossOrigin:true})}
function mk(p,small){var cls=p.n?'mk':'mk poi',txt=p.n||(p.kind==='hotel'?'🛏':p.kind==='rail'?'🚄':p.kind==='pier'?'⛴':p.kind==='metro'?'M':p.kind==='airport'?'✈':'•');
  var s=p.n?(small?22:28):(small?18:24);return L.marker(p.ll,{icon:L.divIcon({className:'',html:'<div class="'+cls+'" data-k="'+p.k+'" style="width:'+s+'px;height:'+s+'px;'+(p.n?'--mc:'+(p.col||'#C1352A'):'')+'">'+txt+'</div>',iconSize:[s,s],iconAnchor:[s/2,s/2]}),keyboard:false,zIndexOffset:p.n?600:200})}
/* street routes: walking and driving paths from OpenStreetMap routing (FOSSGIS OSRM), fetched once when online, then kept on the phone */
var RT='https://routing.openstreetmap.de/routed-',PROF={walk:'foot',car:'car',bike:'bike'},rtMem={},rtQ=[],rtBusy=0;
function rkey(m,a,b){return 'jn-rt1:'+m+':'+a[0].toFixed(5)+','+a[1].toFixed(5)+';'+b[0].toFixed(5)+','+b[1].toFixed(5)}
function getRoute(m,a,b){var prof=PROF[m];if(!prof)return Promise.resolve(null);var k=rkey(m,a,b);if(rtMem[k])return rtMem[k];
  var hit=null;try{hit=JSON.parse(localStorage.getItem(k)||'null')}catch(e){}
  if(hit){rtMem[k]=Promise.resolve(hit);return rtMem[k]}
  if(navigator.onLine===false)return Promise.resolve(null);
  rtMem[k]=new Promise(function(res){rtQ.push({k:k,u:RT+prof+'/route/v1/driving/'+a[1]+','+a[0]+';'+b[1]+','+b[0]+'?overview=full&geometries=geojson',res:res});pump()});
  rtMem[k].then(function(r){if(!r)delete rtMem[k]});return rtMem[k]}
function pump(){while(rtBusy<2&&rtQ.length){var j=rtQ.shift();rtBusy++;(function(j){
  var ctl=('AbortController' in window)?new AbortController():null,to=setTimeout(function(){if(ctl)ctl.abort()},12000);
  fetch(j.u,ctl?{signal:ctl.signal}:{}).then(function(r){return r.ok?r.json():null}).then(function(d){var rt=d&&d.routes&&d.routes[0];if(!rt){j.res(null);return}
    var c=rt.geometry.coordinates.map(function(x){return [+x[1].toFixed(5),+x[0].toFixed(5)]}),o={c:c,d:Math.round(rt.distance),t:Math.round(rt.duration)};
    try{localStorage.setItem(j.k,JSON.stringify(o))}catch(e){}j.res(o)}).catch(function(){j.res(null)}).then(function(){clearTimeout(to);rtBusy--;setTimeout(pump,250)})})(j)}}
/* split a leg into pieces: metro legs walk to the station, ride between stations, walk from the station */
function pieces(a,b){var m=b.m||'walk';if(m==='metro'&&b.via&&b.via.length){var v=b.via,out=[];
    if(dist(a.ll,v[0].ll)>60)out.push({m:'walk',p:[a.ll,v[0].ll]});out.push({m:'metro',p:[v[0].ll,v[v.length-1].ll],via:v});
    if(dist(v[v.length-1].ll,b.ll)>60)out.push({m:'walk',p:[v[v.length-1].ll,b.ll]});return out}
  return [{m:m,p:[a.ll,b.ll]}]}
function segLayers(seg,col,small){var g=L.featureGroup(),pts=seg.pts,stations={};
  for(var i=1;i<pts.length;i++)pieces(pts[i-1],pts[i]).forEach(function(pc){var m=MODE[pc.m]||MODE.walk,routed=!!PROF[pc.m];
    var line=L.polyline(pc.p,{color:m.c,weight:small?3:m.w,opacity:routed?.45:.85,dashArray:m.dash,lineCap:'round',lineJoin:'round'}).addTo(g);
    if(pc.via&&!small)line.bindTooltip('Ⓜ Metro: '+pc.via.map(function(x){return x.name}).join(' → '),{className:'tl',sticky:true});
    if(routed&&dist(pc.p[0],pc.p[1])>80)getRoute(pc.m,pc.p[0],pc.p[1]).then(function(r){if(r&&r.c.length>1){line.setLatLngs(r.c);line.setStyle({opacity:.9,dashArray:pc.m==='walk'?(small?'1 5':'1 7'):null,weight:pc.m==='walk'?(small?3.5:5):(small?3:4.5)})}})});
  pts.forEach(function(p){var v=p.via||[];if(v.length){stations[v[0].k]=v[0];stations[v[v.length-1].k]=v[v.length-1]}});
  if(!small)Object.keys(stations).forEach(function(k){var v=stations[k];L.circleMarker(v.ll,{radius:5,color:'#fff',weight:2,fillColor:'#2443A0',fillOpacity:1}).bindTooltip('Ⓜ '+v.name,{className:'tl',direction:'top'}).addTo(g)});
  var seen={};pts.forEach(function(p){var key=p.k+'@'+p.ll.join();if(seen[key])return;seen[key]=1;p.col=col;var m=mk(p,small);if(!small)m.bindTooltip((p.n?p.n+' · ':'')+p.name,{className:'tl',direction:'top',offset:[0,-12]});m.addTo(g)});
  return g}
function shopLayer(seg){var g=L.featureGroup(),ks={};seg.pts.forEach(function(p){ks[p.k]=1});
  SHOPS.forEach(function(s){if(!s.ll||!ks[s.near])return;var m=L.marker(s.ll,{icon:L.divIcon({className:'',html:'<div class="mk shopm" style="width:22px;height:22px;font-size:11px">🛍</div>',iconSize:[22,22],iconAnchor:[11,11]}),zIndexOffset:-200});
    m.bindTooltip(s.name,{className:'tl',direction:'top',offset:[0,-12]});m.addTo(g)});return g}
function dayCol(id){var d=document.getElementById(id);return d?(getComputedStyle(d).getPropertyValue('--cc').trim()||'#C1352A'):'#C1352A'}
function resolveCol(c){if(c.indexOf('var(')<0)return c;var t=document.createElement('span');t.style.color=c;document.body.appendChild(t);var v=getComputedStyle(t).color;t.remove();return v}
function initPreviews(){
  $$('.dmap').forEach(function(box){var id=box.getAttribute('data-day'),segs=DAYS[id];if(!segs)return;
    var lg='',used={};segs.forEach(function(s){s.pts.forEach(function(p,i){if(i&&!used[p.m]){used[p.m]=1;var m=MODE[p.m]||MODE.walk;lg+='<span><i style="border-color:'+m.c+';'+(m.dash?'border-top-style:dashed':'')+'"></i>'+m.l+'</span>'}})});
    box.innerHTML='<div class="dm-map"></div><button class="dm-tap" type="button" aria-label="Open the map of this day"></button><div class="dm-bar"><div class="lg">'+lg+'</div><button class="dm-open" type="button">Open map</button></div>'+(segs[0].note?'<div class="dm-note">'+esc(segs.map(function(s){return s.note}).filter(Boolean).join(' · '))+'</div>':'');
    var open=function(){openMap(id,0)};$('.dm-tap',box).addEventListener('click',open);$('.dm-open',box).addEventListener('click',open);
    if(!hasL){$('.dm-map',box).innerHTML='<p class="muted" style="padding:12px">Map unavailable.</p>';return}
    var made=false,make=function(){if(made)return;made=true;var col=resolveCol(dayCol(id));
      var map=L.map($('.dm-map',box),{zoomControl:false,attributionControl:false,dragging:false,touchZoom:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,tap:false,zoomSnap:.25});
      tl().addTo(map);var all=L.featureGroup();segs.forEach(function(s){segLayers(s,col,true).addTo(all)});all.addTo(map);map.fitBounds(all.getBounds(),{padding:[18,18],maxZoom:16});paintStops()};
    if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){make();io.disconnect()}})},{rootMargin:'300px'});io.observe(box)}else make();
  })}
function buildMapFS(){mapfs=document.createElement('div');mapfs.className='mapfs';mapfs.hidden=true;
  mapfs.innerHTML='<div class="mf-head"><div class="mf-top"><button class="mf-x" type="button" aria-label="Close map">✕</button><div class="ttl"></div></div><div class="mf-tabs"></div></div><div id="mf-map"></div><div class="mf-panel"><div class="mf-tools"><button type="button" data-a="me">📍 My position</button><button type="button" data-a="all">Fit day</button><button type="button" data-a="shops" class="on">🛍 Shops</button><button type="button" data-a="metro">Ⓜ Metro lines</button><button type="button" data-a="transit">🚌 Bus &amp; transit map</button><button type="button" data-a="save" hidden>⬇ Save offline</button></div><div class="mf-key" hidden><span><i style="background:#F05A1A"></i>Next stop</span><span><i style="background:#fff;box-shadow:0 0 0 2px #C1352A"></i>You are here (by the plan)</span><span><i style="background:#9AA3AE"></i>Done</span></div><div class="mf-status"></div><ol class="legs"></ol></div>';
  document.body.appendChild(mapfs);$('.mf-x',mapfs).addEventListener('click',function(){closeMap()});
  $('.mf-tools',mapfs).addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var a=b.getAttribute('data-a');
    if(a==='transit')toggleTransit(b);if(a==='metro')toggleMetro(b);if(a==='me')locate(true);if(a==='all')fitSeg();if(a==='shops'){showShops=!showShops;b.classList.toggle('on',showShops);drawSeg()}if(a==='save')saveOffline(b)});
  if(canCache())$('[data-a="save"]',mapfs).hidden=false}
function openMap(id,si){if(!hasL)return;curDay=id;curSeg=si||0;mapfs.hidden=false;document.documentElement.style.overflow='hidden';
  var segs=DAYS[id],tabs=$('.mf-tabs',mapfs);tabs.innerHTML='';if(segs.length>1)segs.forEach(function(s,i){var b=document.createElement('button');b.type='button';b.textContent=s.tab||s.t;b.setAttribute('aria-pressed',i===curSeg);b.addEventListener('click',function(){curSeg=i;$$('button',tabs).forEach(function(x,j){x.setAttribute('aria-pressed',j===i)});drawSeg();fitSeg(true);paintStops()});tabs.appendChild(b)});
  if(!fsMap){fsMap=L.map('mf-map',{zoomControl:true,zoomSnap:.5,tap:true});fsBase=tl().addTo(fsMap);fsMap.attributionControl.setPrefix(false);addLocControl();fsMap.on('moveend',paintStops)}
  setTimeout(function(){fsMap.invalidateSize();drawSeg();fitSeg(true);paintStops();var on=false;try{on=localStorage.getItem('jn-loc')==='1'}catch(e){}if(on)locate(false)},30);
  try{history.pushState({map:1},'');mapPushed=true}catch(e){}}
function closeMap(fromPop){if(!mapfs||mapfs.hidden)return;mapfs.hidden=true;document.documentElement.style.overflow='';stopLocate();if(fromPop!==true&&mapPushed){mapPushed=false;try{history.back()}catch(e){}}else mapPushed=false}
window.addEventListener('popstate',function(){closeSheet(true);closeMap(true)});
function drawSeg(){var seg=DAYS[curDay][curSeg],col=resolveCol(dayCol(curDay));if(fsLayers)fsMap.removeLayer(fsLayers);fsLayers=L.featureGroup([segLayers(seg,col,false)]);if(showShops)fsLayers.addLayer(shopLayer(seg));fsLayers.addTo(fsMap);
  $('.ttl',mapfs).textContent=seg.t;
  var h='<li><span class="nt">Dotted paths are walking routes along real streets (OpenStreetMap routing, loaded once when online, then kept on the phone). Pins are close but approximate, so for turn-by-turn directions tap Amap or Apple Maps.</span></li>';if(seg.note)h+='<li><span class="nt">'+esc(seg.note)+'</span></li>';
  for(var i=1;i<seg.pts.length;i++){var a=seg.pts[i-1],b=seg.pts[i],m=MODE[b.m]||MODE.walk;
    var q=encodeURIComponent(b.zh||b.name),am='https://uri.amap.com/search?keyword='+q+'&city='+encodeURIComponent(seg.city||'')+'&callnative=1&src=jiangnan-guide';
    var ap='https://maps.apple.com/?daddr='+encodeURIComponent((b.zh||b.name)+(seg.city?' '+seg.city:''))+'&dirflg='+(APPLEMODE[b.m]||'w');
    h+='<li><span class="md" style="background:'+m.c+'">'+m.l+'</span><div><div class="who">'+(a.n?a.n+' ':'')+esc(a.name)+' → '+(b.n?b.n+' ':'')+esc(b.name)+'</div><div class="how">'+esc(b.d||'')+'</div><div class="rd" data-r="'+i+'"></div></div><div class="go2"><button type="button" data-z="'+i+'">Show</button><a href="'+am+'" target="_blank" rel="noopener">Amap</a><a href="'+('https://uri.amap.com/navigation?from='+a.ll[1]+','+a.ll[0]+','+encodeURIComponent(a.zh||a.name)+'&to='+b.ll[1]+','+b.ll[0]+','+encodeURIComponent(b.zh||b.name)+'&mode=bus&coordinate=wgs84&callnative=1&src=jiangnan-guide')+'" target="_blank" rel="noopener">🚇 Transit in Amap</a><a href="'+ap+'" target="_blank" rel="noopener">Apple Maps</a></div></li>'}
  var legs=$('.legs',mapfs);legs.innerHTML=h;
  $$('button[data-z]',legs).forEach(function(b){b.addEventListener('click',function(){var i=+b.getAttribute('data-z');fsMap.fitBounds(L.latLngBounds([seg.pts[i-1].ll,seg.pts[i].ll]),{padding:[50,50],maxZoom:17})})});
  seg.pts.forEach(function(b,i){if(!i)return;var a=seg.pts[i-1];var pcs=pieces(a,b),tot=0,n=0,want=0;
    pcs.forEach(function(pc){if(!PROF[pc.m]||dist(pc.p[0],pc.p[1])<=80)return;want++;getRoute(pc.m,pc.p[0],pc.p[1]).then(function(r){n++;if(r)tot+=r.d;
      if(n===want&&tot){var el=$('.rd[data-r="'+i+'"]',legs);if(el)el.textContent=(b.m==='car'?'By road ≈ '+fmtD(tot):b.m==='metro'?'Walking to and from the stations ≈ '+fmtD(tot):'Walking route ≈ '+fmtD(tot)+', about '+Math.max(1,Math.round(tot/1000/4.5*60))+' min')}})})});
  $('.mf-key',mapfs).hidden=!(NOWST&&NOWST.day===curDay);fsMap.invalidateSize({pan:false});updSaveStatus();paintStops()}
function fitSeg(now){if(fsLayers)fsMap.fitBounds(fsLayers.getBounds(),{padding:[30,30],maxZoom:16,animate:!now})}


/* colour today's stops on the maps: done = grey, here now = ring, next = orange and pulsing */
var NOWST=null;
function paintStops(){$$('.mk[data-k]').forEach(function(el){el.classList.remove('done','here','nxt')});
  if(!NOWST)return;var d=document.getElementById(NOWST.day);
  var scope=[];if(d)scope=$$('.dmap .mk[data-k]',d);if(mapfs&&!mapfs.hidden&&curDay===NOWST.day)scope=scope.concat($$('#mf-map .mk[data-k]'));
  scope.forEach(function(el){var k=el.getAttribute('data-k');if(NOWST.past[k])el.classList.add('done');if(k===NOWST.cur)el.classList.add('here');if(k===NOWST.next)el.classList.add('nxt')})}
/* metro overlay: metro and rail lines with stations, on top of the normal map (needs internet) */
var metroOn=false,metroL=null;
function toggleMetro(btn){metroOn=!metroOn;btn.classList.toggle('on',metroOn);var st=$('.mf-status',mapfs);
  if(!metroL)metroL=L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',{subdomains:'abc',maxZoom:19,opacity:.9,attribution:'<a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>'});
  if(metroOn){metroL.addTo(fsMap);st.textContent='Ⓜ Metro overlay: metro and rail lines with station names (OpenRailwayMap; needs internet). Zoom in to read the station names.'}else{fsMap.removeLayer(metroL);st.textContent='';updSaveStatus()}}
/* transit view: public-transport map (bus, tram, metro lines) plus metro and rail lines on top; needs internet */
var fsBase=null,trBase=null,trRail=null,transitOn=false;
function toggleTransit(btn){transitOn=!transitOn;btn.classList.toggle('on',transitOn);var st=$('.mf-status',mapfs);
  if(!trBase){trBase=L.tileLayer('https://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png',{maxZoom:18,attribution:'Transit map <a href="https://memomaps.de/">memomaps.de</a> CC-BY-SA, data © OpenStreetMap'});
    trRail=L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png',{subdomains:'abc',maxZoom:19,opacity:.8,attribution:'<a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>'})}
  if(transitOn){fsMap.removeLayer(fsBase);trBase.addTo(fsMap);if(!metroOn)trRail.addTo(fsMap);trBase.bringToBack();
    st.textContent='🚇 Transit view: bus, tram and metro lines with stops (from OpenStreetMap; needs internet, not saved offline). Zoom in to see line numbers. For the best transit route, tap “Transit in Amap” on a leg.'}
  else{fsMap.removeLayer(trBase);if(fsMap.hasLayer(trRail))fsMap.removeLayer(trRail);fsBase.addTo(fsMap);fsBase.bringToBack();st.textContent='';updSaveStatus()}}
/* your position: blue dot, accuracy circle, follow mode, distance to stops */
var follow=false,meAcc=null,meLL=null,locBtn=null;
var LOCSVG='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" fill="currentColor" transform="rotate(45 12 12)"/></svg>';
function dist(a,b){var R=6371000,t=Math.PI/180,dl=(b[0]-a[0])*t,dn=(b[1]-a[1])*t,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*t)*Math.cos(b[0]*t)*Math.sin(dn/2)*Math.sin(dn/2);return 2*R*Math.asin(Math.sqrt(x))}
function fmtD(m){return m<950?Math.round(m/10)*10+' m':(m/1000).toFixed(m<9500?1:0)+' km'}
function setLocState(st){if(!locBtn)return;locBtn.className='locbtn '+st;locBtn.setAttribute('aria-pressed',st!=='off')}
function addLocControl(){var C=L.Control.extend({options:{position:'bottomright'},onAdd:function(){var b=L.DomUtil.create('button','locbtn off');b.type='button';b.title='Show my position';b.setAttribute('aria-label','Show my position');b.innerHTML=LOCSVG;
    L.DomEvent.disableClickPropagation(b);L.DomEvent.on(b,'click',function(){if(meLL&&meWatch!=null){follow=true;setLocState('follow');fsMap.setView(meLL,Math.max(fsMap.getZoom(),16))}else locate(true)});locBtn=b;return b}});
  fsMap.addControl(new C());fsMap.on('dragstart',function(){if(follow){follow=false;setLocState('on')}})}
function locStatus(pos){var st=$('.mf-status',mapfs);if(!meLL)return;var seg=DAYS[curDay]&&DAYS[curDay][curSeg],best=null;
  if(seg)seg.pts.forEach(function(p){if(!p.n)return;var d=dist(meLL,p.ll);if(!best||d<best.d)best={p:p,d:d}});
  st.textContent='📍 You are the blue dot (±'+Math.round(pos.coords.accuracy)+' m).'+(best?' Nearest stop: '+best.p.n+' '+best.p.name+', '+fmtD(best.d)+' as the crow flies.':'')}
function locate(f){var st=$('.mf-status',mapfs);if(!navigator.geolocation){st.textContent='Location is not available here. In the installed app it works with GPS, even offline.';return}
  st.textContent='Finding you… GPS works without internet.';follow=f!==false;setLocState('wait');
  if(meWatch!=null)navigator.geolocation.clearWatch(meWatch);
  meWatch=navigator.geolocation.watchPosition(function(pos){meLL=[pos.coords.latitude,pos.coords.longitude];try{localStorage.setItem('jn-loc','1')}catch(e){}
    if(!meMarker){meMarker=L.marker(meLL,{icon:L.divIcon({className:'',html:'<div class="mk me" style="width:18px;height:18px"></div>',iconSize:[18,18],iconAnchor:[9,9]}),zIndexOffset:1000,keyboard:false}).bindTooltip('You',{className:'tl'});
      meAcc=L.circle(meLL,{radius:pos.coords.accuracy,color:'#2A7BF4',weight:1,fillColor:'#2A7BF4',fillOpacity:.12,interactive:false})}
    meAcc.setLatLng(meLL).setRadius(Math.min(pos.coords.accuracy,2000)).addTo(fsMap);meMarker.setLatLng(meLL).addTo(fsMap);
    if(follow){setLocState('follow');fsMap.setView(meLL,Math.max(fsMap.getZoom(),16),{animate:true})}else setLocState('on');
    locStatus(pos)},
    function(err){setLocState('off');follow=false;st.textContent=err.code===1?'Location is blocked. Allow it for this app: Android: Settings › Apps › Chrome (or the app) › Permissions › Location. iPhone: Settings › Privacy › Location Services › Safari Websites › While Using.':'No GPS fix yet. Step outside or wait a moment, then tap the arrow again.'},
    {enableHighAccuracy:true,maximumAge:10000,timeout:30000})}
function stopLocate(){if(meWatch!=null){navigator.geolocation.clearWatch(meWatch);meWatch=null}follow=false;setLocState('off')}

/* offline tiles */
function canCache(){return 'caches' in window&&location.protocol==='https:'}
function lon2x(lon,z){return Math.floor((lon+180)/360*Math.pow(2,z))}
function lat2y(lat,z){var r=lat*Math.PI/180;return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,z))}
function tilesFor(seg){var out={},lats=seg.pts.map(function(p){return p.ll[0]}),lngs=seg.pts.map(function(p){return p.ll[1]});
  SHOPS.forEach(function(s){if(s.ll&&seg.pts.some(function(p){return p.k===s.near})){lats.push(s.ll[0]);lngs.push(s.ll[1])}});
  var pad=.008,s=Math.min.apply(0,lats)-pad,n=Math.max.apply(0,lats)+pad,w=Math.min.apply(0,lngs)-pad,e=Math.max.apply(0,lngs)+pad;
  var span=Math.max(n-s,e-w),zMax=span>.6?13:span>.25?14:15;
  function box(z,S,N,W,E){for(var x=lon2x(W,z);x<=lon2x(E,z);x++)for(var y=lat2y(N,z);y<=lat2y(S,z);y++)out[z+'/'+x+'/'+y]=1}
  for(var z=11;z<=zMax;z++)box(z,s,n,w,e);
  /* close-ups around each point and along legs */
  var pts=seg.pts.map(function(p){return p.ll});SHOPS.forEach(function(sh){if(sh.ll&&seg.pts.some(function(p){return p.k===sh.near}))pts.push(sh.ll)});
  pts.forEach(function(ll){for(var z=zMax+1;z<=16;z++){var r=.007;box(z,ll[0]-r,ll[0]+r,ll[1]-r*1.15,ll[1]+r*1.15)}});
  for(var i=1;i<seg.pts.length;i++){var a=seg.pts[i-1].ll,b=seg.pts[i].ll,dist=Math.hypot(a[0]-b[0],a[1]-b[1]);if(dist>.05)continue;var k=Math.ceil(dist/.003);
    for(var j=0;j<=k;j++){var la=a[0]+(b[0]-a[0])*j/k,lo=a[1]+(b[1]-a[1])*j/k;for(var z2=zMax+1;z2<=16;z2++)box(z2,la-.002,la+.002,lo-.002,lo+.002)}}
  return Object.keys(out).map(function(t){var p=t.split('/');return TILE.replace('{z}',p[0]).replace('{x}',p[1]).replace('{y}',p[2])})}
var saving=false;
function updSaveStatus(){if(!canCache()||saving)return;var st=$('.mf-status',mapfs),urls=tilesFor(DAYS[curDay][curSeg]);
  caches.open(TCACHE).then(function(c){return c.keys()}).then(function(keys){var have={};keys.forEach(function(r){have[r.url]=1});var n=urls.filter(function(u){return have[u]}).length;
    st.textContent=n>=urls.length*.98?'✓ This map is saved for offline use.':'Map pieces saved offline: '+n+' of '+urls.length+' (about '+Math.max(1,Math.round((urls.length-n)*18/1024))+' MB to go).'}).catch(function(){})}
function saveOffline(btn){var sg=DAYS[curDay][curSeg];for(var q=1;q<sg.pts.length;q++)pieces(sg.pts[q-1],sg.pts[q]).forEach(function(pc){if(PROF[pc.m])getRoute(pc.m,pc.p[0],pc.p[1])});if(saving)return;saving=true;btn.disabled=true;var st=$('.mf-status',mapfs),urls=tilesFor(DAYS[curDay][curSeg]),done=0,fail=0,i=0;
  caches.open(TCACHE).then(function(c){return c.keys().then(function(keys){var have={};keys.forEach(function(r){have[r.url]=1});urls=urls.filter(function(u){return !have[u]});
    var total=urls.length;if(!total){st.textContent='✓ Already saved for offline use.';saving=false;btn.disabled=false;return}
    function next(){if(i>=urls.length)return Promise.resolve();var u=urls[i++];return fetch(u,{mode:'cors'}).then(function(r){if(r.ok)return c.put(u,r);fail++}).catch(function(){fail++}).then(function(){done++;if(done%10===0||done===total)st.textContent='Saving map… '+done+' / '+total+(fail?' ('+fail+' failed)':'');return next()})}
    return Promise.all([next(),next(),next(),next(),next(),next()]).then(function(){saving=false;btn.disabled=false;st.textContent=fail?('Saved '+(total-fail)+' of '+total+'. Tap again on a better connection to finish.'):'✓ Saved for offline use ('+total+' new map pieces).'})})}).catch(function(){saving=false;btn.disabled=false;st.textContent='Could not save on this device.'})}

/* ---------- Luca ---------- */
function luca(){var mh=$('.masthead');if(mh&&JN.LUCA&&!$('.luca-mh',mh)){var b=document.createElement('button');b.type='button';b.className='luca-mh';b.setAttribute('aria-label','Luca');b.innerHTML=JN.LUCA+'<span class="bub">汪汪! wāng wāng</span>';mh.appendChild(b);
    var lines=JN.BARKS||['汪汪! wāng wāng'],n=0;b.addEventListener('click',function(){$('.bub',b).textContent=lines[n++%lines.length];b.classList.add('bark');clearTimeout(b._t);b._t=setTimeout(function(){b.classList.remove('bark')},2600)})}
  try{if(!sessionStorage.getItem('jn-trot')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){sessionStorage.setItem('jn-trot','1');setTimeout(function(){var t=document.createElement('div');t.className='trot';t.setAttribute('aria-hidden','true');t.innerHTML=JN.LUCA;document.body.appendChild(t);setTimeout(function(){t.remove()},9500)},3500)}}catch(e){}}


/* ---------- weather: Open-Meteo forecast, fetched when online, kept for offline ---------- */
var WXL={sh:{n:'Shanghai',ll:[31.23,121.47],radar:'https://www.nmc.cn/publish/radar/shang-hai/qing-pu.htm'},sz:{n:'Suzhou',ll:[31.30,120.62],radar:'https://www.nmc.cn/publish/radar/shang-hai/qing-pu.htm'},
  hz:{n:'Hangzhou',ll:[30.25,120.16],radar:'https://www.nmc.cn/publish/radar/huadong.html'},tl:{n:'Tonglu (the park)',ll:[29.92,119.52],radar:'https://www.nmc.cn/publish/radar/huadong.html'}};
var MOSAIC='https://www.nmc.cn/publish/radar/huadong.html';
function wmo(c){return c==null?['',' ']:c===0?['☀️','Clear']:c<=2?['🌤️','Partly cloudy']:c===3?['☁️','Overcast']:c<=48?['🌫️','Fog']:c<=55?['🌦️','Drizzle']:c<=57?['🌧️','Freezing drizzle']:c<=65?['🌧️','Rain']:c<=67?['🌧️','Freezing rain']:c<=77?['🌨️','Snow']:c<=82?['🌦️','Showers']:c<=86?['🌨️','Snow showers']:['⛈️','Thunderstorm']}
function wxGet(loc){var k='jn-wx2-'+loc,c=null;try{c=JSON.parse(localStorage.getItem(k)||'null')}catch(e){}
  var fresh=c&&Date.now()-c.t<60*60000;if(fresh||navigator.onLine===false)return Promise.resolve(c);
  var L0=WXL[loc].ll,u='https://api.open-meteo.com/v1/forecast?latitude='+L0[0]+'&longitude='+L0[1]+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Asia%2FShanghai&forecast_days=16';
  return fetch(u).then(function(r){return r.ok?r.json():null}).then(function(d){if(!d||!d.daily)return c;var o={t:Date.now(),d:d};try{localStorage.setItem(k,JSON.stringify(o))}catch(e){}return o}).catch(function(){return c})}
function wxRender(){var today=iso(cn()),locs={};
  $$('.wx').forEach(function(el){locs[el.getAttribute('data-loc')]=1});
  Object.keys(locs).forEach(function(loc){wxGet(loc).then(function(c){
    $$('.wx[data-loc="'+loc+'"]').forEach(function(el){var day=el.closest('.day'),date=day&&day.getAttribute('data-date'),W=WXL[loc];
      var links='<a href="'+W.radar+'" target="_blank" rel="noopener">Rain radar</a>'+(W.radar!==MOSAIC?'<a href="'+MOSAIC+'" target="_blank" rel="noopener">East China radar</a>':'');
      if(date<today){el.innerHTML='';el.hidden=true;return}
      var D=c&&c.d&&c.d.daily,i=D?D.time.indexOf(date):-1;
      if(i<0){el.innerHTML='<div class="wx-row"><span class="wx-t">'+(c?'Forecast not out yet for this day':'Weather loads when you are online')+' · '+esc(W.n)+'</span><span class="wx-l">'+links+'</span></div>';return}
      var w=wmo(D.weather_code[i]),h='<div class="wx-row"><span class="wx-i" title="'+w[1]+'">'+w[0]+'</span><span class="wx-t"><b>'+Math.round(D.temperature_2m_min[i])+'–'+Math.round(D.temperature_2m_max[i])+' °C</b> '+w[1]+' · ☔ '+(D.precipitation_probability_max[i]==null?'–':D.precipitation_probability_max[i]+'%')+(D.precipitation_sum[i]>=0.2?' ('+D.precipitation_sum[i].toFixed(1)+' mm)':'')+' · 💨 '+Math.round(D.wind_speed_10m_max[i])+' km/h · '+esc(W.n)+'</span><span class="wx-l">'+links+'</span></div>';
      if(date===today&&c.d.hourly){var H=c.d.hourly,now=cn(),hh=String(now.getHours()).padStart(2,'0'),start=H.time.indexOf(date+'T'+hh+':00');
        if(start>=0){h+='<div class="wx-h">';for(var j=start;j<Math.min(start+14,H.time.length);j++){var hw=wmo(H.weather_code[j]);h+='<span><i>'+H.time[j].slice(11,13)+'</i>'+hw[0]+'<b>'+Math.round(H.temperature_2m[j])+'°</b><em>'+(H.precipitation_probability[j]||0)+'%</em></span>'}h+='</div>'}}
      var age=Math.round((Date.now()-c.t)/60000);h+='<div class="wx-s">Open-Meteo forecast, updated '+(age<2?'just now':age<60?age+' min ago':Math.round(age/60)+' h ago')+(navigator.onLine===false?' (offline copy)':'')+'</div>';
      el.innerHTML=h;el.hidden=false})})})}
function init(){buildSheet();decorate();if(hasL){buildMapFS();initPreviews()}luca();initNow();wxRender();window.addEventListener('online',wxRender);setInterval(function(){if(!document.hidden)wxRender()},30*60000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
