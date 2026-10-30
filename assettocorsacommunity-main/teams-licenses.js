// ===== Equipos integrados =====
let embeddedTeamsData = [
    {
        id: 1,
        name: "Cantabria Rally Team",
        logo: "logosequipos/LogoCantabriaRallyTeam.PNG",
        sede: "MALIAÑO | CAMARGO | CANTABRIA | ESPAÑA",
        creacion: "30/6/2025 | 2ª Temporada",
        palmares: ["N/A"],
        director: { name: "Gonzalo López Perez", avatar: "logosequipos/GonzaloLopez.PNG" },
        members: [
            { name: "David López", avatar: null },
            { name: "Victor Bárcena", avatar: null },
            { name: "Nacho Cabo", avatar: null }
        ],
        social: "N/A"
    },
    {
        id: 2,
        name: "Pe-Flash",
        logo: "logosequipos/LogoPeFlash.PNG",
        sede: "CANTABRIA | ESPAÑA",
        creacion: "20/01/2026 | 1ª temporada",
        palmares: ["N/A"],
        director: { name: "Enzo Diaz", avatar: "logosequipos/EnzoDiaz.PNG" },
        members: [
            { name: "Sergio Diaz", avatar: "logosequipos/SergioDiaz.PNG" },
            { name: "Davis Vidal", avatar: "logosequipos/DavisVidal.PNG" }
        ],
        social: "<a href='https://www.instagram.com/peflahs_virtual?igsh=cW93NHF4dms2aWpn&utm_source=qr'>Instagram</a> • <a href='https://www.facebook.com/share/1b1STtJ8Fy/?mibextid=wwXIfr'>Facebook</a>"
    },
    {
        id: 3,
        name: "Nanos Racing",
        logo: "logosequipos/LogoNanosRacing.PNG",
        sede: "CATALUÑA | ESPAÑA",
        creacion: "10/06/2025 | 2ª temporada",
        palmares: ["N/A"],
        director: { name: "Baltram Laporta", avatar: "logosequipos/BaltramLaporta.PNG" },
        members: [
            { name: "Nil Arjona", avatar: null },
            { name: "Eric Porte", avatar: null },
            { name: "Ricardo Nevirkovets", avatar: null }
        ],
        social: "<a href='https://www.instagram.com/nanos_racing_esports/'>Instagram</a>"
    },
    {
        id: 4,
        name: "DZRT Motorsport",
        logo: "logosequipos/LogoDZRT.PNG",
        sede: "ARUCAS | GRAN CANARIA | ESPAÑA",
        creacion: "02/12/2025 | 1ª temporada",
        palmares: ["N/A"],
        director: { name: "Daniel Gonzalez", avatar: "logosequipos/DanielGonzalez.PNG" },
        members: [
            { name: "Giovanni Muñoz", avatar: "logosequipos/GiovanniMuñoz.PNG" },
            { name: "Edey Cortés", avatar: "logosequipos/EdeyCortés.PNG" },
            { name: "Ion Ciganda", avatar: "logosequipos/IonCiganda.PNG" },
            { name: "Daniel Suárez", avatar: "logosequipos/DanielSuarez.PNG" },
            { name: "Adriel Betancor", avatar: "logosequipos/AdrielBetancor.PNG" },
            { name: "Alejandro Déniz", avatar: "logosequipos/AlejandroDeniz.PNG" },
            { name: "Jacinto Pérez", avatar: "logosequipos/JacintoPerez.PNG" },
            { name: "Ricardo Mena", avatar: "logosequipos/RicardoMena.PNG" },
            { name: "Danhyel Rodríguez", avatar: "logosequipos/DanyhelRodriguez.PNG" }
        ],
        social: "<a href='https://www.instagram.com/dzrt_motorsport/'>Instagram</a>"
    },
    {
        id: 5,
        name: "VM Competición",
        logo: "logosequipos/LogoVM.PNG",
        sede: "ESPAÑA",
        creacion: "26/01/2026 | 1ª temporada",
        palmares: ["N/A"],
        director: { name: "Alejandro Berna", avatar: null },
        members: [
            { name: "Diego Rodríguez", avatar: null },
            { name: "Jaime Armas", avatar: null }
        ],
        social: "N/A"
    },
    {
        id: 6,
        name: "Sanchez Benitez Competición",
        logo: "logosequipos/LogoSanchez.PNG",
        sede: "CÓRDOBA | ESPAÑA",
        creacion: "15/02/2026 | 1ª temporada",
        palmares: ["N/A"],
        director: { name: "Daniel Sánchez", avatar: null },
        members: [
            { name: "Javier Sánchez", avatar: null }
        ],
        social: "N/A"
    },
    {
        id: 7,
        name: "Buhos Racing",
        logo: "logosequipos/LogoBuhos.PNG",
        sede: "MADRID | ESPAÑA",
        creacion: "30/06/2018 | 2ª temporada",
        palmares: [
            "(Sergi Morera) - Campeón del CRV 2025",
            "(Sergi Morera) - Campeón del CRSV 2025"
        ],
        director: { name: "Sergi Morera", avatar: "logosequipos/SergiMorera.PNG" },
        members: [
            { name: "David Lera", avatar: null },
            { name: "Ivan Ruiz", avatar: null },
            { name: "Alonso González Sánchez", avatar: "logosequipos/AlonsoGonzalez.png" }
        ],
        social: "N/A"
    },
    {
         id: 8,
        name: "Canarias Simracing",
        logo: "logosequipos/CanariasLogo.PNG",
        sede: "CANARIAS | ESPAÑA",
        creacion: "1/12/2025 | 1ª temporada",
        palmares: [
            "N/A"
        ],
        director: { name: "Borja Ramón", avatar: null },
        members: [
            { name: "Carlos Cabrera", avatar: null },
            { name: "Hector Betancor", avatar: null },
            { name: "Miguel Duran", avatar: null },
            { name: "Marc Bayona", avatar: null },
            { name: "Agutin Duran", avatar: null },
        ],
        social: "<a href=' https://www.instagram.com/canarias_simracing/'>Instagram</a>"
    }
];

