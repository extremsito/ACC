/* =====================================================================
   ACC Community · Octubre 2026
   - Fotos de piloto (perfil, podio del ranking, historial, equipos)
   - Subida de imágenes (foto de perfil, logo y foto del director)
   - Licencias automáticas con popup y envío por email
   - Crear equipo desde la web
   - Mis inscripciones dentro del perfil
   - Pruebas finalizadas con resultados por temporada
   Como community.js, solo declara funciones: init() está en teams-licenses.js.
   Necesita la sección "OCTUBRE 2026" de supabase-setup.sql y la función
   send-license-email (carpeta supabase/functions).
   ===================================================================== */

/* ---------- Utilidades ---------- */
async function accRpc(name,args){
  const {data,error}=await supabaseClient.rpc(name,args||{});
  if(error){
    const missing=/could not find the function|schema cache/i.test(error.message||'');
    throw new Error(missing?'Esta función todavía no está activada en Supabase (falta ejecutar supabase-setup.sql).':error.message);
  }
  return data;
}
function saveCurrentUser(){try{localStorage.setItem('acc_user',JSON.stringify(currentUser))}catch(e){}}

/* =====================================================================
   1. FOTOS DE PILOTO
   Prioridad: foto de perfil (profiles.avatar_url) > foto en la ficha de su
   equipo (por id de piloto y, si no, por nombre).
   ===================================================================== */
let pilotDir={at:0,rows:[],byId:new Map(),ok:false,pending:null};
async function pilotDirLoad(force){
  if(!force&&pilotDir.at&&Date.now()-pilotDir.at<60000)return pilotDir;
  if(pilotDir.pending)return pilotDir.pending;
  pilotDir.pending=(async()=>{
    let rows=null,ok=false;
    try{const {data,error}=await supabaseClient.rpc('public_pilots');if(!error){rows=data||[];ok=true}}catch(e){}
    // Sin la función pública solo se pueden leer los perfiles con sesión iniciada.
    if(!ok){try{const {data,error}=await supabaseClient.from('profiles').select('id,nombre,apellido,equipo');if(!error)rows=data||[]}catch(e){}}
    pilotDir={at:Date.now(),rows:rows||[],byId:new Map((rows||[]).map(r=>[r.id,r])),ok,pending:null};
    return pilotDir;
  })();
  return pilotDir.pending;
}
function teamPhotoFor(pilotId,name){
  const key=normalizeNameForMatch(name);
  let byName='';
  for(const t of embeddedTeamsData){
    for(const person of [t.director,...(t.members||[])]){
      if(!person?.avatar)continue;
      if(pilotId&&person.pilot_id===pilotId)return person.avatar;
      if(!byName&&key&&normalizeNameForMatch(person.name)===key)byName=person.avatar;
    }
  }
  return byName;
}
function pilotPhoto(pilotId,name){
  if(currentUser&&pilotId&&pilotId===currentUser.id&&currentUser.avatar)return currentUser.avatar;
  const own=pilotId?pilotDir.byId.get(pilotId)?.avatar_url:'';
  return own||teamPhotoFor(pilotId,name)||'';
}
function pilotNameById(id){const p=id?pilotDir.byId.get(id):null;return p?pilotFullName(p):''}
function avatarHtml(url,name,cls){
  const parts=String(name||'').trim().split(/\s+/).filter(Boolean);
  const initials=((parts[0]||'?')[0]+((parts[1]||'')[0]||'')).toUpperCase();
  return `<span class="${cls||'pilot-photo'}"><b>${escHtml(initials)}</b>${url?`<img src="${escHtml(url)}" alt="" loading="lazy" onerror="this.remove()">`:''}</span>`;
}

/* =====================================================================
   2. CAMPO DE IMAGEN: subir archivo (Supabase Storage, bucket acc-media)
   o pegar una URL
   ===================================================================== */
