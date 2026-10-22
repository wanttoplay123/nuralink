-- SOLO PARA DESARROLLO LOCAL
-- Ejecutar desde Supabase SQL Editor. No usar en producción.
-- Estas consultas omiten RLS porque se ejecutan con permisos administrativos.

-- 1. Convertir una cuenta en administrador de NURSELINK.
-- Reemplaza el correo antes de ejecutar.
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'tu-correo@ejemplo.com'
);

-- 2. Verificar una institución concreta para probar la publicación de turnos.
update public.institutions
set verification_status = 'verified'
where name = 'Nombre de la institución';

-- 3. Verificar un perfil profesional concreto para probar postulaciones.
update public.nurse_credentials
set verification_status = 'verified', updated_at = now()
where user_id = (
  select id from auth.users where email = 'correo-profesional@ejemplo.com'
);

-- 4. Ver todas las instituciones y credenciales pendientes.
select id, name, city, verification_status
from public.institutions
order by created_at desc;

select c.user_id, p.full_name, c.verification_status
from public.nurse_credentials c
join public.profiles p on p.id = c.user_id
order by c.updated_at desc;
