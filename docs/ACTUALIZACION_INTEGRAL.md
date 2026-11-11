# Actualización integral: servicios existentes

Revisión local: 10 de noviembre de 2026. Proyecto `D:\TUKNEX`, rama `codex/connected-contract-workflow`. Esta guía prepara una actualización; no acredita cambios en Netlify, Render o Neon.

## Antes de publicar

No crear servicios nuevos. Conserva `tuknex-backend` y `tuknex.netlify.app`, la base Neon y los usuarios existentes. Frontend y backend deben salir del mismo commit revisado, incluidos los archivos nuevos y migraciones.

1. Revisar `git status --short`, el diff y los resultados de `docs/EVOLUCION_INTEGRAL.md`. Ningún secreto ni carpeta `.qa-*`, `.env`, `dist`, `out` o respaldo debe formar parte del commit.
2. Coordinar una ventana de mantenimiento y detener temporalmente envíos/cambios para obtener un respaldo coherente. Conservar el commit y las configuraciones previas.
3. Comprobar el saldo de builds y detener las compilaciones de Netlify mientras se actualiza el backend. En el panel actual: Project configuration → Developer settings → Continuous deployment → Build settings → Configure → Build status. [Documentación oficial](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/).
4. En Neon, identificar la base real correcta. Consultar `SELECT id FROM schema_migrations ORDER BY id;` y comparar con `backend/migrations`. No asumir que 011 o las nuevas migraciones ya están aplicadas.
5. Respaldar la base de producción y restaurar ese respaldo en un entorno aislado autorizado. La prueba incluida en esta entrega usó únicamente datos sintéticos locales: **no es un respaldo de Neon**.

## Respaldo y actualización de base