const IMAGE_TYPES=/^image\/(png|jpe?g|webp|gif)$/;
function renderImageField(containerId,kind,currentUrl){
  const box=$(containerId); if(!box)return;
  box._file=null;
  box.innerHTML=`<div class="image-field-preview">${currentUrl?`<img src="${escHtml(currentUrl)}" alt="" onerror="this.remove()">`:''}<span>Sin imagen</span></div>
    <div class="image-field-inputs">
      <label class="ghost-btn image-field-pick">📷 Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onchange="onImageFieldFile('${containerId}',this)"></label>
      <input type="url" class="image-field-url" placeholder="o pega una URL https://..." value="${escHtml(currentUrl||'')}" oninput="onImageFieldUrl('${containerId}',this.value)">
      <small class="image-field-hint">PNG, JPG o WEBP · máximo 3 MB</small>
    </div>`;
}
function setImageFieldPreview(containerId,src){
  const prev=$(containerId)?.querySelector('.image-field-preview'); if(!prev)return;
  prev.querySelector('img')?.remove();
  if(src)prev.insertAdjacentHTML('afterbegin',`<img src="${escHtml(src)}" alt="" onerror="this.remove()">`);
}
function onImageFieldFile(containerId,input){
  const box=$(containerId),file=input.files?.[0]; if(!box||!file)return;
  if(!IMAGE_TYPES.test(file.type)){input.value='';return toast('La imagen debe ser PNG, JPG, WEBP o GIF.')}
  if(file.size>3*1024*1024){input.value='';return toast('La imagen pesa más de 3 MB.')}
  box._file=file;
  box.querySelector('.image-field-url').value='';
  setImageFieldPreview(containerId,URL.createObjectURL(file));
}
function onImageFieldUrl(containerId,value){
  const box=$(containerId); if(!box)return;
  box._file=null;
  setImageFieldPreview(containerId,/^https?:\/\//i.test(value.trim())?value.trim():'');
}
async function uploadImageFile(file,kind){
  if(!currentUser)throw new Error('Inicia sesión para subir imágenes.');
  const ext=(file.type.split('/')[1]||'png').replace('jpeg','jpg');
  const path=`${currentUser.id}/${kind}-${Date.now()}.${ext}`;
  const {error}=await supabaseClient.storage.from('acc-media').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
  if(error)throw new Error(/bucket not found/i.test(error.message)?'La subida de imágenes no está activada en Supabase (falta ejecutar supabase-setup.sql). De momento puedes pegar una URL.':'No se pudo subir la imagen: '+error.message);
  return supabaseClient.storage.from('acc-media').getPublicUrl(path).data.publicUrl;
}
/* Devuelve la URL final: sube el archivo elegido o valida la URL pegada */
async function readImageField(containerId,kind){
  const box=$(containerId); if(!box)return '';
  const urlInput=box.querySelector('.image-field-url');
  if(box._file){
    const url=await uploadImageFile(box._file,kind);
    box._file=null;
    if(urlInput)urlInput.value=url;
    return url;
  }
  const value=(urlInput?.value||'').trim();
  if(value&&!/^https?:\/\/\S+$/i.test(value))throw new Error('La imagen debe ser una URL que empiece por https://');
  return value;
}

/* =====================================================================
   3. LICENCIAS AUTOMÁTICAS + POPUP + EMAIL
   ===================================================================== */
async function sendLicenseEmail(requestId){
  try{
    const {data,error}=await supabaseClient.functions.invoke('send-license-email',{body:{request_id:requestId}});
    if(error){
      let msg=error.message;
      try{const body=await error.context?.json?.();if(body?.error)msg=body.error}catch(e){}
      return {ok:false,error:msg};
    }
    return {ok:!!data?.ok,to:data?.to,error:data?.error};
  }catch(e){return {ok:false,error:e.message}}
}
async function showLicensePopup(o){
  const isTeam=o.kind==='team';
  $('licenseModalBody').innerHTML=`<div class="lic-popup-body">
    <div class="lic-popup-icon">${isTeam?'👥':'🪪'}</div>
    <p class="eyebrow">${o.already?'Ya tenías licencia':isTeam?'Licencia de equipo asignada':'Licencia de piloto asignada'}</p>
    <h2>${o.already?'Esta es tu licencia':'¡Licencia añadida automáticamente!'}</h2>
    ${isTeam&&o.teamName?`<p class="lic-popup-team">${escHtml(o.teamName)}</p>`:''}
    <div class="license-code big">${escHtml(o.license)}</div>
    <p class="lic-popup-text">${isTeam?'Se ha guardado en tu equipo y en tu perfil. Los pilotos que aceptes en el equipo la recibirán solos.':'Ya está guardada en tu perfil. La necesitarás para inscribirte en las pruebas.'}</p>
    <div class="lic-popup-mail" id="licenseModalMail">${o.requestId&&!o.already?`✉ Enviando la licencia a <b>${escHtml(o.email||'tu email')}</b>…`:''}</div>
    <button class="submit-btn" onclick="closeLicensePopup()">Entendido</button>
  </div>`;
  $('licenseModal').classList.add('visible');
  if(!o.requestId||o.already)return;
  const res=await sendLicenseEmail(o.requestId);
  const el=$('licenseModalMail'); if(!el)return;
  el.classList.add(res.ok?'ok':'bad');
  el.innerHTML=res.ok
    ?`✔ Te la hemos enviado por email a <b>${escHtml(res.to||o.email||'')}</b>.`
    :'No hemos podido enviar el email ahora mismo. La licencia ya está en tu perfil y administración puede reenviártela.';
  if(!res.ok)console.warn('Email de licencia:',res.error);
}
function closeLicensePopup(){$('licenseModal')?.classList.remove('visible')}

function renderLicensesPage(){
  const pc=$('pilotLicenseCard'),tc=$('teamLicenseCard'); if(!pc||!tc)return;
  if(!currentUser){
    pc.innerHTML=`<p class="eyebrow">Licencia de piloto</p><h1>Tu licencia de piloto</h1><p class="empty">Crea tu cuenta o inicia sesión y obtén tu licencia al momento.</p><div class="form-actions"><button class="ghost-btn" onclick="showPage('register')">Crear cuenta</button><button class="submit-btn" onclick="showPage('login')">Iniciar sesión</button></div>`;
    tc.innerHTML=`<p class="eyebrow">Licencia de equipo</p><h1>Licencia de equipo</h1><p class="empty">La licencia de equipo se asigna al crear tu equipo desde la web. Inicia sesión para empezar.</p>`;
    return;
  }
  if(currentUser.license){
    pc.innerHTML=`<p class="eyebrow">Licencia de piloto</p><h1>Tu licencia de piloto</h1><div class="license-code big">${escHtml(currentUser.license)}</div><p class="empty">Ya está en tu perfil. Si hay algún error, contacta con administración.</p>`;
  }else{
    pc.innerHTML=`<p class="eyebrow">Licencia de piloto</p><h1>Obtener licencia de piloto</h1><p class="empty">Se asigna al momento, se añade a tu perfil y te la enviamos por email.</p>
      <div class="form-grid">
        <div class="field"><label>Nombre</label><input value="${escHtml(currentUser.name)}" disabled></div>
        <div class="field"><label>Apellido</label><input value="${escHtml(currentUser.lastName)}" disabled></div>
        <div class="field"><label>Steam ID</label><input id="pilotLicenseSteam" inputmode="numeric" maxlength="17" oninput="onlyDigits17(this)" placeholder="17 dígitos" value="${escHtml(currentUser.steam)}"></div>
        <div class="field"><label>Discord</label><input id="pilotLicenseDiscord" placeholder="usuario#0000 o @usuario"></div>
        <div class="field full"><label>Email (te la enviamos aquí)</label><input value="${escHtml(currentUser.email)}" disabled></div>
      </div>
      <p class="admin-help">¿Tu nombre no está bien escrito? Corrígelo antes en <a href="#" onclick="openProfile();return false">Mi perfil</a>: la licencia se guarda con él.</p>
      <div class="form-actions"><button class="submit-btn" id="pilotLicenseBtn" onclick="requestPilotLicense()">Obtener mi licencia</button></div>`;
  }
  const directed=myDirectedTeam();
  if(directed){
    tc.innerHTML=`<p class="eyebrow">Licencia de equipo</p><h1>${escHtml(directed.name)}</h1>${directed.license
      ?`<div class="license-code big">${escHtml(directed.license)}</div><p class="empty">Eres el team manager. Los pilotos que aceptes reciben esta licencia en su perfil.</p>`
      :`<p class="empty">Eres el team manager y tu equipo todavía no tiene licencia.</p><div class="form-actions"><button class="submit-btn" onclick="assignMyTeamLicense()">Obtener licencia de equipo</button></div>`}`;
  }else if(currentTeamName()){
    tc.innerHTML=`<p class="eyebrow">Licencia de equipo</p><h1>${escHtml(currentTeamName())}</h1>${currentUser.teamLicense?`<div class="license-code big">${escHtml(currentUser.teamLicense)}</div>`:''}<p class="empty">La licencia de equipo la gestiona el team manager de tu equipo. ¿Prefieres montar el tuyo?</p><div class="form-actions"><button class="ghost-btn" onclick="showPage('createTeam')">Crear mi equipo</button></div>`;
  }else{
    tc.innerHTML=`<p class="eyebrow">Licencia de equipo</p><h1>Crea tu equipo</h1><p class="empty">Al crear tu equipo desde la web quedas como team manager y recibes la licencia de equipo al momento, también por email.</p><div class="form-actions"><button class="submit-btn" onclick="showPage('createTeam')">Crear equipo</button></div>`;
  }
}
async function requestPilotLicense(){
  const steam=val('pilotLicenseSteam'),discord=val('pilotLicenseDiscord');
  if(!validateSteamId(steam))return toast('El Steam ID debe tener 17 dígitos.');
  if(!discord)return toast('Escribe tu usuario de Discord.');
  const btn=$('pilotLicenseBtn');
  if(btn){btn.disabled=true;btn.textContent='Asignando licencia...'}
  let data;
  try{data=await accRpc('request_pilot_license',{p_discord:discord,p_steam_id:steam})}
  catch(e){if(btn){btn.disabled=false;btn.textContent='Obtener mi licencia'}return toast(e.message)}
  currentUser.license=data.license;
  if(!data.already)currentUser.steam=steam;
  saveCurrentUser();srCache.at=0;
  renderLicensesPage();
  showLicensePopup({kind:'pilot',license:data.license,email:data.email||currentUser.email,requestId:data.request_id,already:data.already});
}
async function assignMyTeamLicense(){
  let data;
  try{data=await accRpc('assign_my_team_license')}catch(e){return toast(e.message)}
  currentUser.teamLicense=data.license;saveCurrentUser();
  await loadTeamsFromSupabase();renderTeamsGallery();
  renderLicensesPage();renderProfileHub();
  showLicensePopup({kind:'team',license:data.license,teamName:data.team_name,email:data.email||currentUser.email,requestId:data.request_id,already:data.already});
}

/* =====================================================================
   4. CREAR EQUIPO DESDE LA WEB
   Quien lo crea queda como director (team manager) con su foto y recibe la
   licencia de equipo. Todo lo valida la función create_team en Supabase.
   ===================================================================== */
const TEAM_SOCIALS=[['Instagram','https://instagram.com/tuequipo'],['X','https://x.com/tuequipo'],['YouTube','https://youtube.com/@tuequipo'],['Twitch','https://twitch.tv/tuequipo'],['TikTok','https://tiktok.com/@tuequipo'],['Facebook','https://facebook.com/tuequipo'],['Discord','https://discord.gg/...'],['Web','https://tuequipo.com']];
function renderCreateTeamForm(){
  const box=$('createTeamBody'); if(!box)return;
  if(!currentUser){box.innerHTML=`<p class="empty">Inicia sesión para crear tu equipo. Quedarás como team manager y recibirás la licencia de equipo al momento.</p><div class="form-actions"><button class="ghost-btn" onclick="showPage('register')">Crear cuenta</button><button class="submit-btn" onclick="showPage('login')">Iniciar sesión</button></div>`;return}
  const directed=myDirectedTeam();
  if(directed){box.innerHTML=`<div class="notice">Ya eres el team manager de <b>${escHtml(directed.name)}</b>. Solo se puede dirigir un equipo.</div><div class="form-actions"><button class="submit-btn" onclick="showPage('teams');showTeamModal(${Number(directed.id)})">Ver mi equipo</button></div>`;return}
  const today=new Date().toISOString().slice(0,10);
  const director=`${currentUser.name||''} ${currentUser.lastName||''}`.trim();
  box.innerHTML=`
    ${currentTeamName()?`<div class="notice" style="margin-bottom:16px">Ahora estás en <b>${escHtml(currentTeamName())}</b>. Al crear tu equipo saldrás de él.</div>`:''}
    <div class="team-form-section"><h4>1. Datos del equipo</h4><div class="form-grid">
      <div class="field full"><label>Nombre del equipo *</label><input id="ctName" maxlength="60" placeholder="Nombre del equipo"></div>
      <div class="field full"><label>Logo</label><div class="image-field" id="ctLogoField"></div></div>
      <div class="field full"><label>Sede</label><input id="ctSede" maxlength="120" placeholder="Ciudad | Provincia | País"></div>
      <div class="field"><label>Fecha de creación</label><input id="ctDate" type="date" value="${today}"></div>
      <div class="field"><label>Temporada</label><input id="ctSeason" maxlength="20" value="1ª temporada"></div>
    </div></div>
    <div class="team-form-section"><h4>2. Redes sociales</h4><div class="admin-help">Pega el enlace completo de cada red que tengáis. Las vacías no se muestran.</div><div class="form-grid">
      ${TEAM_SOCIALS.map(([label,ph])=>`<div class="field"><label>${label}</label><input type="url" data-social="${label}" placeholder="${ph}"></div>`).join('')}
    </div></div>
    <div class="team-form-section"><h4>3. Director del equipo</h4><div class="admin-help">Eres tú: tu cuenta queda asociada como team manager y decidirás quién entra en el equipo.</div><div class="form-grid">
      <div class="field"><label>Director</label><input value="${escHtml(director)}" disabled></div>
      <div class="field"><label>Licencia de equipo</label><input value="Se asigna automáticamente" disabled></div>
      <div class="field full"><label>Foto del director</label><div class="image-field" id="ctDirectorField"></div></div>
    </div></div>
    <div class="form-actions"><button class="ghost-btn" onclick="showPage('teams')">Cancelar</button><button class="submit-btn" id="ctSubmit" onclick="submitCreateTeam()">Crear equipo</button></div>`;
  renderImageField('ctLogoField','logo','');
  renderImageField('ctDirectorField','director',currentUser.avatar||'');
}
async function submitCreateTeam(){
  if(!currentUser)return showPage('login');
  const name=val('ctName');
  if(name.length<3)return toast('El nombre del equipo debe tener al menos 3 caracteres.');
  if(teamByName(name))return toast('Ya existe un equipo con ese nombre.');
  const social=[...document.querySelectorAll('#createTeamBody [data-social]')].map(i=>({label:i.dataset.social,url:i.value.trim()})).filter(s=>s.url);
  const bad=social.find(s=>!/^https?:\/\/\S+$/i.test(s.url));
  if(bad)return toast(`El enlace de ${bad.label} debe empezar por https://`);
  const date=val('ctDate');
  const creacion=[date?date.split('-').reverse().join('/'):'',val('ctSeason')].filter(Boolean).join(' | ');
  if(currentTeamName()&&!confirm(`Saldrás de "${currentTeamName()}" y pasarás a ser team manager de "${name}". ¿Continuar?`))return;
  const btn=$('ctSubmit');
  if(btn){btn.disabled=true;btn.textContent='Creando equipo...'}
  try{
    const logo=await readImageField('ctLogoField','logo');
    const avatar=await readImageField('ctDirectorField','director');
    const data=await accRpc('create_team',{p_name:name,p_logo:logo,p_sede:val('ctSede'),p_creacion:creacion,p_social:social,p_director_avatar:avatar});
    currentUser.team=data.team_name||name;
    currentUser.teamLicense=data.license;
    if(!currentUser.avatar&&avatar)currentUser.avatar=avatar;
    saveCurrentUser();
    await afterTeamChange();
    showPage('teams');
    showLicensePopup({kind:'team',license:data.license,teamName:data.team_name||name,email:data.email||currentUser.email,requestId:data.request_id});
  }catch(e){toast(e.message)}
  finally{if(btn){btn.disabled=false;btn.textContent='Crear equipo'}}
}

/* =====================================================================
   5. MIS INSCRIPCIONES (perfil): próximas pruebas y carreras disputadas
   ===================================================================== */
async function renderMyRaces(){
  const box=$('profileRaces'); if(!box)return;
  if(!currentUser){box.innerHTML='';return}
  box.innerHTML='<p class="empty">Cargando tus pruebas...</p>';
  let res=null;
  try{await loadMyRegistrations();const c=await srLoad();res=c.results.get(currentUser.id)||null}catch(e){console.warn('Mis inscripciones:',e.message)}
  const evById=new Map(events.map(e=>[e.id,e]));
  const regs=myRegistrations.map(r=>({r,e:evById.get(r.event_id)})).filter(x=>x.e);
  const upcoming=regs.filter(x=>isUpcomingEvent(x.e));
  // Carreras con resultado (inscripciones reales y resultados cargados a mano), con su efecto en el SR.
  const done=(res?.timeline||[]).filter(t=>t.kind==='event');
  const doneKeys=new Set(done.map(t=>normalizeDriverName(t.name)));
  const waiting=regs.filter(x=>!isUpcomingEvent(x.e)&&!doneKeys.has(normalizeDriverName(x.e.name)))
    .map(({r,e})=>({pending:true,name:e.name,date:getLastSessionStart(e)?.getTime()||0,meta:[r.categoria,r.coche].filter(Boolean).join(' · '),eventId:e.id}));
  const past=[...done,...waiting].sort((a,b)=>b.date-a.date);
  const outcome={finish:['Terminada','ok'],ab:['Abandono','bad'],np:['No presentado','bad']};
  const upHtml=upcoming.map(({r,e})=>{
    const s=e.sessions.find(x=>x.id===r.session_id);
    const approved=(r.approval_status||'pending')==='approved';
    return `<div class="race-row">
      <div class="race-date">${s?`<b>${escHtml(s.date)}</b><small>${escHtml(s.time)}</small>`:'<b>—</b>'}</div>
      <div class="race-main"><b>${escHtml(e.name)}</b><small>${escHtml([e.championship,r.categoria,r.coche].filter(Boolean).join(' · '))}</small></div>
      <div class="race-side"><span class="chip ${approved?'ok':''}">${approved?'Aprobada':'Pendiente de aprobación'}</span><button class="mini-btn primary" onclick="openEvent('${escHtml(e.id)}')">Ver prueba</button></div>
    </div>`;
  }).join('');
  const pastHtml=past.map(t=>{
    const [label,cls]=outcome[t.outcome]||['',''];
    return `<div class="race-row">
      <div class="race-date"><b>${escHtml(shortDate(t.date))}</b></div>
      <div class="race-main"><b>${escHtml(t.name)}</b><small>${escHtml(t.meta||'')}</small></div>
      <div class="race-side">${t.pending?'<span class="chip">Resultados pendientes</span>':`<span class="race-result"><small>General</small><b>${escHtml(t.general||'-')}</b></span><span class="race-result"><small>Categoría</small><b>${escHtml(t.category||'-')}</b></span><span class="chip ${cls}">${label}</span><span class="race-sr ${t.delta>=0?'pos':'neg'}">${fmtSigned(t.delta)} SR</span>`}</div>
    </div>`;
  }).join('');
  const finished=done.filter(t=>t.outcome==='finish').length;
  box.innerHTML=`<div class="races-block"><h4>Próximas pruebas ${upcoming.length?`<span class="chip">${upcoming.length}</span>`:''}</h4>${upHtml||`<p class="empty">No estás inscrito en ninguna prueba próxima. <a href="#" onclick="showPage('pruebas');return false">Ver el calendario</a></p>`}</div>
    <div class="races-block"><h4>Carreras disputadas ${past.length?`<span class="chip">${past.length}</span>`:''}${finished?` <small class="races-sub">${finished} terminadas</small>`:''}</h4>${pastHtml||'<p class="empty">Todavía no has corrido ninguna prueba en la comunidad.</p>'}</div>`;
}

/* =====================================================================
   6. PRUEBAS FINALIZADAS con resultados, agrupadas por temporada
   Une las inscripciones reales de cada prueba terminada con los resultados
   cargados a mano (classification_results), igual que las clasificaciones.
   ===================================================================== */
let finishedState={year:null,items:[]};
let resultsModalState={idx:null,cat:''};
function resultRank(value){
  const v=String(value||'').trim().toUpperCase();
  const n=parseStandingPosition(v);
  if(n)return n;
  return v==='AB'?9000:v==='NP'?9500:9999;
}
function sortResultRows(rows){return rows.sort((a,b)=>resultRank(a.general)-resultRank(b.general)||String(a.name).localeCompare(String(b.name),'es'))}
async function loadFinishedEvents(){
  const grid=$('finishedGrid'); if(!grid)return;
  if(!finishedState.items.length)grid.innerHTML='<p class="empty">Cargando pruebas finalizadas...</p>';
  const [regs,manual,champs]=await Promise.all([
    selectAllRows('registrations','id,event_id,pilot_id,categoria,coche,posicion_general,posicion_categoria'),
    selectAllRows('classification_results','*'),
    safeSelect('championships','*','nombre',true),
    pilotDirLoad()
  ]);
  const champName=id=>champs.find(c=>c.id===id)?.nombre||'';
  const items=[],realKeys=new Set();
  const sameEvent=(champId,name)=>m=>m.championship_id===champId&&normalizeDriverName(m.event_name)===normalizeDriverName(name);
  // Las pruebas solo del Desafío Peugeot no tienen posición general: se usa la del Desafío.
  const manualRow=m=>({pilotId:m.pilot_id||'',name:m.pilot_name||pilotNameById(m.pilot_id)||'Piloto',category:(m.category||m.categoria)?displayHistoryCategory(m.category||m.categoria):'',car:m.car||m.coche||'',general:m.posicion_general||(isDesafioOnlyResult(m)?(m.posicion_desafio_peugeot||m.posicion_categoria||''):''),catPos:m.posicion_categoria||''});

  events.filter(e=>e.sessions.length&&!isUpcomingEvent(e)).forEach(e=>{
    realKeys.add(`${e.championshipId}|${normalizeDriverName(e.name)}`);
    const times=e.sessions.map(s=>new Date(s.raw).getTime()).filter(Number.isFinite);
    const date=times.length?Math.max(...times):0;
    const rows=regs.filter(r=>r.event_id===e.id).map(r=>({pilotId:r.pilot_id,name:pilotNameById(r.pilot_id)||'Piloto',category:r.categoria||'',car:r.coche||'',general:r.posicion_general||'',catPos:r.posicion_categoria||''}));
    manual.filter(sameEvent(e.championshipId,e.name)).forEach(m=>{
      const row=manualRow(m);
      if(rows.some(x=>(row.pilotId&&x.pilotId===row.pilotId)||normalizeDriverName(x.name)===normalizeDriverName(row.name)))return;
      rows.push(row);
    });
    items.push({name:e.name,subtitle:e.subtitle,championship:e.championship,plate:e.plateUrl,date,year:new Date(date||Date.now()).getFullYear(),rows:sortResultRows(rows),eventId:e.id,manual:false});
  });

  // Pruebas antiguas que solo existen como resultados cargados a mano.
  const groups=new Map();
  manual.forEach(m=>{
    if(!m.event_name)return;
    const key=`${m.championship_id}|${normalizeDriverName(m.event_name)}`;
    if(realKeys.has(key))return;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(m);
  });
  groups.forEach(list=>{
    const first=list[0];
    const yearMatch=`${champName(first.championship_id)} ${first.championship_id||''}`.match(/20\d{2}/);
    const created=Math.min(...list.map(m=>new Date(m.created_at).getTime()).filter(Number.isFinite));
    const order=list.map(m=>Number(m.event_order)).find(n=>Number.isFinite(n)&&n>0);
    const year=yearMatch?Number(yearMatch[0]):new Date(Number.isFinite(created)?created:Date.now()).getFullYear();
    items.push({name:first.event_name,subtitle:'',championship:champName(first.championship_id),plate:'',date:Number.isFinite(created)?created:0,order,year,rows:sortResultRows(list.map(manualRow)),eventId:'',manual:true});
  });

  finishedState.items=items;
  const years=[...new Set(items.map(i=>i.year))].sort((a,b)=>b-a);
  if(!years.includes(finishedState.year))finishedState.year=years[0]??null;
  renderFinished();
}
function setFinishedYear(year){finishedState.year=year;renderFinished()}
function renderFinished(){
  const grid=$('finishedGrid'),yearsBox=$('finishedYears'); if(!grid)return;
  const years=[...new Set(finishedState.items.map(i=>i.year))].sort((a,b)=>b-a);
  if(yearsBox)yearsBox.innerHTML=years.map(y=>`<button class="filter-chip${y===finishedState.year?' active':''}" onclick="setFinishedYear(${Number(y)})">Temporada ${y}</button>`).join('');
  const list=finishedState.items.map((item,idx)=>({item,idx})).filter(x=>x.item.year===finishedState.year)
    .sort((a,b)=>(a.item.order&&b.item.order?b.item.order-a.item.order:0)||b.item.date-a.item.date);
  if(!list.length){grid.innerHTML='<div class="event-card"><h2>Todavía no hay pruebas finalizadas</h2><p class="empty">Cuando termine una prueba aparecerá aquí con sus resultados.</p></div>';return}
  grid.innerHTML=list.map(({item,idx})=>finishedCardHtml(item,idx)).join('');
}
function finishedCardHtml(i,idx){
  const medals=['🥇','🥈','🥉'];
  // Los 3 primeros clasificados (las filas ya vienen ordenadas); medalla solo para posiciones 1-3.
  const podium=i.rows.filter(r=>parseStandingPosition(r.general)).slice(0,3);
  const classified=i.rows.filter(r=>parseStandingPosition(r.general)).length;
  return `<article class="event-card finished-card">
    ${i.plate?`<img class="event-plate" src="${escHtml(i.plate)}" alt="" loading="lazy" onerror="this.remove()">`:''}
    <div><p class="eyebrow">${escHtml(i.championship||'Campeonato')}${i.subtitle?` · ${escHtml(i.subtitle)}`:''}</p><h2>${escHtml(i.name)}</h2><p class="empty">${i.manual?`Temporada ${i.year}`:`Disputada el ${escHtml(shortDate(i.date))}`}</p></div>
    ${podium.length?`<div class="finished-podium">${podium.map(r=>`<div class="finished-podium-row"><span class="finished-medal">${medals[parseStandingPosition(r.general)-1]||`<small>${escHtml(r.general)}º</small>`}</span>${avatarHtml(pilotPhoto(r.pilotId,r.name),r.name,'pilot-photo sm')}<span><b>${escHtml(r.name)}</b><small>${escHtml([r.category,r.car].filter(Boolean).join(' · '))}</small></span></div>`).join('')}</div>`:'<div class="notice">Resultados pendientes de publicar.</div>'}
    <div class="event-meta"><div class="mini-stat"><b>${i.rows.length}</b><span>Participantes</span></div><div class="mini-stat"><b>${classified}</b><span>Clasificados</span></div></div>
    <div class="finished-actions"><button class="wide-btn ${classified?'primary':''}" ${classified?`onclick="openFinishedResults(${idx})"`:'disabled'}>Ver resultados</button>${i.eventId?`<button class="wide-btn" onclick="openEvent('${escHtml(i.eventId)}')">Ficha de la prueba</button>`:''}</div>
  </article>`;
}
/* Portada: las 3 últimas pruebas finalizadas (de cualquier temporada) */
let homeFinishedAt=0;
async function loadHomeFinished(){
  const wrap=$('homeFinishedWrap'),box=$('homeFinished'); if(!wrap||!box)return;
  try{
    if(!finishedState.items.length||Date.now()-homeFinishedAt>60000){await loadFinishedEvents();homeFinishedAt=Date.now()}
  }catch(e){console.warn('Pruebas finalizadas en portada:',e.message)}
  const latest=finishedState.items.map((item,idx)=>({item,idx})).sort((a,b)=>b.item.date-a.item.date).slice(0,3);
  wrap.classList.toggle('hidden',!latest.length);
  box.innerHTML=latest.map(({item,idx})=>finishedCardHtml(item,idx)).join('');
}
function scrollToFinished(){setTimeout(()=>$('finishedBlock')?.scrollIntoView({behavior:'smooth',block:'start'}),50)}

/* =====================================================================
   7. VISTA PREVIA DEL COCHE al inscribirse (cars.imagen_url)
   ===================================================================== */
function renderCarPreview(){
  const box=$('carPreview'); if(!box)return;
  const e=events.find(x=>x.id===currentEventId);
  const name=$('carSelect')?.value||'';
  const car=e?.cars.find(c=>c.name===name);
  box.classList.toggle('hidden',!car?.image);
  box.innerHTML=car?.image?`<div class="car-preview"><img src="${escHtml(car.image)}" alt="${escHtml(car.name)}" onerror="this.closest('.field').classList.add('hidden')"><span><b>${escHtml(car.name)}</b><small>${escHtml(car.categoryName||'')}</small></span></div>`:'';
}
function openFinishedResults(idx){
  if(!finishedState.items[idx])return;
  resultsModalState={idx,cat:''};
  renderResultsModal();
  $('resultsModal').classList.add('visible');
  document.body.style.overflow='hidden';
}
function setResultsCategory(cat){resultsModalState.cat=cat;renderResultsModal()}
function renderResultsModal(){
  const i=finishedState.items[resultsModalState.idx]; if(!i)return;
  const cat=resultsModalState.cat;
  const cats=[...new Set(i.rows.map(r=>r.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  // Por categoría se ordena por la posición de categoría.
  const rows=cat?i.rows.filter(r=>r.category===cat).sort((a,b)=>resultRank(a.catPos)-resultRank(b.catPos)):i.rows;
  $('resultsModalTitle').textContent=i.name;
  $('resultsModalSubtitle').textContent=[i.championship,i.manual?`Temporada ${i.year}`:shortDate(i.date),`${i.rows.length} participantes`].filter(Boolean).join(' · ');
  $('resultsModalBody').innerHTML=`${cats.length>1?`<div class="chip-row" style="margin-bottom:14px"><button class="filter-chip${!cat?' active':''}" onclick="setResultsCategory('')">General</button>${cats.map((c,n)=>`<button class="filter-chip${cat===c?' active':''}" onclick="setResultsCategory(finishedCategoryAt(${n}))">${escHtml(c)}</button>`).join('')}</div>`:''}
    <div class="table-scroll"><table class="results-table"><thead><tr><th>${cat?'Pos. cat.':'Pos.'}</th><th>Piloto</th><th>Categoría</th><th>Coche</th><th>${cat?'Pos. general':'Pos. categoría'}</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td><span class="rank-pos">${escHtml((cat?r.catPos:r.general)||'-')}</span></td><td><span class="results-pilot">${avatarHtml(pilotPhoto(r.pilotId,r.name),r.name,'pilot-photo sm')}<b>${escHtml(r.name)}</b></span></td><td>${escHtml(r.category||'-')}</td><td>${escHtml(r.car||'-')}</td><td>${escHtml((cat?r.general:r.catPos)||'-')}</td></tr>`).join('')}
    </tbody></table></div>`;
}
function finishedCategoryAt(n){
  const i=finishedState.items[resultsModalState.idx];
  return [...new Set((i?.rows||[]).map(r=>r.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'))[n]||'';
}
function closeFinishedResults(){$('resultsModal').classList.remove('visible');document.body.style.overflow=''}
