const EUROPEAN_NATIONALITIES=["Albania", "Alemania", "Andorra", "Argentina", "Armenia", "Australia", "Austria", "Azerbaiyán", "Bielorrusia", "Bosnia y Herzegovina", "Brasil", "Bulgaria", "Bélgica", "Canadá", "Chile", "Chipre", "Colombia", "Croacia", "Dinamarca", "Eslovaquia", "Eslovenia", "España", "Estados Unidos", "Estonia", "Finlandia", "Francia", "Georgia", "Grecia", "Hungría", "Irlanda", "Islandia", "Italia", "Japón", "Kazajistán", "Kosovo", "Letonia", "Liechtenstein", "Lituania", "Luxemburgo", "Macedonia del Norte", "Malta", "Marruecos", "Moldavia", "Montenegro", "México", "Mónaco", "Noruega", "Nueva Zelanda", "Países Bajos", "Polonia", "Portugal", "Reino Unido", "República Checa", "Rumanía", "Rusia", "San Marino", "Serbia", "Suecia", "Suiza", "Turquía", "Ucrania", "Uruguay", "Venezuela", "Vaticano"];
const SPAIN_CCAA=["Andalucía","Aragón","Asturias","Illes Balears","Canarias","Cantabria","Castilla-La Mancha","Castilla y León","Cataluña","Comunidad Valenciana","Extremadura","Galicia","La Rioja","Comunidad de Madrid","Región de Murcia","Comunidad Foral de Navarra","País Vasco","Ceuta","Melilla"];
function fillSelect(id,items,placeholder="Selecciona una opción"){
  const el=$(id); if(!el) return;
  const current=el.value;
  el.innerHTML=`<option value="">${placeholder}</option>`+items.map(v=>`<option value="${v}">${v}</option>`).join("");
  if(current) el.value=current;
}
function initNationalitySelects(){
  ["regNationality","coNationality","profileNationality"].forEach(id=>fillSelect(id,[...EUROPEAN_NATIONALITIES,"Otro"],"Selecciona nacionalidad"));
  ["regCcaa","profileCcaa","coCcaa"].forEach(id=>fillSelect(id,SPAIN_CCAA,"Selecciona comunidad autónoma"));
}
function toggleCcaaField(selectId,wrapId){
  const sel=$(selectId), wrap=$(wrapId); if(!sel||!wrap)return;
  wrap.classList.toggle("hidden", sel.value!=="España");
}
function toggleNationalityFields(selectId,ccaaWrapId,otherWrapId){
  const sel=$(selectId), ccaaWrap=$(ccaaWrapId), otherWrap=$(otherWrapId);
  if(!sel)return;
  if(ccaaWrap)ccaaWrap.classList.toggle("hidden", sel.value!=="España");
  if(otherWrap)otherWrap.classList.toggle("hidden", sel.value!=="Otro");
}
function nationalityValue(selectId,otherId){
  const selected=$(selectId)?.value||"";
  return selected==="Otro" ? ($(otherId)?.value||"").trim() : selected;
}
function setNationalityValue(selectId,otherId,ccaaWrapId,otherWrapId,value){
  const sel=$(selectId); if(!sel)return;
  if(value && ![...sel.options].some(option=>option.value===value)){
    sel.value="Otro";
    if($(otherId))$(otherId).value=value;
  }else{
    sel.value=value||"";
    if($(otherId))$(otherId).value="";
  }
  toggleNationalityFields(selectId,ccaaWrapId,otherWrapId);
}
function onlyDigits17(input){input.value=input.value.replace(/\D/g,"").slice(0,17)}
function validateSteamId(value){return /^\d{17}$/.test(value)}
const SUPABASE_URL = "https://qfjdwfwfkhefwrpmigev.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmamR3Zndma2hlZndycG1pZ2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTY1MDgsImV4cCI6MjA5MzM3MjUwOH0.pqnFfi5Q3VTc6QTcwiOum5kJigg8nGkqDVDj72zUHd0";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
supabaseClient.auth.onAuthStateChange(async (event, session)=>{
  if(event==="PASSWORD_RECOVERY"){
    const newPassword=prompt("Introduce tu nueva contraseña:");
    if(!newPassword)return toast("Cambio de contraseña cancelado.");
    const {error}=await supabaseClient.auth.updateUser({password:newPassword});
    if(error)return toast(error.message);
    toast("Contraseña actualizada correctamente.");
    showPage("login");
  }
});
let currentUser = null;
let currentEventId = null;
let events = [];
let publicRegistrations = [];
let myRegistrations = [];
let entryMode = "new";
function $(id){return document.getElementById(id)}
function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(id).classList.add("active");document.querySelectorAll("[data-nav]").forEach(b=>b.classList.remove("active"));const nav=document.querySelector(`[data-nav="${id}"]`);if(nav)nav.classList.add("active");if(typeof onPageShown==="function")onPageShown(id);window.scrollTo(0,0)}
function toggleUserMenu(e){e.stopPropagation();$("userMenu").classList.toggle("open")}function closeUserMenu(){$("userMenu").classList.remove("open")}document.addEventListener("click",closeUserMenu)
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("visible");setTimeout(()=>el.classList.remove("visible"),2800)}
function hideLoading(){const el=$("loadingOverlay");if(el)el.classList.add("hidden")}

