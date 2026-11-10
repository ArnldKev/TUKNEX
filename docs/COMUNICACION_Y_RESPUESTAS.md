# Comunicación y respuestas de cotización

Implementación local de la fase 2, 10 de noviembre de 2026. No se aplicaron migraciones en Neon ni se enviaron correos reales durante esta implementación.

## Avisos persistentes

La migración `013_notifications.sql` añade una bandeja de salida. Guardar una solicitud del cliente y preparar el aviso ocurre en la misma transacción SQL. El correo se procesa después; una caída de Resend no revierte la solicitud. Los borradores del navegador y las cotizaciones creadas por el equipo no generan estos avisos de nueva solicitud.

Eventos incluidos:

- Envío explícito del cuestionario por el cliente: avisa al administrador activo.
- Envío explícito de orientación/contacto: avisa al administrador activo. El formulario actual no recoge un nombre de proyecto separado; se identifica como «Consulta de orientación».
- Respuesta comercial a una propuesta: avisa al administrador y, cuando corresponde, al responsable actual del proyecto.

Cada aviso conserva evento, identificador, nombre del proyecto, fecha, destinatario y ruta privada. No incorpora respuestas del cuestionario, DNI, contraseña ni el texto completo de orientación. La ruta no concede acceso: siguen aplicándose la sesión, el rol y la asignación del proyecto.

La combinación evento/destinatario es única. Los reenvíos del cuestionario usan su clave de idempotencia; los contactos idénticos se agrupan durante diez minutos, sin agrupar contactos distintos por un nombre parecido. El worker reclama avisos con una reserva de 45 segundos, usa una clave de idempotencia estable para Resend y aplica espera exponencial. Realiza hasta cinco intentos automáticos; conserva los fallos con un código neutro. Un destinatario desactivado o que ya no tenga el proyecto asignado se cancela antes del envío. Un administrador puede solicitar un nuevo ciclo de intentos.

La persistencia evita perder avisos entre reinicios. No equivale a un compromiso de entrega inmediata: una instancia gratuita detenida de Render no ejecuta el worker hasta que despierte. Un resultado incierto de red puede requerir comprobar la entrega antes de un reintento manual tardío; no se afirma entrega exactamente una vez fuera de la ventana de idempotencia del proveedor.

Configuración privada en Render, pendiente de habilitación y prueba autorizada:

| Variable | Uso |
| --- | --- |
| `NOTIFICATIONS_ENABLED=false` | Valor seguro por defecto; conserva avisos sin enviarlos. |
| `APP_PUBLIC_URL=https://tuknex.netlify.app` | Origen del frontend con las pantallas administrativas. No es la dirección del backend. |
| `RESEND_API_KEY` | Clave privada ya utilizada por el proveedor existente. |
| `EMAIL_FROM` | Remitente autorizado en Resend. |

Solo después de autorizar una prueba con un destinatario controlado se configura `NOTIFICATIONS_ENABLED=true`. No poner estas credenciales en variables `NEXT_PUBLIC_`. El panel muestra si el envío está desactivado o si la configuración está incompleta.

API exclusiva del administrador:

- `GET /api/billing/notifications`: devuelve configuración habilitada/disponible y hasta 200 avisos recientes, sin credenciales.
- `POST /api/billing/notifications/:id/retry`, cuerpo `{}`: prepara otro ciclo. Un aviso enviado, cancelado o con reserva vigente no se reintenta.

## Versiones y decisiones comerciales

La migración `014_quote_responses.sql` conserva una instantánea completa e inmutable de cada versión formal: cliente, emisor, alcance, condiciones, plan, importes y estado. Al instalarla solo se recupera la versión actualmente existente de cada cotización, marcada como registro previo; no se reconstruyen versiones históricas que nunca se guardaron.

Editar una cotización editable crea otra versión y conserva la anterior. El editor envía `expectedVersion`; si otro usuario ya la cambió, se rechaza la edición con 409. El campo es una protección del transporte, no se guarda dentro de la cotización. Las cotizaciones aceptadas/rechazadas conservan la regla existente de no sobrescritura: debe prepararse otra propuesta.

El cliente puede responder una vez por versión enviada, vigente y de su cuenta o de una ficha asociada explícitamente a su cuenta:

