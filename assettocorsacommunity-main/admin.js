const adminState={events:[],championships:[],sessions:[],cars:[],categories:[],championshipCars:[],championshipCategories:[],files:[],registrations:[],profiles:[],registrationChanges:[],classificationResults:[],licenseRequests:[],teamClassificationResults:[]};
let adminSelectedRegistrationEventId = "";
let adminEditingRegistrationId = null;
let adminEditingClassificationId = null;
let adminSelectedClassificationChampionshipId = '';
let adminSelectedClassificationEventName = '';
let adminSelectedDownloadEventId = '';
let adminDownloadLogSort = 'date';
function adminGuard(){if(!currentUser){toast("Inicia sesión con tu cuenta admin.");showPage("login");return false}if(currentUser.role!=="admin"){toast("Acceso denegado. Esta cuenta no es administradora.");showPage("home");return false}return true}
function openAdmin(){if(!adminGuard())return;renderAdmin();showPage("admin");adminTab("events")}
function renderAdmin(){
  $("adminContent").innerHTML=`
    <div class="panel">
      <div class="panel-head">
        <div><p class="eyebrow">Gestión interna</p><div class="panel-title">🛠 Panel de administración</div></div>
        <span class="badge admin">Solo admin</span>
      </div>
      <div class="panel-body">
        <p class="empty">Desde aquí puedes crear y modificar eventos, ver inscripciones, gestionar campeonatos, coches, categorías, sesiones, archivos programados, inscripciones y el tablón de anuncios.</p>
        <div class="admin-tabs">
          <button class="admin-tab active" data-admin-tab="events" onclick="adminTab('events')">Eventos</button>
          <button class="admin-tab" data-admin-tab="championships" onclick="adminTab('championships')">Campeonatos</button>
          <button class="admin-tab" data-admin-tab="sessions" onclick="adminTab('sessions')">Sesiones</button>
          <button class="admin-tab" data-admin-tab="registrations" onclick="adminTab('registrations')">Inscripciones</button><button class="admin-tab" data-admin-tab="classifications" onclick="adminTab('classifications')">Clasificaciones</button>
          <button class="admin-tab" data-admin-tab="cars" onclick="adminTab('cars')">Coches</button>
          <button class="admin-tab" data-admin-tab="categories" onclick="adminTab('categories')">Categorías</button>
          <button class="admin-tab" data-admin-tab="files" onclick="adminTab('files')">Archivos</button><button class="admin-tab" data-admin-tab="downloads" onclick="adminTab('downloads')">Registro de descargas</button>
          <button class="admin-tab" data-admin-tab="teams" onclick="adminTab('teams')">Equipos</button>
          <button class="admin-tab" data-admin-tab="licenses" onclick="adminTab('licenses')">Licencias</button>
          <button class="admin-tab" data-admin-tab="news" onclick="adminTab('news')">Noticias</button>
          <button class="admin-tab" data-admin-tab="safety" onclick="adminTab('safety')">Safety Rating</button>
        </div>
        <div id="adminPanelBody" class="admin-panel-body"></div>
      </div>
    </div>`;
}
function adminSetActive(tab){document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===tab))}
async function adminTab(tab){if(!adminGuard())return;adminSetActive(tab);if(tab==='events')return adminEvents();if(tab==='championships')return adminChampionships();if(tab==='sessions')return adminSessions();if(tab==='registrations')return adminRegistrations();if(tab==='classifications')return adminClassifications();if(tab==='cars')return adminCars();if(tab==='categories')return adminCategories();if(tab==='files')return adminFiles();if(tab==='downloads')return adminDownloadLogs();if(tab==='teams')return adminTeams();if(tab==='licenses')return adminLicenseRequests();if(tab==='news')return adminNews();if(tab==='safety')return adminSafety()}
async function withTimeout(promise, ms=9000, label='consulta'){
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: tiempo de espera agotado`)), ms);
  });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(timer); }
}
async function adminFetch(table,select='*',orderCol='created_at',ascending=false){
  let q=supabaseClient.from(table).select(select);
  if(orderCol)q=q.order(orderCol,{ascending});
  let data, error;
  try{
    const res=await withTimeout(q,9000,table);
    data=res.data; error=res.error;
  }catch(e){toast(e.message);return []}
  if(error && orderCol){
    console.warn(`Fallo ordenando ${table} por ${orderCol}:`, error.message);
    try{
      const retry=await withTimeout(supabaseClient.from(table).select(select),9000,`${table} retry`);
      data=retry.data; error=retry.error;
    }catch(e){toast(e.message);return []}
  }
  if(error){toast(`${table}: ${error.message}`);return []}
  return data||[];
}
function val(id){return ($(id)?.value||'').trim()}
function dateLocalToIso(v){return v?new Date(v).toISOString():null}
function isoToDateLocal(v){if(!v)return'';const d=new Date(v);const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
function madridLocalInputToIso(v){const date=madridWallTimeToInstant(v);return date?date.toISOString():null}
function isoToMadridDateLocal(v){const date=madridWallTimeToInstant(v);if(!date)return'';const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`}
function formatMadridDateTime(v){const date=madridWallTimeToInstant(v);return date?date.toLocaleString('es-ES',{timeZone:'Europe/Madrid'}):'?'}
let adminBaseLoadedAt = 0;
async function adminLoadBase(force=false){
  const now = Date.now();
  if(!force && adminBaseLoadedAt && now - adminBaseLoadedAt < 12000) return;
  const [championships, events, sessions, cars, categories, championshipCars, championshipCategories] = await Promise.all([
    adminFetch('championships','*','nombre',true),
    adminFetch('events','*','created_at',false),
    adminFetch('sessions','*','fecha_hora',true),
    adminFetch('cars','*','nombre',true),
    adminFetch('categories','*','nombre',true),
    adminFetch('championship_cars','*',null,true),
    adminFetch('championship_categories','*',null,true)
  ]);
  adminState.championships=championships;
  adminState.events=events;
  adminState.sessions=sessions;
  adminState.cars=cars;
  adminState.categories=categories;
  adminState.championshipCars=championshipCars;
  adminState.championshipCategories=championshipCategories;
  adminBaseLoadedAt = Date.now();
}