const STANDINGS_POINTS=[35,30,27,25,21,19,17,15,13,11,9,7,5,3,1];
const DESAFIO_PEUGEOT="Desafio Peugeot";
const TEAM_STANDINGS_VIEW="__teams";
let standingsState={championships:[],events:[],registrations:[],profiles:[],categories:[],championshipCategories:[],classificationResults:[],teamClassificationResults:[],selectedChampionshipId:"",selectedView:"general"};
function parseStandingPosition(value){
  const match=String(value||"").match(/\d+/);
  return match?Number(match[0]):null;
}
function pointsForPosition(position){return position&&position>0?STANDINGS_POINTS[position-1]||0:0}
function standingResult(value){
  const raw=String(value||"").trim();
  const upper=raw.toUpperCase();
  if(upper==="NP"||upper==="AB")return {label:upper,position:null,points:0};
  const position=parseStandingPosition(raw);
  return {label:position?String(position):(raw||"-"),position,points:pointsForPosition(position)};
}
function standingEventOrder(event){
  const n=Number(event?.orden_clasificacion??event?.event_order??event?.standings_order);
  return Number.isFinite(n)&&n>0?n:9999;
}
function normalizeDriverName(value){return String(value||"").trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
function normalizePilotLicense(value){return String(value||"").trim().toUpperCase().replace(/\s+/g,'')}
function normalizeTeamLicense(value){return String(value||"").trim().toUpperCase().replace(/\s+/g,'')}
function isPeugeot208(value){return String(value||"").toLowerCase().includes("peugeot 208")}
function isDesafioCategory(value){return String(value||"").trim().toLowerCase()===DESAFIO_PEUGEOT.toLowerCase()}
function isCrsvChampionship(championshipId){
  const champ=[...standingsState.championships,...adminState.championships].find(c=>c.id===championshipId)||{};
  return String(championshipId||champ.id||"").toLowerCase().includes("crsv")||String(champ.nombre||"").toLowerCase().includes("crsv");
}
function isDesafioOnlyResult(row){return row?.solo_desafio_peugeot===true||isDesafioCategory(row?.category||row?.categoria)}
function isDesafioOnlyHistoryEvent(name){const n=normalizeDriverName(name);return n==='rallysprint serras fafe'||n==='rallysprint misiones'}
function isParticipationResult(value){const v=String(value||'').trim().toUpperCase();return !!v&&v!=='NP'}
function displayHistoryCategory(value){return isDesafioCategory(value)?'Rally4':(value||'-')}
function profileByManualResult(result){
  if(result.pilot_id)return standingsState.profiles.find(p=>p.id===result.pilot_id)||null;
  const license=normalizePilotLicense(result.licencia_piloto||result.pilot_license);
  if(license){
    const byLicense=standingsState.profiles.find(p=>normalizePilotLicense(p.licencia_piloto)===license);
    if(byLicense)return byLicense;
  }
  const target=normalizeDriverName(result.pilot_name);
  return standingsState.profiles.find(p=>normalizeDriverName(`${p.nombre||""} ${p.apellido||""}`)===target)||null;
}
function driverName(profile,registration){
  const name=`${profile?.nombre||""} ${profile?.apellido||""}`.trim();
  return name||registration?.pilot_name||"Piloto";
}
function championshipHasPublicStandings(championship){return championship?.mostrar_clasificaciones!==false}
async function openStandings(){
  showPage('standings');
  await loadStandingsData();
  renderStandings();
}
async function loadStandingsData(){
  $('standingsContent').innerHTML='<div class="panel"><div class="panel-body"><p class="empty">Cargando clasificaciones...</p></div></div>';
  const [championships,eventsData,registrations,profiles,categories,championshipCategories,classificationResults,teamClassificationResults]=await Promise.all([
    safeSelect('championships','*','nombre',true),
    safeSelect('events','*','created_at',true),
    selectAllRows('registrations','*','created_at'),
    selectAllRows('profiles','id,nombre,apellido,equipo,licencia_piloto,licencia_equipo','id'),
    safeSelect('categories','*','nombre',true),
    safeSelect('championship_categories','*',null,true),
    selectAllRows('classification_results','*','created_at'),
    selectAllRows('team_classification_results','*','created_at')
  ]);
  // Sin sesión de admin la tabla profiles solo devuelve tu perfil: el resto de nombres sale de public_pilots().
  const dir=await pilotDirLoad();
  const known=new Set(profiles.map(p=>p.id));
  dir.rows.forEach(p=>{if(!known.has(p.id))profiles.push({...p,licencia_piloto:'',licencia_equipo:''})});
  const publicChampionships=championships.filter(championshipHasPublicStandings);
  standingsState={...standingsState,championships:publicChampionships,events:eventsData,registrations,profiles,categories,championshipCategories,classificationResults,teamClassificationResults};
  if(!standingsState.selectedChampionshipId||!publicChampionships.some(c=>c.id===standingsState.selectedChampionshipId))standingsState.selectedChampionshipId=publicChampionships[0]?.id||"";
}
function standingsCategories(championshipId){
  const ids=standingsState.championshipCategories.filter(x=>x.championship_id===championshipId).map(x=>x.category_id);
  const linked=standingsState.categories.filter(c=>ids.includes(c.id)).map(c=>c.nombre);
  const fromRegistrations=[...new Set(standingsState.registrations.filter(r=>standingsState.events.some(e=>e.championship_id===championshipId&&e.id===r.event_id)).map(r=>r.categoria).filter(Boolean))];
  const fromManual=standingsState.classificationResults.filter(r=>r.championship_id===championshipId&&!isDesafioOnlyResult(r)).map(r=>r.category||r.categoria).filter(Boolean);
  const names=[...new Set([...linked,...fromRegistrations,...fromManual])];
  const hasDesafio=isCrsvChampionship(championshipId)&&(standingsState.registrations.some(r=>standingsState.events.some(e=>e.championship_id===championshipId&&e.id===r.event_id)&&isPeugeot208(r.coche))||standingsState.classificationResults.some(r=>r.championship_id===championshipId&&(r.posicion_desafio_peugeot||isDesafioOnlyResult(r)||isPeugeot208(r.car||r.coche))));
  if(hasDesafio&&!names.includes(DESAFIO_PEUGEOT))names.push(DESAFIO_PEUGEOT);
  return names.map(name=>({id:name,nombre:name}));
}
function standingEvents(championshipId,view="general") {
  const realEvents=standingsState.events.filter(e=>e.championship_id===championshipId).map(e=>({id:e.id,nombre:e.nombre||e.id,manual:false,orden_clasificacion:e.orden_clasificacion}));
  const realNames=new Set(realEvents.map(e=>e.nombre));
  const isDesafioView=view===DESAFIO_PEUGEOT;
  const manualEvents=[...new Set(standingsState.classificationResults.filter(r=>r.championship_id===championshipId).map(r=>r.event_name).filter(Boolean))]
    .filter(name=>!realNames.has(name))
    .filter(name=>{const rows=standingsState.classificationResults.filter(r=>r.championship_id===championshipId&&r.event_name===name);const onlyDesafio=rows.length&&rows.every(isDesafioOnlyResult);return isDesafioView||!onlyDesafio})
    .map(name=>{const rows=standingsState.classificationResults.filter(r=>r.championship_id===championshipId&&r.event_name===name);const order=rows.map(r=>Number(r.event_order)).find(n=>Number.isFinite(n)&&n>0);return {id:`manual:${name}`,nombre:name,manual:true,event_order:order}});
  return [...realEvents,...manualEvents].sort((a,b)=>standingEventOrder(a)-standingEventOrder(b)||(a.nombre||'').localeCompare(b.nombre||'','es'));
}
function standingRows(championshipId,view){
  const champEvents=standingEvents(championshipId,view);
  const realEventIds=standingsState.events.filter(e=>e.championship_id===championshipId).map(e=>e.id);
  const isDesafio=view===DESAFIO_PEUGEOT;
  const categoryName=view==='general'||isDesafio?null:view;
  const byDriver=new Map();
  standingsState.registrations.filter(r=>realEventIds.includes(r.event_id)).forEach(r=>{
    if(isDesafio&&!isPeugeot208(r.coche)&&!r.posicion_desafio_peugeot)return;
    if(categoryName&&r.categoria!==categoryName)return;
    const profile=standingsState.profiles.find(p=>p.id===r.pilot_id)||{};
    const driverId=r.pilot_id||`${r.copiloto||''}-${r.coche||''}`;
    if(!byDriver.has(driverId))byDriver.set(driverId,{driverId,name:driverName(profile,r),events:{},total:0});
    const row=byDriver.get(driverId);
    const result=standingResult(isDesafio?r.posicion_desafio_peugeot:(view==='general'?r.posicion_general:r.posicion_categoria));
    row.events[r.event_id]=result;
    row.total+=result.points;
  });
  standingsState.classificationResults.filter(r=>r.championship_id===championshipId).forEach(r=>{
    const category=r.category||r.categoria||"";
    if(isDesafio&&!r.posicion_desafio_peugeot&&!isDesafioOnlyResult(r)&&!isPeugeot208(r.car||r.coche))return;
    if(!isDesafio&&isDesafioOnlyResult(r))return;
    if(categoryName&&category!==categoryName)return;
    const profile=profileByManualResult(r);
    const driverId=profile?.id||`manual:${normalizeDriverName(r.pilot_name)}`;
    if(!byDriver.has(driverId))byDriver.set(driverId,{driverId,name:profile?driverName(profile,r):(r.pilot_name||"Piloto"),events:{},total:0});
    const row=byDriver.get(driverId);
    const matchingEvent=standingsState.events.find(e=>e.championship_id===championshipId&&(e.nombre||e.id)===r.event_name);
    const eventId=matchingEvent?matchingEvent.id:`manual:${r.event_name}`;
    const result=standingResult(isDesafio?(r.posicion_desafio_peugeot||r.posicion_categoria):(view==='general'?r.posicion_general:r.posicion_categoria));
    row.events[eventId]=result;
    row.total+=result.points;
  });
  return [...byDriver.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'es'));
}
function teamDisplayName(profile,row){return row?.team_name||profile?.equipo||"Equipo"}
function teamKey(profile,row){const license=normalizeTeamLicense(row?.licencia_equipo||row?.team_license||profile?.licencia_equipo);return license?`team:${license}`:`team-name:${normalizeDriverName(teamDisplayName(profile,row))}`}
function teamStandingRows(championshipId){
  const realEventIds=standingsState.events.filter(e=>e.championship_id===championshipId).map(e=>e.id);
  const byTeam=new Map();
  standingsState.registrations.filter(r=>realEventIds.includes(r.event_id)).forEach(r=>{
    const profile=standingsState.profiles.find(p=>p.id===r.pilot_id)||{};
    if(!profile.equipo&&!profile.licencia_equipo)return;
    const key=teamKey(profile,r);
    if(!byTeam.has(key))byTeam.set(key,{teamId:key,name:teamDisplayName(profile,r),license:normalizeTeamLicense(profile.licencia_equipo),events:{},total:0});
    const row=byTeam.get(key);
    const result=standingResult(r.posicion_categoria);
    const current=row.events[r.event_id]||{points:0,label:"-"};
    current.points+=result.points;
    current.label=current.points?String(current.points):"-";
    row.events[r.event_id]=current;
    row.total+=result.points;
  });
  standingsState.teamClassificationResults.filter(r=>r.championship_id===championshipId).forEach(r=>{
    const key=teamKey(null,r);
    if(!byTeam.has(key))byTeam.set(key,{teamId:key,name:r.team_name||"Equipo",license:normalizeTeamLicense(r.licencia_equipo||r.team_license),events:{},total:0});
    const row=byTeam.get(key);
    const matchingEvent=standingsState.events.find(e=>e.championship_id===championshipId&&(e.nombre||e.id)===r.event_name);
    const eventId=matchingEvent?matchingEvent.id:`manual:${r.event_name}`;
    const label=String(r.points_label||r.estado_puntos||r.points||r.puntos||0).trim();
    const points=label.toUpperCase()==="NP"?0:(Number(r.points||r.puntos||label||0)||0);
    row.events[eventId]={label:label.toUpperCase()==="NP"?"NP":String(points),points};
    row.total+=points;
  });
  return [...byTeam.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,"es"));
}
function teamStandingEvents(championshipId){
  const base=standingEvents(championshipId,"general");
  const names=new Set(base.map(e=>e.nombre));
  const extra=[...new Set(standingsState.teamClassificationResults.filter(r=>r.championship_id===championshipId).map(r=>r.event_name).filter(Boolean))]
    .filter(name=>!names.has(name))
    .map(name=>{const rows=standingsState.teamClassificationResults.filter(r=>r.championship_id===championshipId&&r.event_name===name);const order=rows.map(r=>Number(r.event_order)).find(n=>Number.isFinite(n)&&n>0);return {id:`manual:${name}`,nombre:name,manual:true,event_order:order}});
  return [...base,...extra].sort((a,b)=>standingEventOrder(a)-standingEventOrder(b)||(a.nombre||"").localeCompare(b.nombre||"","es"));
}
function renderTeamStandingTable(championshipId){
  const champEvents=teamStandingEvents(championshipId);
  const rows=teamStandingRows(championshipId);
  if(!champEvents.length)return '<div class="standings-empty">Este campeonato todav???a no tiene pruebas.</div>';
  const eventRanks={};
  champEvents.forEach(e=>{
    const ranked=rows.map(row=>({teamId:row.teamId,points:Number(row.events[e.id]?.points||0)})).filter(x=>x.points>0).sort((a,b)=>b.points-a.points);
    let lastPoints=null,lastRank=0;
    ranked.forEach((item,idx)=>{if(item.points!==lastPoints){lastRank=idx+1;lastPoints=item.points}eventRanks[e.id]=eventRanks[e.id]||{};eventRanks[e.id][item.teamId]=lastRank;});
  });
  const head1=`<tr><th rowspan="2">N&ordm;</th><th rowspan="2">Equipo</th>${champEvents.map(e=>`<th class="event-head" colspan="2">${escapeAttr(e.nombre||e.id)}</th>`).join('')}<th rowspan="2">Total puntos</th></tr>`;
  const head2=`<tr>${champEvents.map(()=>'<th class="sub-head event-start">POS.</th><th class="sub-head">PTOS</th>').join('')}</tr>`;
  const body=rows.map((row,index)=>`<tr><td>${index+1}</td><td class="driver-cell"><b>${escapeAttr(row.name)}</b></td>${champEvents.map(e=>{const result=row.events[e.id]||{};const rank=eventRanks[e.id]?.[row.teamId]||'-';return `<td class="event-start">${rank}</td><td>${escapeAttr(result.label||String(result.points||0))}</td>`}).join('')}<td class="total-cell">${row.total}</td></tr>`).join('');
  return `<div class="standings-table-wrap"><table class="standings-table"><thead>${head1}${head2}</thead><tbody>${body||`<tr><td colspan="${champEvents.length*2+3}">Todav???a no hay puntos de equipos.</td></tr>`}</tbody></table></div>`;
}
function renderStandingTable(championshipId,view){
  const champEvents=standingEvents(championshipId,view);
  const rows=standingRows(championshipId,view);
  if(!champEvents.length)return '<div class="standings-empty">Este campeonato todavï¿½a no tiene pruebas.</div>';
  const head1=`<tr><th rowspan="2">N&ordm;</th><th rowspan="2">Piloto</th>${champEvents.map(e=>`<th class="event-head" colspan="2">${escapeAttr(e.nombre||e.id)}</th>`).join('')}<th rowspan="2">Total puntos</th></tr>`;
  const head2=`<tr>${champEvents.map(()=>'<th class="sub-head event-start">POS.</th><th class="sub-head">PTOS</th>').join('')}</tr>`;
  const body=rows.map((row,index)=>`<tr><td>${index+1}</td><td class="driver-cell"><b>${escapeAttr(row.name)}</b></td>${champEvents.map(e=>{const result=row.events[e.id]||{};return `<td class="event-start">${result.label||'-'}</td><td>${result.points||0}</td>`}).join('')}<td class="total-cell">${row.total}</td></tr>`).join('');
  return `<div class="standings-table-wrap"><table class="standings-table"><thead>${head1}${head2}</thead><tbody>${body||`<tr><td colspan="${champEvents.length*2+3}">Todavï¿½a no hay resultados para esta clasificaciï¿½n.</td></tr>`}</tbody></table></div>`;
}
function setStandingsChampionship(value){standingsState.selectedChampionshipId=value;standingsState.selectedView='general';renderStandings()}
function setStandingsView(value){standingsState.selectedView=value;renderStandings()}
function renderStandings(){
  if(!standingsState.championships.length){$('standingsContent').innerHTML=`<div class="panel"><div class="panel-head"><div><p class="eyebrow">Campeonatos</p><div class="panel-title">Clasificaciones</div></div><div class="panel-kicker">Virtual Rally Championship</div></div><div class="panel-body"><p class="empty">No hay campeonatos con clasificaciones visibles en la web.</p></div></div>`;return}
  const champId=standingsState.selectedChampionshipId;
  const championship=standingsState.championships.find(c=>c.id===champId)||{};
  const categories=standingsCategories(champId);
  const tabs=[{id:'general',label:'General'},...categories.map(c=>({id:c.nombre,label:c.nombre})),{id:TEAM_STANDINGS_VIEW,label:'Equipos'}];
  if(!tabs.some(t=>t.id===standingsState.selectedView))standingsState.selectedView='general';
  const champOptions=standingsState.championships.map(c=>`<option value="${escapeAttr(c.id)}" ${c.id===champId?'selected':''}>${escapeAttr(c.nombre||c.id)}</option>`).join('');
  $('standingsContent').innerHTML=`<div class="panel"><div class="panel-head"><div><p class="eyebrow">Campeonatos</p><div class="panel-title">Clasificaciones</div></div><div class="panel-kicker">Virtual Rally Championship</div></div><div class="panel-body"><div class="standings-toolbar"><div class="field"><label>Campeonato</label><select onchange="setStandingsChampionship(this.value)">${champOptions}</select></div><div class="standings-tabs">${tabs.map(t=>`<button class="standings-tab ${t.id===standingsState.selectedView?'active':''}" onclick="setStandingsView('${escapeAttr(t.id)}')">${escapeAttr(t.label)}</button>`).join('')}</div></div><h2>${escapeAttr(championship.nombre||'Campeonato')}</h2>${standingsState.selectedView===TEAM_STANDINGS_VIEW?renderTeamStandingTable(champId):renderStandingTable(champId,standingsState.selectedView)}</div></div>`;
}
function scrollToEvents(){$("eventsBlock").scrollIntoView({behavior:"smooth"})}
function getSpainTime(){const now=new Date();return new Date(now.toLocaleString("en-US",{timeZone:"Europe/Madrid"}))}
function getSpainWallTime(value){if(!value)return null;const date=new Date(value);if(Number.isNaN(date.getTime()))return null;return new Date(date.toLocaleString("en-US",{timeZone:"Europe/Madrid"}))}
function registrationHasOpened(event){const open=getSpainWallTime(event?.registrationOpenRaw);return !open||getSpainTime()>=open}
function registrationHasClosed(event){const close=getSpainWallTime(event?.registrationCloseRaw);return !!close&&getSpainTime()>=close}
function isRegistrationOpen(event){return registrationHasOpened(event)&&!registrationHasClosed(event)}
function sessionIsFull(session){return Number(session?.taken||0)>=Number(session?.max||0)}
function sessionIsOpen(session){return !!session && session.state==="Open" && !sessionIsFull(session)}
function madridWallTimeToInstant(value){
  if(!value)return null;
  const raw=String(value).trim();
  if(!raw)return null;
  if(/[zZ]|[+-]\d\d:?\d\d$/.test(raw)){const date=new Date(raw);return Number.isNaN(date.getTime())?null:date}
  const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if(!match){const date=new Date(raw);return Number.isNaN(date.getTime())?null:date}
  const target={year:+match[1],month:+match[2],day:+match[3],hour:+(match[4]||0),minute:+(match[5]||0),second:+(match[6]||0)};
  let utc=Date.UTC(target.year,target.month-1,target.day,target.hour,target.minute,target.second);
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let i=0;i<3;i++){
    const parts=Object.fromEntries(formatter.formatToParts(new Date(utc)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
    const shown=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second);
    const wanted=Date.UTC(target.year,target.month-1,target.day,target.hour,target.minute,target.second);
    const diff=wanted-shown;
    if(!diff)break;
    utc+=diff;
  }
  return new Date(utc);
}
function isFileVisible(file){const now=new Date();const from=madridWallTimeToInstant(file.visibleFrom);const until=madridWallTimeToInstant(file.visibleUntil);if(from&&now<from)return false;if(until&&now>until)return false;return true}
function getCountdownText(file){const now=new Date();const from=madridWallTimeToInstant(file.visibleFrom);if(!from||now>=from)return "";const totalSeconds=Math.max(0,Math.ceil((from-now)/1000));const d=Math.floor(totalSeconds/86400),h=Math.floor((totalSeconds%86400)/3600),m=Math.floor((totalSeconds%3600)/60),s=totalSeconds%60;if(d>0)return `Disponible en ${d}d ${h}h`;if(h>0)return `Disponible en ${h}h ${m}m`;if(m>0)return `Disponible en ${m}m ${s}s`;return `Disponible en ${s}s`}

