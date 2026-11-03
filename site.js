/* Kvakic-Gál Renáta Ingatlaniroda – shared site script.
   Every page loads this file; body[data-page] decides which page module runs.
   Listings added in the office panel are stored in the browser (IndexedDB) for this concept;
   in production the same calls go to a server database. */
window.KVboot=function(){
'use strict';
const CLEAN=window.KV_CLEAN=[];
const on=(t,ty,fn,o)=>{t.addEventListener(ty,fn,o);CLEAN.push(()=>t.removeEventListener(ty,fn,o))};
const MAP=(...a)=>{const m=L.map(...a);CLEAN.push(()=>{try{m.remove()}catch(e){}});return m};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch=matchMedia('(hover: none), (pointer: coarse)').matches;
if(touch)document.documentElement.classList.add('touch');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KV=window.KV,PAGE=document.body.dataset.page;
const QS=new URLSearchParams(window.KV_QS!=null?window.KV_QS:location.search);
document.documentElement.classList.add('js');

/* navigation works both on the real site and inside the chat preview */
const go=url=>{if(window.KV_GO)window.KV_GO(url);else location.href=url};
on(document,'click',e=>{
  const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||a.target==='_blank'||e.metaKey||e.ctrlKey)return;
  const h=a.getAttribute('href');
  if(window.KV_GO&&/^[\w-]+\.html([?#].*)?$/.test(h)){e.preventDefault();go(h)}
});
on(document,'click',e=>{const b=e.target.closest('button[type=submit],input[type=submit]');if(!b||!b.form)return;e.preventDefault();b.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))});
const SS={get(k){try{return sessionStorage.getItem(k)}catch(e){return (window.KV_SESSION||{})[k]||null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){if(window.KV_SESSION){window.KV_SESSION[k]=v;ssSync()}}},del(k){try{sessionStorage.removeItem(k)}catch(e){if(window.KV_SESSION){delete window.KV_SESSION[k];ssSync()}}}};
function ssSync(){}
const IMG=k=>!k?'':/^(data:|blob:|https?:)/.test(k)?k:((window.KV_IMG&&window.KV_IMG[k])||(k+'.jpg'));

/* ---------- storage: office listings ---------- */
const Store=(()=>{let p=null,ok=true;const mem=window.KV_MEM||[];const memSet=(id,l)=>{const i=mem.findIndex(x=>x.id===id);if(i>-1)mem.splice(i,1);if(l)mem.push(l);};
  const open=()=>p||(p=new Promise((res,rej)=>{setTimeout(()=>rej(new Error('idb timeout')),1200);try{const r=indexedDB.open('kvakic-iroda',1);r.onupgradeneeded=()=>r.result.createObjectStore('listings',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}}));
  const run=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction('listings',mode),q=fn(t.objectStore('listings'));t.oncomplete=()=>res(q&&q.result);t.onerror=t.onabort=()=>rej(t.error)}));
  return{
    async all(){try{return (await run('readonly',s=>s.getAll()))||[]}catch(e){ok=false;return mem.slice()}},
    async put(l){try{await run('readwrite',s=>s.put(l))}catch(e){ok=false;memSet(l.id,l)}},
    async del(id){try{await run('readwrite',s=>s.delete(id))}catch(e){ok=false;memSet(id,null)}},
    get ok(){return ok}}})();
let U=[];
const loadU=async()=>{U=(await Store.all()).map(l=>({...l,own:true,days:(Date.now()-(l.created||Date.now()))/864e5}));return U};
const ALL=()=>[...U.filter(l=>!l.hidden),...KV.D];
const ANY=id=>U.find(l=>l.id===id)||KV.D.find(l=>l.id===id);
const wheres=()=>[...new Set([...KV.WHERE,...U.filter(l=>!l.hidden).map(l=>l.where)])];

/* ---------- formatting ---------- */
const num=n=>Number(n).toLocaleString('hu-HU');
const fmtPrice=l=>l.mode==='kiado'?`${num(Math.round(l.price*1000))} ezer Ft<i> /hó</i>`:`${String(+l.price).replace('.',',')} M Ft`;
const pill=l=>l.mode==='kiado'?`${Math.round(l.price*1000)} e Ft`:`${String(+l.price).replace('.',',')} M`;
const region=l=>l.city||(['Orfű','Kozármisleny','Pécsvárad'].includes(l.where)?'Baranya':'Pécs');
const href=l=>'ingatlan.html?id='+encodeURIComponent(l.id);
const facts=l=>`<span><b>${l.size}</b> m²</span>${l.rooms?`<span><b>${l.rooms}</b> szoba</span>`:''}${l.plot?`<span><b>${num(l.plot)}</b> m² telek</span>`:''}`;
const card=l=>`<a class="card rv" href="${href(l)}" data-id="${esc(l.id)}">
  <figure class="ph"><img src="${IMG(l.img[0])}" alt="" loading="lazy"></figure>
  <div class="bd"><small>${esc(l.type)} · ${esc(l.where)}${l.own?'':'<em class="smp">minta</em>'}</small><h3>${esc(l.t)}</h3><div class="price">${fmtPrice(l)}</div><div class="facts">${facts(l)}</div></div></a>`;

/* ---------- toast ---------- */
let tEl=$('#toast');if(!tEl){tEl=document.createElement('div');tEl.className='toast';tEl.id='toast';tEl.setAttribute('role','status');document.body.appendChild(tEl)}
let tt;const toast=m=>{tEl.textContent=m;tEl.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>tEl.classList.remove('show'),3400)};

/* ---------- header ---------- */
const nav=$('#nav');
$$('a[data-nav]').forEach(a=>a.removeAttribute('aria-current'));document.body.classList.remove('menu-open');document.body.style.overflow='';if(nav)nav.classList.remove('hide');
$$('a[data-nav]').forEach(a=>{if(a.dataset.nav&&a.dataset.nav===document.body.dataset.nav)a.setAttribute('aria-current','page')});
const alwaysSolid=['list','detail'].includes(PAGE);
let ly=scrollY;
function onScroll(){if(!nav)return;const y=scrollY,H=innerHeight,open=document.body.classList.contains('menu-open');
  nav.classList.toggle('solid',alwaysSolid||y>60||open);
  if(y>140&&y>ly+6&&!open)nav.classList.add('hide');else if(y<ly-6||y<=140)nav.classList.remove('hide');ly=y;
  document.body.classList.toggle('nav-shown',!nav.classList.contains('hide'));document.body.classList.toggle('no-nav',nav.classList.contains('hide'));
  const vt=$('#vt'),ex=$('#ingatlanok');if(vt&&ex){const r=ex.getBoundingClientRect();vt.classList.toggle('show',r.top<H*.6&&r.bottom>H*.6)}}
let tk=false;on(window,'scroll',()=>{if(!tk){tk=true;requestAnimationFrame(()=>{tk=false;onScroll()})}},{passive:true});
const burger=$('#burger');
const menu=o=>{document.body.classList.toggle('menu-open',o);burger&&burger.setAttribute('aria-expanded',o);lockScroll(o);onScroll()};
if(burger){burger.onclick=()=>menu(!document.body.classList.contains('menu-open'));$$('#mmenu a').forEach(a=>a.addEventListener('click',()=>menu(false)))}

