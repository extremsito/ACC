/* =====================================================================
   Virtual Rally Championship · Octubre 2026
   - Modo claro / oscuro
   - Menú: desplegable "Comunidad", botón de cuenta y menú móvil
   - Portada: fotos que cambian solas y cuenta atrás a la próxima carrera
   - Licencia / Safety Rating mínimo para inscribirse en una prueba
   - Página de campeonatos con el calendario de cada uno
   Se carga antes de teams-licenses.js (que arranca init()).
   ===================================================================== */

/* ---------- Modo claro / oscuro ---------- */
function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function toggleTheme(){
  const next=currentTheme()==='dark'?'light':'dark';
  document.documentElement.dataset.theme=next;
  try{localStorage.setItem('vrc_theme',next)}catch(e){}
}

/* ---------- Menú ---------- */
function closeNavDrops(except){document.querySelectorAll('.nav-drop.open').forEach(d=>{if(d.id!==except)d.classList.remove('open')})}
function toggleNavDrop(e,id){
  e.stopPropagation();
  closeUserMenu();
  closeNavDrops(id);
  $(id)?.classList.toggle('open');
}
function toggleMobileNav(e){
  e.stopPropagation();
  const open=$('topbar').classList.toggle('nav-open');
  $('navToggle').setAttribute('aria-expanded',open?'true':'false');
}
function closeMobileNav(){$('topbar')?.classList.remove('nav-open');$('navToggle')?.setAttribute('aria-expanded','false')}
document.addEventListener('click',()=>closeNavDrops());
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeNavDrops();closeUserMenu();closeMobileNav()}});
/* Llamado desde onPageShown() cada vez que se cambia de página */
function afterPageShown(id){
  closeNavDrops();
  closeMobileNav();
  if(id==='home')updateNextRace();
}
function updateAccountButton(){
  const label=$('accountLabel'),avatar=$('accountAvatar'); if(!label||!avatar)return;
  if(!currentUser){label.textContent='Entrar';avatar.innerHTML='👤';avatar.classList.remove('has-initials');return}
  const name=`${currentUser.name||''} ${currentUser.lastName||''}`.trim()||'Mi cuenta';
  label.textContent=(currentUser.name||'').trim().split(/\s+/)[0]||'Mi cuenta';
  const initials=name.split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  avatar.classList.add('has-initials');
  avatar.innerHTML=`<b>${escHtml(initials)}</b>${currentUser.avatar?`<img src="${escHtml(currentUser.avatar)}" alt="" onerror="this.remove()">`:''}`;
}

/* ---------- Portada: fotos que cambian solas ---------- */
const HERO_PHOTOS=Array.from({length:12},(_,i)=>`imgs/portada/portada-${String(i+1).padStart(2,'0')}.jpg`);
const HERO_INTERVAL=7000;
let heroState={idx:0,timer:null,slides:[]};
function heroLoad(slide){if(!slide.dataset.loaded){slide.style.backgroundImage=`url("${slide.dataset.src}")`;slide.dataset.loaded='1'}}
function heroShow(idx){
  const {slides}=heroState; if(!slides.length)return;
  heroState.idx=(idx+slides.length)%slides.length;
  heroLoad(slides[heroState.idx]);
  heroLoad(slides[(heroState.idx+1)%slides.length]); // la siguiente ya precargada
  slides.forEach((s,i)=>s.classList.toggle('active',i===heroState.idx));
  document.querySelectorAll('#heroDots button').forEach((d,i)=>d.classList.toggle('active',i===heroState.idx));
}
function heroRestart(){
  clearInterval(heroState.timer);
  heroState.timer=setInterval(()=>{if(!document.hidden&&$('home')?.classList.contains('active'))heroShow(heroState.idx+1)},HERO_INTERVAL);
}
function heroGo(idx){heroShow(idx);heroRestart()}
function initHeroSlides(){
  const box=$('heroSlides'),dots=$('heroDots'); if(!box)return;
  box.innerHTML=HERO_PHOTOS.map(src=>`<div class="hero-slide" data-src="${src}"></div>`).join('');
  heroState.slides=[...box.children];
  if(dots)dots.innerHTML=HERO_PHOTOS.map((_,i)=>`<button type="button" aria-label="Foto ${i+1}" onclick="heroGo(${i})"></button>`).join('');
  heroShow(Math.floor(Math.random()*HERO_PHOTOS.length));
  heroRestart();
}