function fmtDate(v){if(!v)return "—";try{return new Date(v).toLocaleDateString("es-ES")}catch{return "—"}}
function fmtTime(v){if(!v)return "—";try{return new Date(v).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}catch{return "—"}}
async function safeSelect(table,select="*",orderCol=null,ascending=true){let q=supabaseClient.from(table).select(select);if(orderCol)q=q.order(orderCol,{ascending});const {data,error}=await q;if(error){console.warn(table,error.message);return []}return data||[]}
async function loadMyRegistrations(){
  myRegistrations=[];
  if(!currentUser?.id)return;
  const {data,error}=await supabaseClient.from("registrations").select("*").eq("pilot_id",currentUser.id);
  if(!error)myRegistrations=data||[];
}
async function loadPublicEvents(){
  const [dbEvents, sessions, championships, cars, categories, champCars, champCategories, eventCarsLinks, eventCategoryLinks, registrations, files] = await Promise.all([
    safeSelect("events","*","created_at",false),
    safeSelect("sessions","*","fecha_hora",true),
    safeSelect("championships","*","nombre",true),
    safeSelect("cars","*","nombre",true),
    safeSelect("categories","*","nombre",true),
    safeSelect("championship_cars","*",null,true),
    safeSelect("championship_categories","*",null,true),
    safeSelect("event_cars","*",null,true),
    safeSelect("event_categories","*",null,true),
    safeSelect("registrations","*","created_at",false),
    safeSelect("session_files","*","created_at",true)
  ]);

  publicRegistrations = registrations;
  events = dbEvents.map(ev=>{
    const evSessions=sessions.filter(s=>s.event_id===ev.id).map(s=>{
      const taken=registrations.filter(r=>r.session_id===s.id).length;
      const max=Number(s.cupo_maximo)||30;
      const manuallyOpen=(s.estado||"open").toLowerCase()==="open";
      return {id:s.id,name:s.nombre,date:fmtDate(s.fecha_hora),time:fmtTime(s.fecha_hora),raw:s.fecha_hora,taken,max,state:manuallyOpen&&taken<max?"Open":"Closed"};
    });

    const championship=championships.find(c=>c.id===ev.championship_id);

    // Fuente principal: coches/categorías ligados al campeonato.
    let allowedCategoryIds=champCategories
      .filter(x=>x.championship_id===ev.championship_id)
      .map(x=>x.category_id)
      .filter(Boolean);

    let allowedCarLinks=champCars
      .filter(x=>x.championship_id===ev.championship_id)
      .filter(x=>x.car_id);

    // Compatibilidad: si todavía tienes vínculos antiguos por evento, también los usamos.
    const legacyEventCategoryIds=eventCategoryLinks
      .filter(x=>x.event_id===ev.id)
      .map(x=>x.category_id)
      .filter(Boolean);

    const legacyEventCarLinks=eventCarsLinks
      .filter(x=>x.event_id===ev.id)
      .map(x=>({ championship_id: ev.championship_id, car_id: x.car_id, category_id: x.category_id || null }))
      .filter(x=>x.car_id);

    if(!allowedCategoryIds.length && legacyEventCategoryIds.length){
      allowedCategoryIds=legacyEventCategoryIds;
    }

    if(!allowedCarLinks.length && legacyEventCarLinks.length){
      allowedCarLinks=legacyEventCarLinks;
    }

    // Si el coche tiene category_id en la tabla cars, lo aceptamos como fallback.
    allowedCarLinks=allowedCarLinks.map(link=>{
      const car=cars.find(c=>c.id===link.car_id);
      return { ...link, category_id: link.category_id || car?.category_id || null };
    });

    // Si hay coches con categoría, derivamos categorías desde los coches.
    const categoryIdsFromCars=allowedCarLinks.map(x=>x.category_id).filter(Boolean);
    allowedCategoryIds=[...new Set([...allowedCategoryIds, ...categoryIdsFromCars])];

    const sessionFiles={};
    files.forEach(f=>{
      if(!evSessions.some(s=>s.id===f.session_id))return;
      if(!sessionFiles[f.session_id])sessionFiles[f.session_id]=[];
      sessionFiles[f.session_id].push({id:f.id,title:f.titulo,description:f.descripcion||"Archivo de la sesión.",button:f.boton||"Descargar",url:f.url,visibleFrom:f.visible_from,visibleUntil:f.visible_until});
    });

    const eventCategories=categories
      .filter(c=>allowedCategoryIds.includes(c.id) && c.visible_para_pilotos!==false)
      .map(c=>({id:c.id,name:c.nombre}));

    const eventCars=allowedCarLinks.map(link=>{
      const car=cars.find(c=>c.id===link.car_id && c.activo!==false);
      if(!car)return null;
      const category=categories.find(c=>c.id===(link.category_id || car.category_id));
      return {
        id:car.id,
        name:car.nombre,
        image:car.imagen_url||"",
        categoryId:link.category_id || car.category_id || "",
        categoryName:category?.nombre || "Sin categoría"
      };
    }).filter(Boolean);

    return {id:ev.id,name:ev.nombre,subtitle:ev.subtitulo||"Prueba VRC",championship:championship?.nombre||"Sin campeonato",championshipId:ev.championship_id||"",description:ev.descripcion||"",registrationOpen:fmtDate(ev.inscripcion_apertura),registrationClose:fmtDate(ev.inscripcion_cierre),registrationOpenRaw:ev.inscripcion_apertura,registrationCloseRaw:ev.inscripcion_cierre,officialBoardUrl:ev.tablon_url||"#",plateUrl:ev.placa_url||"",posterUrl:ev.cartel_url||"",status:ev.estado||"draft",skinsUrl:ev.skins_url||"",boardCode:ev.codigo_tablon||"",minLicense:ev.licencia_minima||"",minSr:ev.sr_minimo!=null&&ev.sr_minimo!==""?Number(ev.sr_minimo):null,season:Number(ev.temporada)||null,eventDate:ev.fecha_prueba||"",requiereCopiloto:ev.requiere_copiloto!==false,drivers:registrations.filter(r=>r.event_id===ev.id).length,distance:ev.distancia_total||"—",categories:eventCategories,cars:eventCars,sessions:evSessions,sessionFiles};
  });

  if(!currentEventId && events.length)currentEventId=events[0].id;
  renderHome();
}
function renderHome(){
  if(typeof updateNextRace==="function")updateNextRace();
  const grid=$("eventsGrid");
  const upcomingEvents=events.filter(isListedUpcomingEvent);
  if(!upcomingEvents.length){
    grid.innerHTML='<div class="event-card"><h2>No hay eventos próximos</h2><p class="empty">Cuando haya pruebas vigentes aparecerán aquí automáticamente.</p></div>';
    return;
  }
  grid.innerHTML=upcomingEvents.map(e=>`<article class="event-card">${e.plateUrl?`<img class="event-plate" src="${e.plateUrl}" alt="Placa ${e.name}" loading="lazy">`:""}<div><p class="eyebrow">${e.championship||"Campeonato"} · ${e.subtitle||"Prueba VRC"}</p><h2>${e.name}</h2><p class="empty">${e.description||""}</p></div><div class="event-meta"><div class="mini-stat"><b>${e.drivers||0}</b><span>Inscritos</span></div><div class="mini-stat"><b>${e.distance||"—"}</b><span>Kilometraje total</span></div><div class="mini-stat"><b>${e.status||"—"}</b><span>Estado</span></div></div><button class="wide-btn primary" onclick="openEvent('${e.id}')">Ver más detalles</button></article>`).join("")
}
function getEntry(eventId){
  const remote=myRegistrations.find(r=>r.event_id===eventId);
  if(remote)return {id:remote.id,sessionId:remote.session_id,category:remote.categoria,car:remote.coche,coDriver:remote.copiloto,coNationality:remote.nacionalidad_copiloto,coCcaa:remote.copiloto_comunidad_autonoma||"",createdAt:remote.created_at,sessionChangeCount:remote.session_change_count||0,vehicleChangeCount:remote.vehicle_change_count||0,approvalStatus:remote.approval_status||remote.estado_inscripcion||"pending"};
  return null;
}
function clearLocalEntry(eventId){
  if(!currentUser)return;
  const entries=JSON.parse(localStorage.getItem("acc_entries")||"{}");
  delete entries[`${currentUser.id||currentUser.email}_${eventId}`];
  localStorage.setItem("acc_entries",JSON.stringify(entries));
}
function clearAllLocalEntries(){localStorage.removeItem("acc_entries")}
function saveEntry(eventId,entry){clearLocalEntry(eventId)}
async function recordFileDownloadById(eventId,sessionId,fileKey){
  try{
    if(!currentUser)return;
    const event=events.find(e=>String(e.id)===String(eventId));
    const session=event?.sessions.find(s=>String(s.id)===String(sessionId));
    const file=(event?.sessionFiles?.[sessionId]||[]).find(f=>String(f.id||f.url)===String(fileKey));
    if(!event||!session||!file)return;
    const payload={file_id:String(file.id||''),event_id:String(event.id||''),event_name:event.name||'',session_id:String(session.id||''),session_name:session.name||'',pilot_id:currentUser.id||'',pilot_name:`${currentUser.name||''} ${currentUser.lastName||''}`.trim()||currentUser.email||'',file_title:file.title||'',file_url:file.url||''};
    const {error}=await supabaseClient.from('file_download_logs').insert(payload);
    if(error)console.warn('No se pudo registrar la descarga:',error.message);
  }catch(e){console.warn('No se pudo registrar la descarga:',e)}
}
function renderSessionFiles(event){const entry=getEntry(event.id);if(!entry)return `<div class="notice">Los archivos estarán disponibles cuando te inscribas en una sesión de la prueba</div>`;if(entry.approvalStatus!=="approved")return `<div class="notice">Tu inscripción está pendiente de aprobación. Los archivos estarán disponibles cuando la administración acepte tu inscripción.</div>`;const session=event.sessions.find(s=>s.id===entry.sessionId);const files=event.sessionFiles[entry.sessionId]||[];if(!files.length)return `<div class="notice">Estás inscrito en esta sesión, pero todavía no hay archivos publicados para ella.</div>`;return `<div class="session-file-group"><div class="session-file-title">${session?`${session.name} · ${session.date} · ${session.time}`:"Tu sesión"}</div>${files.map((file,i)=>{const visible=isFileVisible(file),count=getCountdownText(file),fileKey=escapeAttr(String(file.id||file.url||i));return `<div class="file-row"><div class="round-number">${i+1}</div><div class="file-info"><strong>${escapeAttr(file.title)}</strong><span>${escapeAttr(file.description)}${count?`<span class="countdown">${escapeAttr(count)}</span>`:""}</span></div><div class="file-type">Archivo</div>${visible?`<a class="file-btn" href="${escapeAttr(file.url)}" target="_blank" rel="noopener noreferrer" onclick="recordFileDownloadById('${escapeAttr(event.id)}','${escapeAttr(entry.sessionId)}','${fileKey}')">${escapeAttr(file.button)}</a>`:`<span class="file-btn disabled">Próximamente</span>`}</div>`}).join("")}</div>`}
function openEvent(id){currentEventId=id;const e=events.find(x=>x.id===id);if(!e){toast("Evento no encontrado o todavía no está cargado.");showPage("home");return}const entry=getEntry(id);$("eventContent").innerHTML=`<div class="layout"><div class="stack"><section class="panel"><div class="panel-head"><div class="panel-title">📄 Documentos oficiales</div><div class="panel-kicker">Virtual Rally Championship</div></div><div class="panel-body"><div class="notice">Tablón de anuncios oficial de la prueba.<br><br><div class="doc-actions"><a class="pill-btn primary" href="${e.officialBoardUrl}" target="_blank" rel="noopener noreferrer">Abrir tablón de anuncios</a>${e.skinsUrl?`<a class="pill-btn skins-btn" href="${escapeAttr(e.skinsUrl)}" target="_blank" rel="noopener noreferrer">🎨 Subir skins</a>`:""}</div>${e.skinsUrl?'<small class="doc-hint">Sube la skin de tu coche a la carpeta de Drive de la prueba.</small>':""}</div></div></section><section class="panel"><div class="panel-head"><div class="panel-title">🚦 Sesiones</div></div><div class="panel-body"><div class="notice">Los horarios de las sesiones están adaptados a la zona horaria local de cada participante.</div><table><thead><tr><th>#</th><th>Fecha y hora</th><th>Plazas</th><th>Estado</th><th>Inscripción</th></tr></thead><tbody>${e.sessions.map((s,i)=>`<tr><td>${i+1}</td><td><strong>${s.date}</strong><br><span style="color:var(--blue);font-weight:900">${s.time}</span></td><td>${s.taken}/${s.max}</td><td><span class="badge ${s.state==="Open"?"open":"closed"}">${s.state}</span></td><td><span class="badge ${entry&&entry.sessionId===s.id?"open":"closed"}">${entry&&entry.sessionId===s.id?"Inscrito":"No inscrito"}</span></td></tr>`).join("")}</tbody></table></div></section><section class="panel"><div class="panel-head"><div class="panel-title">📦 Archivos de la prueba</div></div><div class="panel-body" id="sessionFilesBox">${renderSessionFiles(e)}</div></section></div><aside class="panel summary"><div class="panel-head"><div class="panel-title">Información de la prueba</div></div><div class="panel-body"><div class="summary-row"><span class="label">Comienzo periodo de inscripciones</span><span class="value">${e.registrationOpen}</span></div><div class="summary-row"><span class="label">Fin periodo de inscripciones</span><span class="value">${e.registrationClose}</span></div><div class="summary-row"><span class="label">Pilotos inscritos provisionales</span><span class="value">${e.drivers}</span></div><div class="summary-row"><span class="label">Kilometraje total total</span><span class="value">${e.distance}</span></div><div class="summary-row"><span class="label">Campeonato</span><span class="value">${e.championship||"—"}</span></div>${eventHasSrRequirement(e)?`<div class="summary-row"><span class="label">Licencia mínima</span><span class="value" id="eventSrRequirement">${srRequirementText(e)}</span></div>`:""}${e.posterUrl?`<div class="event-poster-summary"><div class="label">Cartel de la prueba</div><img class="event-poster" src="${e.posterUrl}" alt="Cartel ${e.name}" loading="lazy"></div>`:""}${entry?`
<div class="notice"><b>Ya estás inscrito.</b><br>Sesión: ${e.sessions.find(s=>s.id===entry.sessionId)?.name||"—"}<br>Categoría: ${entry.category}<br>Coche: ${entry.car}<div class="board-code">Código Tablón: <b>${e.boardCode?escapeAttr(e.boardCode):"pendiente de publicar"}</b></div></div>
<button class="wide-btn ${canChangeSession(e,entry)?'primary':''}" ${canChangeSession(e,entry)?`onclick="startSessionChange('${e.id}')"`:"disabled"}>Cambiar sesión ${entry.sessionChangeCount||0}/1</button>
<button class="wide-btn ${canChangeVehicle(e,entry)?'primary':''}" ${canChangeVehicle(e,entry)?`onclick="startVehicleChange('${e.id}')"`:"disabled"}>Cambiar coche/categoría ${entry.vehicleChangeCount||0}/1</button>
`:`<button class="wide-btn ${isRegistrationOpen(e)?"primary":""}" id="eventEntryBtn" ${isRegistrationOpen(e)?`onclick="startEntry('${e.id}')"`:"disabled"}>${registrationHasClosed(e)?"Inscripciones cerradas":(!registrationHasOpened(e)?"Inscripciones no abiertas":"Inscribirse")}</button>`}<button class="wide-btn" onclick="showPage('pruebas')">Volver a eventos</button></div></aside></div>`;showPage("event");if(!entry&&isRegistrationOpen(e))markEntryButtonBySr(e)}
function refreshSessionFilesOnly(){const box=$("sessionFilesBox");if(!box)return;const e=events.find(x=>x.id===currentEventId);if(!e)return;box.innerHTML=renderSessionFiles(e)}
function updateEntryCars(){
  const e=events.find(x=>x.id===currentEventId);
  if(!e)return;
  const selectedCategoryId=$("categorySelect")?.value||"";
  const filteredCars=e.cars.filter(car=>car.categoryId===selectedCategoryId);
  $("carSelect").innerHTML=filteredCars.map(car=>`<option value="${car.name}">${car.name}</option>`).join("");
  if(!$("carSelect").innerHTML){$("carSelect").innerHTML='<option value="">No hay coches para esta categoría</option>'}
  renderCarPreview();
}