/* ---------- smooth scroll (desktop) ---------- */
let lenis=window.__lenis||null;
const wantLenis=!!window.Lenis&&!reduce&&matchMedia('(pointer:fine)').matches&&PAGE!=='office';
if(wantLenis&&!lenis){lenis=window.__lenis=new Lenis({duration:1.15,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t))});
  const raf=t=>{if(window.__lenis)window.__lenis.raf(t);requestAnimationFrame(raf)};requestAnimationFrame(raf);document.documentElement.style.scrollBehavior='auto'}
else if(!wantLenis&&lenis){lenis.destroy();lenis=window.__lenis=null}
if(lenis)lenis.start();
function lockScroll(o){document.body.style.overflow=o?'hidden':'';if(lenis)o?lenis.stop():lenis.start()}
const scrollToEl=el=>{if(!el)return;if(lenis)lenis.scrollTo(el,{offset:-90});else el.scrollIntoView({behavior:reduce?'auto':'smooth'})};
on(document,'click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute('href');if(id.length<2)return;const t=document.querySelector(id);if(t){e.preventDefault();scrollToEl(t)}});

/* ---------- reveals ---------- */
const splitWords=root=>$$('.split',root).forEach(el=>{if(el.dataset.done)return;el.dataset.done=1;const parts=[];el.childNodes.forEach(n=>{const em=n.nodeName==='EM';(n.textContent||'').split(/\s+/).filter(Boolean).forEach(w=>parts.push([w,em]))});
  el.setAttribute('aria-label',el.textContent.replace(/\s+/g,' ').trim());
  el.innerHTML=parts.map(([w,em],i)=>`<span class="ln" aria-hidden="true"><span class="wi" style="--i:${i}">${em?`<em>${esc(w)}</em>`:esc(w)}</span></span>`).join(' ')});
splitWords(document);
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});CLEAN.push(()=>io.disconnect());
const watch=r=>$$('.rv,.ph,.split',r).forEach(el=>{if(!el.closest('.hero'))io.observe(el)});
watch(document);
const hero=$('#hero');
if(hero){const hi=$('#heroImg');const ready=()=>{hero.classList.add('ready');$$('.hero .split').forEach(e=>e.classList.add('in'));$$('.hero .up').forEach(e=>e.classList.add('in'))};hi&&!hi.complete?(hi.addEventListener('load',ready,{once:true}),setTimeout(ready,1500)):ready()}
else $$('.ph-top .split,.lp-head .split').forEach(e=>setTimeout(()=>e.classList.add('in'),120));

/* ---------- scroll effects: hero image drift, parallax, lit words ---------- */
const lit=$('#lit');if(lit)lit.innerHTML=lit.textContent.trim().split(/\s+/).map(w=>`<span class="w">${esc(w)}</span>`).join(' ');
const litW=lit?$$('.w',lit):[];
const heroImg=$('.hero .bg img');
const parVis=new Set();const parIO=new IntersectionObserver(es=>es.forEach(e=>{e.isIntersecting?(parVis.add(e.target),e.target.classList.add('par-on')):(parVis.delete(e.target),e.target.classList.remove('par-on'))}),{rootMargin:'80px 0px'});CLEAN.push(()=>parIO.disconnect());
const watchPar=r=>$$('[data-par]',r).forEach(f=>parIO.observe(f));watchPar(document);
function fx(){const H=innerHeight,y=scrollY;
  if(heroImg&&!reduce&&y<H*1.2)heroImg.style.transform=`translate3d(0,${(y*.3).toFixed(1)}px,0) scale(${(1+y/H*.06).toFixed(3)})`;
  if(!reduce)parVis.forEach(f=>{const r=f.getBoundingClientRect();f.style.setProperty('--py',(((r.top+r.height/2-H/2)/H)*-60).toFixed(1)+'px')});
  if(lit){const r=lit.getBoundingClientRect();const k=Math.min(1,Math.max(0,(H*.85-r.top)/(r.height+H*.35)));const n=Math.round(k*litW.length);litW.forEach((w,i)=>w.classList.toggle('on',reduce||i<n))}}
let fq=false;const fxTick=()=>{if(!fq){fq=true;requestAnimationFrame(()=>{fq=false;fx()})}};
on(window,'scroll',fxTick,{passive:true});on(window,'resize',fxTick);fx();

/* ---------- shared bits ---------- */
const tile=()=>L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'});
const telOk=v=>v.replace(/\D/g,'').length>=9;
function demoForm(form,fields,msg){if(!form)return;form.addEventListener('submit',e=>{e.preventDefault();for(const [id,test,err] of fields){const el=$('#'+id);if(!test(el.value)){el.setAttribute('aria-invalid','true');el.focus();toast(err);return}el.removeAttribute('aria-invalid')}form.reset();toast(msg)})}
function teamGrid(){const g=$('#teamGrid');if(!g)return;g.innerHTML=Object.values(KV.AG).map(([n,img,role],i)=>`<div class="member rv" style="--d:${i*.06}s"><figure class="ph${img?'':' mono'}">${img?`<img src="${IMG(img)}" alt="${esc(n)}" width="400" height="521" loading="lazy">`:`<span aria-hidden="true">${n.split(' ').map(x=>x[0]).join('')}</span>`}</figure><b>${esc(n)}</b><span class="r">${esc(role)}</span></div>`).join('');watch(g)}
const fillWhere=(sel,keep)=>{if(!sel)return;const v=keep?sel.value:'';sel.innerHTML='<option value="">Pécs és környéke</option>'+wheres().map(w=>`<option>${esc(w)}</option>`).join('');sel.value=v};
const fillPrice=(sel,mode)=>{if(sel)sel.innerHTML=KV.PRICES[mode].map(([v,t])=>`<option value="${v}">${t}</option>`).join('')};

/* =====================================================================
   PAGES
   ===================================================================== */
const pages={};