/* ---------- Portada: cuenta atrás a la próxima carrera ---------- */
const RACE_LIVE_MS=3*60*60*1000; // una sesión cuenta como "en curso" durante 3 horas
let nextRaceTimer=null;
function findNextRace(){
  const now=Date.now();
  let live=null,next=null;
  (typeof events!=='undefined'?events:[]).forEach(e=>(e.sessions||[]).forEach(s=>{
    const t=new Date(s.raw).getTime(); if(!Number.isFinite(t))return;
    if(t<=now&&now-t<RACE_LIVE_MS){if(!live||t>live.t)live={e,s,t}}
    else if(t>now){if(!next||t<next.t)next={e,s,t}}
  }));
  return live?{...live,live:true}:next;
}
function countdownParts(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  return [[Math.floor(total/86400),'días'],[Math.floor(total%86400/3600),'horas'],[Math.floor(total%3600/60),'min'],[total%60,'seg']];
}
function updateNextRace(){
  const box=$('nextRace'); if(!box)return;
  clearInterval(nextRaceTimer);
  const race=findNextRace();
  if(!race){box.classList.add('hidden');return}
  const when=new Date(race.t).toLocaleString('es-ES',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  box.classList.remove('hidden');
  box.innerHTML=`<button type="button" class="next-race-card${race.live?' live':''}" onclick="openEvent('${escHtml(race.e.id)}')">
    <span class="nr-info"><span class="nr-label">${race.live?'<i class="live-dot"></i> En curso ahora':'Próxima carrera'}</span><b class="nr-name">${escHtml(race.e.name)}</b><small>${escHtml(race.s.name||'Sesión')} · ${escHtml(when)}</small></span>
    ${race.live?'<span class="nr-live-tag">¡A correr!</span>':`<span class="nr-clock" id="nextRaceClock"></span>`}
  </button>`;
  if(race.live)return;
  const tick=()=>{
    const left=race.t-Date.now();
    if(left<=0){updateNextRace();return}
    const clock=$('nextRaceClock'); if(!clock){clearInterval(nextRaceTimer);return}
    clock.innerHTML=countdownParts(left).map(([n,l])=>`<span><b>${String(n).padStart(2,'0')}</b><i>${l}</i></span>`).join('');
  };
  tick();
  nextRaceTimer=setInterval(tick,1000);
}

/* ---------- Licencia / Safety Rating mínimo ---------- */
function eventHasSrRequirement(e){return !!(e?.minLicense||e?.minSr!=null)}
function srRequirementIndex(e){const i=SR_CLASSES.findIndex(c=>c.key===e?.minLicense);return i<0?0:i}
function srRequirementText(e){
  const c=SR_CLASSES[srRequirementIndex(e)];
  return `${e.minLicense?c.name:'Cualquier licencia'}${e.minSr!=null?` · SR ≥ ${fmtSr(e.minSr)}`:''}`;
}
function srMeetsRequirement(e,res){
  const min=srRequirementIndex(e);
  return res.cls>min||(res.cls===min&&res.sr>=(e.minSr??0));
}
/* Devuelve {ok, message}. Sin requisito, siempre ok. */
async function checkSrRequirement(e){
  if(!eventHasSrRequirement(e)||!currentUser||currentUser.role==='admin')return {ok:true};
  let res;
  try{const cache=await srLoad(false);res=cache.results.get(currentUser.id)||srCompute([])}
  catch(err){return {ok:false,message:'No se pudo comprobar tu Safety Rating. Inténtalo de nuevo en un momento.'}}
  if(srMeetsRequirement(e,res))return {ok:true,res};
  const mine=SR_CLASSES[res.cls];
  return {ok:false,res,message:`No tienes el mínimo para correr esta prueba: se pide ${srRequirementText(e)} o superior y tu licencia es ${mine.name} · SR ${fmtSr(res.sr)}.`};
}
async function markEntryButtonBySr(e){
  if(!eventHasSrRequirement(e)||!currentUser||currentUser.role==='admin')return;
  const check=await checkSrRequirement(e);
  const btn=$('eventEntryBtn');
  if(check.ok||!btn||currentEventId!==e.id)return;
  btn.disabled=true;btn.removeAttribute('onclick');btn.classList.remove('primary');
  btn.textContent='Licencia insuficiente';
  btn.insertAdjacentHTML('afterend',`<div class="sr-alert danger sr-entry-alert">${escHtml(check.message)}</div>`);
}

/* ---------- Página de campeonatos + calendario ---------- */
let champPage={list:[],selected:'',season:'all',at:0};
const CHAMPIONSHIP_LOGOS=[[/ccrt|canarias.*tierra/i,'imgs/ccrt-logo.png']];
// Cartel del calendario por defecto (si el campeonato no tiene uno subido desde el admin)
const CHAMPIONSHIP_CALENDARS=[[/ccrt.*2027|2027.*ccrt/i,'imgs/ccrt-calendario-2027.jpg']];
function championshipLogo(c){
  if(c.logo_url)return c.logo_url;
  const text=`${c.id||''} ${c.nombre||''}`;
  return CHAMPIONSHIP_LOGOS.find(([re])=>re.test(text))?.[1]||'';
}
function championshipCalendar(c){
  if(c.calendario_url)return c.calendario_url;
  const text=`${c.id||''} ${c.nombre||''}`;
  return CHAMPIONSHIP_CALENDARS.find(([re])=>re.test(text))?.[1]||'';
}
/* Inicio de la prueba: su primera sesión o, si aún no tiene sesiones, la fecha de la prueba del calendario */
function eventStartTime(e){const first=getFirstSessionStart(e);if(first)return first.getTime();const day=madridWallTimeToInstant(e.eventDate);return day?day.getTime():null}
function eventHasSessionTime(e){return !!getFirstSessionStart(e)}
function championshipEvents(champId){
  return events.filter(e=>e.championshipId===champId)
    .sort((a,b)=>(eventStartTime(a)??Infinity)-(eventStartTime(b)??Infinity)||(a.name||'').localeCompare(b.name||'','es'));
}
function championshipSeason(c){
  if(Number(c.temporada))return Number(c.temporada);
  const seasons=championshipEvents(c.id).map(e=>e.season||(eventStartTime(e)?new Date(eventStartTime(e)).getFullYear():null)).filter(Boolean);
  if(seasons.length)return Math.max(...seasons);
  const m=`${c.nombre||''} ${c.id||''}`.match(/20\d{2}/);
  return m?Number(m[0]):null;
}
function openChampionships(){showPage('championships')}
async function renderChampionshipsPage(){
  const box=$('championshipsContent'); if(!box)return;
  if(!champPage.list.length||Date.now()-champPage.at>60000){
    if(!champPage.list.length)box.innerHTML=loadingBlock('Cargando campeonatos...');
    champPage.list=await safeSelect('championships','*','nombre',true);
    champPage.at=Date.now();
  }
  if(!events.length)await loadPublicEvents();
  if(champPage.selected&&champPage.list.some(c=>c.id===champPage.selected))return renderChampionshipDetail(champPage.selected);
  champPage.selected='';
  renderChampionshipsList();
}
function setChampSeason(year){champPage.season=year;renderChampionshipsList()}
function eventStatus(e){
  const t=eventStartTime(e);
  if(!t)return {key:'tbc',label:'Fecha por confirmar'};
  if(!isUpcomingEvent(e))return {key:'done',label:'Finalizada'};
  if(Date.now()>=t)return {key:'live',label:'En curso'};
  return {key:'next',label:'Próxima'};
}
function renderChampionshipsList(){
  const box=$('championshipsContent'); if(!box)return;
  if(!champPage.list.length){box.innerHTML='<div class="panel"><div class="panel-body"><p class="empty">Todavía no hay campeonatos publicados.</p></div></div>';return}
  // Por defecto se ven todos, del más reciente al más antiguo; los botones filtran por temporada.
  const withSeason=champPage.list.map(c=>({c,season:championshipSeason(c)})).sort((a,b)=>(b.season||0)-(a.season||0)||String(a.c.nombre||'').localeCompare(String(b.c.nombre||''),'es'));
  const seasons=[...new Set(withSeason.map(x=>x.season).filter(Boolean))].sort((a,b)=>b-a);
  if(champPage.season!=='all'&&!seasons.includes(champPage.season))champPage.season='all';
  const shown=withSeason.filter(x=>champPage.season==='all'||x.season===champPage.season||!x.season);
  const chips=seasons.length>1?`<div class="chip-row champ-seasons"><button class="filter-chip${champPage.season==='all'?' active':''}" onclick="setChampSeason('all')">Todas</button>${seasons.map(y=>`<button class="filter-chip${champPage.season===y?' active':''}" onclick="setChampSeason(${y})">Temporada ${y}</button>`).join('')}</div>`:'';
  box.innerHTML=`${chips}<div class="champ-grid">${shown.map(({c,season})=>{
    const list=championshipEvents(c.id),logo=championshipLogo(c);
    const next=list.find(e=>eventStatus(e).key==='next'||eventStatus(e).key==='live');
    const done=list.filter(e=>eventStatus(e).key==='done').length;
    return `<button type="button" class="champ-card" onclick="openChampionshipDetail('${escHtml(c.id)}')">
      <span class="champ-logo${logo?'':' empty'}">${logo?`<img src="${escHtml(logo)}" alt="${escHtml(c.nombre||'')}" loading="lazy" onerror="this.parentElement.classList.add('empty');this.remove()">`:''}<b>${escHtml((c.nombre||c.id||'?').slice(0,4).toUpperCase())}</b></span>
      <span class="champ-body">
        <span class="eyebrow">${season?`Temporada ${season}`:'Campeonato'}</span>
        <b class="champ-name">${escHtml(c.nombre||c.id)}</b>
        <span class="champ-meta"><span><b>${list.length}</b> pruebas</span><span><b>${done}</b> disputadas</span></span>
        <small class="champ-next">${next?`${eventStatus(next).key==='live'?'En curso':'Próxima'}: <b>${escHtml(next.name)}</b> · ${escHtml(shortDate(eventStartTime(next)))}`:list.length?'Temporada finalizada':'Calendario por publicar'}</small>
      </span>
      <span class="champ-cta">Ver calendario →</span>
    </button>`}).join('')}</div>`;
}
function openChampionshipDetail(id){champPage.selected=id;renderChampionshipDetail(id);window.scrollTo({top:0,behavior:'smooth'})}
function closeChampionshipDetail(){champPage.selected='';$('championships')?.classList.remove('detail-open');renderChampionshipsList()}
function renderChampionshipDetail(id){
  const box=$('championshipsContent'); if(!box)return;
  const c=champPage.list.find(x=>x.id===id); if(!c)return closeChampionshipDetail();
  $('championships')?.classList.add('detail-open');
  const list=championshipEvents(id),logo=championshipLogo(c),season=championshipSeason(c),calendar=championshipCalendar(c);
  const rows=list.map((e,i)=>{
    const t=eventStartTime(e),st=eventStatus(e);
    const d=t?new Date(t):null;
    return `<div class="cal-row st-${st.key}">
      <span class="cal-num">${i+1}</span>
      <span class="cal-date">${d?`<b>${d.getDate()}</b><small>${escHtml(d.toLocaleDateString('es-ES',{month:'short'}).replace('.',''))}</small>`:'<b>—</b><small>Por fijar</small>'}</span>
      <span class="cal-main">${e.plateUrl?`<img class="cal-plate" src="${escHtml(e.plateUrl)}" alt="" loading="lazy" onerror="this.remove()">`:''}<span><b>${escHtml(e.name)}</b><small>${escHtml([e.subtitle,d?d.toLocaleString('es-ES',eventHasSessionTime(e)?{weekday:'long',hour:'2-digit',minute:'2-digit'}:{weekday:'long',day:'numeric',month:'long'}):'',e.distance&&e.distance!=='—'?e.distance:''].filter(Boolean).join(' · '))}</small></span></span>
      <span class="cal-side"><span class="cal-status">${st.label}</span><button class="pill-btn${st.key==='next'||st.key==='live'?' primary':''}" onclick="openEvent('${escHtml(e.id)}')">Ver prueba</button></span>
    </div>`;
  }).join('');
  box.innerHTML=`<button class="ghost-btn champ-back" onclick="closeChampionshipDetail()">← Todos los campeonatos</button>
  <div class="champ-hero">
    ${logo?`<div class="champ-hero-logo"><img src="${escHtml(logo)}" alt="${escHtml(c.nombre||'')}" onerror="this.parentElement.remove()"></div>`:''}
    <div><p class="eyebrow">${season?`Temporada ${season}`:'Campeonato'}</p><h1>${escHtml(c.nombre||c.id)}</h1>
      <div class="champ-meta"><span><b>${list.length}</b> pruebas</span><span><b>${list.filter(e=>eventStatus(e).key==='done').length}</b> disputadas</span><span><b>${list.filter(e=>['next','live'].includes(eventStatus(e).key)).length}</b> por disputar</span></div>
      <div class="acc-home-actions">${championshipHasPublicStandings(c)?`<button class="pill-btn primary" onclick="openChampionshipStandings('${escHtml(c.id)}')">Ver clasificación</button>`:''}</div>
    </div>
  </div>
  <div class="champ-detail${calendar?' has-poster':''}">
    <div class="panel"><div class="panel-head"><div class="panel-title">📅 Calendario</div><div class="panel-kicker">Horario de tu zona horaria</div></div>
      <div class="panel-body">${rows||'<p class="empty">El calendario de este campeonato todavía no está publicado.</p>'}</div></div>
    ${calendar?`<a class="champ-poster" href="${escHtml(calendar)}" target="_blank" rel="noopener noreferrer"><img src="${escHtml(calendar)}" alt="Calendario ${escHtml(c.nombre||'')}" loading="lazy"></a>`:''}
  </div>`;
}
async function openChampionshipStandings(id){
  showPage('standings');
  await loadStandingsData();
  if(standingsState.championships.some(c=>c.id===id)){standingsState.selectedChampionshipId=id;standingsState.selectedView='general'}
  renderStandings();
}

/* ---------- Arranque ---------- */
initHeroSlides();
