# TUKNEX: preparación del lanzamiento

El proyecto existente sigue en `D:\TUKNEX\frontend` y `D:\TUKNEX\backend`. No se ha publicado ni contratado ningún servicio. El envío real de correo/SMS requiere configurar proveedores y comprobar la recepción con contactos propios antes de abrir el registro al público.

## Qué funciona

- Un visitante completa el cotizador sin cuenta. «Guardar cotización» abre el acceso dentro de la misma pantalla; iniciar sesión o registrarse conserva sus respuestas y guarda la propuesta en su cuenta. Cerrar el acceso vuelve a la propuesta. No se almacena el texto de la propuesta en localStorage.
- El registro pide nombre, correo, móvil, DNI de 8 dígitos, contraseña de 12 caracteres o más y consentimiento. El móvil peruano de 9 dígitos se normaliza a +51. El DNI es declarado: no hay consulta a RENIEC ni comprobación de identidad oficial.
- Cada contacto tiene su propio estado. Correo usa Resend; SMS usa Twilio Verify. Sin proveedor se muestra «no habilitado», nunca «verificado». La verificación está desactivada por defecto. Para activarla se requiere CONTACT_VERIFICATION_ENABLED=true; los requisitos de correo y SMS se configuran por separado. Sin verificación se permite registrar y guardar propuestas sin marcar los contactos como confirmados.
- Códigos de correo y recuperación: 10 minutos, 5 intentos, un solo uso, hash HMAC con secreto privado. Reenvíos: al menos 60 segundos y máximo 10 solicitudes por cuenta/canal/día. SMS usa aprobación del proveedor y el destino guardado en la cuenta. Cambiar el móvil revoca su verificación.
- Recuperación por código de correo. Al cambiar la contraseña se revocan todas las sesiones de esa cuenta. El endpoint no publica si un correo está registrado.
- Contacto guarda mensajes en PostgreSQL, disponibles en `/admin/mensajes`. Cambiar el seguimiento no envía una respuesta por correo.
- Se conservan cotizaciones, PDFs, contratos, cuotas, pagos, portafolio y NEXI. El control de roles y de propiedad se comprueba en el backend.

## Pendientes externos antes de publicar

1. Elegir dominio y servidor/hosting con PostgreSQL persistente. Los archivos de este directorio proponen un único servidor Docker con HTTPS y API bajo el mismo dominio. Puedes adaptar la configuración a otro proveedor.
2. Configurar el dominio remitente en Resend, completar sus registros DNS y guardar RESEND_API_KEY y EMAIL_FROM únicamente en backend. Probar recepción, spam y recuperación con una cuenta propia.
3. Para SMS, crear un servicio Twilio Verify de **6 dígitos**, habilitar los destinos que atenderás, configurar sus controles de fraude/presupuesto y colocar las tres credenciales privadas. Probar recepción en Perú antes de activar REQUIRE_PHONE_VERIFICATION=true. La cobertura y los costes dependen del proveedor.
4. Revisar los datos del prestador y las condiciones de servicio en Configuración antes de emitir documentos reales. La página `/privacidad` describe el comportamiento implementado; revisa que corresponda a tu operación, tus plazos de conservación y tus canales de atención.
5. Crear una copia de la base y ensayar su restauración en una base separada. Configurar copias externas con una periodicidad acorde a los datos recibidos y supervisar errores/espacio disponible.

## Versiones y pruebas

Los contenedores usan Node 24 LTS y PostgreSQL 17. El entorno local anterior usa Node 20; no cambies instalaciones globales durante una sesión de trabajo. Para producción usa una versión LTS con soporte. Referencia: https://nodejs.org/en/about/previous-releases .

