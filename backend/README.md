# TUKNEX backend

Requiere Node.js 20.19 o superior y PostgreSQL (tu equipo usa PostgreSQL 17).

## Primera configuración local

```powershell
npm ci
npm run setup
```

Abre el enlace local que aparece en la terminal. Introduce la contraseña de PostgreSQL y los datos de tu primer administrador. El asistente crea **tuknex**, un usuario PostgreSQL propio sin permisos de superusuario y la configuración privada en **.env**. La contraseña del usuario postgres no se guarda. Si ya existe una base tuknex ajena al asistente, no la sobrescribe.

```powershell
npm run dev
```

Reinicia también el frontend si ya estaba abierto. Accede a `http://127.0.0.1:3000/acceder` con tu cuenta. Los clientes se registran en `/registro`; las cuentas administradoras se crean exclusivamente con el comando privado del backend. No hay accesos demo por defecto. Usa el mismo host (127.0.0.1 o localhost) para frontend y API.

El registro público crea únicamente clientes. No existe creación de administradores por HTTP ni selector de roles. Consulta [ADMINISTRADORES.md](ADMINISTRADORES.md) para crear el primero o los siguientes desde una terminal privada. El asistente local de PostgreSQL conserva la creación privada de la primera cuenta en una base nueva.

## Verificación

```powershell
npm run build
npm test
npm run test:postgres
npm run start:prod
```

`npm test` usa bases PGlite temporales. `test:postgres` usa la conexión .env y un esquema temporal aislado que se elimina al terminar; no escribe registros de prueba en tus tablas reales. Health: `GET http://127.0.0.1:4000/health`. Las migraciones se aplican al arrancar; también puedes usar `npm run db:migrate`.

## Datos y seguridad

Usuarios y sesiones persisten en PostgreSQL; las contraseñas usan scrypt con sal y sólo se guardan los hashes de los tokens de sesión. La sesión del navegador usa cookie HttpOnly (8 horas). El servidor comprueba roles, origen y propiedad de documentos. Un cliente no puede consultar registros de otra cuenta. Los borradores de documentos permanecen privados.

El backend conserva lógica, migraciones y recursos PDF propios. La única comunicación con frontend es HTTP. La antigua base PGlite `.local-data/billing` queda conservada, sin trasladar sus datos ficticios a PostgreSQL. No borres esa carpeta si quieres conservarla.

La recuperación por código de correo y las verificaciones están integradas, pero requieren configurar los proveedores para enviar mensajes. Los contactos se guardan en /admin/mensajes. Los módulos CRM sin persistencia permanecen deshabilitados y no se simulan envíos. Completa los datos legales del prestador desde Configuración antes de emitir contratos.

Para desplegar, configura NODE_ENV=production, BILLING_MODE=production, DATABASE_URL, CORS_ORIGINS explícitos y SERVER_HOST apropiado; usa HTTPS. Cookie Secure se activa en producción. Si frontend y API están en sitios diferentes, configura SESSION_SAMESITE=none y usa HTTPS. No publiques .env ni credenciales. Para PostgreSQL respalda con pg_dump; la copia de carpetas sólo corresponde a PGlite con el backend detenido.

## Solicitudes del cotizador

La migración 004 agrega solicitudes_cotizacion con respuestas, estimación calculada en servidor y PDF persistido. Se aplica al reiniciar el backend. Los clientes usan GET/POST /api/account/quote-requests y GET /api/account/quote-requests/:id/pdf. El administrador usa GET /api/billing/quote-requests y PATCH /api/billing/quote-requests/:id para el seguimiento (pending, reviewing, quoted, closed). El servidor toma la propiedad de la sesión y limita los documentos al titular o administrador. La clave de idempotencia por cliente evita duplicar reintentos. Los PDFs guardados conservan su contenido cuando cambian las tarifas. Estas solicitudes son preliminares; no emiten automáticamente contratos ni obligaciones de pago.

La migración 005 añade datos de contacto y DNI declarado, estados de verificación, desafíos de un solo uso y mensajes de contacto. Guía de despliegue y límites: ../deploy/PRODUCCION.md. npm run db:backup genera una copia privada de PostgreSQL; no incluye la configuración .env.
