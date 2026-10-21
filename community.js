/* =====================================================================
   ACC Community · Equipos (auto-inscripción), Noticias, Safety Rating y Ranking
   Se carga antes de teams-licenses.js (que arranca init()), por eso solo
   declara funciones: nada aquí se ejecuta hasta que la web lo pide.
   ===================================================================== */

/* ---------- Utilidades ---------- */
function escHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function round2(n){return Math.round(n*100)/100}
function fmtSr(n){return Number(n).toFixed(2)}
function fmtSigned(n){const v=round2(n);return (v>0?'+':v<0?'−':'±')+Math.abs(v).toFixed(2)}
function longDate(v){if(!v)return '';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}
function shortDate(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'})}
function loadingBlock(text){return `<div class="panel"><div class="panel-body"><p class="empty">${escHtml(text||'Cargando...')}</p></div></div>`}
function loginRequiredBlock(text){return `<div class="panel"><div class="panel-body center-block"><p class="empty">${escHtml(text)}</p><button class="pill-btn primary" onclick="showPage('login')">Iniciar sesión</button> <button class="pill-btn" onclick="showPage('register')">Crear cuenta</button></div></div>`}
function pilotFullName(p){return `${p?.nombre||''} ${p?.apellido||''}`.trim()}
async function selectAllRows(table,select='*',orderCol='id'){
  // Supabase devuelve como máximo 1000 filas por consulta: pagina hasta traerlo todo.
  const size=1000,rows=[];
  for(let from=0;from<50000;from+=size){
    let q=supabaseClient.from(table).select(select).range(from,from+size-1);
    if(orderCol)q=q.order(orderCol,{ascending:true});
    const {data,error}=await q;
    if(error){console.warn(table,error.message);return rows}
    rows.push(...(data||[]));
    if(!data||data.length<size)break;
  }
  return rows;
}

/* Gancho llamado desde showPage(): carga el contenido de cada página al entrar */
function onPageShown(id){
  if(id==='home')loadHomeExtras();
  else if(id==='news')loadNewsPage();
  else if(id==='ranking')loadRankingPage();
  else if(id==='safety')loadSafetyPage();
  else if(id==='profile'){renderProfileHub();renderMyRaces()}
  else if(id==='pruebas')loadFinishedEvents();
  else if(id==='licenses')renderLicensesPage();
  else if(id==='createTeam')renderCreateTeamForm();
}

/* =====================================================================
   1. EQUIPOS · solicitudes al team manager
   La pertenencia a un equipo es profiles.equipo (lo que ya usan las
   clasificaciones por equipos). Entrar requiere que el team manager acepte
   la solicitud (funciones request_team_join / respond_team_join en Supabase);
   salir lo hace el propio piloto.
   ===================================================================== */
function teamByName(name){
  const key=normalizeNameForMatch(name);
  return key?embeddedTeamsData.find(t=>normalizeNameForMatch(t.name)===key)||null:null;
}
function currentTeamName(){return (currentUser?.team||'').trim()}
function isMemberOfTeam(team){return !!team&&normalizeNameForMatch(currentTeamName())===normalizeNameForMatch(team.name)}

function fillTeamSelects(extraValue){
  ['profileTeam'].forEach(id=>{
    const el=$(id); if(!el||el.tagName!=='SELECT')return;
    const current=extraValue!==undefined&&id==='profileTeam'?extraValue:el.value;
    const names=embeddedTeamsData.map(t=>t.name).filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'));
    // Un equipo antiguo escrito a mano que no esté en la lista se conserva como opción.
    if(current&&!names.some(n=>normalizeNameForMatch(n)===normalizeNameForMatch(current)))names.push(current);
    el.innerHTML='<option value="">Sin equipo</option>'+names.map(n=>`<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');
    const match=names.find(n=>normalizeNameForMatch(n)===normalizeNameForMatch(current));
    el.value=match||'';
  });
}

/* Mis solicitudes (como piloto) y, si soy team manager, las que llegan a mi equipo */
let myJoinRequests=[];
let managerJoinRequests=[];
function myDirectedTeam(){return currentUser?embeddedTeamsData.find(t=>t.director?.pilot_id&&t.director.pilot_id===currentUser.id)||null:null}
function myPendingRequestFor(teamId){return myJoinRequests.find(r=>Number(r.team_id)===Number(teamId)&&r.status==='pending')||null}
async function loadMyTeamRequests(){
  myJoinRequests=[];managerJoinRequests=[];
  if(!currentUser)return;
  const {data,error}=await supabaseClient.from('team_join_requests').select('*').order('created_at',{ascending:false});
  if(error){console.warn('team_join_requests:',error.message);return}
  myJoinRequests=(data||[]).filter(r=>r.pilot_id===currentUser.id);
  const mine=myDirectedTeam();
  managerJoinRequests=mine?(data||[]).filter(r=>Number(r.team_id)===Number(mine.id)&&r.status==='pending'):[];
}
async function afterTeamChange(){
  await loadTeamsFromSupabase();
  renderTeamsGallery();
  await loadMyTeamRequests();
  srCache.at=0;
  if(typeof pilotDir!=='undefined')pilotDir.at=0;
  if($('teamModal')?.classList.contains('visible')&&teamModalCurrentId!=null)showTeamModal(teamModalCurrentId);
  renderProfileHub();
}
async function joinTeam(teamId){
  const team=embeddedTeamsData.find(t=>Number(t.id)===Number(teamId));
  if(!team)return toast('No encuentro ese equipo.');
  if(!currentUser){toast('Inicia sesión para unirte a un equipo.');closeTeamModal();showPage('login');return}
  if(isMemberOfTeam(team))return toast('Ya perteneces a este equipo.');
  if(myPendingRequestFor(team.id))return toast('Ya tienes una solicitud pendiente para este equipo.');
  const prev=currentTeamName();
  const message=prompt(`${prev?`Ahora estás en "${prev}". Si te aceptan, te cambiarás a "${team.name}".\n\n`:''}Mensaje para el team manager de ${team.name} (opcional):`,'');
  if(message===null)return;
  try{await accRpc('request_team_join',{p_team_id:Number(team.id),p_message:message})}catch(e){return toast(e.message)}
  toast(`Solicitud enviada a ${team.name}. Te avisaremos aquí cuando el team manager responda.`);
  await loadMyTeamRequests();
  if($('teamModal')?.classList.contains('visible'))renderTeamJoinBox(team);
  renderProfileHub();
}
async function cancelJoinRequest(requestId){
  if(!confirm('¿Cancelar la solicitud?'))return;
  try{await accRpc('cancel_team_join',{p_request_id:requestId})}catch(e){return toast(e.message)}
  toast('Solicitud cancelada.');
  await loadMyTeamRequests();
  if($('teamModal')?.classList.contains('visible')&&teamModalCurrentId!=null)renderTeamJoinBox(embeddedTeamsData.find(t=>t.id===teamModalCurrentId));
  renderProfileHub();
}
async function respondJoinRequest(requestId,accept){
  const r=managerJoinRequests.find(x=>x.id===requestId)||(window.accAdminJoinRequests||[]).find(x=>x.id===requestId);
  if(!confirm(`${accept?'¿Aceptar':'¿Rechazar'} a ${r?.pilot_name||'este piloto'}${r?.team_name?` en ${r.team_name}`:''}?`))return;
  try{await accRpc('respond_team_join',{p_request_id:requestId,p_accept:!!accept})}catch(e){return toast(e.message)}
  toast(accept?'Piloto aceptado: ya forma parte del equipo.':'Solicitud rechazada.');
  await afterTeamChange();
  if($('admin')?.classList.contains('active')&&typeof adminTeams==='function')adminTeams();
}
async function joinSelectedTeam(){
  const name=$('profileTeam')?.value||'';
  if(!name)return toast('Elige un equipo de la lista.');
  const team=teamByName(name);
  if(!team)return toast('Ese equipo no está en la lista oficial. Puedes crearlo con «Crear mi equipo».');
  return joinTeam(team.id);
}
async function leaveTeam(){
  if(!currentUser)return;
  if(!currentTeamName())return toast('No perteneces a ningún equipo.');
  if(!confirm(`¿Salir del equipo "${currentTeamName()}"?`))return;
  try{await accRpc('leave_my_team')}catch(e){return toast(e.message)}
  currentUser.team='';currentUser.teamLicense='';
  try{localStorage.setItem('acc_user',JSON.stringify(currentUser))}catch(e){}
  toast('Has salido del equipo.');
  await afterTeamChange();
}

let teamModalCurrentId=null;
function renderTeamJoinBox(team){
  const box=$('teamModalJoin'); if(!box||!team)return;
  if(!currentUser){
    box.innerHTML=`<div class="team-join"><span>¿Quieres correr en este equipo?</span><button class="pill-btn primary" onclick="closeTeamModal();showPage('login')">Inicia sesión para solicitarlo</button></div>`;
    return;
  }
  if(myDirectedTeam()&&Number(myDirectedTeam().id)===Number(team.id)){
    const n=managerJoinRequests.length;
    box.innerHTML=`<div class="team-join is-member"><span>⭐ Eres el team manager${n?` · <b>${n}</b> ${n===1?'solicitud pendiente':'solicitudes pendientes'}`:''}</span><button class="mini-btn primary" onclick="closeTeamModal();openProfile()">Gestionar equipo</button></div>`;
    return;
  }
  if(isMemberOfTeam(team)){
    box.innerHTML=`<div class="team-join is-member"><span>✔ Perteneces a este equipo</span><button class="mini-btn danger" onclick="leaveTeam()">Salir del equipo</button></div>`;
    return;
  }
  const pending=myPendingRequestFor(team.id);
  if(pending){
    box.innerHTML=`<div class="team-join"><span>⏳ Solicitud enviada el ${escHtml(shortDate(pending.created_at))}. Esperando respuesta del team manager.</span><button class="mini-btn" onclick="cancelJoinRequest('${escHtml(pending.id)}')">Cancelar solicitud</button></div>`;
    return;
  }
  const prev=currentTeamName();
  box.innerHTML=`<div class="team-join"><span>${prev?`Ahora estás en <b>${escHtml(prev)}</b>.`:'El team manager decidirá si te acepta.'}</span><button class="pill-btn primary" onclick="joinTeam(${Number(team.id)})">Solicitar unirme</button></div>`;
}
async function teamModalEnhance(team){
  teamModalCurrentId=team.id;
  renderTeamJoinBox(team);
  // Pilotos registrados que se han apuntado solos (además de los que puso administración).
  try{
    const {data,error}=await supabaseClient.from('profiles').select('id,nombre,apellido,equipo').neq('equipo','');
    if(error||teamModalCurrentId!==team.id)return;
    const key=normalizeNameForMatch(team.name);
    const known=team.members||[];
    const extra=(data||[]).filter(p=>normalizeNameForMatch(p.equipo)===key).filter(p=>{
      const name=pilotFullName(p);
      return name&&!known.some(m=>(m.pilot_id&&m.pilot_id===p.id)||normalizeNameForMatch(m.name)===normalizeNameForMatch(name));
    });
    if(!extra.length)return;
    $('teamModalMembers').insertAdjacentHTML('beforeend',extra.map(p=>teamProfile({name:pilotFullName(p),avatar:null,pilot_id:p.id})).join(''));
  }catch(e){console.warn('No se pudieron cargar los pilotos apuntados',e.message)}
}

/* Cabecera de "Mi perfil": resumen, licencia y equipo */
async function renderProfileHub(){
  const hub=$('profileHub'),teamCard=$('profileTeamCard'); if(!hub)return;
  if(!currentUser){hub.innerHTML='';return}
  fillTeamSelects(currentTeamName());
  const team=teamByName(currentTeamName());
  const initials=((currentUser.name||'?')[0]+((currentUser.lastName||'')[0]||'')).toUpperCase();
  hub.innerHTML=`<div class="hub-card">
    <div class="hub-avatar">${currentUser.avatar?`<img src="${escHtml(currentUser.avatar)}" alt="" onerror="this.remove()">`:''}${escHtml(initials||'?')}</div>
    <div class="hub-main">
      <p class="eyebrow">Área de piloto</p>
      <h1>${escHtml(`${currentUser.name||''} ${currentUser.lastName||''}`.trim()||'Piloto')}</h1>
      <div class="hub-tags">
        <span class="hub-tag">${escHtml(currentUser.email||'')}</span>
        ${currentUser.nationality?`<span class="hub-tag">🌍 ${escHtml(currentUser.nationality)}${currentUser.ccaa?' · '+escHtml(currentUser.ccaa):''}</span>`:''}
        <span class="hub-tag">${team?`🏁 ${escHtml(team.name)}`:(currentTeamName()?`🏁 ${escHtml(currentTeamName())}`:'Sin equipo')}</span>
      </div>
    </div>
    <div class="hub-license" id="profileHubLicense"><span class="empty">Calculando licencia…</span></div>
    <div class="hub-actions"><button class="pill-btn primary" onclick="showPage('safety')">Mi Safety Rating</button><button class="pill-btn" onclick="showPage('ranking')">Ranking</button></div>
  </div>`;
  if(teamCard){
    const lic=currentUser.teamLicense||team?.license||'';
    teamCard.querySelector('#profileTeamCurrent').innerHTML=team
      ?`<img src="${escHtml(team.logo)}" alt="" onerror="this.style.display='none'"><span><b>${escHtml(team.name)}</b><small>${escHtml(team.sede||'')}${lic?` · Licencia ${escHtml(lic)}`:''}</small></span>`
      :(currentTeamName()?`<span><b>${escHtml(currentTeamName())}</b><small>Equipo escrito a mano: no está en la lista oficial.</small></span>`:`<span><b>Sin equipo</b><small>Elige uno de la lista y envía tu solicitud, o crea tu propio equipo.</small></span>`);
    renderProfileTeamRequests();
    loadMyTeamRequests().then(renderProfileTeamRequests);
  }
  try{
    const c=await srLoad();
    const res=c.results.get(currentUser.id)||srCompute([]);
    const slot=$('profileHubLicense');
    if(slot)slot.innerHTML=`${licBadge(res.cls,res.sr,'lg')}<small>${escHtml(SR_CLASSES[res.cls].name)} · Safety Rating</small>${currentUser.license?`<small>Licencia ${escHtml(currentUser.license)}</small>`:`<button class="mini-btn primary" onclick="showPage('licenses')">Pedir licencia</button>`}`;
  }catch(e){const slot=$('profileHubLicense');if(slot)slot.innerHTML=''}
}
/* Dentro de "Mi equipo": panel del team manager + mis solicitudes */
function renderProfileTeamRequests(){
  const mgr=$('profileTeamManager'),mine=$('profileTeamRequests'); if(!mgr||!mine)return;
  const directed=myDirectedTeam();
  mgr.innerHTML=directed?`<div class="manager-box"><div class="manager-head"><b>⭐ Eres el team manager de ${escHtml(directed.name)}</b>${directed.license?`<span class="chip ok">Licencia ${escHtml(directed.license)}</span>`:`<button class="mini-btn primary" onclick="assignMyTeamLicense()">Obtener licencia de equipo</button>`}</div>
    ${managerJoinRequests.length?managerJoinRequests.map(r=>`<div class="request-row"><span class="request-who">${avatarHtml(pilotPhoto(r.pilot_id,r.pilot_name),r.pilot_name,'pilot-photo sm')}<span><b>${escHtml(r.pilot_name||'Piloto')}</b><small>${escHtml(shortDate(r.created_at))}${r.message?` · “${escHtml(r.message)}”`:''}</small></span></span><span class="request-actions"><button class="mini-btn" onclick="showPilotModal('${escHtml(r.pilot_name||'')}','','${escHtml(r.pilot_id)}')">Historial</button><button class="mini-btn danger" onclick="respondJoinRequest('${escHtml(r.id)}',false)">Rechazar</button><button class="mini-btn primary" onclick="respondJoinRequest('${escHtml(r.id)}',true)">Aceptar</button></span></div>`).join(''):'<p class="empty">No hay solicitudes pendientes para tu equipo.</p>'}</div>`:'';
  const labels={pending:['⏳ Pendiente',''],accepted:['✔ Aceptada','ok'],rejected:['✖ Rechazada','bad'],cancelled:['Cancelada','']};
  const recent=myJoinRequests.slice(0,5);
  mine.innerHTML=recent.length?`<div class="my-requests"><small class="my-requests-title">Mis solicitudes</small>${recent.map(r=>{const [txt,cls]=labels[r.status]||[r.status,''];return `<div class="request-row"><span><b>${escHtml(r.team_name||'Equipo')}</b><small>${escHtml(shortDate(r.created_at))}</small></span><span class="request-actions"><span class="chip ${cls}">${txt}</span>${r.status==='pending'?`<button class="mini-btn" onclick="cancelJoinRequest('${escHtml(r.id)}')">Cancelar</button>`:''}</span></div>`}).join('')}</div>`:'';
}

/* =====================================================================
   2. NOTICIAS
   ===================================================================== */
let newsCache={rows:[],at:0,error:false};
async function newsFetch(force){
  if(!force&&newsCache.at&&Date.now()-newsCache.at<60000)return newsCache.rows;
  const {data,error}=await supabaseClient.from('news').select('*').order('created_at',{ascending:false});
  if(error){console.warn('news:',error.message);newsCache={rows:[],at:Date.now(),error:true};return []}
  newsCache={rows:(data||[]).filter(n=>n.published!==false),at:Date.now(),error:false};
  return newsCache.rows;
}
function newsSummary(n){
  if(n.summary)return n.summary;
  const plain=String(n.body||'').replace(/^#+\s*/gm,'').replace(/\s+/g,' ').trim();
  return plain.length>170?plain.slice(0,167)+'…':plain;
}
function newsCardHtml(n,featured){
  const cover=n.image_url?`<img src="${escHtml(n.image_url)}" alt="" loading="lazy" onerror="this.remove()">`:'';
  return `<article class="news-card${featured?' featured':''}" tabindex="0" onclick="openNewsArticle('${escHtml(n.id)}')" onkeydown="if(event.key==='Enter')openNewsArticle('${escHtml(n.id)}')">
    <div class="news-cover"><span class="news-cover-fallback">🏁</span>${cover}<span class="news-cat">${escHtml(n.category||'Noticias')}</span></div>
    <div class="news-body"><time>${escHtml(longDate(n.created_at))}</time><h3>${escHtml(n.title)}</h3><p>${escHtml(newsSummary(n))}</p><span class="news-more">Leer más →</span></div>
  </article>`;
}
async function loadNewsPage(){
  const box=$('newsContent'); if(!box)return;
  box.innerHTML=loadingBlock('Cargando noticias...');
  const rows=await newsFetch(true);
  if(!rows.length){
    box.innerHTML=`<div class="panel"><div class="panel-body center-block"><p class="empty">${newsCache.error?'Las noticias todavía no están activadas (falta crear la tabla en Supabase).':'Todavía no hay noticias publicadas. ¡Vuelve pronto!'}</p></div></div>`;
    return;
  }
  const [first,...rest]=rows;
  box.innerHTML=`<div class="news-grid">${newsCardHtml(first,true)}${rest.map(n=>newsCardHtml(n,false)).join('')}</div>`;
}
async function loadHomeExtras(){
  const box=$('homeNews'),wrap=$('homeNewsWrap');
  if(box&&wrap){
    try{
      // La última noticia publicada, destacada justo debajo de la portada.
      const rows=(await newsFetch(false)).slice(0,1);
      wrap.classList.toggle('hidden',!rows.length);
      box.innerHTML=rows.map(n=>newsCardHtml(n,true)).join('');
    }catch(e){wrap.classList.add('hidden')}
  }
  const done=$('homeStatDone');
  // Pruebas disputadas = las de "Pruebas finalizadas" (reales ya terminadas + históricas cargadas a mano).
  loadHomeFinished().then(()=>{if(done)done.textContent=finishedState.items.length});
  const teams=$('homeStatTeams'),events2=$('homeStatEvents'),pilots=$('homeStatPilots');
  if(teams)teams.textContent=embeddedTeamsData.length;
  if(events2)events2.textContent=(typeof events!=='undefined'?events.filter(isUpcomingEvent).length:0);
  if(pilots){
    const total=await homePilotCount();
    pilots.textContent=total;
    pilots.parentElement.classList.toggle('hidden',!total);
  }
}
/* Pilotos registrados. public_pilot_count() funciona sin sesión; si aún no existe en Supabase se cuentan
   los perfiles (solo con sesión) y, si tampoco, los pilotos distintos que han corrido o están inscritos. */
async function homePilotCount(){
  try{
    const {data,error}=await supabaseClient.rpc('public_pilot_count');
    if(!error&&Number(data))return Number(data);
    if(error)console.warn('public_pilot_count:',error.message,'· ejecuta supabase-setup.sql para el número exacto sin sesión');
    const {count,error:countError}=await supabaseClient.from('profiles').select('id',{count:'exact',head:true});
    if(!countError&&count)return count;
  }catch(e){}
  const [regs,manual]=await Promise.all([selectAllRows('registrations','pilot_id'),selectAllRows('classification_results','pilot_id,pilot_name')]);
  const seen=new Set();
  regs.forEach(r=>{if(r.pilot_id)seen.add(r.pilot_id)});
  manual.forEach(m=>{if(m.pilot_id)seen.add(m.pilot_id);else if(m.pilot_name)seen.add('n:'+normalizeDriverName(m.pilot_name))});
  return seen.size;
}
/* Texto plano -> HTML seguro: párrafos, "## título", "- viñeta" y enlaces http(s) */
function renderNewsBody(text){
  const link=s=>s.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  return String(text||'').replace(/\r/g,'').split(/\n{2,}/).map(block=>{
    const lines=block.split('\n').filter(l=>l.trim());
    if(!lines.length)return '';
    if(lines.every(l=>/^\s*[-•]\s+/.test(l)))return `<ul>${lines.map(l=>`<li>${link(escHtml(l.replace(/^\s*[-•]\s+/,'')))}</li>`).join('')}</ul>`;
    if(/^##\s+/.test(lines[0])&&lines.length===1)return `<h3>${escHtml(lines[0].replace(/^##\s+/,''))}</h3>`;
    return `<p>${lines.map(l=>link(escHtml(l))).join('<br>')}</p>`;
  }).join('');
}
async function openNewsArticle(id){
  const rows=await newsFetch(false);
  const n=rows.find(x=>String(x.id)===String(id));
  if(!n)return toast('No encuentro esa noticia.');
  $('newsArticleContent').innerHTML=`<article class="news-article">
    <button class="ghost-btn" onclick="showPage('news')">← Todas las noticias</button>
    <span class="news-cat static">${escHtml(n.category||'Noticias')}</span>
    <h1>${escHtml(n.title)}</h1>
    <div class="news-meta">${escHtml(longDate(n.created_at))}${n.author?` · ${escHtml(n.author)}`:''}</div>
    ${n.image_url?`<img class="news-hero-img" src="${escHtml(n.image_url)}" alt="" onerror="this.remove()">`:''}
    ${n.summary?`<p class="news-lead">${escHtml(n.summary)}</p>`:''}
    <div class="news-text">${renderNewsBody(n.body)}</div>
  </article>`;
  showPage('newsArticle');
  document.querySelector('[data-nav="news"]')?.classList.add('active');
}

/* ----- Administración de noticias ----- */
async function adminNews(){
  if(!adminGuard())return;
  const body=$('adminPanelBody');
  body.innerHTML=loadingBlock('Cargando noticias...');
  const {data,error}=await supabaseClient.from('news').select('*').order('created_at',{ascending:false});
  if(error){
    body.innerHTML=`<div class="admin-box"><h3>📰 Noticias</h3><div class="admin-help">No se pudo leer la tabla <b>news</b>: ${escHtml(error.message)}<br>Ejecuta el archivo <b>supabase-setup.sql</b> en el SQL Editor de Supabase y vuelve a entrar.</div></div>`;
    return;
  }
  window.accAdminNews=data||[];
  const list=(data||[]).map(n=>`<div class="admin-list-item news-admin-item"><span><b>${escHtml(n.title)}</b><br><small>${escHtml(n.category||'Noticias')} · ${escHtml(shortDate(n.created_at))} · ${n.published===false?'<b>Borrador</b>':'Publicada'}</small></span>
    <span class="quick-pilot-actions"><button class="mini-btn" onclick="adminToggleNews('${escHtml(n.id)}',${n.published===false})">${n.published===false?'Publicar':'Ocultar'}</button><button class="mini-btn primary" onclick="adminEditNews('${escHtml(n.id)}')">Editar</button><button class="mini-btn danger" onclick="adminDeleteNews('${escHtml(n.id)}')">Borrar</button></span></div>`).join('')||'<div class="admin-list-item"><span>Todavía no has creado noticias.</span></div>';
  body.innerHTML=`<div class="team-admin-layout">
    <div class="admin-box">
      <h3>📰 Crear / editar noticia</h3>
      <div class="admin-help">Escribe el texto con párrafos separados por una línea en blanco. Puedes usar <b>## Título</b> para un subtítulo, líneas que empiecen por <b>-</b> para listas, y pegar enlaces (se convierten solos).</div>
      <input type="hidden" id="admNewsEditing">
      <div class="form-grid">
        <div class="field full"><label>Título</label><input id="admNewsTitle" placeholder="Título de la noticia" maxlength="140"></div>
        <div class="field"><label>Categoría</label><input id="admNewsCategory" list="admNewsCategories" placeholder="Comunicado" value="Noticias"><datalist id="admNewsCategories"><option value="Noticias"><option value="Comunicado"><option value="Campeonato"><option value="Equipos"><option value="Reglamento"><option value="Resultados"></datalist></div>
        <div class="field"><label>Imagen (URL, opcional)</label><input id="admNewsImage" placeholder="https://..."></div>
        <div class="field full"><label>Resumen (aparece en la tarjeta)</label><input id="admNewsSummary" placeholder="Una frase que enganche" maxlength="240"></div>
        <div class="field full"><label>Contenido</label><textarea id="admNewsBody" style="min-height:220px" placeholder="Escribe aquí la noticia..."></textarea></div>
        <div class="field full"><label class="check-row"><input type="checkbox" id="admNewsPublished" checked> Publicar ahora (si lo desmarcas queda como borrador)</label></div>
      </div>
      <div class="form-actions"><button class="ghost-btn" onclick="adminClearNewsForm()">Nueva</button><button class="submit-btn" onclick="adminSaveNews()">Guardar noticia</button></div>
    </div>
    <div class="admin-box"><h3>Noticias creadas</h3><div class="admin-list">${list}</div></div>
  </div>`;
}
function adminClearNewsForm(){
  $('admNewsEditing').value='';$('admNewsTitle').value='';$('admNewsCategory').value='Noticias';$('admNewsImage').value='';$('admNewsSummary').value='';$('admNewsBody').value='';$('admNewsPublished').checked=true;
}
function adminEditNews(id){
  const n=(window.accAdminNews||[]).find(x=>String(x.id)===String(id)); if(!n)return;
  $('admNewsEditing').value=n.id;$('admNewsTitle').value=n.title||'';$('admNewsCategory').value=n.category||'Noticias';$('admNewsImage').value=n.image_url||'';$('admNewsSummary').value=n.summary||'';$('admNewsBody').value=n.body||'';$('admNewsPublished').checked=n.published!==false;
  window.scrollTo({top:0,behavior:'smooth'});
  toast('Editando noticia. Guarda para aplicar cambios.');
}
async function adminSaveNews(){
  const editing=val('admNewsEditing');
  const payload={
    title:val('admNewsTitle'),
    category:val('admNewsCategory')||'Noticias',
    image_url:val('admNewsImage')||null,
    summary:val('admNewsSummary')||null,
    body:$('admNewsBody').value.trim()||null,
    published:$('admNewsPublished').checked,
    updated_at:new Date().toISOString()
  };
  if(!payload.title)return toast('La noticia necesita un título.');
  if(!payload.body&&!payload.summary)return toast('Escribe un resumen o el contenido de la noticia.');
  let error;
  if(editing){({error}=await supabaseClient.from('news').update(payload).eq('id',editing))}
  else{({error}=await supabaseClient.from('news').insert({...payload,author:`${currentUser?.name||''} ${currentUser?.lastName||''}`.trim()||'Organización'}))}
  if(error)return toast(error.message);
  newsCache.at=0;
  toast(editing?'Noticia actualizada.':'Noticia creada.');
  adminNews();
}
async function adminToggleNews(id,publish){
  const {error}=await supabaseClient.from('news').update({published:publish,updated_at:new Date().toISOString()}).eq('id',id);
  if(error)return toast(error.message);
  newsCache.at=0;toast(publish?'Noticia publicada.':'Noticia oculta (borrador).');adminNews();
}
async function adminDeleteNews(id){
  if(!confirm('¿Borrar esta noticia definitivamente?'))return;
  const {error}=await supabaseClient.from('news').delete().eq('id',id);
  if(error)return toast(error.message);
  newsCache.at=0;toast('Noticia borrada.');adminNews();
}

/* =====================================================================
   3. SAFETY RATING + LICENCIA ACC (estilo iRacing)
   Todo se calcula desde los resultados ya cargados en la web; el único dato
   extra son los ajustes manuales de administración (tabla safety_adjustments).
   Cambia los números de SR_RULES para ajustar el sistema.
   ===================================================================== */
const SR_CLASSES=[
  {key:'R',name:'Rookie',color:'#e5484d',ink:'#ffffff'},
  {key:'D',name:'Clase D',color:'#f76b15',ink:'#ffffff'},
  {key:'C',name:'Clase C',color:'#f5c400',ink:'#1a1300'},
  {key:'B',name:'Clase B',color:'#2fb344',ink:'#ffffff'},
  {key:'A',name:'Clase A',color:'#2f7df6',ink:'#ffffff'},
  {key:'PRO',name:'Pro',color:'#111827',ink:'#ffd166'}
];
// Color para pintar sobre fondo oscuro (el negro de Pro no se vería): Pro usa dorado.
const srRing=c=>c.key==='PRO'?'#ffd166':c.color;
const SR_RULES={start:2.5,max:4.99,promote:4.0,demote:1.0,finish:0.5,ab:-0.4,np:-0.8};
const SR_LAST=SR_CLASSES.length-1;

function licBadge(cls,sr,size){
  const c=SR_CLASSES[cls]||SR_CLASSES[0];
  return `<span class="lic-badge ${size||''}" style="--lic:${c.color};--lic-ink:${c.ink}"><b>${c.key}</b><i>${fmtSr(sr)}</i></span>`;
}
function srOutcome(...values){
  const vals=values.map(v=>String(v??'').trim().toUpperCase()).filter(Boolean);
  if(vals.some(v=>/\d/.test(v)))return 'finish';
  if(vals.includes('AB'))return 'ab';
  if(vals.includes('NP'))return 'np';
  return null;
}
function srDelta(entry){
  if(entry.kind==='adjust')return entry.delta;
  return entry.outcome==='finish'?SR_RULES.finish:entry.outcome==='ab'?SR_RULES.ab:SR_RULES.np;
}
/* Aplica los movimientos en orden cronológico y devuelve licencia final + línea de tiempo */
function srCompute(entries){
  let cls=0,sr=SR_RULES.start;
  const stats={finished:0,ab:0,np:0,adjustments:0,promotions:0,demotions:0};
  const timeline=[];
  for(const e of entries){
    const delta=srDelta(e);
    const clsBefore=cls,srBefore=sr;
    let next=round2(sr+delta),change=null;
    if(cls<SR_LAST&&next>=SR_RULES.promote){cls++;next=SR_RULES.start;change='up';stats.promotions++}
    else if(cls>0&&next<SR_RULES.demote){cls--;next=SR_RULES.start;change='down';stats.demotions++}
    else next=Math.min(SR_RULES.max,Math.max(0,next));
    sr=next;
    if(e.kind==='adjust')stats.adjustments++;else if(e.outcome==='finish')stats.finished++;else if(e.outcome==='ab')stats.ab++;else stats.np++;
    timeline.push({...e,delta,clsBefore,srBefore,clsAfter:cls,srAfter:sr,change});
  }
  return {cls,sr,timeline,stats,count:entries.length};
}

let srCache={at:0,data:null,results:null};
function pushTo(map,key,value){let list=map.get(key);if(!list){list=[];map.set(key,list)}list.push(value)}
function srBuildIndex(data){
  const profileIds=new Set(data.profiles.map(p=>p.id));
  const byLicense=new Map(),byName=new Map(),nameCount=new Map();
  data.profiles.forEach(p=>{
    const lic=normalizePilotLicense(p.licencia_piloto);if(lic&&!byLicense.has(lic))byLicense.set(lic,p.id);
    const nm=normalizeDriverName(pilotFullName(p));if(nm){nameCount.set(nm,(nameCount.get(nm)||0)+1);byName.set(nm,p.id)}
  });
  // Los resultados manuales pueden traer pilot_id, licencia o solo el nombre (solo si el nombre es único).
  const manualOwner=r=>{
    if(r.pilot_id&&profileIds.has(r.pilot_id))return r.pilot_id;
    const lic=normalizePilotLicense(r.licencia_piloto||r.pilot_license);if(lic&&byLicense.has(lic))return byLicense.get(lic);
    const nm=normalizeDriverName(r.pilot_name);return nm&&nameCount.get(nm)===1?byName.get(nm):null;
  };
  const idx={
    sessionsById:new Map(data.sessions.map(s=>[s.id,s])),
    eventsById:new Map(data.events.map(e=>[e.id,e])),
    regsByPilot:new Map(),manualByPilot:new Map(),adjustByPilot:new Map()
  };
  // Pruebas con resultados ya publicados: quien estaba inscrito y no aparece cuenta como NP.
  idx.eventsWithResults=new Set(data.registrations.filter(r=>srOutcome(r.posicion_general,r.posicion_categoria,r.posicion_desafio_peugeot)).map(r=>r.event_id));
  idx.manualEventNames=new Set(data.manual.filter(r=>r.event_name).map(r=>normalizeDriverName(r.event_name)));
  data.registrations.forEach(r=>{if(r.pilot_id)pushTo(idx.regsByPilot,r.pilot_id,r)});
  data.manual.forEach(r=>{const owner=manualOwner(r);if(owner)pushTo(idx.manualByPilot,owner,r)});
  data.adjustments.forEach(a=>{if(a.pilot_id)pushTo(idx.adjustByPilot,a.pilot_id,a)});
  return idx;
}
function srEntriesFor(pilotId,idx,now){
  const byEvent=new Map(),noResult=[];
  (idx.regsByPilot.get(pilotId)||[]).forEach(r=>{
    const se=idx.sessionsById.get(r.session_id);
    const t=se?.fecha_hora?new Date(se.fecha_hora).getTime():NaN;
    if(!Number.isFinite(t)||t>=now)return; // solo pruebas ya disputadas
    const ev=idx.eventsById.get(r.event_id)||{};
    const name=ev.nombre||r.event_id||'Evento';
    const entry={kind:'event',name,date:t,meta:[r.categoria,r.coche].filter(Boolean).join(' · '),general:r.posicion_general||'',category:r.posicion_categoria||''};
    const outcome=srOutcome(r.posicion_general,r.posicion_categoria,r.posicion_desafio_peugeot);
    if(!outcome){noResult.push({r,entry});return} // sin resultado cargado (o no se presentó)
    byEvent.set(normalizeDriverName(name),{...entry,outcome});
  });
  (idx.manualByPilot.get(pilotId)||[]).forEach(r=>{
    const outcome=srOutcome(r.posicion_general,r.posicion_categoria,r.posicion_desafio_peugeot);
    if(!outcome)return;
    const name=r.event_name||'Prueba anterior',key=normalizeDriverName(name);
    if(byEvent.has(key))return; // si hay inscripción real de esa prueba, manda esa
    byEvent.set(key,{kind:'event',name,date:r.created_at?new Date(r.created_at).getTime():0,outcome,meta:[r.category||r.categoria,r.car||r.coche].filter(Boolean).join(' · '),general:r.posicion_general||'',category:r.posicion_categoria||''});
  });
  // Inscripción aprobada, prueba con resultados publicados y el piloto no aparece: no presentado.
  noResult.forEach(({r,entry})=>{
    const key=normalizeDriverName(entry.name);
    if(byEvent.has(key)||(r.approval_status||'pending')!=='approved')return;
    if(idx.eventsWithResults.has(r.event_id)||idx.manualEventNames.has(key))byEvent.set(key,{...entry,outcome:'np',general:'NP',category:'NP'});
  });
  const list=[...byEvent.values()];
  (idx.adjustByPilot.get(pilotId)||[]).forEach(a=>list.push({kind:'adjust',name:a.event_name||'Ajuste de administración',reason:a.reason||'',date:new Date(a.created_at).getTime()||0,delta:Number(a.delta)||0,id:a.id}));
  return list.sort((a,b)=>a.date-b.date);
}
async function srLoad(force){
  if(!force&&srCache.results&&Date.now()-srCache.at<60000)return srCache;
  const [profiles,registrations,sessions,events,manual,adjustments]=await Promise.all([
    selectAllRows('profiles','id,nombre,apellido,equipo,licencia_piloto'),
    selectAllRows('registrations','*'),
    selectAllRows('sessions','id,event_id,fecha_hora'),
    selectAllRows('events','id,nombre'),
    selectAllRows('classification_results','*'),
    selectAllRows('safety_adjustments','*')
  ]);
  const data={profiles,registrations,sessions,events,manual,adjustments};
  const idx=srBuildIndex(data),now=Date.now(),results=new Map();
  profiles.forEach(p=>results.set(p.id,srCompute(srEntriesFor(p.id,idx,now))));
  srCache={at:Date.now(),data,results};
  return srCache;
}

/* ----- Página "Mi Safety Rating" ----- */
function srProgressText(res){
  if(res.cls>=SR_LAST)return 'Has llegado a la cima: eres piloto <b>Pro</b>. Mantén tu Safety Rating limpio para conservarlo.';
  const next=SR_CLASSES[res.cls+1],need=round2(SR_RULES.promote-res.sr),races=Math.max(1,Math.ceil(need/SR_RULES.finish-1e-9));
  return `Te faltan <b>${fmtSr(need)} SR</b> para ascender a <b>${next.name}</b> (unas <b>${races}</b> ${races===1?'prueba limpia':'pruebas limpias'}).`;
}
function srWarning(res){
  if(res.cls>0&&res.sr<SR_RULES.demote+0.6)return `<div class="sr-alert danger">⚠ Estás cerca del descenso: por debajo de ${fmtSr(SR_RULES.demote)} SR bajarías a ${SR_CLASSES[res.cls-1].name}.</div>`;
  return '';
}
function srRulesTable(){
  return `<table class="sr-rules"><tbody>
    <tr><td>Prueba terminada</td><td class="pos">${fmtSigned(SR_RULES.finish)}</td></tr>
    <tr><td>Abandono (AB)</td><td class="neg">${fmtSigned(SR_RULES.ab)}</td></tr>
    <tr><td>Inscrito y no presentado (NP)</td><td class="neg">${fmtSigned(SR_RULES.np)}</td></tr>
    <tr><td>Sanción o ajuste de la organización</td><td>según el caso</td></tr>
    <tr><td>Ascenso de clase</td><td>al llegar a ${fmtSr(SR_RULES.promote)} SR · reinicio en ${fmtSr(SR_RULES.start)}</td></tr>
    <tr><td>Descenso de clase</td><td>por debajo de ${fmtSr(SR_RULES.demote)} SR · reinicio en ${fmtSr(SR_RULES.start)}</td></tr>
    <tr><td>Punto de partida</td><td>Rookie · ${fmtSr(SR_RULES.start)} SR</td></tr></tbody></table>`;
}
function srLadder(cls){
  return `<div class="sr-ladder">${SR_CLASSES.map((c,i)=>`<div class="sr-step${i===cls?' current':''}${i<cls?' done':''}" style="--lic:${c.color};--lic-ink:${c.ink}"><b>${c.key}</b><small>${c.name}</small></div>`).join('')}</div>`;
}
function srTimelineRows(res){
  if(!res.timeline.length)return `<tr><td colspan="5" class="empty">Todavía no hay pruebas puntuables. Cuando termines tu primera prueba aparecerá aquí.</td></tr>`;
  return [...res.timeline].reverse().map(t=>{
    const label=t.kind==='adjust'?`<span class="chip adj">Ajuste</span>`:t.outcome==='finish'?`<span class="chip ok">Terminada</span>`:t.outcome==='ab'?`<span class="chip bad">Abandono</span>`:`<span class="chip bad">No presentado</span>`;
    const change=t.change==='up'?`<span class="chip up">⬆ Ascenso a ${SR_CLASSES[t.clsAfter].name}</span>`:t.change==='down'?`<span class="chip down">⬇ Descenso a ${SR_CLASSES[t.clsAfter].name}</span>`:'';
    return `<tr><td data-label="Fecha">${escHtml(shortDate(t.date))}</td>
      <td data-label="Prueba"><b>${escHtml(t.name)}</b>${t.meta?`<br><small>${escHtml(t.meta)}</small>`:''}${t.reason?`<br><small>${escHtml(t.reason)}</small>`:''}</td>
      <td data-label="Resultado">${label} ${change}</td>
      <td data-label="Δ SR" class="${t.delta>=0?'pos':'neg'}"><b>${fmtSigned(t.delta)}</b></td>
      <td data-label="Licencia">${licBadge(t.clsAfter,t.srAfter)}</td></tr>`;
  }).join('');
}
async function loadSafetyPage(){
  const box=$('safetyContent'); if(!box)return;
  if(!currentUser){box.innerHTML=loginRequiredBlock('Inicia sesión para ver tu Safety Rating y tu licencia.');return}
  box.innerHTML=loadingBlock('Calculando tu licencia...');
  let cache;
  try{cache=await srLoad(true)}catch(e){box.innerHTML=loadingBlock('No se pudo calcular la licencia: '+e.message);return}
  const res=cache.results.get(currentUser.id)||srCompute([]);
  const c=SR_CLASSES[res.cls];
  const pct=Math.min(100,res.sr/5*100);
  box.innerHTML=`
  <div class="sr-hero">
    <div class="sr-ring" style="--pct:${pct}%;--lic:${srRing(c)}"><div class="sr-ring-in"><span class="sr-class" style="color:${srRing(c)}">${c.key}</span><b>${fmtSr(res.sr)}</b><small>Safety Rating</small></div></div>
    <div class="sr-hero-main">
      <p class="eyebrow">Licencia ACC</p>
      <h1>${escHtml(c.name)}</h1>
      <p class="sr-progress-text">${srProgressText(res)}</p>
      <div class="sr-bar"><div class="sr-bar-fill" style="width:${pct}%;background:${srRing(c)}"></div><span class="sr-mark demote" style="left:${SR_RULES.demote/5*100}%"><i>${fmtSr(SR_RULES.demote)}</i></span><span class="sr-mark promote" style="left:${SR_RULES.promote/5*100}%"><i>${fmtSr(SR_RULES.promote)}</i></span></div>
      ${srWarning(res)}
    </div>
  </div>
  ${srLadder(res.cls)}
  <div class="sr-stats">
    <div class="mini-stat"><b>${res.stats.finished}</b><span>Pruebas terminadas</span></div>
    <div class="mini-stat"><b>${res.stats.ab}</b><span>Abandonos</span></div>
    <div class="mini-stat"><b>${res.stats.np}</b><span>No presentados</span></div>
    <div class="mini-stat"><b>${res.stats.promotions}</b><span>Ascensos</span></div>
  </div>
  <div class="sr-columns">
    <div class="panel"><div class="panel-head"><div class="panel-title">📈 Detalle de tu progreso</div><div class="panel-kicker">Más reciente primero</div></div>
      <div class="panel-body"><div class="table-scroll"><table class="sr-table"><thead><tr><th>Fecha</th><th>Prueba</th><th>Resultado</th><th>Δ SR</th><th>Licencia</th></tr></thead><tbody>${srTimelineRows(res)}</tbody></table></div></div></div>
    <div class="panel"><div class="panel-head"><div class="panel-title">📘 Cómo funciona</div></div>
      <div class="panel-body"><p class="empty" style="margin-bottom:14px">Tu Safety Rating (0.00–4.99) sube cuando terminas pruebas sin problemas y baja si abandonas, no te presentas o recibes sanciones. Al llegar a ${fmtSr(SR_RULES.promote)} subes de clase.</p>${srRulesTable()}</div></div>
  </div>`;
}

/* ----- Ranking de licencias ----- */
let rankState={cls:'all',q:'',rows:[]};
async function loadRankingPage(){
  const box=$('rankingContent'); if(!box)return;
  box.innerHTML=loadingBlock('Calculando el ranking...');
  let cache;
  try{[cache]=await Promise.all([srLoad(true),pilotDirLoad()])}catch(e){box.innerHTML=loadingBlock('No se pudo cargar el ranking: '+e.message);return}
  if(!cache.data.profiles.length){
    // Los perfiles solo se leen con sesión iniciada; sin ellos no hay nombres que mostrar.
    box.innerHTML=currentUser?loadingBlock('No se pudieron leer los perfiles de los pilotos. Avisa a administración.'):loginRequiredBlock('Inicia sesión para ver el ranking de licencias de la comunidad.');
    return;
  }
  const rows=cache.data.profiles.map(p=>({p,res:cache.results.get(p.id)})).filter(x=>x.res&&x.res.count>0);
  rows.sort((a,b)=>b.res.cls-a.res.cls||b.res.sr-a.res.sr||b.res.stats.finished-a.res.stats.finished||pilotFullName(a.p).localeCompare(pilotFullName(b.p),'es'));
  rows.forEach((r,i)=>r.pos=i+1);
  rankState.rows=rows;
  renderRanking();
}
function setRankingClass(value){rankState.cls=value;renderRanking()}
function setRankingSearch(value){rankState.q=value;renderRankingTable()}
function rankRowHtml(r){
  const name=pilotFullName(r.p)||'Piloto',mine=currentUser?.id===r.p.id;
  return `<tr class="${mine?'is-me':''}" onclick="showPilotModal('${escHtml(name)}','','${escHtml(r.p.id)}')">
    <td data-label="#"><span class="rank-pos">${r.pos}</span></td>
    <td data-label="Piloto"><b>${escHtml(name)}</b>${mine?' <span class="chip ok">Tú</span>':''}</td>
    <td data-label="Equipo">${escHtml(r.p.equipo||'—')}</td>
    <td data-label="Licencia">${licBadge(r.res.cls,r.res.sr)}</td>
    <td data-label="Terminadas">${r.res.stats.finished}</td>
    <td data-label="Abandonos">${r.res.stats.ab+r.res.stats.np}</td></tr>`;
}
function renderRankingTable(){
  const q=normalizeDriverName(rankState.q);
  const rows=rankState.rows.filter(r=>(rankState.cls==='all'||SR_CLASSES[r.res.cls].key===rankState.cls)&&(!q||normalizeDriverName(pilotFullName(r.p)+' '+(r.p.equipo||'')).includes(q)));
  const body=$('rankingBody'); if(!body)return;
  body.innerHTML=rows.length?rows.map(rankRowHtml).join(''):'<tr><td colspan="6" class="empty">No hay pilotos que coincidan.</td></tr>';
}
function renderRanking(){
  const box=$('rankingContent'); if(!box)return;
  const top=rankState.rows.slice(0,3);
  const medals=['🥇','🥈','🥉'];
  const podium=top.length?`<div class="podium">${top.map((r,i)=>{const c=SR_CLASSES[r.res.cls];const name=pilotFullName(r.p);return `<div class="podium-card p${i+1}" onclick="showPilotModal('${escHtml(name)}','','${escHtml(r.p.id)}')"><span class="podium-photo-wrap">${avatarHtml(pilotPhoto(r.p.id,name),name,'pilot-photo podium-photo')}<span class="podium-medal">${medals[i]}</span></span>${licBadge(r.res.cls,r.res.sr,'lg')}<b>${escHtml(pilotFullName(r.p)||'Piloto')}</b><small>${escHtml(r.p.equipo||'Sin equipo')} · ${c.name}</small></div>`}).join('')}</div>`:'';
  const chips=[['all','Todas'],...SR_CLASSES.map(c=>[c.key,c.key==='PRO'?'Pro':c.key==='R'?'Rookie':c.key])];
  const me=currentUser?rankState.rows.find(r=>r.p.id===currentUser.id):null;
  box.innerHTML=`${podium}
  <div class="panel"><div class="panel-head"><div><div class="panel-title">🏆 Ranking de licencias</div><div class="panel-kicker">Ordenado por clase y Safety Rating</div></div>${me?`<div class="rank-me">Tu puesto: <b>#${me.pos}</b> de ${rankState.rows.length}</div>`:''}</div>
    <div class="panel-body">
      <div class="rank-filters"><div class="chip-row">${chips.map(([k,l])=>`<button class="filter-chip${rankState.cls===k?' active':''}" onclick="setRankingClass('${k}')">${l}</button>`).join('')}</div>
      <input class="rank-search" type="search" placeholder="Buscar piloto o equipo…" value="${escHtml(rankState.q)}" oninput="setRankingSearch(this.value)"></div>
      ${rankState.rows.length?`<div class="table-scroll"><table class="rank-table"><thead><tr><th>#</th><th>Piloto</th><th>Equipo</th><th>Licencia</th><th>Terminadas</th><th>AB/NP</th></tr></thead><tbody id="rankingBody"></tbody></table></div>`:'<p class="empty">Aún no hay pilotos con pruebas puntuables. El ranking aparecerá cuando se carguen los primeros resultados.</p>'}
    </div></div>`;
  if(rankState.rows.length)renderRankingTable();
}

/* ----- Administración: ajustes manuales de Safety Rating ----- */
async function adminSafety(){
  if(!adminGuard())return;
  const body=$('adminPanelBody');
  body.innerHTML=loadingBlock('Cargando...');
  const profiles=await selectAllRows('profiles','id,nombre,apellido,email','nombre');
  const {data,error}=await supabaseClient.from('safety_adjustments').select('*').order('created_at',{ascending:false}).limit(60);
  if(error){
    body.innerHTML=`<div class="admin-box"><h3>🛡 Safety Rating</h3><div class="admin-help">No se pudo leer la tabla <b>safety_adjustments</b>: ${escHtml(error.message)}<br>Ejecuta el archivo <b>supabase-setup.sql</b> en el SQL Editor de Supabase y vuelve a entrar.</div></div>`;
    return;
  }
  const nameOf=id=>{const p=profiles.find(x=>x.id===id);return p?pilotFullName(p)||p.email:'Piloto eliminado'};
  const options=profiles.map(p=>`<option value="${escHtml(p.id)}">${escHtml(pilotFullName(p)||'Sin nombre')} · ${escHtml(p.email||'')}</option>`).join('');
  const list=(data||[]).map(a=>`<div class="admin-list-item"><span><b>${escHtml(nameOf(a.pilot_id))}</b> · <span class="${Number(a.delta)>=0?'pos':'neg'}"><b>${fmtSigned(Number(a.delta))} SR</b></span><br><small>${escHtml(shortDate(a.created_at))}${a.event_name?' · '+escHtml(a.event_name):''} · ${escHtml(a.reason||'Sin motivo')}</small></span><button class="mini-btn danger" onclick="adminDeleteSafetyAdjustment('${escHtml(a.id)}')">Borrar</button></div>`).join('')||'<div class="admin-list-item"><span>Todavía no hay ajustes manuales.</span></div>';
  body.innerHTML=`<div class="team-admin-layout">
    <div class="admin-box">
      <h3>🛡 Ajuste manual de Safety Rating</h3>
      <div class="admin-help">El SR se calcula solo con los resultados (terminada ${fmtSigned(SR_RULES.finish)}, abandono ${fmtSigned(SR_RULES.ab)}, NP ${fmtSigned(SR_RULES.np)}). Aquí puedes <b>sancionar</b> (valor negativo) o <b>premiar</b> (positivo) a un piloto; el motivo lo verá él en su historial.</div>
      <div class="form-grid">
        <div class="field full"><label>Piloto</label><select id="admSrPilot"><option value="">Selecciona piloto</option>${options}</select></div>
        <div class="field"><label>Ajuste de SR (ej. -0.50 o 0.25)</label><input id="admSrDelta" type="number" step="0.05" placeholder="-0.50"></div>
        <div class="field"><label>Prueba (opcional)</label><input id="admSrEvent" placeholder="Nombre de la prueba"></div>
        <div class="field full"><label>Motivo</label><input id="admSrReason" placeholder="Contacto con otro piloto, corte de camino, conducta..." maxlength="200"></div>
      </div>
      <div class="form-actions"><button class="submit-btn" onclick="adminSaveSafetyAdjustment()">Aplicar ajuste</button></div>
      <h3 style="margin-top:22px">Reglas actuales</h3>${srRulesTable()}
    </div>
    <div class="admin-box"><h3>Últimos ajustes</h3><div class="admin-list">${list}</div></div>
  </div>`;
}
async function adminSaveSafetyAdjustment(){
  const pilot=val('admSrPilot'),delta=Number(val('admSrDelta')),reason=val('admSrReason');
  if(!pilot)return toast('Selecciona un piloto.');
  if(!val('admSrDelta')||!Number.isFinite(delta)||delta===0)return toast('Indica un ajuste distinto de 0.');
  if(Math.abs(delta)>5)return toast('El ajuste debe estar entre -5 y 5.');
  if(!reason)return toast('Escribe el motivo del ajuste.');
  const {error}=await supabaseClient.from('safety_adjustments').insert({pilot_id:pilot,delta:round2(delta),reason,event_name:val('admSrEvent')||null,created_by:currentUser?.id||null});
  if(error)return toast(error.message);
  srCache.at=0;toast('Ajuste aplicado.');adminSafety();
}
async function adminDeleteSafetyAdjustment(id){
  if(!confirm('¿Borrar este ajuste? El SR del piloto se recalculará.'))return;
  const {error}=await supabaseClient.from('safety_adjustments').delete().eq('id',id);
  if(error)return toast(error.message);
  srCache.at=0;toast('Ajuste borrado.');adminSafety();
}
