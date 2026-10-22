# NURSELINK

Aplicación móvil para conectar instituciones de salud con profesionales de
enfermería que pueden cubrir turnos.

**Stack:** Expo SDK 58 · React Native · TypeScript · Expo Router · Supabase
(Auth + PostgreSQL + RLS).

## Funciones incluidas

- Registro e inicio de sesión con Supabase Auth.
- Perfil personal editable.
- Perfil profesional con formación, experiencia y registro profesional.
- Registro de institución con estado de verificación.
- Catálogo de turnos abiertos de instituciones verificadas.
- Postulaciones con nota y seguimiento de estado.
- Panel institucional para publicar turnos y revisar candidatos.
- Aceptación atómica de una postulación: el turno queda cubierto y las demás
  postulaciones se rechazan.
- Panel administrativo para verificar instituciones, credenciales, revisar
  documentos adjuntos y gestionar roles de usuario.
- Chat entre institución y profesional después de aceptar una postulación, con
  actualización en tiempo real.
- Notificaciones dentro de la aplicación en tiempo real, incluyendo mensajes.
- Recuperación de contraseña por correo.
- Términos y consentimiento obligatorio al registrarse.
- Subida de documentos (cédula, título, registro y documentos institucionales)
  para verificación, con vista previa para el dueño y el administrador.

## 1. Instalar dependencias

Requisitos: Node.js 20 o superior y Expo Go en el celular Android.

```bash
cd NURSELINK
npm install
```

Antes de iniciar la app, configura Supabase siguiendo la sección 2. Después:

```bash
npx expo start
```

Escanea el QR con Expo Go.

## 2. Conectar Supabase

### Crear el proyecto

1. Crea un proyecto en [supabase.com/dashboard](https://supabase.com/dashboard).
2. Abre **SQL Editor → New query**.
3. Copia y ejecuta todo el contenido de `supabase/schema.sql`.
4. Copia y ejecuta `supabase/supabase_features.sql` (bucket de documentos y
   tiempo real).
5. En **Project Settings → API**, copia la URL del proyecto y la clave pública
   (`anon` o `publishable`).

Si el proyecto ya tenía una versión anterior del esquema, vuelve a ejecutar
`schema.sql` y `supabase_features.sql`. Son idempotentes, actualizan
funciones/triggers y no borran los datos existentes.

### Variables de entorno

Copia `.env.example` a `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

No uses la clave `service_role` en la aplicación. Reinicia el servidor después
de cambiar variables:

```bash
npx expo start --clear
```

### Autenticación

En **Authentication → Providers → Email** puedes dejar activada o desactivada la
confirmación por correo. Si está activa, el usuario debe confirmar el correo
antes de iniciar sesión.

Las cuentas nuevas se crean con rol `nurse` o `institution` mediante un trigger
de PostgreSQL. El cliente no puede autoasignarse el rol `admin`; ese rol solo se
concede con `admin_set_role` o desde el SQL Editor.

### Primer administrador

1. Registra una cuenta normal en la app.
2. Ejecuta en SQL Editor la primera consulta de `supabase/dev_helpers.sql`,
   reemplazando el correo.
3. Cierra sesión y vuelve a entrar: aparecerá la pestaña **Admin**.

### Probar el flujo completo

1. **Profesional:** crea una cuenta, completa el perfil profesional y envíalo a
   verificación.
2. **Administración:** verifica las credenciales desde la pestaña Admin.
3. **Institución:** crea una cuenta eligiendo **Clínica / Institución** y
   completa los datos de la entidad.
4. **Administración:** verifica la institución.
5. **Institución:** publica un turno desde el panel institucional.
6. **Profesional:** abre el turno y envía una postulación.
7. **Institución:** revisa candidatos y acepta una postulación.
8. **Ambos:** abran **Mensajes** para coordinar el turno y comprobar que los
   mensajes se conservan al recargar la app o volver a iniciar sesión.

## 3. Estructura del proyecto

```text
src/
  app/                 Rutas de Expo Router
    (tabs)/            Inicio, turnos, postulaciones, mensajes, institución, admin, perfil
    shift/[id].tsx     Detalle y postulación a un turno
    chat/[id].tsx      Conversación entre institución y profesional
    sign-in.tsx        Acceso, registro y recuperación de contraseña
  components/ui.tsx    Componentes visuales compartidos
  context/app.tsx      Sesión, perfil y API activa
  lib/                 Supabase, formato, errores y tema
  services/            API real de Supabase
supabase/
  schema.sql           Tablas, RLS, triggers y RPCs
  dev_helpers.sql      Ayudas solo para desarrollo
```

## 4. Seguridad implementada

- RLS activo en todas las tablas.
- Los perfiles solo pueden modificar nombre, teléfono y ciudad.
- El rol `admin` no se puede asignar desde el registro público.
- Las credenciales se envían a revisión mediante una función segura y vuelven a
  estado `pending` al modificarse.
- Las instituciones se crean mediante una RPC y quedan en estado `pending`.
- Un profesional solo puede postularse si está verificado, el turno está abierto,
  la institución está verificada y el turno es futuro.
- La aceptación de una postulación es transaccional y evita dobles
  asignaciones.
- Las instituciones solo ven postulaciones de sus propios turnos.
- La conversación se crea al aceptar la postulación; solo la profesional
  asignada, los miembros de la institución y administración pueden leerla.
- Los mensajes tienen límite de 4000 caracteres y no se pueden editar ni borrar
  desde el cliente.
- Los documentos se guardan en un bucket privado de Storage y solo el dueño y
  administración pueden leerlos.
- Los administradores se asignan y gestionan roles con una función segura
  (`admin_set_role`), nunca con permisos directos del cliente.

## 5. Pendientes antes de producción

- Notificaciones push fuera de la app (requieren build de desarrollo/EAS y un
  dispositivo físico; las notificaciones en-app ya son en tiempo real).
- Verificación de correo obligatoria y plantillas de correo personalizadas.
- Revisión legal de los términos y de las responsabilidades de NURSELINK en cada
  modalidad de cobertura.
- Pruebas de concurrencia y auditoría de las transiciones de estado.

## 6. Comandos útiles

```bash
npx tsc --noEmit     # Verificar TypeScript
npx expo lint        # Revisar el código
npx expo-doctor      # Diagnosticar configuración y dependencias
npx expo start       # Iniciar Expo
npx expo start --clear
```

Nota: `npm audit` puede reportar avisos en herramientas de compilación de Expo y
Metro. No ejecutes `npm audit fix --force`: intentaría degradar Expo y React
Native a versiones incompatibles. Actualiza con `npx expo install --fix` y las
versiones oficiales del SDK.