```powershell
cd D:\TUKNEX\backend
npm ci
npm test
npm run test:postgres
npm run db:backup

cd D:\TUKNEX\frontend
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

`test:postgres` crea y elimina esquemas aislados, sin insertar pruebas en las tablas reales. Los tests de correo y SMS sustituyen el transporte: no prueban entrega real ni generan mensajes facturables. `build` permite revisar localmente; para publicar usa `build:release`, que exige URLs públicas HTTPS y demo desactivado.

## Despliegue propuesto con Docker Compose

Docker no está instalado en el entorno de esta revisión: estos contenedores deben construirse y probarse en un servidor de preparación antes de usarlos en producción. No se ha comprobado aquí la obtención de certificados ni la entrega de mensajes.

Desde `D:\TUKNEX\deploy`, copia `.env.example` a `.env` y completa sus valores privados. Genera **tres secretos diferentes** (POSTGRES_PASSWORD, TUKNEX_DB_PASSWORD y VERIFICATION_SECRET):

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Usa hexadecimal para las contraseñas de esta plantilla para que sean válidas dentro de DATABASE_URL. No pegues los valores en el chat, no subas `.env` al repositorio ni lo incluyas en un ZIP público.

El dominio debe apuntar al servidor; éste debe permitir 80/443. La API y PostgreSQL no publican puertos al exterior. Caddy gestiona HTTPS y sirve `frontend/out`; la API escucha únicamente dentro de la red del despliegue. Una sola instancia de backend es el alcance de esta plantilla: los límites de peticiones HTTP son por proceso. Antes de usar varias réplicas se requiere un almacén compartido para esos límites y un proceso coordinado de migraciones.

```powershell
docker compose --env-file .env config --quiet
docker compose --env-file .env build
docker compose --env-file .env up -d
docker compose ps
```

La base se inicia vacía con un usuario de aplicación sin superusuario. Los administradores se crean mediante el comando privado documentado en `../backend/ADMINISTRADORES.md`; el registro web siempre crea clientes. No hay rutas HTTP para crear administradores. **No se trasladan automáticamente los datos locales**. Si necesitas conservar tus cuentas/cotizaciones actuales, planifica la restauración del backup antes de abrir el registro; no restaures encima de una base activa con datos nuevos.

Las migraciones se aplican al arrancar la API. Mantén el volumen de PostgreSQL entre despliegues. **No uses `docker compose down -v`** si quieres conservar los datos. No borres ni muevas la antigua `.local-data/billing`.

## Alternativa: servicios separados

Frontend: `npm run build:release`, publicar `out` con soporte para rutas `.html`. Configura NEXT_PUBLIC_SITE_URL con el dominio real y NEXT_PUBLIC_API_URL con `/` si usas un proxy en el mismo dominio, o el origen HTTPS de tu API. Nunca pongas claves privadas en NEXT_PUBLIC_*.

Backend: Node 24, PostgreSQL, `npm ci`, `npm run build`, `npm run start:prod`. Configura BILLING_MODE=production, DATABASE_URL y CORS_ORIGINS con orígenes HTTPS exactos. Los proveedores de contacto solo se exigen al activar sus verificaciones. `start:prod` fuerza NODE_ENV=production y falla si falta configuración. SERVER_HOST y TRUST_PROXY_HOPS dependen del alojamiento; el valor 1 de la plantilla sólo corresponde a un proxy confiable delante de la API. No uses cookies Secure sobre HTTP para probar localmente: conserva `npm run dev` y NODE_ENV=development en tu equipo.

Si frontend y API están en sitios distintos, revisa cookies, CORS y políticas del navegador en ese alojamiento. La plantilla de un solo dominio evita esa dependencia.

## Comprobación de aceptación antes de abrir al público

- Visitar una ruta directa y recargarla; cargar imágenes, NEXI y los recursos estáticos sin errores de CSP.
- Cotizar como invitado, abrir registro/login desde Guardar, cerrar y reabrir el acceso sin perder la propuesta.
- Crear una cuenta real propia, recibir y confirmar correo; si se exige SMS, confirmar también el móvil. Probar código equivocado, vencido y reenvío.
- Guardar, recargar y consultar la propuesta y su PDF. Revisarla en el administrador y comprobar el cliente registrado.
- Confirmar que otro cliente no accede a documentos ajenos; cerrar sesión y comprobar que no hay datos privados cacheados.
- Probar recuperación de contraseña con recepción real y rechazo de la contraseña anterior.
- Enviar contacto y comprobar su aparición en la bandeja del administrador.
- Emitir sólo documentos de preparación claramente identificados mientras se valida el flujo de contratos y pagos; no registrar pagos reales ficticios en producción.

## Alcance pendiente

Las reseñas públicas siguen sin testimonios inventados; los ejemplos del prototipo se ocultan en modo real. Los módulos CRM sin persistencia siguen deshabilitados. NEXI conserva su guía local y no se presenta como IA generativa conectada. Esta revisión no conecta pasarelas de pago, validación oficial del DNI, ni realiza un despliegue público.

Referencias de integración: https://resend.com/docs/api-reference/emails/send-email · https://www.twilio.com/docs/verify/api/verification · https://www.twilio.com/docs/verify/api/verification-check · https://caddyserver.com/docs/caddyfile/directives/reverse_proxy .

## Política actual de contacto y pagos

Consulta CONTACTO_Y_PAGOS.md antes de activar proveedores. El registro y guardado funcionan sin verificaciones. La frecuencia preferida no fija condiciones financieras; estas se configuran en el panel administrador tras conversar con el cliente.