function championshipHasPublicStandings(championship){return championship?.mostrar_clasificaciones!==false}
async function adminChampionships(){await adminLoadBase();$('adminPanelBody').innerHTML=`<div class="admin-two"><div class="admin-box"><h3>?? Crear / modificar campeonato</h3><input type="hidden" id="admChampEditing"><div class="form-grid"><div class="field"><label>ID campeonato</label><input id="admChampId" placeholder="crsv-2026"></div><div class="field"><label>Nombre</label><input id="admChampName" placeholder="CRSV 2026"></div><div class="field"><label>Temporada</label><input id="admChampSeason" type="number" min="2020" max="2100" placeholder="${new Date().getFullYear()}"></div><div class="field full"><label>Logo del campeonato</label><div class="image-field" id="admChampLogoField"></div></div><div class="field full"><label>Cartel del calendario (opcional)</label><div class="image-field" id="admChampCalendarField"></div></div><div class="field full"><label><input id="admChampShowStandings" type="checkbox" checked> Mostrar clasificaciones de este campeonato en la web</label><small>Si lo desmarcas, el campeonato seguir? disponible en admin, eventos, coches y categor?as, pero no saldr? en Clasificaciones.</small></div></div><div class="form-actions"><button class="ghost-btn" onclick="adminClearChampionshipForm()">Nuevo</button><button class="submit-btn" onclick="adminSaveChampionship()">Guardar campeonato</button></div></div><div class="admin-box"><h3>Campeonatos</h3><div class="admin-list">${adminState.championships.map(c=>{const visibility=championshipHasPublicStandings(c)?'Clasificaciones visibles':'Sin clasificaciones p?blicas';return `<div class="admin-list-item"><span><b>${c.nombre}</b><br><small>${c.id} ? ${visibility}</small></span><span><button class="ghost-btn" onclick="adminEditChampionship('${c.id}')">Editar</button> <button class="ghost-btn" onclick="adminDeleteChampionship('${c.id}')">Borrar</button></span></div>`}).join('')||'<div class="admin-list-item"><span>No hay campeonatos.</span></div>'}</div></div></div>`;renderImageField('admChampLogoField','championship-logo','');renderImageField('admChampCalendarField','championship-calendar','')}
function adminEditChampionship(id){const c=adminState.championships.find(x=>x.id===id);if(!c)return;$('admChampEditing').value=c.id;$('admChampId').value=c.id;$('admChampId').disabled=true;$('admChampName').value=c.nombre||'';if($('admChampShowStandings'))$('admChampShowStandings').checked=championshipHasPublicStandings(c);$('admChampSeason').value=c.temporada||'';renderImageField('admChampLogoField','championship-logo',c.logo_url||'');renderImageField('admChampCalendarField','championship-calendar',c.calendario_url||'');toast('Editando campeonato. Guarda para aplicar cambios.')}
function adminClearChampionshipForm(){$('admChampEditing').value='';$('admChampId').value='';$('admChampId').disabled=false;$('admChampName').value='';if($('admChampShowStandings'))$('admChampShowStandings').checked=true;$('admChampSeason').value='';renderImageField('admChampLogoField','championship-logo','');renderImageField('admChampCalendarField','championship-calendar','')}
async function adminSaveChampionship(){const editing=val('admChampEditing');const payload={id:val('admChampId'),nombre:val('admChampName'),mostrar_clasificaciones:$('admChampShowStandings')?$('admChampShowStandings').checked:true,temporada:Number(val('admChampSeason'))||null};if(!payload.id||!payload.nombre)return toast('ID y nombre son obligatorios.');try{payload.logo_url=await readImageField('admChampLogoField','championship-logo')||null;payload.calendario_url=await readImageField('admChampCalendarField','championship-calendar')||null}catch(e){return toast(e.message)}let res;if(editing){const {id,...upd}=payload;res=await supabaseClient.from('championships').update(upd).eq('id',editing)}else{res=await supabaseClient.from('championships').upsert(payload)}if(res.error)return toast(res.error.message);toast('Campeonato guardado.');await adminChampionships()}
async function adminDeleteChampionship(id){if(!confirm('¿Borrar campeonato? Los eventos vinculados quedarán sin campeonato.'))return;const {error}=await supabaseClient.from('championships').delete().eq('id',id);if(error)return toast(error.message);toast('Campeonato borrado.');await adminChampionships()}
async function adminEvents(){await adminLoadBase();const champOptions='<option value="">Sin campeonato</option>'+adminState.championships.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');const body=$('adminPanelBody');body.innerHTML=`
<div class="admin-two">
  <div class="admin-box">
    <h3>🏁 Crear / modificar evento</h3>
    <input type="hidden" id="admEventEditing">
    <div class="form-grid">
      <div class="field"><label>ID evento</label><input id="admEventId" placeholder="voltrega"></div>
      <div class="field"><label>Campeonato</label><select id="admEventChampionship">${champOptions}</select></div>
      <div class="field full"><label>Nombre</label><input id="admEventName" placeholder="Rallysprint Les Masies de Voltregà"></div>
      <div class="field"><label>Subtítulo</label><input id="admEventSubtitle" placeholder="Rally de asfalto"></div>
      <div class="field"><label>Estado</label><input id="admEventStatus" placeholder="Abierta / Cerrada"></div>
      <div class="field"><label>Copiloto</label><select id="admEventCodriver"><option value="true">Con copiloto</option><option value="false">Sin copiloto</option></select></div>
      <div class="field full"><label>Descripción</label><input id="admEventDescription" placeholder="Descripción corta"></div>
      <div class="field"><label>Apertura inscripción</label><input id="admEventOpen" type="datetime-local" oninput="adminSyncEventSeason()"></div>
      <div class="field"><label>Cierre inscripción</label><input id="admEventClose" type="datetime-local" oninput="adminSyncEventSeason()"></div>
      <div class="field"><label>Fecha de la prueba</label><input id="admEventDate" type="date" oninput="adminSyncEventSeason()"><small>Para el calendario mientras no haya sesiones creadas.</small></div>
      <div class="field"><label>Temporada</label><input id="admEventSeason" type="number" min="2020" max="2100" placeholder="${new Date().getFullYear()}" oninput="this.dataset.manual='1'"><small>Se rellena sola con el año de las fechas de la prueba.</small></div>
      <div class="field"><label>Kilometraje total total</label><input id="admEventDistance" placeholder="38.00 km"></div>
      <div class="field"><label>Orden en clasificacion</label><input id="admEventOrder" type="number" min="1" placeholder="1"></div>
      <div class="field full"><label>Tablón de anuncios</label><input id="admEventBoard" placeholder="https://drive.google.com/..."></div>
      <div class="field"><label>Código tablón</label><input id="admEventBoardCode" placeholder="Solo lo ven los inscritos"></div>
      <div class="field"><label>Drive para subir skins</label><input id="admEventSkins" placeholder="https://drive.google.com/drive/folders/..."></div>
      <div class="field"><label>Licencia mínima para correr</label><select id="admEventMinLicense"><option value="">Sin requisito</option>${SR_CLASSES.map(c=>`<option value="${c.key}">${c.name} (${c.key})</option>`).join('')}</select></div>
      <div class="field"><label>SR mínimo en esa licencia</label><input id="admEventMinSr" type="number" step="0.01" min="0" max="4.99" placeholder="Ej. 2.00"><small>Una licencia superior siempre cumple.</small></div>
      <div class="field full"><label>URL placa del rally (imagen para la tarjeta de evento)</label><input id="admEventPlate" placeholder="https://.../placa.png"></div>
      <div class="field full"><label>URL cartel de la prueba (imagen para detalles)</label><input id="admEventPoster" placeholder="https://.../cartel.jpg"></div>
    </div>
    <div class="form-actions"><button class="submit-btn" onclick="adminSaveEvent()">Guardar evento</button></div>
  </div>
  <div class="admin-box">
    <h3>Eventos</h3>
    <div class="admin-list">${adminState.events.map(e=>{const ch=adminState.championships.find(c=>c.id===e.championship_id);return `<div class="admin-list-item"><span><b>${e.nombre}</b><br><small>${e.id} · ${ch?ch.nombre:'Sin campeonato'} · ${e.estado||''}</small></span><span><button class="ghost-btn" onclick="adminEditEvent('${e.id}')">Editar</button> <button class="ghost-btn" onclick="adminDeleteEvent('${e.id}')">Borrar</button></span></div>`}).join('')||'<div class="admin-list-item"><span>No hay eventos.</span></div>'}</div>
  </div>
</div>`}
function adminEditEvent(id){const e=adminState.events.find(x=>x.id===id);if(!e)return;$('admEventEditing').value=e.id;$('admEventId').value=e.id;$('admEventId').disabled=true;$('admEventChampionship').value=e.championship_id||'';$('admEventName').value=e.nombre||'';$('admEventSubtitle').value=e.subtitulo||'';$('admEventDescription').value=e.descripcion||'';$('admEventOpen').value=isoToDateLocal(e.inscripcion_apertura);$('admEventClose').value=isoToDateLocal(e.inscripcion_cierre);$('admEventStatus').value=e.estado||'';$('admEventCodriver').value=e.requiere_copiloto===false?'false':'true';$('admEventDistance').value=e.distancia_total||'';$('admEventOrder').value=e.orden_clasificacion||'';$('admEventBoard').value=e.tablon_url||'';$('admEventPlate').value=e.placa_url||'';$('admEventPoster').value=e.cartel_url||'';$('admEventBoardCode').value=e.codigo_tablon||'';$('admEventSkins').value=e.skins_url||'';$('admEventMinLicense').value=e.licencia_minima||'';$('admEventMinSr').value=e.sr_minimo??'';$('admEventDate').value=e.fecha_prueba||'';$('admEventSeason').value=e.temporada||'';$('admEventSeason').dataset.manual=e.temporada?'1':'';if(!e.temporada)adminSyncEventSeason();toast('Editando evento. Guarda para aplicar cambios.')}
async function adminSaveEvent(){const editing=val('admEventEditing');const payload={id:val('admEventId'),nombre:val('admEventName'),subtitulo:val('admEventSubtitle'),descripcion:val('admEventDescription'),inscripcion_apertura:dateLocalToIso(val('admEventOpen')),inscripcion_cierre:dateLocalToIso(val('admEventClose')),estado:val('admEventStatus'),distancia_total:val('admEventDistance'),tablon_url:val('admEventBoard'),placa_url:val('admEventPlate'),cartel_url:val('admEventPoster'),orden_clasificacion:val('admEventOrder')?Number(val('admEventOrder')):null,championship_id:val('admEventChampionship')||null,requiere_copiloto:val('admEventCodriver')!=='false',fecha_prueba:val('admEventDate')||null,codigo_tablon:val('admEventBoardCode')||null,skins_url:val('admEventSkins')||null,licencia_minima:val('admEventMinLicense')||null,sr_minimo:val('admEventMinSr')!==''?Number(val('admEventMinSr')):null,temporada:Number(val('admEventSeason'))||adminEventSeasonFromDates()||new Date().getFullYear()};if(!payload.id||!payload.nombre)return toast('ID y nombre son obligatorios.');if(payload.skins_url&&!/^https?:\/\//i.test(payload.skins_url))return toast('El enlace de skins debe empezar por https://');if(payload.sr_minimo!=null&&(payload.sr_minimo<0||payload.sr_minimo>4.99))return toast('El SR mínimo va de 0.00 a 4.99.');let res;if(editing){const {id,...upd}=payload;res=await supabaseClient.from('events').update(upd).eq('id',editing)}else{res=await supabaseClient.from('events').insert(payload)}if(res.error)return toast(res.error.message);toast('Evento guardado.');await loadPublicEvents();await adminEvents()}
/* Temporada de la prueba: el año de sus fechas (fecha de la prueba o, si no, cierre/apertura de inscripciones) */
function adminEventSeasonFromDates(){const v=val('admEventDate')||val('admEventClose')||val('admEventOpen');const y=v?new Date(v).getFullYear():NaN;return Number.isFinite(y)?y:null}
function adminSyncEventSeason(){const box=$('admEventSeason');if(!box||box.dataset.manual==='1')return;const y=adminEventSeasonFromDates();if(y)box.value=y}
async function adminDeleteEvent(id){if(!confirm('¿Borrar evento y todo lo asociado?'))return;const {error}=await supabaseClient.from('events').delete().eq('id',id);if(error)return toast(error.message);toast('Evento borrado.');await loadPublicEvents();await adminEvents()}
async function adminSessions(){await adminLoadBase();const eventOptions=adminState.events.map(e=>`<option value="${e.id}">${e.nombre}</option>`).join('');const body=$('adminPanelBody');body.innerHTML=`<div class="admin-two"><div class="admin-box"><h3>🚦 Crear / modificar sesión</h3><input type="hidden" id="admSessionEditing"><div class="form-grid"><div class="field full"><label>Evento</label><select id="admSessionEvent">${eventOptions}</select></div><div class="field"><label>ID sesión</label><input id="admSessionId" placeholder="voltrega_s1"></div><div class="field"><label>Nombre</label><input id="admSessionName" placeholder="Sesión 1"></div><div class="field"><label>Fecha y hora</label><input id="admSessionDate" type="datetime-local"></div><div class="field"><label>Cupo máximo</label><input id="admSessionMax" type="number" value="30"></div><div class="field"><label>Estado</label><select id="admSessionStatus"><option value="open">Open</option><option value="closed">Closed</option></select></div></div><div class="form-actions"><button class="ghost-btn" onclick="adminClearSessionForm()">Nueva</button><button class="submit-btn" onclick="adminSaveSession()">Guardar sesión</button></div></div><div class="admin-box"><h3>Sesiones</h3><div class="admin-list">${adminState.sessions.map(s=>`<div class="admin-list-item"><span><b>${s.nombre}</b><br><small>${s.event_id} · ${new Date(s.fecha_hora).toLocaleString('es-ES')} · cupo ${s.cupo_maximo}</small></span><span><button class="ghost-btn" onclick="adminEditSession('${s.id}')">Editar</button> <button class="ghost-btn" onclick="adminDeleteSession('${s.id}')">Borrar</button></span></div>`).join('')||'<div class="admin-list-item"><span>No hay sesiones.</span></div>'}</div></div></div>`}
function adminEditSession(id){const s=adminState.sessions.find(x=>x.id===id);if(!s)return;$('admSessionEditing').value=s.id;$('admSessionId').value=s.id;$('admSessionId').disabled=true;$('admSessionEvent').value=s.event_id||'';$('admSessionName').value=s.nombre||'';$('admSessionDate').value=isoToDateLocal(s.fecha_hora);$('admSessionMax').value=s.cupo_maximo||30;$('admSessionStatus').value=s.estado||'open';toast('Editando sesión. Guarda para aplicar cambios.')}
function adminClearSessionForm(){$('admSessionEditing').value='';$('admSessionId').value='';$('admSessionId').disabled=false;$('admSessionName').value='';$('admSessionDate').value='';$('admSessionMax').value=30;$('admSessionStatus').value='open'}
async function adminSaveSession(){const editing=val('admSessionEditing');const payload={id:val('admSessionId'),event_id:val('admSessionEvent'),nombre:val('admSessionName'),fecha_hora:dateLocalToIso(val('admSessionDate')),cupo_maximo:Number(val('admSessionMax')||30),estado:val('admSessionStatus')};if(!payload.id||!payload.event_id||!payload.nombre||!payload.fecha_hora)return toast('Rellena evento, ID, nombre y fecha.');let res;if(editing){const {id,...upd}=payload;res=await supabaseClient.from('sessions').update(upd).eq('id',editing)}else{res=await supabaseClient.from('sessions').insert(payload)}if(res.error)return toast(res.error.message);toast('Sesión guardada.');await adminSessions()}
async function adminDeleteSession(id){if(!confirm('¿Borrar sesión?'))return;const {error}=await supabaseClient.from('sessions').delete().eq('id',id);if(error)return toast(error.message);toast('Sesión borrada.');await adminSessions()}

function categoryIsVisibleForPilots(category){return category?.visible_para_pilotos!==false}
function adminAllowedCategoriesForEvent(eventId){
  const ev=adminState.events.find(e=>e.id===eventId)||{};
  const championshipId=ev.championship_id;
  const ids=adminState.championshipCategories.filter(x=>x.championship_id===championshipId).map(x=>x.category_id);
  return adminState.categories.filter(c=>ids.includes(c.id));
}
function adminPublicCategoriesForEvent(eventId){return adminAllowedCategoriesForEvent(eventId).filter(categoryIsVisibleForPilots)}
function adminAllowedCarsForEventCategory(eventId,categoryName){
  const ev=adminState.events.find(e=>e.id===eventId)||{};
  const championshipId=ev.championship_id;
  const category=adminState.categories.find(c=>c.nombre===categoryName);
  const links=adminState.championshipCars.filter(x=>x.championship_id===championshipId && (!category || x.category_id===category.id));
  const ids=links.map(x=>x.car_id);
  return adminState.cars.filter(c=>ids.includes(c.id) && c.activo!==false);
}
async function adminLoadRegistrationChanges(registrationIds){
  if(!registrationIds.length)return [];
  const tables=['registration_change_history','registration_changes','registration_change_logs'];
  for(const table of tables){
    try{
      const {data,error}=await withTimeout(supabaseClient.from(table).select('*').in('registration_id',registrationIds).order('created_at',{ascending:false}),7000,'historial de cambios');
      if(!error)return (data||[]).map(item=>({...item,_sourceTable:table}));
    }catch(e){
      console.warn('Historial de cambios no disponible en '+table,e);
    }
  }
  return [];
}
function adminSessionLabel(sessionId){
  const s=adminState.sessions.find(x=>x.id===sessionId);
  return s ? (s.nombre||s.id) : (sessionId||'ï¿½');
}
function adminChangeValue(value){return value||value===0?escapeAttr(value):'ï¿½'}
function adminNormalizeRegistrationChange(change){
  const type=String(change.change_type||change.tipo||change.type||change.kind||'').toLowerCase();
  const oldSession=change.old_session_id||change.session_id_old||change.sesion_anterior||change.old_session;
  const newSession=change.new_session_id||change.session_id_new||change.sesion_nueva||change.new_session;
  const isSession=type.includes('session')||type.includes('sesion')||oldSession||newSession;
  return {
    type:isSession?'session':'vehicle',
    date:change.created_at||change.fecha||change.changed_at||'',
    oldSession,
    newSession,
    oldCategory:change.old_categoria||change.old_category||change.categoria_anterior,
    newCategory:change.new_categoria||change.new_category||change.categoria_nueva,
    oldCar:change.old_coche||change.old_car||change.coche_anterior,
    newCar:change.new_coche||change.new_car||change.coche_nuevo
  };
}
function adminRegistrationChangesFor(registrationId){
  return adminState.registrationChanges
    .filter(c=>c.registration_id===registrationId||c.registrationId===registrationId||c.inscripcion_id===registrationId)
    .map(adminNormalizeRegistrationChange);
}
function adminRenderRegistrationHistoryButton(registration){
  const changes=adminRegistrationChangesFor(registration.id);
  const total=changes.length || (registration.session_change_count||0) + (registration.vehicle_change_count||0);
  if(!total)return '<span class="change-history-empty">Sin cambios.</span>';
  const label=changes.length?`Ver historial (${changes.length})`:'Ver historial';
  return `<button class="ghost-btn history-btn" onclick="openRegistrationHistoryModal('${registration.id}')">${label}</button>`;
}
function adminRenderHistoryTable(type,changes,registration){
  const filtered=changes.filter(c=>c.type===type);
  const count=type==='session'?(registration.session_change_count||0):(registration.vehicle_change_count||0);
  if(!filtered.length){
    const text=count?'Hay cambios usados, pero no hay detalle anterior guardado.':'Sin cambios de este tipo.';
    return `<p class="change-history-empty">${text}</p>`;
  }
  const rows=filtered.map(c=>{
    const dateText=c.date?new Date(c.date).toLocaleString('es-ES'):'-';
    if(type==='session')return `<tr><td>${adminChangeValue(adminSessionLabel(c.oldSession))}</td><td>${adminChangeValue(adminSessionLabel(c.newSession))}</td><td>${dateText}</td></tr>`;
    return `<tr><td>${adminChangeValue(c.oldCategory)}</td><td>${adminChangeValue(c.oldCar)}</td><td>${adminChangeValue(c.newCategory)}</td><td>${adminChangeValue(c.newCar)}</td><td>${dateText}</td></tr>`;
  }).join('');
  const head=type==='session'
    ? '<tr><th>Sesiï¿½n anterior</th><th>Sesiï¿½n nueva</th><th>Fecha</th></tr>'
    : '<tr><th>Categorï¿½a anterior</th><th>Coche anterior</th><th>Categorï¿½a nueva</th><th>Coche nuevo</th><th>Fecha</th></tr>';
  return `<table class="history-table"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}
