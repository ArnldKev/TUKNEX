# Publicar TUKNEX en Render, Netlify y Neon

Guía revisada el **6 de noviembre de 2026**, para el código de `D:\TUKNEX`, rama `codex/quote-studio-refinement`. Usar el repositorio `ArnldKev/TUKNEX` y los servicios existentes `tuknex-backend` y `tuknex.netlify.app`.

La arquitectura ya está preparada: navegador → Netlify → `/api/*` → Render → Neon. El frontend es una exportación estática; las cuentas, cotizaciones, contratos, pagos y documentos dependen del backend y PostgreSQL.

## 1. Preparar la publicación y el respaldo

El código actual tiene muchos archivos modificados y nuevos sin commit. Publicar el commit anterior de GitHub no incluye estas mejoras. Deben entrar juntos frontend, backend, lockfiles, fuentes y migraciones. En particular, `009_team.sql` y `010_staff_quote_requests.sql` todavía estaban sin seguimiento al iniciar esta revisión.

Antes de publicar:

1. En Netlify, revisa **Usage & billing**. Si los despliegues están pausados por créditos, resuelve ese estado desde el panel. No se comprobó el saldo privado de tu cuenta en esta revisión.
2. Para asegurar el orden de publicación, pausa temporalmente las compilaciones de Netlify desde **Project configuration → Developer settings → Continuous deployment → Build settings → Stop builds**. La versión ya publicada sigue disponible. Reactívalas después de que Render esté Live con el commit nuevo.
3. Conserva el proyecto, la rama de base de datos y la cadena privada de Neon que contienen tus usuarios actuales. Una base nueva no contiene automáticamente tu administrador ni las cotizaciones.
4. Genera un respaldo privado de esa base antes del despliegue. El siguiente comando usa el `DATABASE_URL` local; debe corresponder a la misma base de Render:

```powershell
cd D:\TUKNEX\backend
npm run db:backup
```

El respaldo queda en `backend/.local-data/backups/`, ignorado por Git. Si la conexión local y la de Render son distintas, respalda la base correcta desde Neon o con su conexión privada antes de continuar. No copies credenciales a capturas o al chat. Si las credenciales que aparecieron en capturas antiguas no se renovaron, reemplázalas en sus proveedores y en Render antes de abrir al público.

Referencia: [detener o activar builds en Netlify](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/).

## 2. Configurar Render

Abre el servicio existente **tuknex-backend → Settings → Build & Deploy**. Mantén el servicio y su URL actuales.

| Campo | Valor |
| --- | --- |
| Repository | `ArnldKev/TUKNEX` |
| Branch | `main` |
| Language / Runtime | `Node` |
| Root Directory | `backend` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/health` |

El comando de compilación incluye herramientas de TypeScript. El inicio fuerza el modo de producción y usa el puerto asignado por Render. Las migraciones pendientes se aplican al arrancar; con el mismo Neon, las ya registradas no vuelven a ejecutarse. Esta revisión no aplicó migraciones reales ni desplegó servicios.

En **Environment → Environment Variables**, configura estos valores literales:

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
```

**DATABASE_URL:** conserva la cadena privada real de tu Neon. No pegues una frase de ejemplo en su valor ni cambies a otra base para este despliegue. Mantén SSL como exige la cadena generada por Neon. **PORT:** utiliza el suministrado por Render.

El origen CORS debe coincidir exactamente con el dominio público: HTTPS, sin barra final, rutas ni asterisco. Si después agregas un dominio propio, actualiza CORS, la URL pública del frontend y vuelve a compilar. Con el proxy `/api`, la cookie se mantiene en el dominio público y `lax` es apropiado.

`TRUST_PROXY_HOPS=1` es una configuración conservadora para el proxy inmediato. No se verificó la cadena real de IP de Netlify/Render; con un salto adicional, los límites por conexión pueden agrupar visitantes detrás del proxy. No lo cambies a 2: el validador actual solo permite 0 o 1.