| Decisión | Resultado |
| --- | --- |
| `request_changes` | Conserva la propuesta como enviada, registra los comentarios y espera una revisión del equipo. |
| `decline` | Conserva la versión respondida y registra otra versión con estado rechazado. |
| `confirm_proposal` | Conserva la versión respondida y registra otra versión con estado aceptado de la propuesta. Permite preparar el contrato por el flujo existente. |

Confirmar una propuesta **no firma el contrato, no crea un contrato y no registra pagos**. La aceptación contractual posterior mantiene su revisión de PDF y consentimiento independientes.

La respuesta conserva autor, nombre al responder, fecha, comentarios, decisión e instantánea canónica del servidor. El cliente no envía importes confiables. Una versión sustituida o vencida no admite una decisión nueva. Repetir la misma operación con la misma clave devuelve el mismo resultado; reutilizar la clave con otra decisión se rechaza. Las restricciones únicas protegen también frente al doble clic. Una respuesta a una revisión anterior sigue visible después de editar la propuesta.

API del cliente autenticado:

- `GET /api/account/quotes/:id/responses`.
- `POST /api/account/quotes/:id/responses` con `{version, decision, comment, idempotencyKey}`. La clave es un UUID. Para solicitar cambios, el comentario tiene al menos cinco caracteres; máximo general: 2.000.
- `GET /api/account/quotes/:id/versions/:version/pdf`.

API de consulta administrativa:

- `GET /api/billing/quote-responses/:id`.
- `GET /api/billing/quote-responses/:id/versions/:version/pdf`.

API del equipo con asignación vigente:

- `GET /api/team/projects/:pid/quote-responses/:id`.
- `GET /api/team/projects/:pid/quote-responses/:id/versions/:version/pdf`.

El PDF de una revisión se representa a partir de los datos guardados de esa versión; no utiliza el precio o alcance nuevo. Esta descarga no altera la cotización. No se presenta como una copia binaria de un PDF antiguo que no se hubiese almacenado: el flujo contractual conserva por separado sus documentos y hashes revisados.

## Integración de interfaz

- `QuoteResponsePanel({quote, onChanged?})`, en `components/billing/quote-responses.tsx`: detalle de una cotización formal del cliente. `onChanged` actualiza los recursos del portal. Ya está integrado en el detalle del portal del cliente.
- `QuoteResponseHistory({quoteId, version?, teamProjectId?})`: historial de decisiones y descarga de revisiones; omitir `teamProjectId` en administración y pasarlo desde el proyecto del subadministrador. `version` permite recargar cuando se edita la propuesta.
- `NotificationInbox()`, en `components/billing/notification-inbox.tsx`: bandeja administrativa con búsqueda, estados y reintento.
- Registrar `NotificationsModule` y `QuoteResponsesModule` en `AppModule`. No hace falta una dependencia de npm nueva.

Enlaces privados preparados por la bandeja: `/admin/solicitudes?solicitud=:id`, `/admin/cotizaciones?cotizacion=:id`, `/admin/mensajes?mensaje=:id` y `/equipo?proyecto=:id`. Las pantallas correspondientes deben resolver estos parámetros, abrir el detalle autorizado y conservar un mensaje claro si el registro ya no está accesible. La integración de estos enlaces y las comprobaciones visuales de las pantallas forman parte de la entrega conjunta.

## Pruebas y límites

- `backend/scripts/test-communications.mjs`: transacciones, deduplicación, fallo simulado y recuperación de correo, reserva vencida, revocación de destinatario, decisiones/revisiones, versión obsoleta, idempotencia, restricciones de acceso, PDF de revisión y separación de contrato/pagos. Base PGlite en memoria y adaptador de entrega sintético.
- `backend/scripts/test-communications-http.mjs`: rutas reales de la aplicación contra base temporal, inicio de sesión por rol, IDOR, comprobación de sesión/rol, respuestas y reintentos.
- `frontend/scripts/test-quote-responses.cjs`: opciones comerciales, aclaración contractual, versión concreta, validación de comentarios y ausencia de controles en estados finales/obsoletos.

No se sustituye una entrega real con el adaptador sintético. La prueba de envío autorizado, la interacción con micrófono físico, los servicios desplegados y la aplicación de migraciones en Neon siguen siendo comprobaciones externas separadas.

Resultados ejecutados de esta fase: 79 comprobaciones de servicio aisladas, 38 comprobaciones HTTP locales, comprobaciones SSR de decisiones, 13 tests TypeScript focalizados (incluyen catálogo y enlaces) y lint focalizado sin errores. No se repitió una compilación de producción del frontend durante el desarrollo paralelo.
