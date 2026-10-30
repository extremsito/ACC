-- =====================================================================
-- ACC Community · tablas nuevas (Noticias, Safety Rating, licencias y equipos)
-- Ejecutar UNA vez en Supabase > SQL Editor. Se puede volver a ejecutar
-- sin problema (es idempotente).
--
-- Asume que un administrador es un perfil con profiles.role = 'admin',
-- que es lo que ya usa la web para mostrar el panel de administración.
-- =====================================================================

-- Comprobación de administrador (security definer para no recursar en las políticas de profiles)
create or replace function public.is_acc_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- NOTICIAS
-- ---------------------------------------------------------------------
create table if not exists public.news (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text default 'Noticias',
  summary     text,
  body        text,
  image_url   text,
  author      text,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.news enable row level security;

drop policy if exists "news_read" on public.news;
create policy "news_read" on public.news
  for select using (published = true or public.is_acc_admin());

drop policy if exists "news_admin_write" on public.news;
create policy "news_admin_write" on public.news
  for all using (public.is_acc_admin()) with check (public.is_acc_admin());

-- ---------------------------------------------------------------------
-- SAFETY RATING · ajustes manuales (sanciones / premios) de administración
-- El SR base se calcula en la web a partir de los resultados.
-- ---------------------------------------------------------------------
create table if not exists public.safety_adjustments (
  id          uuid primary key default gen_random_uuid(),
  pilot_id    uuid not null references public.profiles(id) on delete cascade,
  delta       numeric(4,2) not null check (delta between -5 and 5 and delta <> 0),
  reason      text not null,
  event_name  text,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

create index if not exists safety_adjustments_pilot_idx on public.safety_adjustments (pilot_id);

alter table public.safety_adjustments enable row level security;

-- Lectura pública: el ranking y el detalle de cada piloto necesitan verlos.
drop policy if exists "safety_read" on public.safety_adjustments;
create policy "safety_read" on public.safety_adjustments
  for select using (true);

drop policy if exists "safety_admin_write" on public.safety_adjustments;
create policy "safety_admin_write" on public.safety_adjustments
  for all using (public.is_acc_admin()) with check (public.is_acc_admin());

-- =====================================================================
-- OCTUBRE 2026 · Licencias automáticas, equipos creados desde la web,
-- solicitudes al team manager, fotos de piloto y datos públicos.
-- Igual que arriba: idempotente, se puede ejecutar varias veces.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Columnas nuevas
-- ---------------------------------------------------------------------
alter table public.profiles         add column if not exists avatar_url text;
alter table public.teams            add column if not exists license text;
alter table public.teams            add column if not exists social_links jsonb;
alter table public.teams            add column if not exists created_by uuid;
alter table public.license_requests add column if not exists assigned_license text;
alter table public.license_requests add column if not exists email_sent_at timestamptz;
alter table public.license_requests add column if not exists email_error text;
-- Foto del coche que se muestra al elegirlo en la inscripción
alter table public.cars             add column if not exists imagen_url text;

-- ---------------------------------------------------------------------
-- Datos públicos de pilotos (sin email ni Steam ID): contador de la
-- portada, nombres en resultados y fotos, también sin iniciar sesión.
-- ---------------------------------------------------------------------
create or replace function public.public_pilot_count()
returns integer language sql security definer stable set search_path = public as $$
  select count(*)::int from public.profiles;
$$;

create or replace function public.public_pilots()
returns table (id uuid, nombre text, apellido text, equipo text, avatar_url text)
language sql security definer stable set search_path = public as $$
  select p.id::uuid, p.nombre::text, p.apellido::text, p.equipo::text, p.avatar_url::text from public.profiles p;
$$;

grant execute on function public.public_pilot_count() to anon, authenticated;
grant execute on function public.public_pilots()      to anon, authenticated;

-- ---------------------------------------------------------------------
-- Protección de perfiles: el piloto edita sus datos, pero el rol, la
-- licencia de piloto y la entrada a un equipo solo cambian a través de
-- las funciones de abajo (o por un administrador). Salir del equipo sí.
-- ---------------------------------------------------------------------
create or replace function public.acc_profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_acc_admin() or coalesce(current_setting('acc.trusted', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'pilot';
    new.licencia_piloto := '';
    return new;
  end if;
  if coalesce(new.role::text, 'pilot') <> coalesce(old.role::text, 'pilot') then
    raise exception 'No puedes cambiar tu rol.';
  end if;
  if coalesce(new.licencia_piloto, '') <> coalesce(old.licencia_piloto, '') then
    raise exception 'La licencia de piloto se asigna automáticamente desde la sección Licencias.';
  end if;
  if coalesce(new.equipo, '') <> coalesce(old.equipo, '') and coalesce(new.equipo, '') <> '' then
    raise exception 'Para entrar en un equipo envía una solicitud a su team manager.';
  end if;
  return new;
end;
$$;

drop trigger if exists acc_profiles_guard on public.profiles;
create trigger acc_profiles_guard before insert or update on public.profiles
  for each row execute function public.acc_profiles_guard();

-- ---------------------------------------------------------------------
-- Numeración de licencias: PIL26_0306, EQ26_0030... (año + correlativo)
-- ---------------------------------------------------------------------
create or replace function public.acc_next_license(p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_yy   text := to_char(now() at time zone 'Europe/Madrid', 'YY');
  v_re   text := '^' || p_prefix || v_yy || '_([0-9]+)$';
  v_max  int  := 0;
  v_part int;
begin
  perform pg_advisory_xact_lock(hashtext('acc_license_' || p_prefix));
  if p_prefix = 'PIL' then
    select coalesce(max(substring(upper(btrim(licencia_piloto)) from v_re)::int), 0) into v_part from public.profiles;
    v_max := greatest(v_max, v_part);
    select coalesce(max(substring(upper(btrim(licencia_piloto)) from v_re)::int), 0) into v_part from public.classification_results;
    v_max := greatest(v_max, v_part);
  else
    select coalesce(max(substring(upper(btrim(licencia_equipo)) from v_re)::int), 0) into v_part from public.profiles;
    v_max := greatest(v_max, v_part);
    select coalesce(max(substring(upper(btrim(license)) from v_re)::int), 0) into v_part from public.teams;
    v_max := greatest(v_max, v_part);
    select coalesce(max(substring(upper(btrim(licencia_equipo)) from v_re)::int), 0) into v_part from public.team_classification_results;
    v_max := greatest(v_max, v_part);
  end if;
  select coalesce(max(substring(upper(btrim(assigned_license)) from v_re)::int), 0) into v_part from public.license_requests;
  v_max := greatest(v_max, v_part);
  return p_prefix || v_yy || '_' || lpad((v_max + 1)::text, 4, '0');
end;
$$;

-- Quita a un piloto de la lista de miembros de todos los equipos (menos uno).
create or replace function public.acc_remove_member_everywhere(p_uid uuid, p_keep_team bigint)
returns void language sql security definer set search_path = public as $$
  update public.teams t
     set members = coalesce((select jsonb_agg(m) from jsonb_array_elements(t.members) m
                             where coalesce(m->>'pilot_id', '') <> p_uid::text), '[]'::jsonb)
   where jsonb_typeof(t.members) = 'array'
     and t.members @> jsonb_build_array(jsonb_build_object('pilot_id', p_uid::text))
     and (p_keep_team is null or t.id::bigint <> p_keep_team);
$$;

create or replace function public.acc_is_team_director(p_team_id bigint)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.teams t
                 where t.id::bigint = p_team_id and t.director->>'pilot_id' = auth.uid()::text);
$$;

revoke execute on function public.acc_next_license(text) from public, anon, authenticated;
revoke execute on function public.acc_remove_member_everywhere(uuid, bigint) from public, anon, authenticated;
grant execute on function public.acc_is_team_director(bigint) to authenticated;

-- ---------------------------------------------------------------------
-- Solicitudes para entrar en un equipo (las decide el team manager)
-- ---------------------------------------------------------------------
create table if not exists public.team_join_requests (
  id            uuid primary key default gen_random_uuid(),
  team_id       bigint not null,
  team_name     text,
  pilot_id      uuid not null references public.profiles(id) on delete cascade,
  pilot_name    text,
  message       text,
  status        text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  responded_by  uuid
);
create unique index if not exists team_join_requests_one_pending
  on public.team_join_requests (team_id, pilot_id) where status = 'pending';
create index if not exists team_join_requests_team_idx on public.team_join_requests (team_id);

alter table public.team_join_requests enable row level security;
drop policy if exists "team_requests_read" on public.team_join_requests;
create policy "team_requests_read" on public.team_join_requests
  for select using (pilot_id = auth.uid() or public.is_acc_admin() or public.acc_is_team_director(team_id));
-- Escrituras solo a través de las funciones de abajo.

-- ---------------------------------------------------------------------
-- Licencia de piloto automática
-- ---------------------------------------------------------------------
create or replace function public.request_pilot_license(p_discord text, p_steam_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  p       public.profiles%rowtype;
  v_lic   text;
  v_req   text;
  v_email text;
begin
  if v_uid is null then raise exception 'Inicia sesión para pedir tu licencia.'; end if;
  select * into p from public.profiles where id = v_uid;
  if not found then raise exception 'Tu perfil de piloto no existe. Contacta con administración.'; end if;
  if coalesce(btrim(p.licencia_piloto), '') <> '' then
    return jsonb_build_object('license', p.licencia_piloto, 'already', true);
  end if;
  if coalesce(btrim(p_discord), '') = '' then raise exception 'Indica tu usuario de Discord.'; end if;
  if coalesce(p_steam_id, '') !~ '^[0-9]{17}$' then raise exception 'El Steam ID debe tener 17 dígitos.'; end if;

  v_lic   := public.acc_next_license('PIL');
  v_email := coalesce(nullif(btrim(p.email), ''), (select u.email from auth.users u where u.id = v_uid));

  perform set_config('acc.trusted', 'on', true);
  update public.profiles set licencia_piloto = v_lic, steam_id = p_steam_id where id = v_uid;
  perform set_config('acc.trusted', 'off', true);

  insert into public.license_requests (type, status, user_id, name, last_name, email, steam_id, discord,
                                       team_name, manager_name, members, notes, assigned_license)
  values ('pilot', 'asignada', v_uid, coalesce(p.nombre, ''), coalesce(p.apellido, ''), coalesce(v_email, ''),
          p_steam_id, left(btrim(p_discord), 80), '', '', '', 'Licencia de piloto asignada automáticamente', v_lic)
  returning id::text into v_req;

  return jsonb_build_object('license', v_lic, 'already', false, 'request_id', v_req, 'email', v_email);
end;
$$;

-- ---------------------------------------------------------------------
-- Crear equipo desde la web (quien lo crea queda como director/team
-- manager y recibe la licencia de equipo)
-- ---------------------------------------------------------------------
create or replace function public.create_team(p_name text, p_logo text, p_sede text, p_creacion text,
                                              p_social jsonb, p_director_avatar text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  p        public.profiles%rowtype;
  v_name   text := btrim(coalesce(p_name, ''));
  v_logo   text := nullif(btrim(coalesce(p_logo, '')), '');
  v_avatar text := nullif(btrim(coalesce(p_director_avatar, '')), '');
  v_links  jsonb := '[]'::jsonb;
  v_item   jsonb;
  v_id     bigint;
  v_lic    text;
  v_full   text;
  v_req    text;
  v_email  text;
begin
  if v_uid is null then raise exception 'Inicia sesión para crear un equipo.'; end if;
  select * into p from public.profiles where id = v_uid;
  if not found then raise exception 'Tu perfil de piloto no existe. Contacta con administración.'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 60 then
    raise exception 'El nombre del equipo debe tener entre 3 y 60 caracteres.';
  end if;
  if v_logo is not null and v_logo !~* '^https?://[^[:space:]<>"'']+$' then
    raise exception 'El logo debe ser una imagen subida o una URL https.';
  end if;
  if v_avatar is not null and v_avatar !~* '^https?://[^[:space:]<>"'']+$' then
    raise exception 'La foto del director debe ser una imagen subida o una URL https.';
  end if;

  perform pg_advisory_xact_lock(hashtext('acc_create_team'));
  if exists (select 1 from public.teams t where lower(btrim(t.name)) = lower(v_name)) then
    raise exception 'Ya existe un equipo con ese nombre.';
  end if;
  if exists (select 1 from public.teams t where t.director->>'pilot_id' = v_uid::text) then
    raise exception 'Ya diriges un equipo: solo puedes crear uno.';
  end if;

  if jsonb_typeof(p_social) = 'array' then
    for v_item in select value from jsonb_array_elements(p_social) limit 8 loop
      if coalesce(v_item->>'url', '') ~* '^https?://[^[:space:]<>"'']+$'
         and coalesce(v_item->>'label', '') ~ '^[A-Za-z0-9 /]{1,20}$' then
        v_links := v_links || jsonb_build_array(jsonb_build_object('label', v_item->>'label', 'url', v_item->>'url'));
      end if;
    end loop;
  end if;

  v_full  := btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, ''));
  v_email := coalesce(nullif(btrim(p.email), ''), (select u.email from auth.users u where u.id = v_uid));
  select coalesce(max(t.id::bigint), 0) + 1 into v_id from public.teams t;
  v_lic := public.acc_next_license('EQ');

  perform public.acc_remove_member_everywhere(v_uid, null);
  insert into public.teams (id, name, logo, sede, creacion, palmares, director, members, social, social_links, license, created_by)
  values (v_id, v_name, coalesce(v_logo, ''), left(btrim(coalesce(p_sede, '')), 120), left(btrim(coalesce(p_creacion, '')), 60),
          '["N/A"]',
          jsonb_build_object('name', v_full, 'avatar', v_avatar, 'pilot_id', v_uid::text),
          jsonb_build_array(jsonb_build_object('name', v_full, 'avatar', coalesce(v_avatar, p.avatar_url), 'pilot_id', v_uid::text)),
          'N/A', v_links, v_lic, v_uid);

  perform set_config('acc.trusted', 'on', true);
  update public.profiles set equipo = v_name, licencia_equipo = v_lic, avatar_url = coalesce(avatar_url, v_avatar) where id = v_uid;
  perform set_config('acc.trusted', 'off', true);

  update public.team_join_requests set status = 'cancelled', responded_at = now()
   where pilot_id = v_uid and status = 'pending';

  insert into public.license_requests (type, status, user_id, name, last_name, email, steam_id, discord,
                                       team_name, manager_name, members, notes, assigned_license)
  values ('team', 'asignada', v_uid, coalesce(p.nombre, ''), coalesce(p.apellido, ''), coalesce(v_email, ''),
          coalesce(p.steam_id, ''), '', v_name, v_full, '', 'Equipo creado desde la web', v_lic)
  returning id::text into v_req;

  return jsonb_build_object('team_id', v_id, 'license', v_lic, 'request_id', v_req, 'email', v_email, 'team_name', v_name);
end;
$$;

-- Licencia para un equipo ya existente cuyo team manager está vinculado.
create or replace function public.assign_my_team_license()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  t       record;
  p       public.profiles%rowtype;
  v_lic   text;
  v_req   text;
  v_email text;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  select * into t from public.teams where director->>'pilot_id' = v_uid::text order by id limit 1;
  if not found then raise exception 'No eres team manager de ningún equipo.'; end if;
  if coalesce(btrim(t.license), '') <> '' then
    return jsonb_build_object('license', t.license, 'already', true, 'team_name', t.name);
  end if;
  select * into p from public.profiles where id = v_uid;
  v_lic   := public.acc_next_license('EQ');
  v_email := coalesce(nullif(btrim(p.email), ''), (select u.email from auth.users u where u.id = v_uid));
  update public.teams set license = v_lic where id = t.id;
  update public.profiles set licencia_equipo = v_lic where lower(btrim(equipo)) = lower(btrim(t.name));
  insert into public.license_requests (type, status, user_id, name, last_name, email, steam_id, discord,
                                       team_name, manager_name, members, notes, assigned_license)
  values ('team', 'asignada', v_uid, coalesce(p.nombre, ''), coalesce(p.apellido, ''), coalesce(v_email, ''),
          coalesce(p.steam_id, ''), '', t.name, btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), '',
          'Licencia de equipo asignada automáticamente', v_lic)
  returning id::text into v_req;
  return jsonb_build_object('license', v_lic, 'already', false, 'request_id', v_req, 'email', v_email, 'team_name', t.name);
end;
$$;

-- ---------------------------------------------------------------------
-- Solicitudes de equipo: pedir, cancelar, responder (team manager o
-- admin) y salir del equipo
-- ---------------------------------------------------------------------
create or replace function public.request_team_join(p_team_id bigint, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  p     public.profiles%rowtype;
  t     record;
  v_id  uuid;
begin
  if v_uid is null then raise exception 'Inicia sesión para unirte a un equipo.'; end if;
  select * into p from public.profiles where id = v_uid;
  if not found then raise exception 'Tu perfil de piloto no existe. Contacta con administración.'; end if;
  select * into t from public.teams where id::bigint = p_team_id;
  if not found then raise exception 'Ese equipo no existe.'; end if;
  if lower(btrim(coalesce(p.equipo, ''))) = lower(btrim(t.name)) then raise exception 'Ya perteneces a este equipo.'; end if;
  if exists (select 1 from public.team_join_requests where team_id = p_team_id and pilot_id = v_uid and status = 'pending') then
    raise exception 'Ya tienes una solicitud pendiente para este equipo.';
  end if;
  insert into public.team_join_requests (team_id, team_name, pilot_id, pilot_name, message)
  values (p_team_id, t.name, v_uid, btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), left(btrim(coalesce(p_message, '')), 300))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cancel_team_join(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.team_join_requests set status = 'cancelled', responded_at = now()
   where id = p_request_id and pilot_id = auth.uid() and status = 'pending';
  if not found then raise exception 'No hay ninguna solicitud pendiente que cancelar.'; end if;
end;
$$;

create or replace function public.respond_team_join(p_request_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  r     public.team_join_requests%rowtype;
  t     record;
  p     public.profiles%rowtype;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  select * into r from public.team_join_requests where id = p_request_id for update;
  if not found or r.status <> 'pending' then raise exception 'Esta solicitud ya no está pendiente.'; end if;
  select * into t from public.teams where id::bigint = r.team_id;
  if not found then raise exception 'El equipo ya no existe.'; end if;
  if not (public.is_acc_admin() or t.director->>'pilot_id' = v_uid::text) then
    raise exception 'Solo el team manager del equipo puede responder a esta solicitud.';
  end if;

  if p_accept then
    select * into p from public.profiles where id = r.pilot_id;
    perform set_config('acc.trusted', 'on', true);
    update public.profiles set equipo = t.name, licencia_equipo = coalesce(t.license, '') where id = r.pilot_id;
    perform set_config('acc.trusted', 'off', true);
    perform public.acc_remove_member_everywhere(r.pilot_id, r.team_id);
    update public.teams
       set members = case when jsonb_typeof(members) = 'array' then members else '[]'::jsonb end
                     || jsonb_build_array(jsonb_build_object('name', btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')),
                                                             'avatar', p.avatar_url, 'pilot_id', r.pilot_id::text))
     where id::bigint = r.team_id
       and not (coalesce(members, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('pilot_id', r.pilot_id::text)));
    update public.team_join_requests set status = 'cancelled', responded_at = now()
     where pilot_id = r.pilot_id and status = 'pending' and id <> r.id;
  end if;

  update public.team_join_requests
     set status = case when p_accept then 'accepted' else 'rejected' end, responded_at = now(), responded_by = v_uid
   where id = r.id;
  return jsonb_build_object('status', case when p_accept then 'accepted' else 'rejected' end, 'team_name', t.name);
end;
$$;

create or replace function public.leave_my_team()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_dir text;
begin
  if v_uid is null then raise exception 'Inicia sesión.'; end if;
  select name into v_dir from public.teams where director->>'pilot_id' = v_uid::text limit 1;
  if v_dir is not null then
    raise exception 'Eres el team manager de %. Pide a administración que pase el equipo a otro piloto antes de salir.', v_dir;
  end if;
  perform set_config('acc.trusted', 'on', true);
  update public.profiles set equipo = '', licencia_equipo = '' where id = v_uid;
  perform set_config('acc.trusted', 'off', true);
  perform public.acc_remove_member_everywhere(v_uid, null);
end;
$$;

revoke execute on function public.request_pilot_license(text, text)                from public, anon;
revoke execute on function public.create_team(text, text, text, text, jsonb, text) from public, anon;
revoke execute on function public.assign_my_team_license()                         from public, anon;
revoke execute on function public.request_team_join(bigint, text)                  from public, anon;
revoke execute on function public.cancel_team_join(uuid)                           from public, anon;
revoke execute on function public.respond_team_join(uuid, boolean)                 from public, anon;
revoke execute on function public.leave_my_team()                                  from public, anon;
grant execute on function public.request_pilot_license(text, text)                to authenticated;
grant execute on function public.create_team(text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.assign_my_team_license()                         to authenticated;
grant execute on function public.request_team_join(bigint, text)                  to authenticated;
grant execute on function public.cancel_team_join(uuid)                           to authenticated;
grant execute on function public.respond_team_join(uuid, boolean)                 to authenticated;
grant execute on function public.leave_my_team()                                  to authenticated;

-- ---------------------------------------------------------------------
-- Imágenes subidas desde la web (foto de perfil, logo y foto del
-- director). Cada piloto solo escribe en su carpeta: acc-media/<su id>/
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('acc-media', 'acc-media', true, 3145728, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "acc_media_insert" on storage.objects;
create policy "acc_media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'acc-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "acc_media_update" on storage.objects;
create policy "acc_media_update" on storage.objects for update to authenticated
  using (bucket_id = 'acc-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "acc_media_delete" on storage.objects;
create policy "acc_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'acc-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- OCTUBRE 2026 (2) · Virtual Rally Championship
-- Subida de skins, código del tablón, requisito de Safety Rating,
-- temporada de cada prueba y logo/calendario de cada campeonato.
-- Idempotente: se puede ejecutar varias veces.
-- =====================================================================
alter table public.events        add column if not exists skins_url       text;
alter table public.events        add column if not exists codigo_tablon   text;
alter table public.events        add column if not exists licencia_minima text;
alter table public.events        add column if not exists sr_minimo       numeric(4,2);
alter table public.events        add column if not exists temporada       integer;
alter table public.championships add column if not exists logo_url        text;
alter table public.championships add column if not exists calendario_url  text;
alter table public.championships add column if not exists temporada       integer;

-- Las pruebas que ya existen toman la temporada del año de su primera sesión
-- (o, si no tienen sesiones, del cierre/apertura de inscripciones).
update public.events e
   set temporada = coalesce(
         (select extract(year from min(nullif(s.fecha_hora::text, '')::timestamptz))::int from public.sessions s where s.event_id = e.id),
         extract(year from nullif(coalesce(e.inscripcion_cierre::text, e.inscripcion_apertura::text), '')::timestamptz)::int)
 where e.temporada is null;

-- ---------------------------------------------------------------------
-- Fecha de la prueba para el calendario (mientras no tenga sesiones)
-- ---------------------------------------------------------------------
alter table public.events add column if not exists fecha_prueba date;

-- ---------------------------------------------------------------------
-- CCRT 2027 · Campeonato de Canarias de Rallys de Tierra
-- Calendario provisional. El logo y el cartel salen solos de la web
-- (imgs/ccrt-logo.png e imgs/ccrt-calendario-2027.jpg). Las sesiones y
-- las fechas de inscripción se añaden después desde el panel admin.
-- No pisa nada si ya existe (on conflict do nothing).
-- ---------------------------------------------------------------------
insert into public.championships (id, nombre, mostrar_clasificaciones, temporada)
values ('ccrt-2027', 'CCRT 2027', true, 2027)
on conflict (id) do nothing;

insert into public.events (id, nombre, subtitulo, descripcion, estado, championship_id, orden_clasificacion, requiere_copiloto, fecha_prueba, temporada)
values
  ('ccrt27-la-oliva',       'Rally La Oliva',                        'Rally de tierra · Fuerteventura', '15, 16 y 17 de enero de 2027',    'Próximamente', 'ccrt-2027', 1, true, '2027-01-15', 2027),
  ('ccrt27-isla-verde',     'Rally Tierra Isla Verde',               'Rally de tierra · La Palma',      '29, 30 y 31 de enero de 2027',    'Próximamente', 'ccrt-2027', 2, true, '2027-01-29', 2027),
  ('ccrt27-teide',          'Rally del Teide',                       'Rally de tierra · Tenerife',      '12, 13 y 14 de febrero de 2027',  'Próximamente', 'ccrt-2027', 3, true, '2027-02-12', 2027),
  ('ccrt27-gran-canaria',   'Rally Tierra de Gran Canaria',          'Rally de tierra · Gran Canaria',  '26, 27 y 28 de febrero de 2027',  'Próximamente', 'ccrt-2027', 4, true, '2027-02-26', 2027),
  ('ccrt27-isla-volcanes',  'Rally Tierra Isla de los Volcanes',     'Rally de tierra · Lanzarote',     '12, 13 y 14 de marzo de 2027',    'Próximamente', 'ccrt-2027', 5, true, '2027-03-12', 2027)
on conflict (id) do nothing;