pages.home=async()=>{
  let qmode='elado';const qm=$('#qMode');fillWhere($('#qWhere'));fillPrice($('#qPrice'),'elado');
  $$('[data-qmode]').forEach(b=>b.onclick=()=>{qmode=b.dataset.qmode;if(qm)qm.value=qmode;$$('[data-qmode]').forEach(x=>x.setAttribute('aria-pressed',x===b));fillPrice($('#qPrice'),qmode)});
  $('#qs').onsubmit=e=>{e.preventDefault();const p=new URLSearchParams({mode:qmode});const w=$('#qWhere').value,t=$('#qType').value,a=$('#qPrice').value;if(w)p.set('hol',w);if(t)p.set('tipus',t);if(+a)p.set('ar',a);go('ingatlanok.html?'+p)};
  await loadU();
  const own=U.filter(l=>l.feat&&!l.hidden);
  const fl=[...own,...['KV-1042','KV-1031','KV-1035'].map(id=>KV.D.find(l=>l.id===id))].slice(0,3);
  $('#featGrid').innerHTML=fl.map((l,i)=>`<a class="fcard rv" href="${href(l)}" style="--d:${i*.08}s"><figure class="ph" data-par><img src="${IMG(l.img[0])}" alt="" loading="lazy"></figure><div class="fc"><small>${esc(l.type)} · ${esc(l.where)}${l.own?'':' · mintahirdetés'}</small><h3>${esc(l.t)}</h3><div class="row"><span>${l.size} m²${l.rooms?` · ${l.rooms} szoba`:''}${l.plot?` · ${num(l.plot)} m² telek`:''}</span><span class="price">${fmtPrice(l)}</span></div></div></a>`).join('');
  watch($('#featGrid'));watchPar($('#featGrid'));teamGrid();
  if(window.L&&$('#homeMap')){const vis=ALL();const m=MAP('homeMap',{scrollWheelZoom:false,zoomControl:true,attributionControl:true}).setView([46.075,18.225],11);tile().addTo(m);
    vis.forEach(l=>{const mk=L.circleMarker(l.ll,{radius:7,weight:2,color:'#141B17',fillColor:'#C6A26A',fillOpacity:1,className:'hdot'});mk.bindTooltip(`<b>${pill(l)}</b> · ${esc(l.t)}`,{direction:'top',offset:[0,-8],className:'htip'});mk.on('click',()=>go(href(l)));mk.addTo(m)});
    if(vis.length)m.fitBounds(L.latLngBounds(vis.map(l=>l.ll)).pad(.15),{maxZoom:13});
    const c=$('#mbCount');if(c){const e=vis.filter(l=>l.mode==='elado').length,k=vis.length-e;c.innerHTML=`<b>${e}</b> eladó <span>·</span> <b>${k}</b> kiadó ingatlan`}}
  fx();
};

pages.list=async()=>{
  await loadU();
  const S={mode:QS.get('mode')==='kiado'?'kiado':'elado',type:QS.get('tipus')||'',rooms:+(QS.get('szoba')||0),where:QS.get('hol')||'',max:+(QS.get('ar')||0),sort:'new'};
  const listEl=$('#list');fillWhere($('#fWhere'));
  let map=null,layer=null;const MK={};
  if(window.L){map=MAP('map',{scrollWheelZoom:false}).setView([46.075,18.225],12);tile().addTo(map);map.on('focus',()=>map.scrollWheelZoom.enable());map.on('blur',()=>map.scrollWheelZoom.disable());layer=L.layerGroup().addTo(map)}
  const filtered=()=>ALL().filter(l=>l.mode===S.mode&&(!S.type||l.type===S.type)&&(!S.rooms||l.rooms>=S.rooms)&&(!S.where||l.where===S.where)&&(!S.max||l.price<=S.max))
    .sort({new:(a,b)=>a.days-b.days,asc:(a,b)=>a.price-b.price,desc:(a,b)=>b.price-a.price,size:(a,b)=>b.size-a.size}[S.sort]);
  const hl=(id,on)=>{const c=listEl.querySelector(`.card[data-id="${CSS.escape(id)}"]`);c&&c.classList.toggle('on',on);const m=MK[id];if(m&&m._icon){m._icon.classList.toggle('on',on);m.setZIndexOffset(on?1000:0)}};
  function syncQS(){if(window.KV_GO)return;const p=new URLSearchParams({mode:S.mode});if(S.where)p.set('hol',S.where);if(S.type)p.set('tipus',S.type);if(S.rooms)p.set('szoba',S.rooms);if(S.max)p.set('ar',S.max);try{history.replaceState(null,'','?'+p)}catch(e){}}
  function render(fit){
    $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===S.mode));
    $('#fType').value=S.type;$('#fRooms').value=String(S.rooms);$('#fWhere').value=S.where;
    fillPrice($('#fPrice'),S.mode);$('#fPrice').value=String(S.max);if($('#fPrice').selectedIndex<0){$('#fPrice').value='0';S.max=0}$('#fSort').value=S.sort;
    const r=filtered();$('#count').innerHTML=`<b>${r.length}</b> ingatlan`;
    if(!r.length){listEl.innerHTML=`<div class="empty"><h3>Erre most nincs találat</h3><p>Próbáljon tágabb ársávot vagy másik városrészt, vagy kérje, hogy szóljunk, ha ilyen ingatlan érkezik.</p><button class="btn btn-ink" type="button" id="clr">Szűrők törlése</button></div>`;$('#clr').onclick=()=>{Object.assign(S,{type:'',rooms:0,where:'',max:0});render(true)}}
    else listEl.innerHTML=r.map(card).join('');
    watch(listEl);
    $$('.card',listEl).forEach(c=>{const id=c.dataset.id;c.onmouseenter=()=>hl(id,true);c.onmouseleave=()=>hl(id,false)});
    if(map){layer.clearLayers();r.forEach(l=>{const m=L.marker(l.ll,{icon:L.divIcon({className:'pm',html:`<span>${pill(l)}</span>`,iconSize:[0,0]}),keyboard:true,title:l.t,riseOnHover:true});m.on('click',()=>go(href(l)));m.on('mouseover',()=>hl(l.id,true));m.on('mouseout',()=>hl(l.id,false));m.addTo(layer);MK[l.id]=m});
      if(fit&&r.length)map.fitBounds(L.latLngBounds(r.map(l=>l.ll)).pad(.25),{maxZoom:14,animate:!reduce})}
    syncQS();
  }
  $$('[data-mode]').forEach(b=>b.onclick=()=>{S.mode=b.dataset.mode;S.max=0;render(true)});
  $('#fType').onchange=e=>{S.type=e.target.value;render(true)};
  $('#fRooms').onchange=e=>{S.rooms=+e.target.value;render(true)};
  $('#fWhere').onchange=e=>{S.where=e.target.value;render(true)};
  $('#fPrice').onchange=e=>{S.max=+e.target.value;render(true)};
  $('#fSort').onchange=e=>{S.sort=e.target.value;render(false)};
  const ex=$('#ingatlanok'),vt=$('#vt');
  let listY=null;
  const jump=(y,showNav)=>{y=Math.max(0,Math.round(y));ly=y;if(showNav){nav.classList.remove('hide');document.body.classList.add('nav-shown');document.body.classList.remove('no-nav')}if(lenis)lenis.scrollTo(y,{immediate:true});else scrollTo(0,y)};
  const exsTop=()=>$('.exs').getBoundingClientRect().top+scrollY-$('#bar').offsetHeight-(nav?nav.offsetHeight:0);
  vt.onclick=()=>{const toMap=!ex.classList.contains('show-map');
    if(toMap)listY=scrollY;
    ex.classList.toggle('show-map',toMap);
    vt.querySelector('span').textContent=toMap?'Lista':'Térkép';vt.querySelector('use').setAttribute('href',toMap?'#i-lst':'#i-map');
    if(toMap){if(map){map.invalidateSize();render(true)}jump(exsTop(),true)}
    else jump(listY!=null?listY:exsTop());
    requestAnimationFrame(onScroll)};
  render(true);on(window,'resize',()=>map&&map.invalidateSize());
  if(QS.get('nezet')==='terkep'&&matchMedia('(max-width:900px)').matches)vt.click();
};

