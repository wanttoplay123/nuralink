-- NURSELINK · Bucket de documentos y Realtime

alter table public.messages add column if not exists read_at timestamptz;

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

grant update (read_at) on public.messages to authenticated;

-- Bucket privado para documentos
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

drop policy if exists "documents_read_own" on storage.objects;
create policy "documents_read_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_platform_admin()
  )
);

drop policy if exists "documents_insert_own" on storage.objects;
create policy "documents_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "documents_delete_own" on storage.objects;
create policy "documents_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Tiempo real
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
alter table public.messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
alter table public.notifications replica identity full;
Al terminar, verifica:
select id, public from storage.buckets where id = 'documents';

select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public';