El comando existente `npm run db:backup`, ejecutado desde `D:\TUKNEX\backend`, utiliza la conexión privada de su `.env` y guarda un dump privado bajo `.local-data/backups/`. Antes de ejecutarlo, verificar que corresponde a la base que usa Render y emplear una conexión directa compatible con pg_dump. No pegar credenciales en comandos, capturas, código ni el chat. pg_dump/pg_restore deben ser compatibles con la versión del servidor. [Referencia de Neon](https://neon.com/blog/announcing-point-in-time-restore).

La restauración debe hacerse en una base vacía de prueba, nunca con `--clean` contra producción. Revisar inventario de tablas, conteos, hashes de PDFs/comprobantes y evidencia de aceptación. Después aplicar las migraciones sobre esa copia y comprobar contratos históricos, roles, cuotas y saldos. Los scripts `test-backup-restore.mjs` y `test-migration-upgrade.mjs` ejemplifican el procedimiento con un servidor PostgreSQL 17 exclusivamente local en el puerto 55452; no cargan `.env` ni aceptan una URL productiva.

Migraciones aditivas de esta entrega:

| Archivo | Finalidad |
|---|---|
| 011_online_contract_acceptance.sql | Evidencia de aceptación contractual y PDF revisado; avance preexistente conservado |
| 012_client_associations.sql | Vínculos explícitos entre cuenta y fichas históricas |
| 013_notifications.sql | Bandeja durable de correo, reserva y reintentos |
| 014_quote_responses.sql | Versiones inmutables y respuestas a propuestas |
| 015_project_tracking.sql | Hitos, fases y revisiones de seguimiento |
| 016_payment_reports.sql | Reportes de pago y decisiones auditadas |
| 017_nexi_reports.sql | Informes generados y revisiones humanas |
| 018_contract_addenda.sql | Acuerdos complementarios y aceptación separada |
| 019_project_dossiers.sql | Expedientes inmutables, privacidad e idempotencia |

**El backend aplica las migraciones pendientes al arrancar. Publicarlo autoriza esa escritura en la base configurada. No desplegar hasta aprobar y comprobar el respaldo real.** En PostgreSQL los arranques concurrentes se serializan con un bloqueo transaccional de migraciones. No borrar filas de `schema_migrations` ni modificar archivos ya aplicados en producción.

## Render: actualizar el servicio actual

| Ajuste | Valor |
|---|---|
| Servicio | `tuknex-backend` existente |
| Runtime | Node |
| Root directory | `backend` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm run start:prod` |
| Health check | `/health` |
| Rama/commit | El commit aprobado que contenga frontend y backend compatibles |

Render permite configurar estos comandos en Settings; la disponibilidad de un pre-deploy separado depende del plan. Esta aplicación ya migra al inicio, por lo que no necesita contratar un plan para agregar otra fase. [Comandos de despliegue](https://render.com/docs/deploys), [puerto y servicio web](https://render.com/docs/web-services).

Variables base, sin secretos:

```dotenv
NODE_VERSION=24
NODE_ENV=production
BILLING_MODE=production
SEED_DEMO_DATA=false
SERVER_HOST=0.0.0.0
CORS_ORIGINS=https://tuknex.netlify.app
SESSION_SAMESITE=lax
TRUST_PROXY_HOPS=1
QUOTE_DRAFTS_ENABLED=false
CONTACT_VERIFICATION_ENABLED=false
REQUIRE_EMAIL_VERIFICATION=false
REQUIRE_PHONE_VERIFICATION=false
NOTIFICATIONS_ENABLED=false
APP_PUBLIC_URL=https://tuknex.netlify.app
```

Conservar `DATABASE_URL` privada y el puerto asignado por Render. Completar los datos reales del prestador desde Administración antes de enviar contratos: nombre, DNI/RUC, dirección y contactos. Los contratos online también requieren DNI/RUC y dirección completos del cliente. Las credenciales que aparecieron en capturas antiguas deben rotarse si todavía siguen vigentes; esta entrega no las imprime ni las rota.

IA y audio siguen opcionales. Para habilitar la integración existente: `NEXI_AI_ENABLED=true`, `NEXI_AI_PROVIDER=groq`, `NEXI_AI_MODEL=openai/gpt-oss-120b` y `GROQ_API_KEY` privada únicamente en Render. Si el dictado se habilita: `NEXI_AUDIO_ENABLED=true`, `NEXI_AUDIO_MODEL=whisper-large-v3-turbo`. Su disponibilidad y cuota reales se comprueban con una consulta propia y permiso de micrófono, no con las respuestas simuladas de QA. Si no están disponibles, mantenerlos desactivados y utilizar escritura manual.

Los avisos se guardan aun cuando `NOTIFICATIONS_ENABLED=false`. Después de autorizar una prueba con un correo administrador controlado y configurar `RESEND_API_KEY`, `EMAIL_FROM` autorizado y `APP_PUBLIC_URL`, se puede habilitar el envío. Activarlo procesa la bandeja pendiente: revisar destinatarios y solicitudes acumuladas antes de hacerlo. La aplicación exige configuración completa al activarlo. Un fallo del correo conserva la solicitud; se ve el estado y se puede reintentar desde la bandeja administrativa.

No activar verificaciones de correo/teléfono para esta actualización si todavía no se desea exigirlas. No configurar claves de IA, Resend o base de datos como variables `NEXT_PUBLIC_*`.

## Netlify: actualizar el frontend actual después del backend

| Ajuste | Valor |
|---|---|
| Proyecto | `tuknex` existente |
| Base directory | `frontend` |
| Build command | `npm run build:release` |
| Publish directory | `out` respecto a la base |
| Node | 24 |
| NPM_FLAGS | `--include=dev` |
| NEXT_PUBLIC_SITE_URL | `https://tuknex.netlify.app` |
| NEXT_PUBLIC_API_URL | `/` |
| NEXT_PUBLIC_DEMO_MODE | `false` |
| NETLIFY_NEXT_PLUGIN_SKIP | `true` |

La publicación relativa a la base está documentada por [Netlify](https://docs.netlify.com/build/frameworks/overview/). `frontend/netlify.toml` mantiene `/api/*` hacia el backend existente; no se agrega otro servidor Next.js. Conservar las variables públicas de WhatsApp, contacto y redes que correspondan al negocio.

Cuando Render esté Live con el commit aprobado, verificar `/health`, inicio de sesión y endpoints nuevos. Reactivar builds de Netlify y desplegar ese mismo commit. Activar builds por sí solo no ejecuta una compilación. Revisar el commit y la fecha del despliegue publicado; un commit en otra rama o una compilación fallida no actualizan el sitio.

## Prueba piloto posterior autorizada

Con cuentas controladas, comprobar: registro sin verificación obligatoria → cuestionario y boceto → ordenar idea con aprobación → envío explícito → aviso al administrador → asignación → propuesta y nueva revisión → respuesta del cliente → contrato y PDF exacto → aceptación → avance → reporte de pago con prueba → confirmación administrativa → saldos y expediente → entrega y opinión.

Probar además sesión vencida, reinicio frío de Render, cuota de IA agotada y correo temporalmente fuera de servicio. Las respuestas ya escritas deben conservarse y debe existir un reintento claro. Validar micrófono físico y descarga/apertura real de PDF y ZIP en un móvil y un escritorio. El piloto no se declara aprobado hasta ejecutarlo en los servicios reales.

## Recuperación

Si falla el frontend, volver al despliegue anterior de Netlify y conservar el backend compatible. Si falla la aplicación backend, revisar el log de arranque y restaurar el commit previo compatible. Las migraciones son aditivas: **no ejecutar DROP ni borrar historiales para volver atrás**. Si ya se crearon datos nuevos, no restaurar un dump antiguo sobre la base activa: se perderían operaciones posteriores. Preparar una restauración separada y conciliar los cambios con autorización, o corregir hacia delante.

Desactivar `NOTIFICATIONS_ENABLED` y las funciones de IA si el problema es externo; eso no borra documentos ni convierte reportes pendientes en pagos. Comunicar qué operaciones fueron interrumpidas y verificar idempotencia antes de repetirlas.

## Publicar el código en la rama conectada

El 10 de noviembre se verificó que los cambios siguen sin commit en `codex/connected-contract-workflow`; no tiene upstream. `main` y `origin/main` locales estaban en el mismo HEAD anterior, lo cual no comprueba el remoto actual. Un commit local no publica la web.

Con los despliegues controlados y el respaldo real preparado: revisar/stagear `backend frontend deploy docs`, crear el commit y ejecutar `git push -u origin codex/connected-contract-workflow`. Si la rama de producción conectada sigue siendo `main`, abrir y revisar una PR de esa rama de trabajo a `main`; resolver conflictos y fusionar. Render y Netlify deben publicar el SHA resultante aprobado. No cambiar la producción a otra rama para saltarse esta revisión ni usar un push forzado.
