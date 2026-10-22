-- NURSELINK V2 - Esquema inicial para Supabase
-- Ejecutar completo en un proyecto nuevo desde SQL Editor.
-- No exponer la clave service_role en la aplicación móvil.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  city text,
  role text not null default 'nurse'
    check (role in ('nurse', 'institution', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nit text,
  institution_type text,
  city text not null,
  address text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  created_by uuid not null
    constraint institutions_created_by_fkey
    references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index if not exists institutions_created_by_key
  on public.institutions (created_by);

create table if not exists public.institution_members (
  institution_id uuid not null
    constraint institution_members_institution_id_fkey
    references public.institutions(id) on delete cascade,
  user_id uuid not null
    constraint institution_members_user_id_fkey
    references public.profiles(id) on delete cascade,
  member_role text not null default 'recruiter'
    check (member_role in ('owner', 'recruiter')),
  primary key (institution_id, user_id)
);

create table if not exists public.nurse_credentials (
  user_id uuid primary key
    constraint nurse_credentials_user_id_fkey
    references public.profiles(id) on delete cascade,
  professional_type text not null
    check (professional_type in ('nurse', 'nursing_assistant')),
  education text,
  experience_years integer not null default 0
    check (experience_years >= 0),
  professional_registration text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  availability_notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null
    constraint shifts_institution_id_fkey
    references public.institutions(id),
  created_by uuid not null
    constraint shifts_created_by_fkey
    references public.profiles(id),
  title text not null,
  service text not null,
  city text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  payment_amount numeric(12, 2)
    check (payment_amount >= 0),
  payment_currency text not null default 'COP'
    check (payment_currency = 'COP'),
  fulfillment_mode text not null default 'direct'
    check (fulfillment_mode in ('direct', 'managed')),
  status text not null default 'draft'
    check (status in ('draft', 'open', 'covered', 'cancelled')),
  requirements text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null
    constraint applications_shift_id_fkey
    references public.shifts(id),
  nurse_id uuid not null
    constraint applications_nurse_id_fkey
    references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, nurse_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null
    constraint conversations_shift_id_fkey
    references public.shifts(id),
  nurse_id uuid not null
    constraint conversations_nurse_id_fkey
    references public.profiles(id),
  institution_id uuid not null
    constraint conversations_institution_id_fkey
    references public.institutions(id),
  created_at timestamptz not null default now(),
  unique (shift_id, nurse_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    constraint messages_conversation_id_fkey
    references public.conversations(id) on delete cascade,
  sender_id uuid not null
    constraint messages_sender_id_fkey
    references public.profiles(id),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists read_at timestamptz;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    constraint notifications_user_id_fkey
    references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shifts_search_idx
  on public.shifts (city, status, starts_at);
create index if not exists shifts_institution_idx
  on public.shifts (institution_id, created_at desc);
create index if not exists applications_nurse_idx
  on public.applications (nurse_id, created_at desc);
create index if not exists applications_shift_idx
  on public.applications (shift_id, status);
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.credential_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    constraint credential_documents_user_id_fkey
    references public.profiles(id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists credential_documents_user_idx
  on public.credential_documents (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares de autorización
-- ---------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

create or replace function public.is_institution_member(target_institution uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.institution_members m
    where m.institution_id = target_institution
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_view_nurse_profile(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user = (select auth.uid())
    or public.is_platform_admin()
    or exists (
      select 1
      from public.applications a
      join public.shifts s on s.id = a.shift_id
      where a.nurse_id = target_user
        and public.is_institution_member(s.institution_id)
    );
$$;

create or replace function public.can_view_nurse_credentials(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user = (select auth.uid())
    or public.is_platform_admin()
    or exists (
      select 1
      from public.applications a
      join public.shifts s on s.id = a.shift_id
      where a.nurse_id = target_user
        and public.is_institution_member(s.institution_id)
    );
$$;

create or replace function public.has_applied_to_shift(target_shift uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applications a
    where a.shift_id = target_shift
      and a.nurse_id = (select auth.uid())
      and a.status <> 'withdrawn'
  );
$$;

-- ---------------------------------------------------------------------------
-- Automatizaciones
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists accepted_terms_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_role text;
  inst_name text;
  inst_nit text;
  inst_city text;
  inst_address text;
  inst_type text;
begin
  -- La metadata de registro la controla el cliente: nunca aceptar 'admin' aquí.
  -- Los administradores se asignan con admin_set_role o desde el SQL Editor.
  user_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'nurse');
  if user_role not in ('nurse', 'institution') then
    user_role := 'nurse';
  end if;

  insert into public.profiles (id, full_name, phone, city, role, accepted_terms_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    user_role,
    nullif(new.raw_user_meta_data ->> 'accepted_terms_at', '')::timestamptz
  );

  -- Si el usuario se registró como institución, crear de forma inmediata la entidad
  if user_role = 'institution' then
    inst_name := coalesce(
      nullif(new.raw_user_meta_data ->> 'institution_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      'Institución de Salud'
    );
    inst_nit := nullif(new.raw_user_meta_data ->> 'nit', '');
    inst_city := coalesce(nullif(new.raw_user_meta_data ->> 'city', ''), 'No especificada');
    inst_address := nullif(new.raw_user_meta_data ->> 'address', '');
    inst_type := coalesce(nullif(new.raw_user_meta_data ->> 'institution_type', ''), 'Clínica / Hospital');

    insert into public.institutions (
      name,
      nit,
      institution_type,
      city,
      address,
      verification_status,
      created_by
    )
    values (
      inst_name,
      inst_nit,
      inst_type,
      inst_city,
      inst_address,
      'pending',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.add_institution_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.institution_members (institution_id, user_id, member_role)
  values (new.id, new.created_by, 'owner')
  on conflict (institution_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_institution_created on public.institutions;
create trigger on_institution_created
after insert on public.institutions
for each row execute procedure public.add_institution_owner();

create or replace function public.notify_institution_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, title, body, data)
  select
    p.id,
    'Institución pendiente',
    new.name || ' espera verificación.',
    jsonb_build_object('institution_id', new.id)
  from public.profiles p
  where p.role = 'admin';
  return new;
end;
$$;

drop trigger if exists on_institution_created_notify on public.institutions;
create trigger on_institution_created_notify
after insert on public.institutions
for each row execute procedure public.notify_institution_created();

create or replace function public.notify_new_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nurse_name text;
  v_shift_title text;
  v_institution_id uuid;
begin
  select coalesce(full_name, 'Profesional') into v_nurse_name
  from public.profiles where id = new.nurse_id;

  select title, institution_id into v_shift_title, v_institution_id
  from public.shifts where id = new.shift_id;

  insert into public.notifications (user_id, title, body, data)
  select
    m.user_id,
    'Nueva postulación',
    v_nurse_name || ' se postuló a ' || coalesce(v_shift_title, 'un turno') || '.',
    jsonb_build_object('application_id', new.id, 'shift_id', new.shift_id)
  from public.institution_members m
  where m.institution_id = v_institution_id;

  return new;
end;
$$;

drop trigger if exists on_application_created_notify on public.applications;
create trigger on_application_created_notify
after insert on public.applications
for each row execute procedure public.notify_new_application();

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations%rowtype;
  v_sender_name text;
begin
  select * into v_conversation
  from public.conversations
  where id = new.conversation_id;

  select coalesce(full_name, 'Usuario') into v_sender_name
  from public.profiles where id = new.sender_id;

  if new.sender_id = v_conversation.nurse_id then
    insert into public.notifications (user_id, title, body, data)
    select
      m.user_id,
      'Nuevo mensaje',
      v_sender_name || ': ' || left(new.body, 120),
      jsonb_build_object('conversation_id', new.conversation_id)
    from public.institution_members m
    where m.institution_id = v_conversation.institution_id;
  else
    insert into public.notifications (user_id, title, body, data)
    values (
      v_conversation.nurse_id,
      'Nuevo mensaje',
      v_sender_name || ': ' || left(new.body, 120),
      jsonb_build_object('conversation_id', new.conversation_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_message_created_notify on public.messages;
create trigger on_message_created_notify
after insert on public.messages
for each row execute procedure public.notify_new_message();

-- ---------------------------------------------------------------------------
-- RPCs de negocio
-- ---------------------------------------------------------------------------

create or replace function public.create_institution(
  p_name text,
  p_nit text default null,
  p_type text default null,
  p_city text default null,
  p_address text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_profile public.profiles%rowtype;
  v_institution public.institutions%rowtype;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select * into v_profile from public.profiles where id = v_user;
  if not found then
    raise exception 'Perfil no encontrado.';
  end if;

  if v_profile.role not in ('nurse', 'institution') then
    raise exception 'Tu cuenta no puede registrar una institución.';
  end if;

  if exists (select 1 from public.institution_members where user_id = v_user) then
    raise exception 'Ya tienes una institución asociada.';
  end if;

  if p_name is null or length(trim(p_name)) = 0
     or p_city is null or length(trim(p_city)) = 0 then
    raise exception 'El nombre y la ciudad son obligatorios.';
  end if;

  insert into public.institutions (
    name, nit, institution_type, city, address, verification_status, created_by
  )
  values (
    trim(p_name),
    nullif(trim(coalesce(p_nit, '')), ''),
    nullif(trim(coalesce(p_type, '')), ''),
    trim(p_city),
    nullif(trim(coalesce(p_address, '')), ''),
    'pending',
    v_user
  )
  returning * into v_institution;

  update public.profiles
  set role = 'institution'
  where id = v_user and role <> 'admin';

  return to_jsonb(v_institution);
exception
  when unique_violation then
    raise exception 'Ya existe una institución asociada a esta cuenta.';
end;
$$;

create or replace function public.save_my_credentials(
  p_professional_type text,
  p_education text default null,
  p_experience_years integer default 0,
  p_professional_registration text default null,
  p_availability_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_role text;
  v_credentials public.nurse_credentials%rowtype;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select role into v_role from public.profiles where id = v_user;
  if v_role is distinct from 'nurse' then
    raise exception 'Esta acción es exclusiva para profesionales de enfermería.';
  end if;

  if p_professional_type not in ('nurse', 'nursing_assistant') then
    raise exception 'El tipo de profesional no es válido.';
  end if;

  if coalesce(p_experience_years, 0) < 0 then
    raise exception 'Los años de experiencia no son válidos.';
  end if;

  insert into public.nurse_credentials (
    user_id, professional_type, education, experience_years,
    professional_registration, verification_status, availability_notes, updated_at
  )
  values (
    v_user,
    p_professional_type,
    nullif(trim(coalesce(p_education, '')), ''),
    coalesce(p_experience_years, 0),
    nullif(trim(coalesce(p_professional_registration, '')), ''),
    'pending',
    nullif(trim(coalesce(p_availability_notes, '')), ''),
    now()
  )
  on conflict (user_id) do update set
    professional_type = excluded.professional_type,
    education = excluded.education,
    experience_years = excluded.experience_years,
    professional_registration = excluded.professional_registration,
    availability_notes = excluded.availability_notes,
    verification_status = 'pending',
    updated_at = now()
  returning * into v_credentials;

  return to_jsonb(v_credentials);
end;
$$;

create or replace function public.respond_to_application(
  p_application_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_application public.applications%rowtype;
  v_shift public.shifts%rowtype;
  v_institution_name text;
  v_title text;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if p_decision not in ('reviewing', 'accepted', 'rejected') then
    raise exception 'La decisión no es válida.';
  end if;

  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Postulación no encontrada.';
  end if;

  select * into v_shift
  from public.shifts
  where id = v_application.shift_id
  for update;

  if not found then
    raise exception 'Turno no encontrado.';
  end if;

  if not (
    public.is_institution_member(v_shift.institution_id)
    or public.is_platform_admin()
  ) then
    raise exception 'No tienes permisos para revisar esta postulación.';
  end if;

  if v_application.status = 'withdrawn' then
    raise exception 'La postulación fue retirada por la profesional.';
  end if;

  if v_application.status = 'accepted' and p_decision <> 'accepted' then
    raise exception 'La postulación ya fue aceptada.';
  end if;

  if p_decision = 'accepted' then
    if v_shift.status <> 'open' then
      raise exception 'El turno ya no está abierto.';
    end if;

    update public.applications
    set status = 'accepted', updated_at = now()
    where id = v_application.id;

    update public.applications
    set status = 'rejected', updated_at = now()
    where shift_id = v_shift.id
      and id <> v_application.id
      and status in ('pending', 'reviewing');

    update public.shifts
    set status = 'covered'
    where id = v_shift.id;

    insert into public.conversations (shift_id, nurse_id, institution_id)
    values (v_shift.id, v_application.nurse_id, v_shift.institution_id)
    on conflict (shift_id, nurse_id) do nothing;

    select name into v_institution_name
    from public.institutions where id = v_shift.institution_id;

    insert into public.notifications (user_id, title, body, data)
    values (
      v_application.nurse_id,
      'Postulación aceptada',
      v_shift.title || ' · ' || coalesce(v_institution_name, 'Institución'),
      jsonb_build_object('application_id', v_application.id, 'shift_id', v_shift.id)
    );
  else
    update public.applications
    set status = p_decision, updated_at = now()
    where id = v_application.id;

    insert into public.notifications (user_id, title, body, data)
    values (
      v_application.nurse_id,
      case
        when p_decision = 'rejected' then 'Postulación no seleccionada'
        else 'Postulación en revisión'
      end,
      v_shift.title,
      jsonb_build_object('application_id', v_application.id, 'shift_id', v_shift.id)
    );
  end if;

  select * into v_application
  from public.applications where id = p_application_id;

  return to_jsonb(v_application);
end;
$$;

create or replace function public.withdraw_application(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_application public.applications%rowtype;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select * into v_application
  from public.applications
  where id = p_application_id and nurse_id = v_user
  for update;

  if not found then
    raise exception 'Postulación no encontrada.';
  end if;

  if v_application.status not in ('pending', 'reviewing') then
    raise exception 'Esta postulación ya no se puede retirar.';
  end if;

  update public.applications
  set status = 'withdrawn', updated_at = now()
  where id = v_application.id
  returning * into v_application;

  return to_jsonb(v_application);
end;
$$;

create or replace function public.admin_set_institution_verification(
  p_institution_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_institution public.institutions%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Acceso exclusivo para administración.';
  end if;

  if p_status not in ('pending', 'verified', 'rejected') then
    raise exception 'El estado no es válido.';
  end if;

  update public.institutions
  set verification_status = p_status
  where id = p_institution_id
  returning * into v_institution;

  if not found then
    raise exception 'Institución no encontrada.';
  end if;

  insert into public.notifications (user_id, title, body, data)
  values (
    v_institution.created_by,
    case when p_status = 'verified' then 'Institución verificada' else 'Verificación de institución' end,
    case
      when p_status = 'verified' then v_institution.name || ' ya puede publicar turnos.'
      else v_institution.name || ' quedó en estado ' || p_status || '.'
    end,
    jsonb_build_object('institution_id', v_institution.id)
  );
end;
$$;

create or replace function public.admin_set_credential_verification(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_credentials public.nurse_credentials%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Acceso exclusivo para administración.';
  end if;

  if p_status not in ('pending', 'verified', 'rejected') then
    raise exception 'El estado no es válido.';
  end if;

  update public.nurse_credentials
  set verification_status = p_status, updated_at = now()
  where user_id = p_user_id
  returning * into v_credentials;

  if not found then
    raise exception 'Perfil profesional no encontrado.';
  end if;

  insert into public.notifications (user_id, title, body, data)
  values (
    p_user_id,
    case when p_status = 'verified' then 'Perfil profesional verificado' else 'Verificación de perfil' end,
    case
      when p_status = 'verified' then 'Ya puedes postularte a los turnos disponibles.'
      else 'Tu verificación quedó en estado ' || p_status || '.'
    end,
    '{}'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.institution_members enable row level security;
alter table public.nurse_credentials enable row level security;
alter table public.shifts enable row level security;
alter table public.applications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles for select
to authenticated
using (public.can_view_nurse_profile(id) or public.is_platform_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "institutions_select" on public.institutions;
create policy "institutions_select"
on public.institutions for select
to authenticated
using (
  verification_status = 'verified'
  or created_by = (select auth.uid())
  or public.is_institution_member(id)
  or public.is_platform_admin()
);

drop policy if exists "institution_members_select" on public.institution_members;
create policy "institution_members_select"
on public.institution_members for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_institution_member(institution_id)
  or public.is_platform_admin()
);

drop policy if exists "credentials_select" on public.nurse_credentials;
create policy "credentials_select"
on public.nurse_credentials for select
to authenticated
using (
  public.can_view_nurse_credentials(user_id)
  or public.is_platform_admin()
);

drop policy if exists "shifts_select" on public.shifts;
create policy "shifts_select"
on public.shifts for select
to authenticated
using (
  (
    status = 'open'
    and exists (
      select 1 from public.institutions i
      where i.id = institution_id
        and i.verification_status = 'verified'
    )
  )
  or public.is_institution_member(institution_id)
  or public.has_applied_to_shift(id)
  or public.is_platform_admin()
);

drop policy if exists "shifts_insert" on public.shifts;
create policy "shifts_insert"
on public.shifts for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.is_institution_member(institution_id)
  and status in ('draft', 'open')
  and exists (
    select 1 from public.institutions i
    where i.id = institution_id
      and i.verification_status = 'verified'
  )
);

drop policy if exists "shifts_update" on public.shifts;
create policy "shifts_update"
on public.shifts for update
to authenticated
using (
  public.is_institution_member(institution_id)
  or public.is_platform_admin()
)
with check (
  public.is_institution_member(institution_id)
  or public.is_platform_admin()
);

drop policy if exists "applications_select" on public.applications;
create policy "applications_select"
on public.applications for select
to authenticated
using (
  nurse_id = (select auth.uid())
  or exists (
    select 1
    from public.shifts s
    where s.id = shift_id
      and public.is_institution_member(s.institution_id)
  )
  or public.is_platform_admin()
);

drop policy if exists "applications_insert" on public.applications;
create policy "applications_insert"
on public.applications for insert
to authenticated
with check (
  nurse_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'nurse'
  )
  and exists (
    select 1 from public.nurse_credentials c
    where c.user_id = (select auth.uid())
      and c.verification_status = 'verified'
  )
  and exists (
    select 1
    from public.shifts s
    join public.institutions i on i.id = s.institution_id
    where s.id = shift_id
      and s.status = 'open'
      and i.verification_status = 'verified'
      and s.starts_at > now()
  )
);

drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select"
on public.conversations for select
to authenticated
using (
  nurse_id = (select auth.uid())
  or public.is_institution_member(institution_id)
  or public.is_platform_admin()
);

drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (
        c.nurse_id = (select auth.uid())
        or public.is_institution_member(c.institution_id)
        or public.is_platform_admin()
      )
  )
);

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (
        c.nurse_id = (select auth.uid())
        or public.is_institution_member(c.institution_id)
      )
  )
  and length(trim(body)) > 0
);

drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read"
on public.messages for update
to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (
        c.nurse_id = (select auth.uid())
        or public.is_institution_member(c.institution_id)
      )
  )
)
with check (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (
        c.nurse_id = (select auth.uid())
        or public.is_institution_member(c.institution_id)
      )
  )
);

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select"
on public.notifications for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "notifications_update_read" on public.notifications;
create policy "notifications_update_read"
on public.notifications for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Administración de roles
-- ---------------------------------------------------------------------------

create or replace function public.admin_set_role(
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Acceso exclusivo para administración.';
  end if;

  if p_role not in ('nurse', 'institution', 'admin') then
    raise exception 'El rol no es válido.';
  end if;

  select * into v_target from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Usuario no encontrado.';
  end if;

  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'No puedes quitarte el rol de administrador a ti mismo.';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  insert into public.notifications (user_id, title, body, data)
  values (
    p_user_id,
    'Rol actualizado',
    'Tu rol en NURSELINK cambió a ' || p_role || '.',
    '{}'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilegios
-- ---------------------------------------------------------------------------

revoke all on public.profiles from anon, authenticated;
revoke all on public.institutions from anon, authenticated;
revoke all on public.institution_members from anon, authenticated;
revoke all on public.nurse_credentials from anon, authenticated;
revoke all on public.shifts from anon, authenticated;
revoke all on public.applications from anon, authenticated;
revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.notifications from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone, city) on public.profiles to authenticated;

grant select on public.institutions to authenticated;
grant select on public.institution_members to authenticated;
grant select on public.nurse_credentials to authenticated;

grant select, insert on public.shifts to authenticated;
grant update (
  title, service, city, starts_at, ends_at, payment_amount,
  payment_currency, fulfillment_mode, status, requirements
) on public.shifts to authenticated;

grant select on public.applications to authenticated;
grant insert (shift_id, nurse_id, note, status) on public.applications to authenticated;

grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_institution_member(uuid) from public;
revoke all on function public.can_view_nurse_profile(uuid) from public;
revoke all on function public.can_view_nurse_credentials(uuid) from public;
revoke all on function public.has_applied_to_shift(uuid) from public;
revoke all on function public.create_institution(text, text, text, text, text) from public;
revoke all on function public.save_my_credentials(text, text, integer, text, text) from public;
revoke all on function public.respond_to_application(uuid, text) from public;
revoke all on function public.withdraw_application(uuid) from public;
revoke all on function public.admin_set_institution_verification(uuid, text) from public;
revoke all on function public.admin_set_credential_verification(uuid, text) from public;
revoke all on function public.admin_set_role(uuid, text) from public;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_institution_member(uuid) to authenticated;
grant execute on function public.can_view_nurse_profile(uuid) to authenticated;
grant execute on function public.can_view_nurse_credentials(uuid) to authenticated;
grant execute on function public.has_applied_to_shift(uuid) to authenticated;
grant execute on function public.create_institution(text, text, text, text, text) to authenticated;
grant execute on function public.save_my_credentials(text, text, integer, text, text) to authenticated;
grant execute on function public.respond_to_application(uuid, text) to authenticated;
grant execute on function public.withdraw_application(uuid) to authenticated;
grant execute on function public.admin_set_institution_verification(uuid, text) to authenticated;
grant execute on function public.admin_set_credential_verification(uuid, text) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Conversaciones para postulaciones ya aceptadas
-- ---------------------------------------------------------------------------

insert into public.conversations (shift_id, nurse_id, institution_id)
select a.shift_id, a.nurse_id, s.institution_id
from public.applications a
join public.shifts s on s.id = a.shift_id
where a.status = 'accepted'
on conflict (shift_id, nurse_id) do nothing;

-- ---------------------------------------------------------------------------
-- Documentos de credenciales
-- ---------------------------------------------------------------------------

alter table public.credential_documents enable row level security;

drop policy if exists "credential_documents_select" on public.credential_documents;
create policy "credential_documents_select"
on public.credential_documents for select
to authenticated
using (user_id = (select auth.uid()) or public.is_platform_admin());

drop policy if exists "credential_documents_insert" on public.credential_documents;
create policy "credential_documents_insert"
on public.credential_documents for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "credential_documents_delete" on public.credential_documents;
create policy "credential_documents_delete"
on public.credential_documents for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on public.credential_documents from anon, authenticated;
grant select, insert, delete on public.credential_documents to authenticated;

