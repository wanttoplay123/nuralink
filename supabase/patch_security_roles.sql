-- NURSELINK · Parche de seguridad
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
      name, nit, institution_type, city, address, verification_status, created_by
    )
    values (
      inst_name, inst_nit, inst_type, inst_city, inst_address, 'pending', new.id
    );
  end if;

  return new;
end;
$$;

-- Verificación: revisa que los administradores existentes sean los esperados.
select id, full_name, created_at
from public.profiles
where role = 'admin';-- NURSELINK · Parche de seguridad
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
      name, nit, institution_type, city, address, verification_status, created_by
    )
    values (
      inst_name, inst_nit, inst_type, inst_city, inst_address, 'pending', new.id
    );
  end if;

  return new;
end;
$$;

-- Verificación: revisa que los administradores existentes sean los esperados.
select id, full_name, created_at
from public.profiles
where role = 'admin';