function normalizeNameForMatch(name){return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()}
function loadTeamsFromStorage(){
  try{
    const saved=localStorage.getItem('acc_embedded_teams');
    if(saved){embeddedTeamsData=JSON.parse(saved)}
  }catch(e){console.warn('No se pudieron cargar equipos guardados',e)}
}
function saveTeamsToStorage(){localStorage.setItem('acc_embedded_teams', JSON.stringify(embeddedTeamsData));}
function dbTeamToAppTeam(row){
  return {
    id:Number(row.id),
    name:row.name||row.nombre||'',
    logo:row.logo||'',
    sede:row.sede||'',
    creacion:row.creacion||'',
    palmares:normalizePalmares(row.palmares||'N/A'),
    director:row.director&&typeof row.director==='object'?row.director:{name:row.director_name||'',avatar:row.director_avatar||null,pilot_id:row.director_pilot_id||''},
    members:Array.isArray(row.members)?row.members:[],
    social:row.social||'N/A',
    // Columnas nuevas (supabase-setup.sql): undefined si aún no existen, para no romper el guardado.
    license:row.license===undefined?undefined:(row.license||''),
    social_links:Array.isArray(row.social_links)?row.social_links:(row.social_links===undefined?undefined:[])
  };
}
function appTeamToDbTeam(team){
  const row={
    id:Number(team.id),
    name:team.name||'',
    logo:team.logo||'',
    sede:team.sede||'',
    creacion:team.creacion||'',
    palmares:team.palmares||[],
    director:team.director||{},
    members:team.members||[],
    social:team.social||'N/A'
  };
  if(team.license!==undefined)row.license=team.license||null;
  if(team.social_links!==undefined)row.social_links=team.social_links||[];
  return row;
}
async function loadTeamsFromSupabase(){
  try{
    const {data,error}=await supabaseClient.from('teams').select('*').order('id',{ascending:true});
    if(error)throw error;
    if(Array.isArray(data)&&data.length){
      embeddedTeamsData=data.map(dbTeamToAppTeam);
      saveTeamsToStorage();
    }
    return true;
  }catch(e){
    console.warn('No se pudieron cargar equipos desde Supabase:',e.message);
    loadTeamsFromStorage();
    return false;
  }
}
async function saveTeamToSupabase(team){
  const {error}=await supabaseClient.from('teams').upsert(appTeamToDbTeam(team),{onConflict:'id'});
  if(error)throw error;
  saveTeamsToStorage();
}
async function deleteTeamFromSupabase(id){
  const {error}=await supabaseClient.from('teams').delete().eq('id',Number(id));
  if(error)throw error;
  saveTeamsToStorage();
}

/* Registro de licencias: lo que ha pedido cada piloto, la licencia que se le asignó y si le llegó el email.
   Las solicitudes antiguas (sin licencia asignada) conservan los botones de estado de antes. */