function getFirstSessionStart(event){
  if(!event.sessions.length)return null;
  const rawDates = (event.sessions||[]).map(s=>s.raw).filter(Boolean).map(d=>new Date(d));
  if(rawDates.length)return new Date(Math.min(...rawDates.map(d=>d.getTime())));
  return null;
}
function getLastSessionStart(event){
  const rawDates=(event.sessions||[]).map(s=>s.raw).filter(Boolean).map(d=>getSpainWallTime(d)).filter(Boolean);
  if(rawDates.length)return new Date(Math.max(...rawDates.map(d=>d.getTime())));
  return null;
}
// En Pruebas no se enseñan aún las de temporadas futuras (p. ej. 2027): se ven en Campeonatos.
function isFutureSeasonEvent(event){return Number(event?.season)>getSpainTime().getFullYear()}
function isListedUpcomingEvent(event){return isUpcomingEvent(event)&&!isFutureSeasonEvent(event)}
function isUpcomingEvent(event){
  const last=getLastSessionStart(event);
  // Sin sesiones todavía: se usa la fecha de la prueba del calendario (si la hay) y se oculta 3 días después.
  if(!last){const day=getSpainWallTime(madridWallTimeToInstant(event.eventDate));return !day||getSpainTime()<new Date(day.getTime()+3*24*60*60*1000)}
  const hideAt=new Date(last.getTime()+8*60*60*1000);
  return getSpainTime()<hideAt;
}
function getSessionChangeDeadline(event){
  const first = getFirstSessionStart(event);
  if(!first)return null;
  const spain = new Date(first.toLocaleString("en-US",{timeZone:"Europe/Madrid"}));
  spain.setDate(spain.getDate()-2);
  spain.setHours(22,0,0,0);
  return spain;
}
function canChangeSession(event,entry){
  if(!entry)return false;
  const deadline=getSessionChangeDeadline(event);
  if(!deadline)return false;
  return (entry.sessionChangeCount||0)<1 && getSpainTime()<=deadline;
}
function canChangeVehicle(event,entry){
  if(!entry)return false;
  if((entry.vehicleChangeCount||0)>=1)return false;
  return !registrationHasClosed(event);
}
function startSessionChange(id){
  const e=events.find(x=>x.id===id), entry=getEntry(id);
  if(!e||!entry)return toast("No tienes inscripción en esta prueba.");
  if(!canChangeSession(e,entry))return toast("Ya no puedes cambiar de sesión o ya has usado el cambio disponible.");
  entryMode="session";
  $("entryTitle").textContent="Cambiar sesión · "+e.name;
  $("coDriver").value=entry.coDriver||"";$("coDriver").disabled=true;
  setNationalityValue("coNationality","coNationalityOther","coCcaaWrap","coNationalityOtherWrap",entry.coNationality||"");$("coCcaa").value=entry.coCcaa||"";$("coNationality").disabled=true;$("coCcaa").disabled=true;if($("coNationalityOther"))$("coNationalityOther").disabled=true;
  $("categorySelect").innerHTML=`<option>${entry.category}</option>`;$("categorySelect").disabled=true;
  $("carSelect").innerHTML=`<option>${entry.car}</option>`;$("carSelect").disabled=true;renderCarPreview();
  $("sessionSelect").innerHTML=e.sessions.map(s=>`<option value="${s.id}" ${s.id===entry.sessionId?"selected":""} ${s.id!==entry.sessionId&&!sessionIsOpen(s)?"disabled":""}>${s.name} · ${s.date} · ${s.time} · ${s.taken}/${s.max}${sessionIsOpen(s)||s.id===entry.sessionId?"":" · Cerrada"}</option>`).join("");
  $("sessionSelect").disabled=false;
  toggleEntryCodriverFields(e);
  showPage("entry");
}
function startVehicleChange(id){
  const e=events.find(x=>x.id===id), entry=getEntry(id);
  if(!e||!entry)return toast("No tienes inscripción en esta prueba.");
  if(!canChangeVehicle(e,entry))return toast("Ya no puedes cambiar coche/categoría o ya has usado el cambio disponible.");
  entryMode="vehicle";
  $("entryTitle").textContent="Cambiar coche y categoría · "+e.name;
  $("coDriver").value=entry.coDriver||"";$("coDriver").disabled=true;
  setNationalityValue("coNationality","coNationalityOther","coCcaaWrap","coNationalityOtherWrap",entry.coNationality||"");$("coCcaa").value=entry.coCcaa||"";$("coNationality").disabled=true;$("coCcaa").disabled=true;if($("coNationalityOther"))$("coNationalityOther").disabled=true;
  $("categorySelect").innerHTML=e.categories.map(c=>`<option value="${c.id}" ${c.name===entry.category?"selected":""}>${c.name}</option>`).join("");
  $("categorySelect").disabled=false;$("categorySelect").onchange=updateEntryCars;updateEntryCars();
  [...$("carSelect").options].forEach(o=>{ if(o.value===entry.car) o.selected=true; });
  $("carSelect").disabled=false;renderCarPreview();
  $("sessionSelect").innerHTML=`<option value="${entry.sessionId}">Tu sesión actual</option>`;$("sessionSelect").disabled=true;
  toggleEntryCodriverFields(e);
  showPage("entry");
}
function resetEntryFormState(){
  ["coDriver","coNationality","coNationalityOther","coCcaa","categorySelect","carSelect","sessionSelect"].forEach(id=>{if($(id))$(id).disabled=false});
  $("coDriver").value="";$("coNationality").value="";if($("coNationalityOther"))$("coNationalityOther").value="";$("coCcaa").value="";toggleNationalityFields("coNationality","coCcaaWrap","coNationalityOtherWrap");
}
function eventNeedsCodriver(event){return event?.requiereCopiloto!==false}
function toggleEntryCodriverFields(event){
  const required=eventNeedsCodriver(event);
  ["coDriverWrap","coNationalityWrap"].forEach(id=>{if($(id))$(id).classList.toggle("hidden",!required)});
  if(!required){
    if($("coDriver"))$("coDriver").value="";
    if($("coNationality"))$("coNationality").value="";
    if($("coNationalityOther"))$("coNationalityOther").value="";
    if($("coCcaa"))$("coCcaa").value="";
    if($("coCcaaWrap"))$("coCcaaWrap").classList.add("hidden");
    if($("coNationalityOtherWrap"))$("coNationalityOtherWrap").classList.add("hidden");
  }
}
async function startEntry(id){
  entryMode="new";
  resetEntryFormState();
  if(!currentUser){toast("Debes iniciar sesión antes de inscribirte.");showPage("login");return}
  if(getEntry(id)){toast("Ya estás inscrito. Usa los botones de cambio disponibles en el resumen del evento.");return}
  const e=events.find(x=>x.id===id);
  if(!e){toast("Evento no encontrado.");return}
  if(!isRegistrationOpen(e))return toast(registrationHasClosed(e)?"Las inscripciones de esta prueba ya estan cerradas.":"Las inscripciones de esta prueba todavia no estan abiertas.");
  if(!e.sessions.length){toast("Este evento todavía no tiene sesiones configuradas.");return}
  if(!e.categories.length||!e.cars.length){toast("El campeonato de este evento todavía no tiene coches o categorías configuradas.");return}
  const sr=await checkSrRequirement(e);
  if(!sr.ok)return toast(sr.message);
  $("entryTitle").textContent=e.name;
  $("categorySelect").innerHTML=e.categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  $("categorySelect").onchange=updateEntryCars;
  updateEntryCars();
  const availableSessions=e.sessions.filter(sessionIsOpen);
  if(!availableSessions.length)return toast("No hay sesiones con plazas disponibles para esta prueba.");
  $("sessionSelect").innerHTML=availableSessions.map(s=>`<option value="${s.id}">${s.name} · ${s.date} · ${s.time} · ${s.taken}/${s.max}</option>`).join("");
  toggleEntryCodriverFields(e);
  showPage("entry")
}
async function registerUser(){
  const email=$("regEmail").value.trim(),
        password=$("regPassword").value,
        steam=$("regSteam").value.trim(),
        nationality=nationalityValue("regNationality","regNationalityOther"),
        ccaa=$("regCcaa").value;

  if(!email||!password||!$("regName").value.trim()||!$("regLastName").value.trim())return toast("Rellena nombre, apellido, email y contraseña.");
  if(!validateSteamId(steam))return toast("El Steam ID debe tener exactamente 17 dígitos numéricos.");
  if(!nationality)return toast("Selecciona o escribe la nacionalidad.");
  if(nationality==="España"&&!ccaa)return toast("Selecciona la comunidad autónoma.");

  const profilePayload={
    nombre:$("regName").value.trim(),
    apellido:$("regLastName").value.trim(),
    steam_id:steam,
    // La licencia se pide después, desde Licencias; el equipo, con una solicitud al team manager.
    licencia_piloto:"",
    equipo:"",
    licencia_equipo:"",
    nacionalidad:nationality,
    comunidad_autonoma:nationality==="España"?ccaa:"",
    email,
    role:"pilot"
  };

  const {data,error}=await supabaseClient.auth.signUp({
    email,
    password,
    options:{data:profilePayload}
  });
  if(error)return toast(error.message);

  const userId=data.user?.id;
  if(userId){
    const {error:profileError}=await supabaseClient
      .from("profiles")
      .upsert({id:userId,...profilePayload},{onConflict:"id"});
    if(profileError)return toast(profileError.message);
  }

  toast("Registro creado. Inicia sesión y pide tu licencia en Licencias.");
  showPage("login");
}
async function loadProfile(authUser){
  if(!authUser?.id){currentUser=null;localStorage.removeItem("acc_user");updateUserMenu();return null}

  let {data,error}=await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id",authUser.id)
    .limit(1);

  if(error){toast(error.message);return null}

  let profile=data&&data.length?data[0]:null;

  // Importante: al recargar NO creamos perfiles automáticamente.
  // Si no existe perfil, usamos datos mínimos de Auth para no provocar errores de FK.
  if(!profile){
    const meta=authUser.user_metadata||{};
    profile={
      nombre:meta.nombre||"",
      apellido:meta.apellido||"",
      steam_id:meta.steam_id||"",
      licencia_piloto:meta.licencia_piloto||"",
      equipo:meta.equipo||"",
      licencia_equipo:meta.licencia_equipo||"",
      nacionalidad:meta.nacionalidad||"",
      comunidad_autonoma:meta.comunidad_autonoma||"",
      email:authUser.email||"",
      role:meta.role||"pilot"
    };
  }

  currentUser={
    id:authUser.id,
    name:profile.nombre||"",
    lastName:profile.apellido||"",
    email:profile.email||authUser.email,
    steam:profile.steam_id||"",
    license:profile.licencia_piloto||"",
    team:profile.equipo||"",
    teamLicense:profile.licencia_equipo||"",
    nationality:profile.nacionalidad||"",
    ccaa:profile.comunidad_autonoma||"",
    avatar:profile.avatar_url||"",
    role:profile.role||"pilot"
  };

  localStorage.setItem("acc_user",JSON.stringify(currentUser));
  updateUserMenu();
  await loadMyRegistrations();
  if(typeof loadMyTeamRequests==="function")loadMyTeamRequests();
  return currentUser;
}
async function loginUser(){const email=$("loginEmail").value.trim(),password=$("loginPassword").value;if(!email||!password)return toast("Escribe email y contraseña.");const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)return toast(error.message);const profile=await loadProfile(data.user);toast(profile?.role==="admin"?"Login admin correcto.":"Login correcto.");showPage("home")}
async function resetPassword(){
  const email=$("loginEmail").value.trim();
  if(!email)return toast("Escribe tu email para enviarte el enlace de restablecimiento.");
  const redirectTo=window.location.origin+window.location.pathname;
  const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo});
  if(error)return toast(error.message);
  toast("Te hemos enviado un enlace para restablecer la contraseña.");
}