Referencias: [servicios web y puertos de Render](https://render.com/docs/web-services), [subdirectorios en Render](https://render.com/docs/monorepo-support).

## 3. Activar IA y audio en Render

Para publicar con las funciones generativas y el dictado que ya existen, añade:

```dotenv
NEXI_AI_ENABLED=true
NEXI_AI_PROVIDER=groq
NEXI_AI_MODEL=openai/gpt-oss-120b
NEXI_AUDIO_ENABLED=true
NEXI_AUDIO_MODEL=whisper-large-v3-turbo
```

**GROQ_API_KEY:** coloca únicamente en Render tu clave privada vigente de Groq. No añadas esta clave a Netlify ni a variables `NEXT_PUBLIC_*`. Si aún no hay clave válida, utiliza `NEXI_AI_ENABLED=false` y `NEXI_AUDIO_ENABLED=false`: el cuestionario y la escritura siguen disponibles. Audio activado requiere IA activada.

Esta revisión confirmó que ambos modelos figuran en la documentación de Groq; no llamó al proveedor ni comprobó tus credenciales o cuotas privadas. El plan gratuito está sujeto a sus límites. Configurar una variable no contrata automáticamente un plan de pago.

Referencia: [modelos de Groq](https://console.groq.com/docs/models).

## 4. Verificación de contacto y correo

Los tres valores de verificación en false permiten registrar clientes y guardar propuestas sin confirmar correo o teléfono, como solicitaste. Los datos no se marcan como verificados.

La recuperación de contraseña por correo sí necesita un **RESEND_API_KEY** válido, un **EMAIL_FROM** autorizado y **VERIFICATION_SECRET** privado de al menos 32 caracteres. No se exige un proveedor de correo para compilar con las verificaciones apagadas, pero eso tampoco demuestra que la recuperación entregue mensajes. El remitente de prueba de Resend tiene restricciones; para correos a todos tus clientes debes configurar un remitente/dominio autorizado y comprobar una entrega propia.

Si `VERIFICATION_SECRET` está definido y no vacío, debe tener al menos 32 caracteres incluso con verificación apagada. Mantén el secreto vigente; no lo cambies en cada reinicio. Twilio no es necesario mientras la verificación de teléfono permanezca desactivada.

Los avisos por correo a todos los administradores al recibir solicitudes siguen siendo una función pendiente. Activar Resend no implementa esos avisos por sí solo.

## 5. Configurar Netlify

Abre **tuknex → Project configuration → Developer settings → Build settings → Configure**. Algunas versiones del panel agrupan esta sección bajo **Continuous deployment**.

| Campo | Valor |
| --- | --- |
| Production branch | `main` |
| Base directory | `frontend` |
| Build command | `npm run build:release` |
| Publish directory | `out` |
| Package directory | Puede quedar vacío con esta base |

`out` es relativo a la base `frontend`: el directorio generado en el repositorio es `frontend/out`. El archivo `frontend/netlify.toml` ya contiene el comando, el directorio de publicación y el proxy. No escribas `frontend/frontend/out`.

En **Project configuration → Environment variables**, establece para Production/Builds:

```dotenv
NODE_VERSION=24
NPM_FLAGS=--include=dev
NETLIFY_NEXT_PLUGIN_SKIP=true
NEXT_PUBLIC_SITE_URL=https://tuknex.netlify.app
NEXT_PUBLIC_API_URL=/
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_WHATSAPP=51934631664
```

Usa tu número de atención vigente si cambió. También puedes definir `NEXT_PUBLIC_CONTACT_EMAIL` y enlaces sociales con valores reales. No necesitas `NEXT_PUBLIC_BILLING_API_URL`: el código prioriza `NEXT_PUBLIC_API_URL`.

El valor de `NEXT_PUBLIC_API_URL` es **solo `/`**. El código agrega `/api/...` y Netlify reenvía esas peticiones a `https://tuknex-backend.onrender.com/api/...`. No se requiere un servidor Next ni funciones Netlify para esta exportación. Mantén la URL de Render en el TOML si conservas el servicio actual.

Las variables públicas se incorporan al compilar. Cambiarlas sin un nuevo build no actualiza el JavaScript ya publicado. `NPM_FLAGS` asegura la instalación de las herramientas necesarias de compilación y lint.

Referencias: [directorios en monorepos Netlify](https://docs.netlify.com/build/configure-builds/monorepos/), [dependencias de builds](https://docs.netlify.com/build/configure-builds/manage-dependencies/), [proxy de API](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

## 6. Subir todos los cambios a GitHub

La rama local revisada es `codex/quote-studio-refinement`. Con Netlify temporalmente pausado y ambos servicios configurados para `main`, ejecuta en PowerShell solamente los comandos del bloque:

```powershell
cd D:\TUKNEX
git status
git add -- backend frontend deploy docs DESIGN.md UX-CONTRACT.md .dockerignore .gitignore
git diff --cached --stat
git commit -m "Preparar lanzamiento completo de TUKNEX"
git fetch origin
git switch main
git pull --ff-only origin main
git merge codex/quote-studio-refinement
git push origin main
git log -1 --oneline
```

El listado preparado para commit debe incluir los nuevos módulos de equipo, las migraciones 009/010, los estilos, las fuentes y ambos lockfiles. Los archivos `.env`, `.local-data`, `.qa-*`, `node_modules`, `out`, `dist` y respaldos están ignorados. Si aparecen conflictos o un error de Git, resuélvelo antes del push; no utilices `--force` como solución.

Estos comandos son instrucciones: esta revisión no hizo commit, merge, push ni publicación.

## 7. Publicar primero el backend y después el frontend

1. En Render espera el despliegue automático del commit nuevo. Si está configurado para despliegue manual, usa **Manual Deploy → Deploy latest commit**. Comprueba que el commit coincide con el de `git log`.
2. Espera **Deploy succeeded / Live**. Abre `https://tuknex-backend.onrender.com/health`: debe devolver HTTP 200 y `{"status":"ok"}`. `/health` consulta la base; la ruta es directa de Render, porque el proxy del frontend solo reenvía `/api/*`.
3. En Netlify reactiva **Activate builds** y espera una sola compilación del commit nuevo. Si no se inicia, usa **Deploys → Trigger deploy**. Comprueba el mismo commit. Si hace falta eliminar una caché antigua, selecciona la variante **Clear cache and deploy** en ese único despliegue.
4. Espera **Published**. Abre la web en una ventana privada o haz una recarga completa para comprobar los recursos nuevos.

Render Free se suspende después de inactividad y puede tardar aproximadamente un minuto en despertar. Netlify documenta un máximo de 26 segundos para su proxy; una llamada en frío o audio lento puede agotarlo. Prueba en frío y en caliente antes de usarlo con clientes. Los proveedores describen Free como entorno de prueba; para disponibilidad continua conviene evaluar una instancia que permanezca activa.

Referencias: [límites de Render Free](https://render.com/docs/free), [límites del proxy Netlify](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

## 8. Comprobar la publicación antes de compartir el enlace

Comprueba con una cuenta propia de prueba, sin registrar cobros ficticios como pagos reales:

- Inicio y bienvenida → cotizador; respuestas conservadas entre pasos y actualización del boceto.
- Registro e inicio de sesión de cliente; recargar conserva la sesión y permite consultar su propuesta.
- Administrador → **Mis cotizaciones** → guardar → **Asignar cliente**; listado y búsqueda por nombre/DNI/correo; el cliente puede consultar la propuesta asignada.
- Subadministrador: solo sus proyectos; crear/consultar cotizaciones permitidas. Las cotizaciones propias siguen separadas de las solicitudes de clientes y de los documentos formales.
- Descargar el PDF y comprobar nombre, contenido, colores y boceto del caso de prueba.
- Consultar `/api/quote-ai/config` y `/api/quote-ai/audio/dictation-config` desde el dominio Netlify: `enabled: true` si los activaste. Hacer una consulta sintética y un dictado con micrófono real; verificar permiso, números, negaciones y alternativa escrita.
- Abrir y recargar directamente `/admin/mis-cotizaciones`, `/equipo/mis-cotizaciones` y `/mi-cuenta/cotizaciones`.
- Verificar datos del emisor y condiciones en **Configuración** antes del primer documento comercial. Las variables `ISSUER_*` solo inicializan una base nueva; no reemplazan la configuración ya guardada.
- Si habilitas recuperación por correo, comprobar recepción, código y cambio de contraseña con tu cuenta propia.

Una cuenta, sesión o cotización real solo se prueba desde su propietario autorizado. No se hicieron estas operaciones sobre tus datos en esta revisión. La configuración de claves, el saldo de los proveedores y la recepción de correo necesitan comprobación en sus paneles/entorno publicado.

## Resultado de la revisión del 6 de noviembre de 2026

- Backend: compilación TypeScript e integración aprobadas, **961 comprobaciones y 21 pruebas Node**. Se usaron bases temporales/proveedores simulados y un preloader que bloquea .env privado y red externa en esas pruebas.
- Frontend: **153 pruebas de modo real y 13 de demostración**, comprobaciones SSR de cotizador/estilos y lint aprobados. Build de publicación correcto: **42/42**. Conserva el aviso informativo previo sobre el plugin ESLint de Next; no impidió compilar.
- La exportación contiene 38 HTML y 88 referencias internas únicas comprobadas, sin faltantes. Ambas rutas nuevas de cotizaciones propias están presentes y los bundles no incluyen `http://127.0.0.1:4000`.
- Auditoría de dependencias: backend 0 y frontend 0 vulnerabilidades conocidas al cierre. Se corrigió la dependencia de desarrollo minimatch 10.2.6 mediante una sustitución acotada bajo typescript-estree por 11.0.1, conservando versiones directas. [Aviso de seguridad](https://github.com/advisories/GHSA-g3hv-75wg-m249). Esto no certifica ausencia de otros fallos en la aplicación.
- Consultas públicas: la API a través de Netlify respondió HTTP 200, modo production; la configuración de IA y dictado indicó enabled true. El primer intento agotó una espera de 16 segundos; el reintento respondió. No se ejecutaron consultas reales al modelo, grabaciones, login ni operaciones sobre datos de clientes.
- La ruta pública nueva /admin/mis-cotizaciones todavía respondió 404 en la versión publicada. El trabajo revisado sigue pendiente de commit/push/despliegue.
- Las pruebas locales usaron Node 20.19.3. Render/Netlify deben ejecutar su propia compilación con Node24; no se simuló Linux/Render ni se certificó disponibilidad continua. Tampoco se repitieron las mediciones anteriores de rendimiento móvil. La latencia en frío, el micrófono físico y los recorridos autenticados deben revisarse tras publicar.
- No se iniciaron servicios locales ni se publicaron cambios, no se modificó Neon y no se cambiaron secretos. El archivo next-env.d.ts se restauró al estado inicial de esta revisión.

Evidencia privada local de la revisión: `.qa-deploy-2026-11/summary.json`, `backend-full-tests.log`, `frontend-tests.log`, `frontend-lint.log`, `frontend-build.log`, `frontend-audit-final.json`, `backend-audit.json`, `static-export-check.json` y `public-check.json`. Estos archivos de QA están ignorados por Git y no forman parte del despliegue.