let adminLicenseFilter='all';
function adminSetLicenseFilter(value){adminLicenseFilter=value;adminLicenseRequests(true)}
async function adminLicenseRequests(cached){
  if(!adminGuard())return;
  if(cached!==true)adminState.licenseRequests=await adminFetch("license_requests","*","created_at",false);
  const all=adminState.licenseRequests;
  const list=all.filter(r=>adminLicenseFilter==='all'||(adminLicenseFilter==='pilot'?r.type==='pilot':r.type!=='pilot'));
  const when=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})};
  const rows=list.map(r=>{
    const isPilot=r.type==="pilot";
    const who=`${r.name||""} ${r.last_name||""}`.trim()||r.manager_name||"Sin nombre";
    const asked=isPilot?"Licencia de piloto":(String(r.notes||"").includes("creado")?`Crear equipo «${r.team_name||"-"}» + licencia de equipo`:`Licencia de equipo para «${r.team_name||"-"}»`);
    const detail=[r.email,r.steam_id&&`Steam ID ${r.steam_id}`,r.discord&&`Discord ${r.discord}`].filter(Boolean).map(escapeAttr).join(" · ");
    const mail=r.email_sent_at?`<span class="chip ok">✉ Enviado ${escapeAttr(when(r.email_sent_at))}</span>`:r.email_error?`<span class="chip bad" title="${escapeAttr(r.email_error)}">✉ Error al enviar</span>`:r.assigned_license?`<span class="chip">✉ Sin enviar</span>`:'';
    const legacyStatus=`<small>Estado: <b>${escapeAttr(r.status||"pendiente")}</b></small>`;
    const actions=r.assigned_license
      ?`<button class="mini-btn primary" onclick="adminResendLicenseEmail('${escapeAttr(r.id)}')">Reenviar email</button>`
      :`<button class="mini-btn primary" onclick="adminUpdateLicenseStatus('${escapeAttr(r.id)}','enviada')">Marcar enviada</button><button class="mini-btn" onclick="adminUpdateLicenseStatus('${escapeAttr(r.id)}','pendiente')">Pendiente</button>`;
    return `<div class="admin-list-item license-log-item">
      <span class="license-log-main">
        <small class="license-log-date">${escapeAttr(when(r.created_at))}</small>
        <b>${isPilot?"🪪 Piloto":"👥 Equipo"} · ${escapeAttr(who)}</b>
        <small>Ha pedido: <b>${escapeAttr(asked)}</b></small>
        ${detail?`<small>${detail}</small>`:""}
        ${r.assigned_license?"":legacyStatus}
      </span>
      <span class="license-log-side">
        ${r.assigned_license?`<span class="license-code">${escapeAttr(r.assigned_license)}</span>`:""}
        ${mail}
        <span class="quick-pilot-actions">${actions}<button class="mini-btn danger" onclick="adminDeleteLicenseRequest('${escapeAttr(r.id)}')">Borrar</button></span>
      </span>
    </div>`;
  }).join("")||'<div class="admin-list-item"><span>No hay licencias en el registro.</span></div>';
  const count=t=>all.filter(r=>t==='all'||(t==='pilot'?r.type==='pilot':r.type!=='pilot')).length;
  const chips=[['all','Todas'],['pilot','Piloto'],['team','Equipo']].map(([k,l])=>`<button class="filter-chip${adminLicenseFilter===k?' active':''}" onclick="adminSetLicenseFilter('${k}')">${l} · ${count(k)}</button>`).join('');
  $("adminPanelBody").innerHTML=`<div class="admin-box"><h3>🪪 Registro de licencias</h3><p class="admin-help">Las licencias se asignan solas cuando un piloto la pide o crea su equipo. Aquí ves qué pidió cada uno, la licencia que recibió y si le llegó el email (puedes reenviarlo).</p><div class="chip-row" style="margin-bottom:14px">${chips}</div><div class="admin-list">${rows}</div></div>`;
}
async function adminResendLicenseEmail(id){
  toast("Enviando email...");
  const res=await sendLicenseEmail(id);
  toast(res.ok?`Email enviado a ${res.to||"el piloto"}.`:`No se pudo enviar: ${res.error}`);
  adminLicenseRequests();
}
async function adminUpdateLicenseStatus(id,status){
  const {error}=await supabaseClient.from("license_requests").update({status}).eq("id",id);
  if(error)return toast(error.message);
  toast("Solicitud actualizada.");
  adminLicenseRequests();
}
async function adminDeleteLicenseRequest(id){
  if(!confirm("¿Borrar esta solicitud?"))return;
  const {error}=await supabaseClient.from("license_requests").delete().eq("id",id);
  if(error)return toast(error.message);
  toast("Solicitud borrada.");
  adminLicenseRequests();
}