pages.detail=async()=>{
  await loadU();
  const box=$('#pp'),id=QS.get('id'),l=id&&ANY(id);
  if(!l||(l.hidden&&!QS.has('elonezet'))){box.innerHTML=`<section class="pp-404"><div class="wrap"><span class="eyebrow">Ingatlan</span><h1 style="margin-top:18px">Ez a hirdetés már nem elérhető</h1><p>Lehet, hogy időközben elkelt, vagy az iroda visszavonta.</p><a class="btn btn-ink" href="ingatlanok.html">Többi ingatlan <svg><use href="#ar"/></svg></a></div></section>`;return}
  document.title=`${l.t} – ${l.where} | Kvakic-Gál Renáta Ingatlaniroda`;
  const ag=KV.AG[l.ag]||KV.AG.renata,n=l.img.length;
  const more=[['Állapot',l.cond],['Fűtés',l.heat],['Emelet',l.floor],['Építés éve',l.year],['Telek',l.plot?num(l.plot)+' m²':''],['Azonosító',l.id]].filter(x=>x[1]);
  const sim=ALL().filter(x=>x.id!==l.id&&x.mode===l.mode).sort((a,b)=>Math.abs(a.price-l.price)-Math.abs(b.price-l.price)).slice(0,3);
  box.innerHTML=`<article class="pp">
    <div class="pp-gal ${n===1?'one':n===2?'two':''}" id="gal">${l.img.slice(0,3).map((k,i)=>`<button type="button" data-i="${i}" aria-label="${i+1}. fotó megnyitása"><img src="${IMG(k)}" alt="${esc(l.t)}, ${i+1}. fotó"${i?' loading="lazy"':''}>${i===Math.min(2,n-1)&&n>1?`<span class="all">Mind a ${n} fotó</span>`:''}</button>`).join('')}</div>
    <div class="wrap pp-main">
      <div>
        <p class="crumb"><a href="index.html">Főoldal</a> / <a href="ingatlanok.html?mode=${l.mode}">${l.mode==='kiado'?'Kiadó':'Eladó'} ingatlanok</a> / ${esc(l.where)}</p>
        <span class="eyebrow">${l.mode==='kiado'?'Kiadó':'Eladó'} ${esc(l.type.toLowerCase())}${l.own?'':' · mintahirdetés'}</span>
        <h1 class="split" id="ppH">${esc(l.t)}</h1>
        <p class="loc">${esc(l.where)}, ${esc(region(l))}${l.addr&&l.showAddr?` · ${esc(l.addr)}`:''}</p>
        <div class="price">${fmtPrice(l)}${l.mode==='elado'&&l.size?`<i>${num(Math.round(l.price*1e6/l.size))} Ft/m²</i>`:''}</div>
        <div class="kv"><div><small>Alapterület</small><b>${l.size} m²</b></div><div><small>Szobák</small><b>${l.rooms||'–'}</b></div><div><small>${l.plot?'Telek':'Típus'}</small><b>${l.plot?num(l.plot)+' m²':esc(l.type)}</b></div><div><small>Városrész</small><b style="font-size:1.25rem">${esc(l.where)}</b></div></div>
        ${l.d?`<h2 class="h rv">Leírás</h2><p class="desc rv">${esc(l.d)}</p>`:''}
        ${l.f&&l.f.length?`<h2 class="h rv">Jellemzők</h2><div class="feats rv">${l.f.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}
        ${more.length>1?`<h2 class="h rv">További adatok</h2><div class="dmore rv">${more.map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>`:''}
        <h2 class="h rv">Elhelyezkedés</h2><div class="pp-map rv" id="ppMap" role="region" aria-label="Az ingatlan környéke a térképen"></div>
        <p class="pp-note" style="margin-top:10px">A térkép a környéket mutatja, a pontos címet megtekintéskor adjuk meg.</p>
        ${l.own?'':'<p class="pp-note" style="margin-top:22px">Mintahirdetés a koncepció bemutatásához. Élesben itt az iroda valódi hirdetései jelennek meg.</p>'}
      </div>
      <aside class="pp-side">
        <div class="pp-card">
          <div class="ag">${ag[1]?`<img src="${IMG(ag[1])}" alt="${esc(ag[0])}">`:`<span style="width:64px;height:64px;display:grid;place-items:center;background:var(--forest);font-family:var(--f-d);font-size:1.6rem;color:var(--gold)">${ag[0].split(' ').map(x=>x[0]).join('')}</span>`}<div><b>${esc(ag[0])}</b><span>${esc(ag[2])}</span></div></div>
          <h3>Időpontot kérek</h3>
          <form id="bk" novalidate><input id="bN" placeholder="Név" autocomplete="name" aria-label="Név"><input id="bT" placeholder="Telefonszám" type="tel" autocomplete="tel" aria-label="Telefonszám"><textarea id="bM" rows="3" aria-label="Üzenet">Érdekelne a(z) ${esc(l.id)} azonosítójú ingatlan. Mikor lehetne megnézni?</textarea><button class="btn btn-gold" type="submit">Kérem a visszahívást <svg><use href="#ar"/></svg></button></form>
          <div class="tel"><span>Vagy hívjon most</span><a href="tel:${KV.OFFICE.telHref}">${KV.OFFICE.tel}</a></div>
        </div>
      </aside>
    </div>
    ${sim.length?`<section class="sec ivory" style="padding:100px 0"><div class="wrap"><div class="sec-h"><div><span class="eyebrow rv">Hasonló ingatlanok</span><h2 class="split">Ez is <em>érdekelheti</em></h2></div><a class="link rv" href="ingatlanok.html?mode=${l.mode}">Összes ${l.mode==='kiado'?'kiadó':'eladó'} <svg><use href="#ar"/></svg></a></div><div class="sim">${sim.map(card).join('')}</div></div></section>`:''}
  </article>`;
  splitWords(box);watch(box);setTimeout(()=>$('#ppH')&&$('#ppH').classList.add('in'),80);
  if(window.L){const m=MAP('ppMap',{scrollWheelZoom:false}).setView(l.ll,14);tile().addTo(m);L.circle(l.ll,{radius:260,color:'#9C7A44',weight:1.5,fillColor:'#C6A26A',fillOpacity:.22}).addTo(m);L.marker(l.ll,{icon:L.divIcon({className:'pm',html:`<span>${pill(l)}</span>`,iconSize:[0,0]})}).addTo(m)}
  demoForm($('#bk'),[['bN',v=>v.trim().length>1,'Kérjük, adja meg a nevét.'],['bT',telOk,'Kérjük, adjon meg egy telefonszámot.']],'Köszönjük! Munkanapokon 24 órán belül visszahívjuk. (bemutató)');
  /* lightbox */
  let li=0;const lb=document.createElement('div');lb.className='lb';lb.hidden=true;lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Fotók');
  lb.innerHTML=`<div class="lb-top"><span id="lbC"></span><button class="x" type="button" id="lbX" aria-label="Bezárás"><svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.3"><path d="M1 1l12 12M13 1L1 13"/></svg></button></div><div class="lb-img"><img id="lbI" alt=""></div><div class="lb-nav"><button type="button" id="lbP" aria-label="Előző fotó"><svg width="16" height="16" style="transform:scaleX(-1)"><use href="#ar"/></svg></button><button type="button" id="lbN" aria-label="Következő fotó"><svg width="16" height="16"><use href="#ar"/></svg></button></div>`;
  document.body.appendChild(lb);CLEAN.push(()=>lb.remove());
  const show=i=>{li=(i+n)%n;$('#lbI').src=IMG(l.img[li]);$('#lbI').alt=`${l.t}, ${li+1}. fotó`;$('#lbC').textContent=`${li+1} / ${n}`};
  const openLb=i=>{show(i);lb.hidden=false;requestAnimationFrame(()=>lb.classList.add('open'));lockScroll(true);$('#lbX').focus()};
  const closeLb=()=>{lb.classList.remove('open');setTimeout(()=>lb.hidden=true,300);lockScroll(false)};
  $$('#gal button').forEach(b=>b.onclick=()=>openLb(+b.dataset.i));
  $('#lbX').onclick=closeLb;$('#lbP').onclick=()=>show(li-1);$('#lbN').onclick=()=>show(li+1);
  on(document,'keydown',e=>{if(lb.hidden)return;if(e.key==='Escape')closeLb();if(e.key==='ArrowLeft')show(li-1);if(e.key==='ArrowRight')show(li+1)});
};

