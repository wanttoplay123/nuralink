-- NURSELINK · Parche de actualización (OBSOLETO)
-- schema.sql ya incluye estos cambios. NO ejecutar después de schema.sql:
-- sobrescribe handle_new_user con una versión que fuerza role='nurse' y
-- desactiva la creación automática de instituciones en el registro.
-- Se conserva solo como referencia histórica.

alter table public.profiles add column if not exists accepted_terms_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, city, role, accepted_terms_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    'nurse',
    nullif(new.raw_user_meta_data ->> 'accepted_terms_at', '')::timestamptz
  );
  return new;
end;
$$;

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