function openRegistrationHistoryModal(registrationId){
  const registration=adminState.registrations.find(r=>r.id===registrationId);
  if(!registration)return toast('No encuentro esta inscripciï¿½n.');
  const profile=adminState.profiles.find(p=>p.id===registration.pilot_id)||{};
  const changes=adminRegistrationChangesFor(registrationId);
  $('registrationHistoryTitle').textContent='Historial de cambios';
  $('registrationHistorySubtitle').textContent=`${profile.nombre||''} ${profile.apellido||''} ï¿½ ${profile.licencia_piloto||registration.pilot_id||''}`;
  $('registrationHistoryBody').innerHTML=`
    <section class="history-section"><h4>Cambios de sesiï¿½n</h4>${adminRenderHistoryTable('session',changes,registration)}</section>
    <section class="history-section"><h4>Cambios de coche / categorï¿½a</h4>${adminRenderHistoryTable('vehicle',changes,registration)}</section>`;
  $('registrationHistoryModal').classList.add('visible');
}
function closeRegistrationHistoryModal(event){
  if(event&&event.target!==$('registrationHistoryModal'))return;
  $('registrationHistoryModal')?.classList.remove('visible');
}
function registrationApprovalStatus(registration){
  return registration.approval_status||registration.estado_inscripcion||"pending";
}
function registrationApprovalLabel(registration){
  return registrationApprovalStatus(registration)==="approved"?"Aceptada":"Pendiente";
}
async function adminSetRegistrationApproval(id,status){
  const label=status==="approved"?"aceptada":"pendiente";
  const {error}=await supabaseClient.from('registrations').update({approval_status:status}).eq('id',id);
  if(error)return toast(error.message);
  toast('Inscripcion '+label+'.');
  await loadMyRegistrations();
  await loadPublicEvents();
  await adminRegistrations();
}
async function adminRegistrations(){
  if(!adminGuard())return;
  const body=$('adminPanelBody');
  if(body)body.innerHTML='<div class="admin-box"><h3>👥 Inscripciones</h3><p class="empty">Cargando inscripciones...</p></div>';

  try{
    await adminLoadBase();

    const [regRes, profileRes] = await Promise.all([
      withTimeout(supabaseClient.from('registrations').select('*').order('created_at',{ascending:false}), 9000, 'inscripciones'),
      withTimeout(supabaseClient.from('profiles').select('id,nombre,apellido,email,equipo,licencia_piloto,licencia_equipo'), 9000, 'perfiles')
    ]);

    if(regRes.error){
      $('adminPanelBody').innerHTML=`<div class="admin-box"><h3>👥 Inscripciones</h3><p class="empty">No se pudieron cargar las inscripciones.</p><p class="empty"><b>Error:</b> ${regRes.error.message}</p></div>`;
      return;
    }
    if(profileRes.error){
      $('adminPanelBody').innerHTML=`<div class="admin-box"><h3>👥 Inscripciones</h3><p class="empty">No se pudieron cargar los perfiles de pilotos.</p><p class="empty"><b>Error:</b> ${profileRes.error.message}</p></div>`;
      return;
    }

    adminState.registrations = regRes.data || [];
    adminState.profiles = profileRes.data || [];
    adminState.registrationChanges = await adminLoadRegistrationChanges(adminState.registrations.map(r=>r.id));

    if(!adminState.events.length){
      $('adminPanelBody').innerHTML=`<div class="admin-box"><h3>👥 Inscripciones</h3><p class="empty">No hay eventos creados todavía.</p></div>`;
      return;
    }

    if(!adminSelectedRegistrationEventId || !adminState.events.some(e=>e.id===adminSelectedRegistrationEventId)){
      adminSelectedRegistrationEventId = adminState.events[0]?.id || '';
    }

    const selected=adminSelectedRegistrationEventId;
    const eventOptions=adminState.events.map(e=>`<option value="${e.id}" ${e.id===selected?'selected':''}>${e.nombre}</option>`).join('');
    const filtered=selected?adminState.registrations.filter(r=>r.event_id===selected):adminState.registrations;
    const editing=adminState.registrations.find(r=>r.id===adminEditingRegistrationId);
    const editEventId=editing?.event_id || selected;
    const editSessions=adminState.sessions.filter(s=>s.event_id===editEventId);
    const editCategories=adminAllowedCategoriesForEvent(editEventId);
    const selectedCategory=editing?.categoria || editCategories[0]?.nombre || '';
    const editCars=adminAllowedCarsForEventCategory(editEventId,selectedCategory);
    const manualSessions=adminState.sessions.filter(s=>s.event_id===selected);
    const manualCategories=adminAllowedCategoriesForEvent(selected);
    const manualCategory=manualCategories[0]?.nombre || '';
    const manualCars=adminAllowedCarsForEventCategory(selected,manualCategory);
    const pilotOptions=adminState.profiles.map(p=>`<option value="${p.id}">${`${p.nombre||''} ${p.apellido||''}`.trim()||p.email||p.id}${p.licencia_piloto?` · ${p.licencia_piloto}`:''}</option>`).join('');
    const manualForm=`
      <div class="admin-box" style="margin-bottom:20px">
        <h3>Nueva inscripcion manual</h3>
        <p class="empty">Crea una inscripcion para el evento seleccionado aunque el periodo publico este cerrado.</p>
        <div class="form-grid">
          <div class="field full"><label>Piloto</label><select id="admManualRegPilot">${pilotOptions||'<option value="">No hay pilotos disponibles</option>'}</select></div>
          <div class="field"><label>Categoria</label><select id="admManualRegCategory" onchange="adminRefreshManualRegistrationCars()">${manualCategories.map(c=>`<option value="${c.nombre}">${c.nombre}</option>`).join('')||'<option value="">Sin categorias</option>'}</select></div>
          <div class="field"><label>Coche</label><select id="admManualRegCar">${manualCars.map(c=>`<option value="${c.nombre}">${c.nombre}</option>`).join('')||'<option value="">No hay coches para esta categoria</option>'}</select></div>
          <div class="field"><label>Sesion</label><select id="admManualRegSession">${manualSessions.map(s=>`<option value="${s.id}">${s.nombre||s.id} · ${s.fecha_hora?new Date(s.fecha_hora).toLocaleString('es-ES'):'sin fecha'}</option>`).join('')||'<option value="">Sin sesiones</option>'}</select></div>
          <div class="field"><label>Copiloto</label><input id="admManualRegCodriver" placeholder="Nombre copiloto"></div>
          <div class="field"><label>Nacionalidad copiloto</label><input id="admManualRegCoNat" placeholder="España"></div>
        </div>
        <div class="form-actions"><button class="submit-btn" onclick="adminCreateManualRegistration()">Crear inscripcion manual</button></div>
      </div>`;

    const editForm=editing?`
      <div class="admin-box" style="margin-bottom:20px">
        <h3>✏ï¸ Editar inscripción</h3>
        <p class="empty">Como admin puedes corregir una inscripción manualmente o mover al piloto de sesión.</p>
        <input type="hidden" id="admEditRegId" value="${editing.id}">
        <div class="form-grid">
          <div class="field"><label>Copiloto</label><input id="admEditRegCodriver" value="${editing.copiloto||''}"></div>
          <div class="field"><label>Nacionalidad copiloto</label><input id="admEditRegCoNat" value="${editing.nacionalidad_copiloto||''}"></div>
          <div class="field"><label>Categoría</label><select id="admEditRegCategory" onchange="adminRefreshRegistrationCars()">${editCategories.map(c=>`<option value="${c.nombre}" ${c.nombre===editing.categoria?'selected':''}>${c.nombre}</option>`).join('') || `<option value="${editing.categoria||''}">${editing.categoria||'Sin categorías'}</option>`}</select></div>
          <div class="field"><label>Coche</label><select id="admEditRegCar" onchange="adminToggleDesafioPeugeotField()">${editCars.map(c=>`<option value="${c.nombre}" ${c.nombre===editing.coche?'selected':''}>${c.nombre}</option>`).join('') || `<option value="${editing.coche||''}">${editing.coche||'Sin coches'}</option>`}</select></div>
          <div class="field"><label>Resultado general</label><select id="admEditRegGeneralStatus"><option value="pos" ${registrationResultStatus(editing.posicion_general)==='pos'?'selected':''}>Clasificado</option><option value="NP" ${registrationResultStatus(editing.posicion_general)==='NP'?'selected':''}>NP - No participa</option><option value="AB" ${registrationResultStatus(editing.posicion_general)==='AB'?'selected':''}>AB - Abandono</option></select></div><div class="field"><label>Posicion general</label><input id="admEditRegPosGeneral" placeholder="Ej: 5" value="${registrationResultStatus(editing.posicion_general)==='pos'?(editing.posicion_general||''):''}"></div>
          <div class="field ${isPeugeot208(editing.coche)?'':'hidden'}" id="admEditRegDesafioField"><label>Resultado Desafio Peugeot</label><input id="admEditRegDesafioPeugeot" placeholder="1 / NP / AB" value="${editing.posicion_desafio_peugeot||''}"></div>
          <div class="field"><label>Resultado categoria</label><select id="admEditRegCategoryStatus"><option value="pos" ${registrationResultStatus(editing.posicion_categoria)==='pos'?'selected':''}>Clasificado</option><option value="NP" ${registrationResultStatus(editing.posicion_categoria)==='NP'?'selected':''}>NP - No participa</option><option value="AB" ${registrationResultStatus(editing.posicion_categoria)==='AB'?'selected':''}>AB - Abandono</option></select></div><div class="field"><label>Posicion categoria</label><input id="admEditRegPosCategoria" placeholder="Ej: 2" value="${registrationResultStatus(editing.posicion_categoria)==='pos'?(editing.posicion_categoria||''):''}"></div>
          <div class="field full"><label>Sesión</label><select id="admEditRegSession">${editSessions.map(s=>`<option value="${s.id}" ${s.id===editing.session_id?'selected':''}>${s.nombre||s.id} · ${s.fecha_hora?new Date(s.fecha_hora).toLocaleString('es-ES'):'sin fecha'}</option>`).join('')}</select></div>
        </div>
        <div class="form-actions">
          <button class="ghost-btn" onclick="adminEditingRegistrationId=null;adminRegistrations()">Cancelar</button>
          <button class="submit-btn" onclick="adminSaveRegistration()">Guardar cambios</button>
        </div>
      </div>`:'';

    const rows=filtered.map(r=>{
      const p=adminState.profiles.find(x=>x.id===r.pilot_id)||{};
      const s=adminState.sessions.find(x=>x.id===r.session_id)||{};
      return `<tr>
        <td>${p.nombre||''} ${p.apellido||''}<br><small>${p.licencia_piloto||''}</small>${p.email?`<br><small>${p.email}</small>`:''}</td>
        <td>${p.equipo||'—'}<br><small>${p.licencia_equipo||''}</small></td>
        <td>${r.copiloto||''}<br><small>${r.nacionalidad_copiloto||''}</small></td>
        <td>${r.categoria||''}</td>
        <td>${r.coche||''}</td>
        <td>${s.nombre||r.session_id||''}</td>
        <td>${standingResult(r.posicion_general).label||'-'} / ${standingResult(r.posicion_categoria).label||'-'}${r.posicion_desafio_peugeot?`<br><small>Desafio Peugeot: ${standingResult(r.posicion_desafio_peugeot).label}</small>`:""}</td>
        <td>${adminRenderRegistrationHistoryButton(r)}</td>
        <td><span class="badge ${registrationApprovalStatus(r)==="approved"?"open":"closed"}">${registrationApprovalLabel(r)}</span></td>
        <td>${r.created_at?new Date(r.created_at).toLocaleString('es-ES'):'—'}</td>
        <td><div class="admin-actions"><button class="ghost-btn" onclick="adminEditRegistration('${r.id}')">Editar</button><button class="ghost-btn" onclick="adminSetRegistrationApproval('${r.id}','approved')">Aceptar</button><button class="ghost-btn" onclick="adminSetRegistrationApproval('${r.id}','pending')">Pendiente</button><button class="ghost-btn" onclick="adminDeleteRegistration('${r.id}')">Borrar</button></div></td>
      </tr>`;
    }).join('');

    const selectedEvent=adminState.events.find(e=>e.id===selected)||{};
    const tableMarkup=`<div class="admin-table-wrap"><table><thead><tr><th>Piloto</th><th>Equipo</th><th>Copiloto</th><th>Categoría</th><th>Coche</th><th>Sesion</th><th>Resultado</th><th>Historial</th><th>Aprobación</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>${rows||'<tr><td colspan="11">No hay inscripciones para este evento.</td></tr>'}</tbody></table></div>`;
    $('adminPanelBody').innerHTML=`${manualForm}${editForm}<div class="admin-box"><h3>👥 Inscripciones por evento</h3><p class="empty">Selecciona un evento y abre la tabla a pantalla completa para ver, editar o aprobar inscritos.</p><div class="form-grid"><div class="field full"><label>Evento</label><select id="admRegEventFilter" onchange="adminSetRegistrationEvent(this.value)">${eventOptions}</select></div></div><button class="submit-btn registration-table-open" onclick="openRegistrationTableModal()">Abrir tabla de inscripciones</button></div>`;
    if($('registrationTableModalBody'))$('registrationTableModalBody').innerHTML=tableMarkup;
    if($('registrationTableModalSubtitle'))$('registrationTableModalSubtitle').textContent=selectedEvent.nombre||selected||'Evento seleccionado';
  }catch(error){
    console.error(error);
    $('adminPanelBody').innerHTML=`<div class="admin-box"><h3>👥 Inscripciones</h3><p class="empty">No se pudieron cargar las inscripciones.</p><p class="empty"><b>Error:</b> ${error.message}</p><div class="form-actions"><button class="submit-btn" onclick="adminRegistrations()">Reintentar</button></div></div>`;
  }
}
function openRegistrationTableModal(){
  const modal=$('registrationTableModal');
  if(!modal)return;
  modal.classList.add('visible');
  document.body.style.overflow='hidden';
}
function closeRegistrationTableModal(){
  const modal=$('registrationTableModal');
  if(!modal)return;
  modal.classList.remove('visible');
  document.body.style.overflow='';
}function adminSetRegistrationEvent(eventId){
  adminSelectedRegistrationEventId=eventId;
  adminEditingRegistrationId=null;
  adminRegistrations();
}
function adminEditRegistration(id){adminEditingRegistrationId=id;adminRegistrations()}
function adminRefreshRegistrationCars(){
  const reg=adminState.registrations.find(r=>r.id===adminEditingRegistrationId);
  if(!reg||!$('admEditRegCar'))return;
  const cars=adminAllowedCarsForEventCategory(reg.event_id,val('admEditRegCategory'));
  $('admEditRegCar').innerHTML=cars.map(c=>`<option value="${c.nombre}">${c.nombre}</option>`).join('')||'<option value="">No hay coches para esta categoría</option>';
}
function adminToggleDesafioPeugeotField(){
  const field=$('admEditRegDesafioField');
  if(field)field.classList.toggle('hidden',!isPeugeot208(val('admEditRegCar')));
}
function adminRefreshManualRegistrationCars(){
  const carSelect=$('admManualRegCar');
  if(!carSelect)return;
  const cars=adminAllowedCarsForEventCategory(adminSelectedRegistrationEventId,val('admManualRegCategory'));
  carSelect.innerHTML=cars.map(c=>`<option value="${c.nombre}">${c.nombre}</option>`).join('')||'<option value="">No hay coches para esta categoria</option>';
}
async function adminCreateManualRegistration(){
  if(!adminGuard())return;
  const eventId=adminSelectedRegistrationEventId;
  const payload={
    event_id:eventId,
    pilot_id:val('admManualRegPilot'),
    categoria:val('admManualRegCategory'),
    coche:val('admManualRegCar'),
    session_id:val('admManualRegSession'),
    copiloto:val('admManualRegCodriver'),
    nacionalidad_copiloto:val('admManualRegCoNat'),
    approval_status:'approved'
  };
  if(!payload.event_id||!payload.pilot_id||!payload.categoria||!payload.coche||!payload.session_id)return toast('Rellena piloto, categoria, coche y sesion.');
  if(adminState.registrations.some(r=>r.event_id===payload.event_id&&r.pilot_id===payload.pilot_id))return toast('Este piloto ya esta inscrito en este evento.');
  const {error}=await supabaseClient.from('registrations').insert(payload);
  if(error)return toast(error.message);
  toast('Inscripcion manual creada.');
  adminBaseLoadedAt=0;
  await loadPublicEvents();
  await loadMyRegistrations();
  await adminRegistrations();
}
function registrationResultStatus(value){
  const upper=String(value||'').trim().toUpperCase();
  return upper==='NP'||upper==='AB'?upper:'pos';
}
function adminResultValue(statusId,inputId){
  const status=val(statusId).toUpperCase();
  return status==='NP'||status==='AB'?status:val(inputId);
}
async function adminSaveRegistration(){
  const id=val('admEditRegId');
  if(!id)return toast('No hay inscripción seleccionada.');
  const payload={
    copiloto:val('admEditRegCodriver'),
    nacionalidad_copiloto:val('admEditRegCoNat'),
    categoria:val('admEditRegCategory'),
    coche:val('admEditRegCar'),
    posicion_desafio_peugeot:isPeugeot208(val('admEditRegCar'))?val('admEditRegDesafioPeugeot'):'',
    session_id:val('admEditRegSession'),
    posicion_general:adminResultValue('admEditRegGeneralStatus','admEditRegPosGeneral'),
    posicion_categoria:adminResultValue('admEditRegCategoryStatus','admEditRegPosCategoria')
  };
  const reg=adminState.registrations.find(r=>r.id===id);
  const ev=adminState.events.find(e=>e.id===reg?.event_id);
  const requiereCopiloto = ev?.requiere_copiloto !== false;
  if(!payload.categoria||!payload.coche||!payload.session_id||(requiereCopiloto&&(!payload.copiloto||!payload.nacionalidad_copiloto)))return toast('Rellena los campos obligatorios.');
  const {error}=await supabaseClient.from('registrations').update(payload).eq('id',id);
  if(error)return toast(error.message);
  toast('Inscripción actualizada.');
  adminEditingRegistrationId=null;
  await loadPublicEvents();
  await loadMyRegistrations();
  adminBaseLoadedAt=0;
  await adminRegistrations();
}
async function adminDeleteRegistration(id){
  if(!confirm('¿Borrar esta inscripción? El piloto dejará de aparecer inscrito en la prueba.'))return;
  const regToDelete=adminState.registrations.find(r=>r.id===id);
  const {error}=await supabaseClient.from('registrations').delete().eq('id',id);
  if(error)return toast(error.message);
  toast('Inscripción borrada.');
  if(adminEditingRegistrationId===id)adminEditingRegistrationId=null;
  if(regToDelete && currentUser && regToDelete.pilot_id===currentUser.id){
    myRegistrations=myRegistrations.filter(r=>r.id!==id);
    clearLocalEntry(regToDelete.event_id);
  }
  await loadMyRegistrations();
  await loadPublicEvents();
  await loadMyRegistrations();
  adminBaseLoadedAt=0;
  await adminRegistrations();
}
function classificationCategoryOptions(championshipId,selected=''){
  const ids=adminState.championshipCategories.filter(x=>x.championship_id===championshipId).map(x=>x.category_id);
  const names=adminState.categories.filter(c=>ids.includes(c.id)).map(c=>c.nombre);
  if(selected&&!names.includes(selected))names.unshift(selected);
  if(isCrsvChampionship(championshipId)&&typeof DESAFIO_PEUGEOT!=="undefined"&&!names.includes(DESAFIO_PEUGEOT))names.push(DESAFIO_PEUGEOT);
  return names.map(name=>`<option value="${escapeAttr(name)}">${escapeAttr(name)}</option>`).join('');
}
function adminProfileName(profile){return `${profile?.nombre||''} ${profile?.apellido||''}`.trim()}
function adminSetClassificationChampionship(id){adminSelectedClassificationChampionshipId=id;adminSelectedClassificationEventName='';adminEditingClassificationId=null;adminClassifications()}
function adminSetClassificationEvent(name){adminSelectedClassificationEventName=String(name||'').trim();adminEditingClassificationId=null;adminClassifications()}
function adminClassificationEventOrder(championshipId,eventName){
  const row=adminState.classificationResults.find(r=>r.championship_id===championshipId&&r.event_name===eventName&&r.event_order);
  return row?.event_order||'';
}
function adminClassificationLinkedProfile(result){
  const license=normalizePilotLicense(result.licencia_piloto||result.pilot_license);
  if(license)return adminState.profiles.find(p=>normalizePilotLicense(p.licencia_piloto)===license)||null;
  if(result.pilot_id)return adminState.profiles.find(p=>p.id===result.pilot_id)||null;
  return null;
}
async function adminClassifications(){
  await adminLoadBase(true);
  const [{data,error}, profileRes, teamRes]=await Promise.all([
    supabaseClient.from('classification_results').select('*').order('event_name',{ascending:true}),
    supabaseClient.from('profiles').select('id,nombre,apellido,equipo,licencia_piloto,licencia_equipo'),
    supabaseClient.from('team_classification_results').select('*').order('event_name',{ascending:true})
  ]);
  if(error){
    $('adminPanelBody').innerHTML=`<div class="admin-box"><h3>Clasificaciones</h3><p class="empty">No se pudo cargar la tabla de resultados antiguos. Ejecuta primero el SQL de <b>classification_results</b>.</p><p class="empty"><b>Error:</b> ${error.message}</p></div>`;
    return;
  }
  adminState.classificationResults=data||[];
  if(!profileRes.error)adminState.profiles=profileRes.data||[];
  adminState.teamClassificationResults=teamRes&& !teamRes.error ? (teamRes.data||[]) : [];
  if(!adminSelectedClassificationChampionshipId||!adminState.championships.some(c=>c.id===adminSelectedClassificationChampionshipId))adminSelectedClassificationChampionshipId=adminState.championships[0]?.id||'';
  const selectedChamp=adminSelectedClassificationChampionshipId;
  const eventNames=[...new Set([...adminState.classificationResults.filter(r=>r.championship_id===selectedChamp).map(r=>r.event_name).filter(Boolean),...(adminState.teamClassificationResults||[]).filter(r=>r.championship_id===selectedChamp).map(r=>r.event_name).filter(Boolean)])];
  if(!adminSelectedClassificationEventName)adminSelectedClassificationEventName=eventNames[0]||'';
  const selectedEvent=adminSelectedClassificationEventName;
  const champOptions=adminState.championships.map(c=>`<option value="${escapeAttr(c.id)}" ${c.id===selectedChamp?'selected':''}>${escapeAttr(c.nombre||c.id)}</option>`).join('');
  const eventList=eventNames.map(name=>`<option value="${escapeAttr(name)}"></option>`).join('');
  const categoryOptions=classificationCategoryOptions(selectedChamp);
  const blankRows=Array.from({length:20},(_,i)=>`<tr><td><input id="admBulkPilot_${i}" placeholder="Nombre piloto"></td><td><input id="admBulkLicense_${i}" placeholder="PIL26_0001"></td><td><input id="admBulkCategory_${i}" list="admClassCategoryList" placeholder="Rally2"></td><td><input id="admBulkGeneral_${i}" inputmode="numeric" placeholder="1 / NP / AB"></td><td><input id="admBulkCategoryPos_${i}" inputmode="numeric" placeholder="1 / NP / AB"></td></tr>`).join('');
  const teamBlankRows=Array.from({length:20},(_,i)=>`<tr><td><input id="admBulkTeam_${i}" placeholder="Nombre equipo"></td><td><input id="admBulkTeamLicense_${i}" placeholder="EQ26_0001"></td><td><input id="admBulkTeamPoints_${i}" placeholder="Puntos / NP"></td></tr>`).join('');
  const teamRows=(adminState.teamClassificationResults||[]).filter(r=>r.championship_id===selectedChamp&&r.event_name===selectedEvent).map(r=>`<tr><td>${escapeAttr(r.team_name||'')}</td><td>${escapeAttr(r.licencia_equipo||r.team_license||'')}</td><td>${escapeAttr(r.points_label||String(Number(r.points||0)))}</td><td><button class="ghost-btn" onclick="adminDeleteTeamClassification('${r.id}')">Borrar</button></td></tr>`).join('');
  const rows=adminState.classificationResults.filter(r=>r.championship_id===selectedChamp&&r.event_name===selectedEvent).map(r=>{
    const linked=adminClassificationLinkedProfile(r);
    return `<tr><td>${escapeAttr(r.pilot_name||'')}</td><td>${escapeAttr(r.licencia_piloto||r.pilot_license||'')}</td><td>${escapeAttr(r.category||r.categoria||'')}</td><td>${escapeAttr(r.posicion_general||'')}</td><td>${escapeAttr(r.posicion_categoria||'')}</td><td>${linked?escapeAttr(adminProfileName(linked)):'Pendiente por licencia'}</td><td><button class="ghost-btn" onclick="adminDeleteClassification('${r.id}')">Borrar</button></td></tr>`;
  }).join('');
  $('adminPanelBody').innerHTML=`<div class="admin-box" style="margin-bottom:20px"><h3>Clasificaciones anteriores</h3><p class="empty">Rellena la prueba en bloques de 20 filas. La licencia de piloto sirve para unir automaticamente estos puntos con su cuenta cuando el piloto se registre en la web.</p><div class="form-grid"><div class="field"><label>Campeonato</label><select id="admClassChampionship" onchange="adminSetClassificationChampionship(this.value)">${champOptions}</select></div><div class="field"><label>Prueba anterior</label><input id="admClassEventFilter" list="admClassEventList" placeholder="Rallysprint ..." value="${escapeAttr(selectedEvent)}" onchange="adminSetClassificationEvent(this.value)"><datalist id="admClassEventList">${eventList}</datalist><datalist id="admClassCategoryList">${categoryOptions}</datalist></div><div class="field"><label>Orden en clasificacion</label><input id="admClassEventOrder" type="number" min="1" value="${escapeAttr(adminClassificationEventOrder(selectedChamp,selectedEvent)||'')}" placeholder="1"></div></div></div><div class="admin-box" style="margin-bottom:20px"><h3>A&ntilde;adir 20 resultados</h3><div class="admin-table-wrap"><table class="bulk-results-table"><thead><tr><th>Piloto</th><th>Licencia piloto</th><th>Categoria</th><th>Posicion general</th><th>Posicion categoria</th></tr></thead><tbody>${blankRows}</tbody></table></div><div class="form-actions"><button class="submit-btn" onclick="adminSaveBulkClassifications()">Guardar filas rellenadas</button></div></div><div class="admin-box" style="margin-bottom:20px"><h3>A&ntilde;adir puntos de equipos</h3><p class="empty">Para pruebas antiguas: pon equipo, licencia de equipo y puntos totales de esa prueba.</p><div class="admin-table-wrap"><table class="bulk-results-table"><thead><tr><th>Equipo</th><th>Licencia equipo</th><th>Puntos</th></tr></thead><tbody>${teamBlankRows}</tbody></table></div><div class="form-actions"><button class="submit-btn" onclick="adminSaveBulkTeamClassifications()">Guardar puntos de equipos</button></div></div><div class="admin-box"><h3>Resultados cargados de ${escapeAttr(selectedEvent||'la prueba seleccionada')}</h3><div class="admin-table-wrap"><table><thead><tr><th>Piloto</th><th>Licencia piloto</th><th>Categoria</th><th>General</th><th>Categoria</th><th>Enlace</th><th>Acciones</th></tr></thead><tbody>${rows||'<tr><td colspan="7">Todavia no hay resultados cargados para esta prueba.</td></tr>'}</tbody></table></div></div><div class="admin-box" style="margin-top:20px"><h3>Puntos manuales de equipos</h3><div class="admin-table-wrap"><table><thead><tr><th>Equipo</th><th>Licencia equipo</th><th>Puntos</th><th>Acciones</th></tr></thead><tbody>${teamRows||'<tr><td colspan="4">Todavia no hay puntos manuales de equipos para esta prueba.</td></tr>'}</tbody></table></div></div>`;
}
async function adminSaveBulkClassifications(){
  const championshipId=val('admClassChampionship');
  const eventName=val('admClassEventFilter');
  const eventOrder=val('admClassEventOrder')?Number(val('admClassEventOrder')):null;
  if(!championshipId||!eventName)return toast('Elige campeonato y escribe la prueba anterior.');
  const payloads=[];
  for(let i=0;i<20;i++){
    const pilotName=val(`admBulkPilot_${i}`);
    const license=val(`admBulkLicense_${i}`);
    const category=val(`admBulkCategory_${i}`);
    const general=val(`admBulkGeneral_${i}`);
    const categoryPos=val(`admBulkCategoryPos_${i}`);
    const desafio=isDesafioCategory(category)?categoryPos:"";
    if(!pilotName&&!license&&!category&&!general&&!categoryPos)continue;
    if(!pilotName||!license)return toast(`Fila ${i+1}: piloto y licencia son obligatorios.`);
    const linked=adminState.profiles.find(p=>normalizePilotLicense(p.licencia_piloto)===normalizePilotLicense(license));
    payloads.push({championship_id:championshipId,event_name:eventName,event_order:eventOrder,pilot_id:linked?.id||null,pilot_name:pilotName,licencia_piloto:license,category,posicion_general:isDesafioCategory(category)?"":general,posicion_categoria:categoryPos,posicion_desafio_peugeot:desafio,solo_desafio_peugeot:isDesafioCategory(category)});
  }
  if(!payloads.length){
    if(eventOrder){
      const {error}=await supabaseClient.from('classification_results').update({event_order:eventOrder}).eq('championship_id',championshipId).eq('event_name',eventName);
      if(error)return toast(error.message);
      toast('Orden de la prueba actualizado.');
      await adminClassifications();
      return;
    }
    return toast('Rellena al menos una fila.');
  }
  const {error}=await supabaseClient.from('classification_results').insert(payloads);
  if(error)return toast(error.message);
  toast(`${payloads.length} resultados guardados.`);
  adminSelectedClassificationChampionshipId=championshipId;
  adminSelectedClassificationEventName=eventName;
  await adminClassifications();
}
async function adminSaveBulkTeamClassifications(){
  const championshipId=val("admClassChampionship");
  const eventName=val("admClassEventFilter");
  const eventOrder=val("admClassEventOrder")?Number(val("admClassEventOrder")):null;
  if(!championshipId||!eventName)return toast("Elige campeonato y prueba anterior.");
  const payloads=[];
  for(let i=0;i<20;i++){
    const teamName=val("admBulkTeam_"+i);
    const license=val("admBulkTeamLicense_"+i);
    const pointsRaw=val("admBulkTeamPoints_"+i);
    const pointsStatus=pointsRaw.toUpperCase()==="NP"?"NP":"";
    const points=pointsStatus?0:(Number(pointsRaw||0)||0);
    if(!teamName&&!license&&!pointsRaw)continue;
    if(!teamName||!license)return toast("Fila equipo "+(i+1)+": equipo y licencia son obligatorios.");
    payloads.push({championship_id:championshipId,event_name:eventName,event_order:eventOrder,team_name:teamName,licencia_equipo:license,points,points_label:pointsStatus||String(points)});
  }
  if(!payloads.length)return toast("Rellena al menos una fila de equipos.");
  const {error}=await supabaseClient.from("team_classification_results").insert(payloads);
  if(error)return toast(error.message);
  toast(payloads.length+" puntos de equipos guardados.");
  adminSelectedClassificationChampionshipId=championshipId;
  adminSelectedClassificationEventName=eventName;
  await adminClassifications();
}
async function adminDeleteTeamClassification(id){
  if(!confirm("Borrar estos puntos manuales de equipo?"))return;
  const {error}=await supabaseClient.from("team_classification_results").delete().eq("id",id);
  if(error)return toast(error.message);
  toast("Puntos de equipo borrados.");
  await adminClassifications();
}
async function adminDeleteClassification(id){
  if(!confirm('Borrar este resultado antiguo?'))return;
  const {error}=await supabaseClient.from('classification_results').delete().eq('id',id);
  if(error)return toast(error.message);
  toast('Resultado borrado.');
  await adminClassifications();
}
async function adminCars(){await adminLoadBase();const champOptions=adminState.championships.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');$('adminPanelBody').innerHTML=`<div class="admin-two"><div class="admin-box"><h3>🚗 Crear / modificar coche</h3><p class="empty">Cada coche debe ir ligado a una categoría del campeonato.</p><input type="hidden" id="admCarEditing"><div class="form-grid"><div class="field full"><label>Campeonato</label><select id="admCarChampionship" onchange="adminRefreshCarCategoryOptions()">${champOptions}</select></div><div class="field full"><label>Categoría</label><select id="admCarCategory"></select></div><div class="field full"><label>Nombre</label><input id="admCarName" placeholder="Skoda Fabia RS Rally2"></div><div class="field full"><label>Imagen del coche (URL)</label><input id="admCarImage" type="url" placeholder="https://... (se muestra al elegir coche en la inscripción)"></div></div><div class="form-actions"><button class="ghost-btn" onclick="adminClearCarForm()">Nuevo</button><button class="submit-btn" onclick="adminSaveCar()">Guardar coche</button></div></div><div class="admin-box"><h3>Coches por campeonato y categoría</h3><div class="admin-list">${adminState.championshipCars.map(link=>{const car=adminState.cars.find(c=>c.id===link.car_id);if(!car)return '';const champ=adminState.championships.find(ch=>ch.id===link.championship_id);const category=adminState.categories.find(cat=>cat.id===link.category_id);return `<div class="admin-list-item"><span>${car.nombre}<br><small>${champ?.nombre||'Sin campeonato'} · ${category?.nombre||'Sin categoría'} · ${car.activo?'Activo':'Desactivado'}</small></span><span><button class="ghost-btn" onclick="adminEditCar('${car.id}','${link.championship_id}','${link.category_id||''}')">Editar</button> <button class="ghost-btn" onclick="adminToggleCar('${car.id}',${!car.activo})">${car.activo?'Desactivar':'Activar'}</button> <button class="ghost-btn" onclick="adminDeleteCar('${car.id}')">Borrar</button></span></div>`}).join('')||'<div class="admin-list-item"><span>No hay coches.</span></div>'}</div></div></div>`;adminRefreshCarCategoryOptions()}
function adminRefreshCarCategoryOptions(){const championshipId=val('admCarChampionship');const allowedCategoryIds=adminState.championshipCategories.filter(x=>x.championship_id===championshipId).map(x=>x.category_id);const options=adminState.categories.filter(c=>allowedCategoryIds.includes(c.id)).map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');if($('admCarCategory'))$('admCarCategory').innerHTML=options||'<option value="">Primero añade categorías a este campeonato</option>'}
function adminEditCar(id,championshipId,categoryId){const car=adminState.cars.find(c=>c.id===id);if(!car)return;$('admCarEditing').value=id;$('admCarChampionship').value=championshipId||'';adminRefreshCarCategoryOptions();$('admCarCategory').value=categoryId||'';$('admCarName').value=car.nombre||'';$('admCarImage').value=car.imagen_url||'';toast('Editando coche. Guarda para aplicar cambios.')}
function adminClearCarForm(){$('admCarEditing').value='';$('admCarName').value='';$('admCarImage').value='';adminRefreshCarCategoryOptions()}
async function adminSaveCar(){if(!val('admCarName'))return toast('Escribe el nombre del coche.');if(!val('admCarChampionship'))return toast('Crea o selecciona un campeonato.');if(!val('admCarCategory'))return toast('Selecciona la categoría del coche.');const editing=val('admCarEditing');const image=val('admCarImage');if(image&&!/^https?:\/\/\S+$/i.test(image))return toast('La imagen debe ser una URL que empiece por https://');const carRow={nombre:val('admCarName'),activo:true};if(image||adminState.cars.some(c=>'imagen_url' in c))carRow.imagen_url=image||null;let car;if(editing){const {data,error}=await supabaseClient.from('cars').update(carRow).eq('id',editing).select('*').limit(1);if(error)return toast(/imagen_url/.test(error.message)?'Falta la columna imagen_url: ejecuta supabase-setup.sql.':error.message);car=data?.[0]}else{const {data,error}=await supabaseClient.from('cars').upsert(carRow,{onConflict:'nombre'}).select('*').limit(1);if(error)return toast(error.message);car=data?.[0]}if(car){const {error:linkError}=await supabaseClient.from('championship_cars').upsert({championship_id:val('admCarChampionship'),car_id:car.id,category_id:val('admCarCategory')},{onConflict:'championship_id,car_id'});if(linkError)return toast(linkError.message)}toast('Coche guardado.');await adminCars()}
async function adminToggleCar(id,activo){const {error}=await supabaseClient.from('cars').update({activo}).eq('id',id);if(error)return toast(error.message);await adminCars()}
async function adminDeleteCar(id){if(!confirm('¿Borrar coche?'))return;const {error}=await supabaseClient.from('cars').delete().eq('id',id);if(error)return toast(error.message);await adminCars()}

async function adminCategories(){await adminLoadBase();const champOptions=adminState.championships.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');$('adminPanelBody').innerHTML=`<div class="admin-two"><div class="admin-box"><h3>?? Crear / modificar categor?a</h3><input type="hidden" id="admCategoryEditing"><div class="form-grid"><div class="field full"><label>Campeonato</label><select id="admCategoryChampionship">${champOptions}</select></div><div class="field full"><label>Nombre</label><input id="admCategoryName" placeholder="Rally2"></div><div class="field full"><label><input id="admCategoryVisibleForPilots" type="checkbox" checked> Los pilotos pueden elegir esta categor?a al inscribirse</label><small>Si lo desmarcas, seguir? disponible para inscripci?n manual desde admin.</small></div></div><div class="form-actions"><button class="ghost-btn" onclick="adminClearCategoryForm()">Nueva</button><button class="submit-btn" onclick="adminSaveCategory()">Guardar categor?a</button></div></div><div class="admin-box"><h3>Categor?as por campeonato</h3><div class="admin-list">${adminState.categories.map(c=>{const links=adminState.championshipCategories.filter(x=>x.category_id===c.id);const linked=links.map(x=>adminState.championships.find(ch=>ch.id===x.championship_id)?.nombre).filter(Boolean).join(', ')||'Sin campeonato';const firstChamp=links[0]?.championship_id||'';const visibility=categoryIsVisibleForPilots(c)?'Visible para pilotos':'Solo admin/manual';return `<div class="admin-list-item"><span>${c.nombre}<br><small>${linked} ? ${visibility}</small></span><span><button class="ghost-btn" onclick="adminEditCategory('${c.id}','${firstChamp}')">Editar</button> <button class="ghost-btn" onclick="adminDeleteCategory('${c.id}')">Borrar</button></span></div>`}).join('')||'<div class="admin-list-item"><span>No hay categor?as.</span></div>'}</div></div></div>`}

function adminEditCategory(id,championshipId){const c=adminState.categories.find(x=>x.id===id);if(!c)return;$('admCategoryEditing').value=id;$('admCategoryName').value=c.nombre||'';$('admCategoryChampionship').value=championshipId||'';if($('admCategoryVisibleForPilots'))$('admCategoryVisibleForPilots').checked=categoryIsVisibleForPilots(c);toast('Editando categor?a. Guarda para aplicar cambios.')}
function adminClearCategoryForm(){$('admCategoryEditing').value='';$('admCategoryName').value='';if($('admCategoryVisibleForPilots'))$('admCategoryVisibleForPilots').checked=true}
async function adminSaveCategory(){if(!val('admCategoryName'))return toast('Escribe el nombre de la categor?a.');if(!val('admCategoryChampionship'))return toast('Crea o selecciona un campeonato.');const editing=val('admCategoryEditing');const visibleParaPilotos=$('admCategoryVisibleForPilots')?$('admCategoryVisibleForPilots').checked:true;let category;if(editing){const {data,error}=await supabaseClient.from('categories').update({nombre:val('admCategoryName'),visible_para_pilotos:visibleParaPilotos}).eq('id',editing).select('*').limit(1);if(error)return toast(error.message);category=data?.[0]}else{const {data,error}=await supabaseClient.from('categories').upsert({nombre:val('admCategoryName'),visible_para_pilotos:visibleParaPilotos},{onConflict:'nombre'}).select('*').limit(1);if(error)return toast(error.message);category=data?.[0]}if(category){const {error:linkError}=await supabaseClient.from('championship_categories').upsert({championship_id:val('admCategoryChampionship'),category_id:category.id});if(linkError)return toast(linkError.message)}toast('Categor?a guardada.');await adminCategories()}
async function adminDeleteCategory(id){if(!confirm('¿Borrar categoría?'))return;const {error}=await supabaseClient.from('categories').delete().eq('id',id);if(error)return toast(error.message);await adminCategories()}
async function adminFiles(){await adminLoadBase();adminState.files=await adminFetch('session_files','*','created_at',false);const sessionOptions=adminState.sessions.map(s=>`<option value="${s.id}">${s.event_id} · ${s.nombre} · ${new Date(s.fecha_hora).toLocaleString('es-ES')}</option>`).join('');$('adminPanelBody').innerHTML=`<div class="admin-two"><div class="admin-box"><h3>📦 Añadir / editar archivo programado</h3><input type="hidden" id="admFileEditing"><div class="form-grid"><div class="field full"><label>Sesión</label><select id="admFileSession">${sessionOptions}</select></div><div class="field"><label>Título</label><input id="admFileTitle" placeholder="Pack Skins"></div><div class="field"><label>Texto botón</label><input id="admFileButton" value="Descargar"></div><div class="field full"><label>Descripción</label><input id="admFileDesc" placeholder="Archivo correspondiente a esta sesión"></div><div class="field full"><label>URL</label><input id="admFileUrl" placeholder="https://drive.google.com/..."></div><div class="field"><label>Visible desde</label><input id="admFileFrom" type="datetime-local"></div><div class="field"><label>Visible hasta</label><input id="admFileUntil" type="datetime-local"></div></div><div class="form-actions"><button class="ghost-btn" onclick="adminClearFileForm()">Nuevo</button><button class="submit-btn" onclick="adminSaveFile()">Guardar archivo</button></div></div><div class="admin-box"><h3>Archivos programados</h3><div class="admin-list">${adminState.files.map(f=>{const s=adminState.sessions.find(x=>x.id===f.session_id)||{};return `<div class="admin-list-item"><span><b>${f.titulo}</b><br><small>${s.event_id||''} · ${s.nombre||f.session_id}<br>Desde: ${f.visible_from?new Date(f.visible_from).toLocaleString('es-ES'):'—'} · Hasta: ${f.visible_until?new Date(f.visible_until).toLocaleString('es-ES'):'—'}</small></span><span><button class="ghost-btn" onclick="adminEditFile('${f.id}')">Editar</button> <button class="ghost-btn" onclick="adminDeleteFile('${f.id}')">Borrar</button></span></div>`}).join('')||'<div class="admin-list-item"><span>No hay archivos.</span></div>'}</div></div></div>`}
function adminEditFile(id){const f=adminState.files.find(x=>x.id===id);if(!f)return toast('No encuentro este archivo.');$('admFileEditing').value=f.id;$('admFileSession').value=f.session_id||'';$('admFileTitle').value=f.titulo||'';$('admFileButton').value=f.boton||'Descargar';$('admFileDesc').value=f.descripcion||'';$('admFileUrl').value=f.url||'';$('admFileFrom').value=isoToMadridDateLocal(f.visible_from);$('admFileUntil').value=isoToMadridDateLocal(f.visible_until);toast('Editando archivo. Guarda para aplicar cambios.')}
function adminClearFileForm(){['admFileEditing','admFileTitle','admFileDesc','admFileUrl','admFileFrom','admFileUntil'].forEach(id=>{if($(id))$(id).value=''});if($('admFileButton'))$('admFileButton').value='Descargar'}
async function adminSaveFile(){const editing=val('admFileEditing');const payload={session_id:val('admFileSession'),titulo:val('admFileTitle'),descripcion:val('admFileDesc'),boton:val('admFileButton')||'Descargar',url:val('admFileUrl'),visible_from:madridLocalInputToIso(val('admFileFrom')),visible_until:madridLocalInputToIso(val('admFileUntil'))};if(!payload.session_id||!payload.titulo||!payload.url)return toast('Sesión, título y URL son obligatorios.');const res=editing?await supabaseClient.from('session_files').update(payload).eq('id',editing):await supabaseClient.from('session_files').insert(payload);if(res.error)return toast(res.error.message);toast(editing?'Archivo actualizado.':'Archivo programado.');await adminFiles()}
async function adminDeleteFile(id){if(!confirm('¿Borrar archivo?'))return;const {error}=await supabaseClient.from('session_files').delete().eq('id',id);if(error)return toast(error.message);await adminFiles()}
async function adminDownloadLogs(selectedEventId='',sortMode=''){
  if(!adminGuard())return;
  await adminLoadBase();
  if(selectedEventId)adminSelectedDownloadEventId=selectedEventId;
  if(sortMode)adminDownloadLogSort=sortMode;
  const current=adminSelectedDownloadEventId||adminState.events[0]?.id||'';
  adminSelectedDownloadEventId=current;
  const eventOptions=adminState.events.map(e=>`<option value="${escapeAttr(e.id)}" ${String(e.id)===String(current)?'selected':''}>${escapeAttr(e.nombre||e.id)}</option>`).join('');
  const selectedEvent=adminState.events.find(e=>String(e.id)===String(current))||{};
  $('adminPanelBody').innerHTML=`<div class="admin-box"><h3>Registro de descargas</h3><p class="empty">Selecciona una prueba y abre la tabla en ventana.</p><div class="form-grid"><div class="field"><label>Prueba</label><select id="admDownloadEvent" onchange="adminDownloadLogs(this.value)">${eventOptions}</select></div><div class="field"><label>Ordenar por</label><select id="admDownloadSort" onchange="adminDownloadLogs('',this.value)"><option value="date" ${adminDownloadLogSort==='date'?'selected':''}>Fecha y hora</option><option value="session" ${adminDownloadLogSort==='session'?'selected':''}>Sesión</option></select></div></div><button class="submit-btn registration-table-open" onclick="openDownloadLogModal()">Abrir registro de descargas</button></div>`;
  await loadDownloadLogModal(current,adminDownloadLogSort,selectedEvent.nombre||current);
}
async function loadDownloadLogModal(eventId,sortMode='date',eventName=''){
  const body=$('downloadLogModalBody');
  if(body)body.innerHTML='<p class="empty">Cargando registro...</p>';
  const {data,error}=await supabaseClient.from('file_download_logs').select('*').eq('event_id',eventId).order('downloaded_at',{ascending:false}).limit(500);
  if(error){if(body)body.innerHTML=`<p class="empty">No se pudo cargar el registro: ${escapeAttr(error.message)}</p>`;return}
  let logs=data||[];
  if(sortMode==='session')logs=logs.sort((a,b)=>String(a.session_name||a.session_id||'').localeCompare(String(b.session_name||b.session_id||''),'es')||(new Date(b.downloaded_at||0)-new Date(a.downloaded_at||0)));
  const rows=logs.map(log=>`<tr><td>${escapeAttr(log.pilot_name||'-')}</td><td>${escapeAttr(log.session_name||log.session_id||'-')}</td><td>${escapeAttr(log.file_title||'-')}</td><td>${log.downloaded_at?new Date(log.downloaded_at).toLocaleString('es-ES'):'-'}</td></tr>`).join('');
  if($('downloadLogModalSubtitle'))$('downloadLogModalSubtitle').textContent=(eventName||eventId)+' · Orden: '+(sortMode==='session'?'Sesión':'Fecha y hora');
  if(body)body.innerHTML=`<div class="admin-table-wrap"><table><thead><tr><th>Piloto</th><th>Sesión</th><th>Archivo</th><th>Fecha y hora</th></tr></thead><tbody>${rows||'<tr><td colspan="4">No hay descargas registradas para esta prueba.</td></tr>'}</tbody></table></div>`;
}
function openDownloadLogModal(){const modal=$('downloadLogModal');if(!modal)return;modal.classList.add('visible');document.body.style.overflow='hidden'}
function closeDownloadLogModal(){const modal=$('downloadLogModal');if(!modal)return;modal.classList.remove('visible');document.body.style.overflow=''}