pages.sell=()=>demoForm($('#vform'),[['vName',v=>v.trim().length>1,'Kérjük, adja meg a nevét.'],['vTel',telOk,'Kérjük, adjon meg egy telefonszámot.']],'Köszönjük! Hamarosan visszahívjuk az értékbecslés miatt. (bemutató)');
pages.services=()=>{};
pages.service=()=>demoForm($('#sform'),[['sN',v=>v.trim().length>1,'Kérjük, adja meg a nevét.'],['sT',telOk,'Kérjük, adjon meg egy telefonszámot.']],'Köszönjük! Munkanapokon 24 órán belül visszahívjuk. (bemutató)');
pages.about=()=>teamGrid();
pages.contact=()=>{
  if(window.L){const m=MAP('ctMap',{scrollWheelZoom:false}).setView(KV.OFFICE.ll,15);tile().addTo(m);L.marker(KV.OFFICE.ll,{icon:L.divIcon({className:'pm',html:'<span>Iroda · Fsz. 2.</span>',iconSize:[0,0]})}).addTo(m)}
  demoForm($('#cform'),[['cN',v=>v.trim().length>1,'Kérjük, adja meg a nevét.'],['cE',v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),'Kérjük, ellenőrizze az e-mail címet.'],['cM',v=>v.trim().length>4,'Kérjük, írja meg röviden, miben segíthetünk.']],'Köszönjük az üzenetet! Hamarosan válaszolunk. (bemutató)');
};

/* =====================================================================
   OFFICE PANEL – staff add, edit, hide, feature and delete listings
   ===================================================================== */
const TYPES=['Lakás','Ház','Nyaraló','Telek','Iroda','Üzlethelyiség','Garázs'];
const FEATS=['Erkély','Terasz','Kert','Medence','Garázs','Beálló','Lift','Klíma','Panoráma','Bútorozott','Gépesített konyha','Új építésű','Felújított','Napelem','Padlófűtés','Hőszivattyú','Távfűtés','Gázcirkó','Kisállat hozható','Akadálymentes'];
const CONDS=['','Új építésű','Újszerű','Felújított','Jó állapotú','Közepes állapotú','Felújítandó'];
const HEATS=['','Gázcirkó','Távfűtés','Hőszivattyú','Padlófűtés','Elektromos','Vegyes tüzelés','Egyéb'];
const blank=()=>({id:'',mode:'elado',type:'Lakás',t:'',where:'',addr:'',showAddr:false,ll:null,price:'',size:'',rooms:'',plot:'',floor:'',year:'',cond:'',heat:'',f:[],d:'',img:[],ag:'renata',feat:false,hidden:false});