function nextTeamId(){return embeddedTeamsData.reduce((m,t)=>Math.max(m,Number(t.id)||0),0)+1}
function parseLines(text){return String(text||'').split('\n').map(x=>x.trim()).filter(Boolean)}
function normalizePalmares(value){
  let current = value;
  for(let i=0;i<5 && typeof current === 'string';i++){
    const trimmed = current.trim();
    if(!trimmed) return ['N/A'];
    if(trimmed === 'N/A') return ['N/A'];
    try{
      const parsed = JSON.parse(trimmed);
      if(parsed === current) break;
      current = parsed;
      continue;
    }catch(e){}
    return parseLines(trimmed);
  }
  if(Array.isArray(current)){
    const items = current.flatMap(item => normalizePalmares(item)).map(item => String(item).trim()).filter(Boolean);
    return items.length ? items : ['N/A'];
  }
  if(current == null) return ['N/A'];
  const lines = parseLines(current);
  return lines.length ? lines : ['N/A'];
}
function renderPalmaresList(value){
  return normalizePalmares(value).map(item=>`<li>${escapeAttr(item)}</li>`).join('');
}
function parseMembers(text){return parseLines(text).map(line=>{const parts=line.split('|').map(x=>x.trim());return {name:parts[0]||'', avatar:parts[1]||null, pilot_id:parts[2]||''}}).filter(x=>x.name)}
function escapeAttr(v){return String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
function renderTeamsGallery(){
  const gallery = $('teamsGallery');
  if(!gallery) return;
  gallery.innerHTML = embeddedTeamsData.map(team => `
    <div class="team-card" onclick="showTeamModal(${Number(team.id)})">
      <img src="${escapeAttr(team.logo)}" alt="${escapeAttr(team.name)}" onerror="this.style.display='none'">
      <h3>${escapeAttr(team.name)}</h3>
    </div>
  `).join('');
  if(typeof fillTeamSelects==='function')fillTeamSelects();
}
function teamProfile(person){
  // Sin foto propia en el equipo, se usa la foto de perfil del piloto si la tiene.
  const avatar = person.avatar || (typeof pilotPhoto==='function' ? pilotPhoto(person.pilot_id, person.name) : '');
  return `<div class="team-profile-card" onclick="event.stopPropagation();showPilotModal('${escapeAttr(person.name)}','${escapeAttr(avatar||'')}','${escapeAttr(person.pilot_id||'')}')"><div class="team-avatar">${avatar ? `<img src="${escapeAttr(avatar)}" alt="${escapeAttr(person.name)}">` : `<div class="team-silhouette">👤</div>`}</div><div class="team-profile-name">${escapeAttr(person.name)}</div></div>`;
}
function teamSocialHtml(team){
  // Equipos creados desde la web: enlaces validados y escapados. Los antiguos guardan HTML escrito por administración.
  const links=(team.social_links||[]).filter(l=>/^https?:\/\//i.test(l?.url||''));
  if(links.length)return links.map(l=>`<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">${escapeAttr(l.label||'Web')}</a>`).join(' • ');
  return (!team.social || team.social === 'N/A') ? `<p class="team-empty">Sin perfiles sociales disponibles por el momento</p>` : team.social;
}
function showTeamModal(id){
  const team = embeddedTeamsData.find(t => Number(t.id) === Number(id));
  if(!team) return;
  $('teamModalImg').src = team.logo;
  $('teamModalName').textContent = team.name;
  $('teamModalInfo').innerHTML = `<h3>SEDE</h3><p>${escapeAttr(team.sede)}</p><h3>CREACIÓN</h3><p>${escapeAttr(team.creacion)}</p>${team.license?`<h3>LICENCIA DE EQUIPO</h3><p>${escapeAttr(team.license)}</p>`:''}<h3>PALMARÉS</h3><ul>${renderPalmaresList(team.palmares)}</ul>`;
  $('teamModalSocial').innerHTML = teamSocialHtml(team);
  $('teamModalDirector').innerHTML = team.director?.name ? teamProfile(team.director) : '';
  $('teamModalMembers').innerHTML = team.members.map(teamProfile).join('');
  $('teamModal').classList.add('visible');
  teamModalEnhance(team);
}
function closeTeamModal(){ const modal=$('teamModal'); if(modal) modal.classList.remove('visible'); }
function teamModalBackdrop(event){ if(event.target && event.target.id === 'teamModal') closeTeamModal(); }

async function showPilotModal(name, avatar='', pilotId=''){
  $('pilotModalName').textContent=name;
  const setPhoto=url=>{$('pilotModalAvatar').innerHTML=url?'<img src="'+escapeAttr(url)+'" alt="'+escapeAttr(name)+'" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">':'<div class="team-silhouette">👤</div>'};
  // Foto: la que venga del equipo, o la foto de perfil del piloto (o la de su ficha de equipo).
  const photo=avatar||(typeof pilotPhoto==='function'?pilotPhoto(pilotId,name):'');
  setPhoto(photo);
  if(!photo&&typeof pilotDirLoad==='function')pilotDirLoad().then(()=>{const p=pilotPhoto(pilotId,name);if(p&&$('pilotModalName').textContent===name)setPhoto(p)});
  $('pilotModalHistory').innerHTML='<p class="empty">Cargando historial...</p>';
  $('pilotModal').classList.add('visible');
  const target=normalizeNameForMatch(name);
  try{
    const [regRes, profileRes, eventsRes, sessionsRes, manualRes]=await Promise.all([
      withTimeout(supabaseClient.from('registrations').select('*').order('created_at',{ascending:false}),9000,'historial inscripciones'),
      withTimeout(supabaseClient.from('profiles').select('id,nombre,apellido,email,equipo,licencia_piloto'),9000,'historial perfiles'),
      withTimeout(supabaseClient.from('events').select('id,nombre,subtitulo,championship_id'),9000,'historial eventos'),
      withTimeout(supabaseClient.from('sessions').select('id,nombre,fecha_hora,event_id'),9000,'historial sesiones'),
      withTimeout(supabaseClient.from('classification_results').select('*').order('created_at',{ascending:false}),9000,'historial manual')
    ]);
    if(regRes.error)throw new Error(regRes.error.message);
    const profiles=profileRes.data||[], events=eventsRes.data||[], sessions=sessionsRes.data||[];
    let ids = pilotId ? [pilotId] : [];
    if(!ids.length){
      const matchedProfiles=profiles.filter(p=>normalizeNameForMatch((p.nombre||'')+' '+(p.apellido||''))===target || normalizeNameForMatch(p.nombre)===target);
      ids=matchedProfiles.map(p=>p.id);
    }
    const matchedProfile=profiles.find(p=>ids.includes(p.id))||profiles.find(p=>normalizeNameForMatch((p.nombre||'')+' '+(p.apellido||''))===target || normalizeNameForMatch(p.nombre)===target)||{};
    const pilotLicense=normalizePilotLicense(matchedProfile.licencia_piloto);
    const historyMap=new Map();
    function historyKey(name){return normalizeDriverName(name||'Prueba anterior')}
    function ensureHistory(name,date,meta){
      const key=historyKey(name);
      if(!historyMap.has(key))historyMap.set(key,{date:date||0,eventName:name||'Prueba anterior',meta:meta||'-',general:'-',category:'-',desafio:'',desafioOnly:false});
      const item=historyMap.get(key);
      item.date=Math.max(item.date,date||0);
      if(meta&&(!item.meta||item.meta==='-'))item.meta=meta;
      return item;
    }
    (regRes.data||[]).filter(r=>{
      if(!ids.includes(r.pilot_id))return false;
      const se=sessions.find(x=>x.id===r.session_id);
      if(!se?.fecha_hora)return false;
      return new Date(se.fecha_hora).getTime() < Date.now();
    }).forEach(r=>{
      if(!isParticipationResult(r.posicion_general||r.clasificacion_general||r.resultado_general||r.pos_general)&&!isParticipationResult(r.posicion_categoria||r.clasificacion_categoria||r.resultado_categoria||r.pos_categoria)&&!isParticipationResult(r.posicion_desafio_peugeot))return;
      const ev=events.find(e=>e.id===r.event_id)||{};
      const se=sessions.find(x=>x.id===r.session_id)||{};
      const item=ensureHistory(ev.nombre||r.event_id||'Evento',se.fecha_hora?new Date(se.fecha_hora).getTime():0,displayHistoryCategory(r.categoria)+' - '+(r.coche||'-'));
      item.general=r.posicion_general||r.clasificacion_general||r.resultado_general||r.pos_general||'-';
      item.category=r.posicion_categoria||r.clasificacion_categoria||r.resultado_categoria||r.pos_categoria||'-';
      if(r.posicion_desafio_peugeot)item.desafio=r.posicion_desafio_peugeot;
    });
    (manualRes.data||[]).filter(r=>{
      const manualLicense=normalizePilotLicense(r.licencia_piloto||r.pilot_license);
      if(pilotLicense&&manualLicense&&pilotLicense===manualLicense)return true;
      return normalizeNameForMatch(r.pilot_name)===target;
    }).forEach(r=>{
      if(!isParticipationResult(r.posicion_general)&&!isParticipationResult(r.posicion_categoria)&&!isParticipationResult(r.posicion_desafio_peugeot))return;
      const item=ensureHistory(r.event_name||'Prueba anterior',r.created_at?new Date(r.created_at).getTime():0,displayHistoryCategory(r.category||r.categoria));
      if(r.posicion_general)item.general=r.posicion_general;
      if(!isDesafioOnlyResult(r)&&r.posicion_categoria)item.category=r.posicion_categoria;
      if(r.posicion_desafio_peugeot)item.desafio=r.posicion_desafio_peugeot;
      if(isDesafioOnlyHistoryEvent(r.event_name))item.desafioOnly=true;
    });
    const history=[...historyMap.values()].sort((a,b)=>b.date-a.date||String(a.eventName).localeCompare(String(b.eventName),'es'));
    if(!history.length){
      $('pilotModalHistory').innerHTML='<p class="team-empty">Todav&iacute;a no tiene pruebas terminadas en la comunidad.</p>';
      return;
    }
    const renderHistoryItem=item=>{const normalBoxes=item.desafioOnly?'':'<div class="pilot-result-box"><span>Clasificaci&oacute;n general</span><b>'+escapeAttr(item.general)+'</b></div><div class="pilot-result-box"><span>Clasificaci&oacute;n categor&iacute;a</span><b>'+escapeAttr(item.category)+'</b></div>';const desafioBox=item.desafio?'<div class="pilot-result-box"><span>Clasificaci&oacute;n Desaf&iacute;o Peugeot</span><b>'+escapeAttr(item.desafio)+'</b></div>':'';return '<div class="pilot-history-item"><div class="pilot-history-top"><div><div class="pilot-history-event">'+escapeAttr(item.eventName)+'</div><div class="pilot-history-car">'+escapeAttr(item.meta)+'</div></div></div><div class="pilot-history-results">'+normalBoxes+desafioBox+'</div></div>'};
    $('pilotModalHistory').innerHTML=history.map(renderHistoryItem).join('');
  }catch(e){
    $('pilotModalHistory').innerHTML='<p class="team-empty">No se pudo cargar el historial: '+escapeAttr(e.message)+'</p>';
  }
}function closePilotModal(){ const modal=$('pilotModal'); if(modal) modal.classList.remove('visible'); }
function pilotModalBackdrop(event){ if(event.target && event.target.id === 'pilotModal') closePilotModal(); }

async function adminTeams(){
  if(!adminGuard())return;
  await loadTeamsFromSupabase();
  const body=$('adminPanelBody');
  window.accRegisteredProfiles=[];
  let profileOptions='';
  let profileList='';
  try{
    const {data,error}=await supabaseClient.from('profiles').select('id,nombre,apellido,email,equipo').order('nombre',{ascending:true});
    if(!error && data){
      window.accRegisteredProfiles=data;
      profileOptions=data.map(p=>`<option value="${escapeAttr(p.id)}">${escapeAttr(((p.nombre||'')+' '+(p.apellido||'')).trim())} · ${escapeAttr(p.email||'')} · ${escapeAttr(p.id)}</option>`).join('');
      profileList=data.map(p=>`<div class="admin-list-item quick-pilot-card"><span><b>${escapeAttr(((p.nombre||'')+' '+(p.apellido||'')).trim()||'Sin nombre')}</b><br><small>${escapeAttr(p.email||'')} · Equipo perfil: ${escapeAttr(p.equipo||'-')}</small><br><small>ID: ${escapeAttr(p.id)}</small></span><span class="quick-pilot-actions"><button class="mini-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${escapeAttr(p.id)}');toast('ID copiado')">Copiar ID</button><button class="mini-btn primary" onclick="adminAddMemberFromProfile('${escapeAttr(p.id)}')">Añadir al equipo</button></span></div>`).join('');
    }
  }catch(e){profileList='<div class="admin-list-item"><span>No se pudieron cargar los pilotos registrados.</span></div>'}
  const teamsList=embeddedTeamsData.map(t=>`<div class="admin-list-item"><span><b>${escapeAttr(t.name)}</b><br><small>ID ${escapeAttr(t.id)} · ${t.members?.length||0} pilotos</small></span><span><button class="ghost-btn" onclick="adminEditTeam(${Number(t.id)})">Editar</button> <button class="ghost-btn" onclick="adminDeleteTeam(${Number(t.id)})">Borrar</button></span></div>`).join('')||'<div class="admin-list-item"><span>No hay equipos.</span></div>';
  body.innerHTML=`
  <div class="team-admin-layout">
    <div class="admin-box">
      <h3>👥 Crear / modificar equipo</h3>
      <div class="admin-help">Ahora puedes rellenar cada parte por separado. Para vincular un piloto real, pulsa <b>Añadir al equipo</b> desde la lista de pilotos registrados o pega su ID en el campo “ID piloto real”.</div>
      <input type="hidden" id="admTeamEditing">
      <datalist id="registeredPilotsList">${profileOptions}</datalist>

      <div class="team-form-section">
        <h4>1. Datos del equipo</h4>
        <div class="form-grid">
          <div class="field"><label>ID equipo</label><input id="admTeamId" type="number" placeholder="auto"></div>
          <div class="field"><label>Nombre equipo</label><input id="admTeamName" placeholder="Nombre del equipo"></div>
          <div class="field full"><label>Logo URL / ruta</label><input id="admTeamLogo" placeholder="logosequipos/logo.png" oninput="adminUpdateTeamPreview()"></div>
          <div class="field full"><label>Sede</label><input id="admTeamSede" placeholder="Cantabria | España"></div>
          <div class="field"><label>Creación</label><input id="admTeamCreacion" placeholder="01/01/2026 | 1ª temporada"></div>
          <div class="field"><label>Redes sociales HTML</label><input id="admTeamSocial" placeholder="<a href='...'>Instagram</a>"></div>
          <div class="field full"><label>Palmarés / logros</label><textarea id="admTeamPalmares" placeholder="N/A\nCampeón CRV 2025"></textarea></div>
        </div>
      </div>

      <div class="team-form-section">
        <h4>2. Director / team manager</h4>
        <div class="admin-help">Vincula al director con su cuenta (<b>ID piloto real</b>) para que pueda aceptar o rechazar las solicitudes de su equipo desde su perfil.</div>
        <div class="form-grid">
          <div class="field"><label>Nombre director</label><input id="admTeamDirectorName" placeholder="Nombre director"></div>
          <div class="field"><label>Foto director</label><input id="admTeamDirectorAvatar" placeholder="logosequipos/director.png"></div>
          <div class="field"><label>ID piloto real del director</label><input id="admTeamDirectorPilotId" list="registeredPilotsList" placeholder="id del perfil registrado"></div>
          <div class="field"><label>Licencia de equipo</label><input id="admTeamLicense" placeholder="EQ26_0000"></div>
        </div>
      </div>

      <div class="team-form-section">
        <h4>3. Pilotos / miembros</h4>
        <div class="admin-help">Añade pilotos con botones. El campo ID piloto real es el que une el miembro del equipo con sus pruebas corridas.</div>
        <div id="admTeamMembersVisual"></div>
        <button class="ghost-btn" type="button" onclick="adminAddMemberRow()">+ Añadir piloto manualmente</button>
      </div>

      <div class="form-actions">
        <button class="ghost-btn" onclick="adminClearTeamForm()">Nuevo equipo</button>
        <button class="submit-btn" onclick="adminSaveTeam()">Guardar equipo</button>
      </div>
    </div>

    <div class="admin-box">
      <h3>Solicitudes para entrar en equipos</h3>
      <div class="admin-help">Normalmente las responde el team manager desde su perfil. Aquí puedes hacerlo tú, por ejemplo en equipos sin director vinculado.</div>
      <div class="admin-list" id="admTeamJoinRequests"><div class="admin-list-item"><span>Cargando...</span></div></div>
      <h3 style="margin-top:22px">Vista rápida</h3>
      <div id="admTeamPreview" class="team-preview-card"><img src="" alt=""><span><b>Nuevo equipo</b><small>Rellena los datos y guarda.</small></span></div>
      <h3>Equipos</h3>
      <div class="admin-list">${teamsList}</div>
      <div class="team-admin-tools"><button class="ghost-btn" onclick="adminExportTeams()">Exportar JSON</button><button class="ghost-btn" onclick="adminResetTeams()">Restaurar originales</button></div>
      <div id="admTeamsExport" class="admin-help hidden"></div>
      <h3 style="margin-top:22px">Pilotos registrados</h3>
      <div class="admin-help">Pulsa <b>Añadir al equipo</b> para pasarlo directamente al formulario.</div>
      <div class="admin-list" style="max-height:420px;overflow:auto">${profileList||'<div class="admin-list-item"><span>No hay pilotos registrados.</span></div>'}</div>
    </div>
  </div>`;
  adminAddMemberRow();
  adminUpdateTeamPreview();
  adminLoadJoinRequests();
}
async function adminLoadJoinRequests(){
  const box=$('admTeamJoinRequests'); if(!box)return;
  const {data,error}=await supabaseClient.from('team_join_requests').select('*').eq('status','pending').order('created_at',{ascending:true});
  if(error){box.innerHTML=`<div class="admin-list-item"><span>No se pudieron leer las solicitudes: ${escapeAttr(error.message)}. Ejecuta supabase-setup.sql.</span></div>`;return}
  window.accAdminJoinRequests=data||[];
  box.innerHTML=(data||[]).map(r=>{const team=embeddedTeamsData.find(t=>Number(t.id)===Number(r.team_id));const linked=!!team?.director?.pilot_id;return `<div class="admin-list-item quick-pilot-card"><span><b>${escapeAttr(r.pilot_name||'Piloto')}</b> → ${escapeAttr(r.team_name||team?.name||'Equipo')}<br><small>${escapeAttr(new Date(r.created_at).toLocaleDateString('es-ES'))}${linked?' · tiene team manager':' · sin team manager vinculado'}${r.message?` · “${escapeAttr(r.message)}”`:''}</small></span><span class="quick-pilot-actions"><button class="mini-btn danger" onclick="respondJoinRequest('${escapeAttr(r.id)}',false)">Rechazar</button><button class="mini-btn primary" onclick="respondJoinRequest('${escapeAttr(r.id)}',true)">Aceptar</button></span></div>`}).join('')||'<div class="admin-list-item"><span>No hay solicitudes pendientes.</span></div>';
}

function adminMemberRowHtml(member={}){
  const id=Date.now()+Math.floor(Math.random()*100000);
  return `<div class="member-row" data-member-row>
    <div class="field"><label>Nombre piloto</label><input data-member-name value="${escapeAttr(member.name||'')}" placeholder="Nombre Apellido"></div>
    <div class="field"><label>Foto</label><input data-member-avatar value="${escapeAttr(member.avatar||'')}" placeholder="logosequipos/piloto.png"></div>
    <div class="field"><label>ID piloto real</label><input data-member-pilot-id list="registeredPilotsList" value="${escapeAttr(member.pilot_id||member.driver_key||'')}" placeholder="id del perfil registrado"></div>
    <button class="member-remove" type="button" title="Quitar piloto" onclick="this.closest('[data-member-row]').remove()">×</button>
  </div>`;
}
function adminAddMemberRow(member={}){const box=$('admTeamMembersVisual');if(!box)return;box.insertAdjacentHTML('beforeend',adminMemberRowHtml(member));}
function adminAddMemberFromProfile(profileId){
  const p=(window.accRegisteredProfiles||[]).find(x=>String(x.id)===String(profileId));
  if(!p)return toast('No encuentro ese piloto registrado.');
  const name=((p.nombre||'')+' '+(p.apellido||'')).trim()||p.email||'Piloto';
  adminAddMemberRow({name,avatar:'',pilot_id:p.id});
  toast('Piloto añadido al formulario.');
}
function adminGetVisualMembers(){
  return Array.from(document.querySelectorAll('[data-member-row]')).map(row=>({
    name:(row.querySelector('[data-member-name]')?.value||'').trim(),
    avatar:(row.querySelector('[data-member-avatar]')?.value||'').trim()||null,
    pilot_id:(row.querySelector('[data-member-pilot-id]')?.value||'').trim()
  })).filter(m=>m.name);
}
function adminUpdateTeamPreview(){
  const preview=$('admTeamPreview'); if(!preview)return;
  const name=val('admTeamName')||'Nuevo equipo';
  const logo=val('admTeamLogo');
  preview.innerHTML=`<img src="${escapeAttr(logo)}" alt="" onerror="this.style.display='none'"><span><b>${escapeAttr(name)}</b><small>${escapeAttr(val('admTeamSede')||'Sin sede indicada')}</small></span>`;
}
function adminEditTeam(id){
  const t=embeddedTeamsData.find(x=>Number(x.id)===Number(id));if(!t)return;
  $('admTeamEditing').value=t.id;$('admTeamId').value=t.id;$('admTeamId').disabled=true;$('admTeamName').value=t.name||'';$('admTeamLogo').value=t.logo||'';$('admTeamSede').value=t.sede||'';$('admTeamCreacion').value=t.creacion||'';$('admTeamSocial').value=t.social||'';$('admTeamDirectorName').value=t.director?.name||'';$('admTeamDirectorAvatar').value=t.director?.avatar||'';$('admTeamDirectorPilotId').value=t.director?.pilot_id||'';$('admTeamLicense').value=t.license||'';$('admTeamPalmares').value=normalizePalmares(t.palmares||'N/A').join('\n');
  const box=$('admTeamMembersVisual'); if(box){box.innerHTML=''; (t.members||[]).forEach(m=>adminAddMemberRow(m)); if(!(t.members||[]).length)adminAddMemberRow();}
  adminUpdateTeamPreview();
  toast('Editando equipo. Guarda para aplicar cambios.');
}
function adminClearTeamForm(){
  ['admTeamEditing','admTeamId','admTeamName','admTeamLogo','admTeamSede','admTeamCreacion','admTeamSocial','admTeamDirectorName','admTeamDirectorAvatar','admTeamDirectorPilotId','admTeamLicense','admTeamPalmares'].forEach(id=>{if($(id))$(id).value=''});if($('admTeamId'))$('admTeamId').disabled=false;const box=$('admTeamMembersVisual');if(box){box.innerHTML='';adminAddMemberRow();}adminUpdateTeamPreview();
}
async function adminSaveTeam(){
  const editing=val('admTeamEditing');const id=editing?Number(editing):(Number(val('admTeamId'))||nextTeamId());
  const previous=editing?embeddedTeamsData.find(t=>Number(t.id)===Number(editing)):null;
  const team={id,name:val('admTeamName'),logo:val('admTeamLogo'),sede:val('admTeamSede'),creacion:val('admTeamCreacion'),palmares:normalizePalmares($('admTeamPalmares').value||'N/A'),director:{name:val('admTeamDirectorName'),avatar:val('admTeamDirectorAvatar')||null,pilot_id:val('admTeamDirectorPilotId')},members:adminGetVisualMembers(),social:val('admTeamSocial')||'N/A'};
  // Licencia y enlaces validados solo se envían si la tabla ya tiene esas columnas (o si se ha escrito una licencia).
  if(val('admTeamLicense')||previous?.license!==undefined)team.license=val('admTeamLicense');
  if(previous?.social_links!==undefined)team.social_links=previous.social_links;
  if(!team.name)return toast('El nombre del equipo es obligatorio.');
  if(editing){embeddedTeamsData=embeddedTeamsData.map(t=>Number(t.id)===Number(editing)?team:t)}else{embeddedTeamsData.push(team)}
  try{
    await saveTeamToSupabase(team);
    renderTeamsGallery();toast('Equipo guardado en Supabase.');await adminTeams();
  }catch(e){
    console.error(e);
    saveTeamsToStorage();renderTeamsGallery();toast('No se pudo guardar en Supabase: '+e.message);
  }
}

async function adminDeleteTeam(id){if(!confirm('¿Borrar equipo?'))return;embeddedTeamsData=embeddedTeamsData.filter(t=>Number(t.id)!==Number(id));try{await deleteTeamFromSupabase(id);renderTeamsGallery();toast('Equipo borrado de Supabase.');await adminTeams()}catch(e){saveTeamsToStorage();renderTeamsGallery();toast('No se pudo borrar en Supabase: '+e.message);await adminTeams()}}
function adminResetTeams(){if(!confirm('¿Restaurar los equipos originales del HTML? Se perderán los cambios locales.'))return;localStorage.removeItem('acc_embedded_teams');location.reload()}
function adminExportTeams(){const box=$('admTeamsExport');box.classList.remove('hidden');box.innerHTML=`<b>JSON de equipos:</b><textarea readonly style="margin-top:10px;min-height:260px">${JSON.stringify(embeddedTeamsData,null,2).replace(/</g,'&lt;')}</textarea>`}

loadTeamsFromStorage();
renderTeamsGallery();

async function init(){
  try{
    initNationalitySelects();
    pilotDirLoad();
    await loadTeamsFromSupabase();
    renderTeamsGallery();
    renderHome();
    const {data}=await supabaseClient.auth.getSession();
    if(data.session?.user){
      await loadProfile(data.session.user);
    }else{
      currentUser=null;
      localStorage.removeItem("acc_user");
      updateUserMenu();
    }
    await loadPublicEvents();
    loadHomeExtras();
  }catch(error){
    console.error(error);
    toast("No se pudo cargar todo. Revisa Supabase o la conexión.");
  }finally{
    hideLoading();
  }
}
setInterval(()=>{if($("event").classList.contains("active"))refreshSessionFilesOnly()},2000);
init();