async function logoutUser(){await supabaseClient.auth.signOut();currentUser=null;localStorage.removeItem("acc_user");clearAllLocalEntries();myRegistrations=[];updateUserMenu();toast("Sesión cerrada.");showPage("home")}
function updateUserMenu(){const logged=!!currentUser,isAdmin=currentUser?.role==="admin";if(typeof updateAccountButton==="function")updateAccountButton();$("userChip").textContent=logged?`✅ ${currentUser.name} ${currentUser.lastName||""}`:"";$("userChip").classList.toggle("visible",logged);$("menuLogin").classList.toggle("hidden",logged);$("menuRegister").classList.toggle("hidden",logged);$("menuProfile").classList.toggle("hidden",!logged);$("menuSafety").classList.toggle("hidden",!logged);$("menuLogout").classList.toggle("hidden",!logged);$("menuAdmin").classList.toggle("hidden",!isAdmin);$("adminNavBtn").classList.toggle("hidden",!isAdmin)}
function openProfile(){if(!currentUser){toast("Debes iniciar sesion.");showPage("login");return}$("profileName").value=currentUser.name||"";$("profileLastName").value=currentUser.lastName||"";$("profileSteam").value=currentUser.steam||"";$("profileLicense").value=currentUser.license||"";$("profileTeam").value=currentUser.team||"";$("profileTeamLicense").value=currentUser.teamLicense||"";setNationalityValue("profileNationality","profileNationalityOther","profileCcaaWrap","profileNationalityOtherWrap",currentUser.nationality||"");$("profileCcaa").value=currentUser.ccaa||"";$("profileEmail").value=currentUser.email||"";if(typeof renderImageField==="function")renderImageField("profileAvatarField","avatar",currentUser.avatar||"");showPage("profile")}
async function saveProfile(){
  if(!currentUser)return toast("Sesion caducada.");
  const isSpain=normalizeDriverName($("profileNationality").value)==="espana";
  // Licencia de piloto y equipo no se tocan aquí: se asignan desde Licencias y con las solicitudes de equipo.
  const u={...currentUser,name:$("profileName").value.trim(),lastName:$("profileLastName").value.trim(),steam:$("profileSteam").value.trim(),teamLicense:$("profileTeamLicense").value.trim(),nationality:nationalityValue("profileNationality","profileNationalityOther"),ccaa:isSpain?$("profileCcaa").value:""};
  if(!u.name||!u.lastName)return toast("Nombre y apellido son obligatorios.");
  if(!validateSteamId(u.steam))return toast("El Steam ID debe tener exactamente 17 digitos numericos.");
  if(!u.nationality)return toast("Selecciona o escribe la nacionalidad.");
  if(isSpain&&!u.ccaa)return toast("Selecciona la comunidad autonoma.");
  const update={nombre:u.name,apellido:u.lastName,steam_id:u.steam,licencia_equipo:u.teamLicense,nacionalidad:u.nationality,comunidad_autonoma:u.ccaa};
  if(typeof readImageField==="function"){
    try{u.avatar=await readImageField("profileAvatarField","avatar")}catch(e){return toast(e.message)}
    if(u.avatar!==(currentUser.avatar||""))update.avatar_url=u.avatar||null;
  }
  const {error}=await supabaseClient.from("profiles").update(update).eq("id",currentUser.id);
  if(error)return toast(/avatar_url/.test(error.message)?"Falta activar las fotos de perfil en Supabase (ejecuta supabase-setup.sql).":error.message);
  currentUser=u;localStorage.setItem("acc_user",JSON.stringify(u));updateUserMenu();
  if(typeof pilotDir!=="undefined")pilotDir.at=0;
  toast("Perfil actualizado.");renderProfileHub();
}
async function recordRegistrationChange(payload){
  const row={
    registration_id:payload.registrationId,
    event_id:payload.eventId,
    pilot_id:payload.pilotId,
    change_type:payload.changeType,
    old_session_id:payload.oldSessionId||null,
    new_session_id:payload.newSessionId||null,
    old_categoria:payload.oldCategory||null,
    new_categoria:payload.newCategory||null,
    old_coche:payload.oldCar||null,
    new_coche:payload.newCar||null,
    created_at:new Date().toISOString()
  };
  const tables=['registration_changes','registration_change_history','registration_change_logs'];
  for(const table of tables){
    const {error}=await supabaseClient.from(table).insert(row);
    if(!error)return true;
    console.warn('No se pudo guardar historial en '+table,error.message);
  }
  return false;
}
async function confirmEntry(){
  if(!currentUser)return toast("Debes iniciar sesión.");
  await loadPublicEvents();
  await loadMyRegistrations();
  const e=events.find(x=>x.id===currentEventId);
  if(!e)return toast("Evento no encontrado.");
  const existing=getEntry(currentEventId);

  if(entryMode==="session"){
    if(!existing)return toast("No tienes inscripción en esta prueba.");
    if(!canChangeSession(e,existing))return toast("Ya no puedes cambiar de sesión o ya has usado el cambio disponible.");
    const newSessionId=$("sessionSelect").value;
    if(newSessionId===existing.sessionId)return toast("Elige una sesión distinta.");
    const targetSession=e.sessions.find(s=>s.id===newSessionId);
    if(!sessionIsOpen(targetSession))return toast("Esta sesion ya no tiene plazas disponibles.");
    const {error}=await supabaseClient.rpc("change_registration_session",{p_registration_id:existing.id,p_new_session_id:newSessionId});
    if(error)return toast(error.message);
    await recordRegistrationChange({registrationId:existing.id,eventId:currentEventId,pilotId:currentUser.id,changeType:"session",oldSessionId:existing.sessionId,newSessionId});
    await loadMyRegistrations();await loadPublicEvents();toast("Sesión actualizada. Has usado tu único cambio de sesión.");openEvent(currentEventId);return;
  }

  if(entryMode==="vehicle"){
    if(!existing)return toast("No tienes inscripción en esta prueba.");
    if(!canChangeVehicle(e,existing))return toast("Ya no puedes cambiar coche/categoría o ya has usado el cambio disponible.");
    const categoryOption=$("categorySelect").selectedOptions[0];
    const newCategory=categoryOption?categoryOption.textContent:$("categorySelect").value;
    const newCar=$("carSelect").value;
    if(newCategory===existing.category && newCar===existing.car)return toast("Elige una categoría o coche distinto.");
    const {error}=await supabaseClient.rpc("change_registration_vehicle",{p_registration_id:existing.id,p_new_categoria:newCategory,p_new_coche:newCar});
    if(error)return toast(error.message);
    await recordRegistrationChange({registrationId:existing.id,eventId:currentEventId,pilotId:currentUser.id,changeType:"vehicle",oldCategory:existing.category,newCategory,oldCar:existing.car,newCar});
    await loadMyRegistrations();await loadPublicEvents();toast("Coche/categoría actualizado. Has usado tu único cambio disponible.");openEvent(currentEventId);return;
  }

  if(existing)return toast("Ya estás inscrito en esta prueba.");
  const {data:profileCheck,error:profileCheckError}=await supabaseClient.from("profiles").select("id").eq("id",currentUser.id).limit(1);
  if(profileCheckError)return toast(profileCheckError.message);
  if(!profileCheck||!profileCheck.length)return toast("Tu perfil de piloto no existe en la base de datos. Contacta con administracion para repararlo.");
  if(!isRegistrationOpen(e))return toast(registrationHasClosed(e)?"Las inscripciones de esta prueba ya estan cerradas.":"Las inscripciones de esta prueba todavia no estan abiertas.");
  const categoryOption=$("categorySelect").selectedOptions[0];
  const needsCodriver=eventNeedsCodriver(e);
  const coNationalityValue=needsCodriver?nationalityValue("coNationality","coNationalityOther"):"";
  const selectedSession=e.sessions.find(s=>s.id===$("sessionSelect").value);
  if(!sessionIsOpen(selectedSession))return toast("Esta sesion ya no tiene plazas disponibles.");
  const sr=await checkSrRequirement(e);
  if(!sr.ok)return toast(sr.message);
  const entry={coDriver:needsCodriver?$("coDriver").value.trim():"",coNationality:coNationalityValue,coCcaa:needsCodriver&&$("coNationality").value==="España"?$("coCcaa").value:"",category:categoryOption?categoryOption.textContent:$("categorySelect").value,car:$("carSelect").value,sessionId:$("sessionSelect").value,createdAt:new Date().toISOString(),sessionChangeCount:0,vehicleChangeCount:0};
  if(needsCodriver&&!entry.coDriver||needsCodriver&&!entry.coNationality)return toast("Rellena copiloto y nacionalidad del copiloto.");if(needsCodriver&&entry.coNationality==="España"&&!entry.coCcaa)return toast("Selecciona la comunidad autónoma del copiloto.");
  const {error}=await supabaseClient.from("registrations").insert({event_id:currentEventId,pilot_id:currentUser.id,copiloto:entry.coDriver,nacionalidad_copiloto:entry.coNationality,copiloto_comunidad_autonoma:entry.coCcaa,categoria:entry.category,coche:entry.car,session_id:entry.sessionId});
  if(error)return toast(error.message);
  saveEntry(currentEventId,entry);await loadMyRegistrations();await loadPublicEvents();toast("Inscripción guardada. Ya puedes ver archivos de tu sesión.");openEvent(currentEventId)
}
function openAdmin(){if(!currentUser){toast("Inicia sesión con tu cuenta admin.");showPage("login");return}if(currentUser.role!=="admin"){toast("Acceso denegado. Esta cuenta no es administradora.");showPage("home");return}renderAdmin();showPage("admin")}