pages.office=async()=>{
  await loadU();
  const root=$('#office');let who=SS.get('kv-who');
  let F=blank(),editing=false,amap=null,apin=null,tab='new';
  const save=async l=>{await Store.put(l);await loadU()};

  function shell(){
    root.innerHTML=`<div class="adm page">
      <header class="adm-top"><a class="bs" href="index.html" style="text-decoration:none;color:inherit"><img src="${(window.KV_IMG&&window.KV_IMG['mono-gold'])||'mono-gold.png'}" alt="">Irodai felület</a>
        <nav class="adm-tabs" role="tablist" aria-label="Irodai menü" ${who?'':'hidden'}><button type="button" role="tab" data-tab="new">Új hirdetés</button><button type="button" role="tab" data-tab="mine">Hirdetéseim <i id="cnt"></i></button></nav>
        <span class="who">${who?`Belépve: ${esc((KV.AG[who]||[''])[0])}`:''}</span>
        ${who?'<button class="btn-s" type="button" id="out" style="height:40px">Kilépés</button>':''}
        <a class="btn-s" href="index.html" style="height:40px;display:inline-flex;align-items:center;text-decoration:none;background:var(--gold);color:var(--ink)">Weboldal</a></header>
      <p class="adm-note">Bemutató: a feltöltött hirdetések ebben a böngészőben tárolódnak, és itt azonnal megjelennek a weboldalon. Élesben szerveren tároljuk őket, így minden látogató látja.</p>
      <div id="admMain"></div></div>`;
    $$('[data-tab]',root).forEach(b=>b.onclick=()=>{tab=b.dataset.tab;if(tab==='new'&&!editing)F=blank();view()});
    const o=$('#out',root);if(o)o.onclick=()=>{SS.del('kv-who');who=null;shell();view()};
  }
  function view(){
    const main=$('#admMain');amap=null;
    $$('[data-tab]',root).forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===tab));
    const c=$('#cnt',root);if(c)c.textContent=U.length;
    if(!who)return login(main);
    tab==='mine'?mine(main):form(main);
    scrollTo(0,0);
  }
  function login(main){
    main.innerHTML=`<div class="adm-login"><form class="lg-card" id="lg" novalidate><span class="eyebrow">Kvakic-Gál Renáta Ingatlaniroda</span><h2>Belépés</h2><p>Itt adhatják fel és kezelhetik a kollégák a hirdetéseiket.</p>
      <label class="fld"><span>Ki vagy?</span><select class="af-sel" id="lgW">${Object.entries(KV.AG).map(([k,a])=>`<option value="${k}">${esc(a[0])}</option>`).join('')}</select></label>
      <label class="fld"><span>Jelszó</span><input class="af-in" id="lgP" type="password" autocomplete="current-password"><span class="hint">Bemutató: bármilyen jelszóval beléphet. Élesben minden kollégának saját belépése van.</span></label>
      <button class="btn btn-ink" type="submit">Belépés <svg><use href="#ar"/></svg></button></form></div>`;
    $('#lg').onsubmit=e=>{e.preventDefault();who=$('#lgW').value;SS.set('kv-who',who);F=blank();F.ag=who;tab=QS.get('lap')==='mine'?'mine':'new';shell();view()};
  }

  /* ---------- my listings ---------- */
  function mine(main){
    const list=[...U].sort((a,b)=>(b.created||0)-(a.created||0));
    main.innerHTML=`<div class="mine"><div class="mine-h"><div><span class="eyebrow">Hirdetéseim</span><h2 style="margin-top:14px">${list.length?`${list.length} hirdetés`:'Még nincs hirdetés'}</h2></div><button class="btn btn-ink" type="button" id="toNew">Új hirdetés <svg><use href="#ar"/></svg></button></div>
      ${list.length?list.map(l=>`<div class="row-l" data-id="${esc(l.id)}"><figure class="ph"><img src="${IMG(l.img[0])}" alt=""></figure>
        <div><h3>${esc(l.t)}</h3><div class="meta"><span>${l.mode==='kiado'?'Kiadó':'Eladó'} ${esc(l.type.toLowerCase())} · ${esc(l.where)}</span><span>${fmtPrice(l).replace(/<\/?i>/g,'')}</span><span>${esc(l.id)}</span></div>
        <div class="meta"><span class="st ${l.hidden?'off':''}">${l.hidden?'Rejtett':'Aktív'}</span>${l.feat?'<span class="st ft">Kiemelt</span>':''}<span>Feltöltve: ${new Date(l.created).toLocaleDateString('hu-HU')}</span></div></div>
        <div class="acts"><button type="button" data-a="view">Megnézem</button><button type="button" data-a="edit">Szerkesztés</button><button type="button" data-a="feat">${l.feat?'Kiemelés le':'Kiemelés'}</button><button type="button" data-a="hide">${l.hidden?'Megjelenítés':'Elrejtés'}</button><button type="button" class="del" data-a="del">Törlés</button></div></div>`).join('')
      :`<div class="mine-empty"><h3>Adja fel az első hirdetést</h3><p>Pár perc az egész: adatok, fotók, hely a térképen, és már látszik is a weboldalon.</p><button class="btn btn-gold" type="button" id="toNew2">Új hirdetés <svg><use href="#ar"/></svg></button></div>`}</div>`;
    [$('#toNew'),$('#toNew2')].forEach(b=>b&&(b.onclick=()=>{editing=false;F=blank();F.ag=who;tab='new';view()}));
    $$('.row-l',main).forEach(r=>{const id=r.dataset.id,l=U.find(x=>x.id===id);let arm;
      $$('[data-a]',r).forEach(b=>b.onclick=async()=>{const a=b.dataset.a;
        if(a==='view')go(href(l)+(l.hidden?'&elonezet=1':''));
        if(a==='edit'){F=JSON.parse(JSON.stringify(l));delete F.own;delete F.days;F.price=l.mode==='kiado'?Math.round(l.price*1000):l.price;editing=true;tab='new';view()}
        if(a==='feat'){await save({...strip(l),feat:!l.feat});toast(l.feat?'Kiemelés levéve.':'Kiemelve: a főoldalon a kiemelt ajánlatok között látszik.');view()}
        if(a==='hide'){await save({...strip(l),hidden:!l.hidden});toast(l.hidden?'A hirdetés újra látható.':'A hirdetés elrejtve, a weboldalon nem látszik.');view()}
        if(a==='del'){if(!b.classList.contains('arm')){b.classList.add('arm');b.textContent='Biztosan törlöd?';clearTimeout(arm);arm=setTimeout(()=>{b.classList.remove('arm');b.textContent='Törlés'},3500);return}
          await Store.del(id);await loadU();toast('Hirdetés törölve.');view()}})})
  }
  const strip=l=>{const c={...l};delete c.own;delete c.days;return c};

  /* ---------- new / edit form ---------- */
  function form(main){
    if(!F.ag)F.ag=who;
    const opt=(arr,v)=>arr.map(x=>`<option value="${esc(x)}"${x===v?' selected':''}>${x||'Válasszon'}</option>`).join('');
    main.innerHTML=`<div class="adm-body"><form class="adm-form" id="af" novalidate>
      <section class="af-sec"><h3><small>01</small>Alapadatok</h3><div class="af-grid">
        <div class="fld wide"><span>Hirdetés típusa</span><div class="segx" role="group" aria-label="Eladó vagy kiadó"><button type="button" data-m="elado">Eladó</button><button type="button" data-m="kiado">Kiadó</button></div></div>
        <label class="fld"><span>Ingatlan típusa</span><select class="af-sel" id="aType">${opt(TYPES,F.type)}</select></label>
        <label class="fld"><span>Értékesítő</span><select class="af-sel" id="aAg">${Object.entries(KV.AG).map(([k,a])=>`<option value="${k}"${k===F.ag?' selected':''}>${esc(a[0])}</option>`).join('')}</select></label>
        <label class="fld wide"><span>Hirdetés címe</span><input class="af-in" id="aT" maxlength="70" value="${esc(F.t)}" placeholder="pl. Felújított 3 szobás lakás erkéllyel"><span class="hint" id="aTc"></span></label>
      </div></section>
      <section class="af-sec"><h3><small>02</small>Elhelyezkedés</h3><div class="af-grid">
        <label class="fld"><span>Település, városrész</span><input class="af-in" id="aW" list="whereList" value="${esc(F.where)}" placeholder="pl. Belváros"><datalist id="whereList">${wheres().map(w=>`<option value="${esc(w)}">`).join('')}</datalist></label>
        <label class="fld"><span>Cím <i>(nem kötelező)</i></span><div class="locrow"><input class="af-in" id="aA" value="${esc(F.addr)}" placeholder="utca, házszám"><button class="btn-s" type="button" id="aFind">Keresés</button></div></label>
        <div class="fld wide"><span>Hely a térképen</span><div class="amap" id="amap" role="region" aria-label="Kattintson a térképre az ingatlan helyének kijelöléséhez"></div><span class="hint" id="aLL">Kattintson a térképre, vagy keressen rá a címre. A jelölő húzható.</span></div>
        <label class="tog wide fld" style="display:flex"><span><b>Pontos cím megjelenítése</b><small>Kikapcsolva csak a városrész és a környék látszik.</small></span><input type="checkbox" id="aSA" ${F.showAddr?'checked':''}></label>
      </div></section>
      <section class="af-sec"><h3><small>03</small>Ár és méret</h3><div class="af-grid c3">
        <label class="fld"><span>Ár</span><div class="unit"><input class="af-in" id="aP" inputmode="decimal" value="${esc(F.price)}"><b id="aPu"></b></div></label>
        <label class="fld"><span>Alapterület</span><div class="unit"><input class="af-in" id="aS" inputmode="numeric" value="${esc(F.size)}"><b>m²</b></div></label>
        <label class="fld"><span>Szobák</span><input class="af-in" id="aR" inputmode="numeric" value="${esc(F.rooms)}"></label>
        <label class="fld"><span>Telek <i>(ha van)</i></span><div class="unit"><input class="af-in" id="aPl" inputmode="numeric" value="${esc(F.plot)}"><b>m²</b></div></label>
        <label class="fld"><span>Emelet <i>(lakásnál)</i></span><input class="af-in" id="aFl" value="${esc(F.floor)}" placeholder="pl. 2. emelet"></label>
        <label class="fld"><span>Építés éve</span><input class="af-in" id="aY" inputmode="numeric" value="${esc(F.year)}" placeholder="pl. 2018"></label>
      </div></section>
      <section class="af-sec"><h3><small>04</small>Állapot és jellemzők</h3><div class="af-grid">
        <label class="fld"><span>Állapot</span><select class="af-sel" id="aC">${opt(CONDS,F.cond)}</select></label>
        <label class="fld"><span>Fűtés</span><select class="af-sel" id="aH">${opt(HEATS,F.heat)}</select></label>
        <div class="fld wide"><span>Jellemzők <i>(kattintással kiválasztható)</i></span><div class="chipset" id="aF"></div>
          <div class="locrow" style="margin-top:8px"><input class="af-in" id="aFx" placeholder="Saját jellemző, pl. Kandalló"><button class="btn-s" type="button" id="aFadd">Hozzáad</button></div></div>
      </div></section>
      <section class="af-sec"><h3><small>05</small>Leírás</h3><div class="af-grid"><label class="fld wide"><span>Az ingatlan bemutatása</span><textarea class="af-ta" id="aD" rows="7" maxlength="2500" placeholder="Mi teszi különlegessé? Elhelyezkedés, elrendezés, környék, közlekedés…">${esc(F.d)}</textarea><span class="hint" id="aDc"></span></label></div></section>
      <section class="af-sec"><h3><small>06</small>Fotók</h3><div>
        <label class="drop" id="drop" tabindex="0"><b>Húzza ide a fotókat</b><span>vagy kattintson a tallózáshoz · JPG, PNG · legfeljebb 20 fotó<br>Az első fotó lesz a borítókép.</span><input type="file" id="aImg" accept="image/*" multiple hidden></label>
        <div class="thumbs" id="thumbs"></div></div></section>
      <section class="af-sec"><h3><small>07</small>Megjelenés</h3><div class="af-grid">
        <label class="tog"><span><b>Kiemelt ajánlat</b><small>A főoldalon a kiemelt ajánlatok között jelenik meg.</small></span><input type="checkbox" id="aFe" ${F.feat?'checked':''}></label>
        <label class="tog"><span><b>Látható a weboldalon</b><small>Kikapcsolva elmentjük, de nem jelenik meg.</small></span><input type="checkbox" id="aVi" ${F.hidden?'':'checked'}></label>
      </div></section>
    </form>
    <aside class="adm-side"><h4>Így fog kinézni</h4><div class="pv" id="pv"></div><div class="errs" id="errs" hidden></div>
      <button class="btn btn-gold" type="button" id="pub">${editing?'Változások mentése':'Közzététel'} <svg><use href="#ar"/></svg></button>
      <div class="sub"><button class="btn btn-line" type="button" id="cancel">${editing?'Mégse':'Űrlap törlése'}</button></div>
      <p class="pp-note">${editing?`Szerkesztés: ${esc(F.id)}`:'Közzététel után azonnal megjelenik a listában és a térképen.'}</p></aside></div>`;
    wire(main);
  }
  function wire(main){
    const segs=$$('[data-m]',main),pu=$('#aPu');
    const setMode=m=>{F.mode=m;segs.forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m));pu.textContent=m==='kiado'?'ezer Ft/hó':'millió Ft';preview()};
    segs.forEach(b=>b.onclick=()=>setMode(b.dataset.m));
    const bind=(id,key,cast=v=>v)=>{const el=$('#'+id);el.addEventListener('input',()=>{F[key]=cast(el.value);el.removeAttribute('aria-invalid');preview()});el.addEventListener('change',()=>{F[key]=cast(el.value);preview()})};
    bind('aType','type');bind('aAg','ag');bind('aT','t');bind('aW','where');bind('aA','addr');bind('aP','price');bind('aS','size');bind('aR','rooms');bind('aPl','plot');bind('aFl','floor');bind('aY','year');bind('aC','cond');bind('aH','heat');bind('aD','d');
    $('#aSA').onchange=e=>F.showAddr=e.target.checked;$('#aFe').onchange=e=>F.feat=e.target.checked;$('#aVi').onchange=e=>F.hidden=!e.target.checked;
    const cnt=()=>{$('#aTc').textContent=`${F.t.length} / 70 karakter`;$('#aDc').textContent=`${F.d.length} / 2500 karakter`};
    ['aT','aD'].forEach(i=>$('#'+i).addEventListener('input',cnt));cnt();
    /* features */
    const chips=()=>{const all=[...new Set([...FEATS,...F.f])];$('#aF').innerHTML=all.map(x=>`<button type="button" aria-pressed="${F.f.includes(x)}">${esc(x)}</button>`).join('');
      $$('#aF button').forEach((b,i)=>b.onclick=()=>{const x=all[i];F.f=F.f.includes(x)?F.f.filter(y=>y!==x):[...F.f,x];b.setAttribute('aria-pressed',F.f.includes(x))})};
    chips();
    const addF=()=>{const v=$('#aFx').value.trim();if(!v)return;if(!F.f.includes(v))F.f.push(v);$('#aFx').value='';chips()};
    $('#aFadd').onclick=addF;$('#aFx').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addF()}};
    /* map */
    if(window.L){amap=MAP('amap').setView(F.ll||[46.075,18.225],F.ll?15:12);tile().addTo(amap);
      const pinIcon=L.divIcon({className:'pin',html:'<span></span>',iconSize:[0,0]});
      const setLL=(ll,pan)=>{F.ll=[+ll.lat.toFixed(5),+ll.lng.toFixed(5)];if(!apin){apin=L.marker(ll,{draggable:true,icon:pinIcon,keyboard:true,title:'Az ingatlan helye'}).addTo(amap);apin.on('dragend',()=>setLL(apin.getLatLng()))}else apin.setLatLng(ll);if(pan)amap.setView(ll,16);$('#aLL').textContent=`Kijelölve: ${F.ll[0]}, ${F.ll[1]} · a jelölő húzható.`;$('#amap').removeAttribute('aria-invalid');$('#amap').style.boxShadow=''};
      apin=null;if(F.ll)setLL(L.latLng(F.ll[0],F.ll[1]));
      amap.on('click',e=>setLL(e.latlng));
      $('#aFind').onclick=async()=>{const q=[F.addr,F.where,'Pécs'].filter(Boolean).join(', ');if(!F.addr&&!F.where){toast('Írja be a címet vagy a városrészt.');$('#aA').focus();return}
        const b=$('#aFind');b.disabled=true;b.textContent='Keresés…';
        try{const r=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=hu&q='+encodeURIComponent(q));const j=await r.json();
          if(j[0])setLL(L.latLng(+j[0].lat,+j[0].lon),true);else toast('Ezt a címet nem találtam, jelölje ki a térképen.')}
        catch(e){toast('A címkeresés most nem érhető el, jelölje ki a térképen.')}
        b.disabled=false;b.textContent='Keresés'};
      setTimeout(()=>amap.invalidateSize(),60)}
    /* photos */
    const drop=$('#drop'),inp=$('#aImg');
    drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click()}};
    ['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('over')}));
    ['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('over')}));
    drop.addEventListener('drop',e=>addFiles(e.dataTransfer.files));inp.onchange=()=>{addFiles(inp.files);inp.value=''};
    thumbs();setMode(F.mode);
    $('#pub').onclick=publish;
    $('#cancel').onclick=()=>{const wasEdit=editing;editing=false;F=blank();F.ag=who;tab=wasEdit?'mine':'new';view()};
  }
  async function prep(file){const bm=await createImageBitmap(file);const k=Math.min(1,1600/Math.max(bm.width,bm.height));const c=document.createElement('canvas');c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.82)}
  async function addFiles(files){const fs=[...files].filter(f=>/^image\//.test(f.type));if(!fs.length)return;
    const room=20-F.img.length;if(room<=0){toast('Legfeljebb 20 fotó tölthető fel.');return}
    const take=fs.slice(0,room);const tEl=$('#thumbs');take.forEach(()=>tEl.insertAdjacentHTML('beforeend','<div class="th busy"></div>'));
    for(const f of take){try{F.img.push(await prep(f))}catch(e){toast(`A(z) ${f.name} fájlt nem sikerült beolvasni.`)}}
    if(fs.length>room)toast('Legfeljebb 20 fotó tölthető fel, a többit kihagytuk.');thumbs();preview()}
  function thumbs(){const t=$('#thumbs');if(!t)return;
    t.innerHTML=F.img.map((src,i)=>`<div class="th">${i===0?'<span class="cv">Borító</span>':''}<img src="${IMG(src)}" alt="${i+1}. fotó"><div class="tb"><button type="button" data-mv="-1" data-i="${i}" ${i?'':'disabled'} aria-label="Előrébb">←</button>${i?`<button type="button" data-cv="${i}" aria-label="Legyen ez a borító">★</button>`:''}<button type="button" data-rm="${i}" aria-label="Fotó törlése">✕</button><button type="button" data-mv="1" data-i="${i}" ${i<F.img.length-1?'':'disabled'} aria-label="Hátrébb">→</button></div></div>`).join('');
    $$('[data-mv]',t).forEach(b=>b.onclick=()=>{const i=+b.dataset.i,j=i+ +b.dataset.mv;[F.img[i],F.img[j]]=[F.img[j],F.img[i]];thumbs();preview()});
    $$('[data-cv]',t).forEach(b=>b.onclick=()=>{const i=+b.dataset.cv;F.img.unshift(F.img.splice(i,1)[0]);thumbs();preview()});
    $$('[data-rm]',t).forEach(b=>b.onclick=()=>{F.img.splice(+b.dataset.rm,1);thumbs();preview()})}
  function toListing(){const p=parseFloat(String(F.price).replace(',','.').replace(/\s/g,''))||0;
    return{...F,t:F.t.trim(),where:F.where.trim(),price:F.mode==='kiado'?p/1000:p,size:+F.size||0,rooms:+F.rooms||0,plot:+F.plot||0,year:F.year?String(F.year).trim():'',f:[...F.f]}}
  function preview(){const pv=$('#pv');if(!pv)return;const l=toListing();
    pv.innerHTML=`<figure class="ph">${l.img[0]?`<img src="${IMG(l.img[0])}" alt="">`:'Még nincs fotó'}</figure><div class="bd"><small>${esc(l.type)}${l.where?' · '+esc(l.where):''}</small><h3>${esc(l.t)||'Hirdetés címe'}</h3><div class="price">${l.price?fmtPrice(l):'Ár'}</div><div class="facts">${l.size?facts(l):'<span>Alapterület, szobák</span>'}</div></div>`}
  function errors(){const l=toListing(),e=[];
    if(l.t.length<5)e.push(['aT','Adjon címet a hirdetésnek (legalább 5 karakter).']);
    if(!l.where)e.push(['aW','Adja meg a települést vagy városrészt.']);
    if(!l.ll)e.push(['amap','Jelölje ki az ingatlan helyét a térképen.']);
    if(!(l.price>0))e.push(['aP','Adja meg az árat.']);
    if(!(l.size>0))e.push(['aS','Adja meg az alapterületet.']);
    if(l.type!=='Telek'&&l.type!=='Garázs'&&!(l.rooms>0))e.push(['aR','Adja meg a szobák számát.']);
    if(!l.img.length)e.push(['drop','Töltsön fel legalább egy fotót.']);
    return e}
  async function publish(){
    $$('[aria-invalid]',root).forEach(x=>x.removeAttribute('aria-invalid'));$('#amap').style.boxShadow='';
    const e=errors(),box=$('#errs');
    if(e.length){box.hidden=false;box.innerHTML=`<b>Még ${e.length} dolog hiányzik:</b>`+e.map(([id,m])=>`<button type="button" data-f="${id}">${m}</button>`).join('');
      e.forEach(([id])=>{const el=$('#'+id);if(id==='amap')el.style.boxShadow='inset 0 0 0 1.5px #A2402E';else el.setAttribute('aria-invalid','true')});
      $$('[data-f]',box).forEach(b=>b.onclick=()=>{const el=$('#'+b.dataset.f);el.scrollIntoView({behavior:'smooth',block:'center'});el.focus&&el.focus({preventScroll:true})});return}
    box.hidden=true;const b=$('#pub');b.disabled=true;b.textContent='Mentés…';
    const l=toListing();
    if(!editing){const used=new Set([...U,...KV.D].map(x=>x.id));let n=2001;while(used.has('KV-'+n))n++;l.id='KV-'+n;l.created=Date.now()}
    l.updated=Date.now();
    await save(l);
    const wasEdit=editing;editing=false;F=blank();F.ag=who;
    $('#admMain').innerHTML=`<div class="mine" style="text-align:center;padding-top:110px"><span class="eyebrow">${wasEdit?'Mentve':'Közzétéve'}</span><h2 style="font-size:clamp(2.4rem,5vw,4rem);margin:18px 0 14px">${esc(l.t)}</h2><p style="color:var(--muted);max-width:34em;margin:0 auto 34px">${l.hidden?'A hirdetés el van rejtve, a weboldalon nem látszik.':'A hirdetés már látszik az Ingatlanok oldalon, a listában és a térképen'+(l.feat?', valamint a főoldalon a kiemelt ajánlatok között.':'.')}</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center"><button class="btn btn-gold" type="button" id="sv">Megnézem az oldalon <svg><use href="#ar"/></svg></button><button class="btn btn-line" type="button" id="sl">Az Ingatlanok oldalon</button><button class="btn btn-line" type="button" id="sn">Új hirdetés</button><button class="btn btn-line" type="button" id="sm">Hirdetéseim</button></div></div>`;
    const c=$('#cnt',root);if(c)c.textContent=U.length;scrollTo(0,0);
    $('#sv').onclick=()=>go(href(l)+(l.hidden?'&elonezet=1':''));$('#sl').onclick=()=>go(`ingatlanok.html?mode=${l.mode}`);
    $('#sn').onclick=()=>{tab='new';view()};$('#sm').onclick=()=>{tab='mine';view()};
    toast(wasEdit?'Változások mentve.':'Hirdetés közzétéve!');
  }
  shell();
  if(who&&QS.get('lap')==='mine')tab='mine';
  view();
};

/* ---------- run ---------- */
const run=pages[PAGE];if(run)Promise.resolve(run()).then(()=>{onScroll();fx()}).catch(e=>console.error(e));else onScroll();
if(location.hash&&!window.KV_GO){const t=document.querySelector(location.hash);if(t)setTimeout(()=>scrollToEl(t),300)}
if(window.KV_HASH){const t=document.querySelector(window.KV_HASH);if(t)setTimeout(()=>t.scrollIntoView(),300)}
};
if(!window.KV_SPA)window.KVboot();
