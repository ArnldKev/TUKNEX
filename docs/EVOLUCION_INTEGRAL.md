# Evolución integral de TUKNEX

Inicio: 9 de noviembre de 2026. Proyecto D:\TUKNEX; rama codex/connected-contract-workflow. Alcance: solicitud maestra del usuario, preservada en .qa-integral/request.md. Servicios actuales: Netlify, Render y Neon; no se crea infraestructura paralela ni se publica sin autorización.

## Fase 0: auditoría y plan

Arquitectura encontrada: Next.js 15.5.28 + React 19.3.1, TypeScript 5.9.3 y exportación estática; NestJS 11.2.7 + Express 5.3.0; PostgreSQL con pg 8.23.1, PGlite 0.5.10 para pruebas; validación Zod 4.6.7, PDF con pdf-lib 1.17.1. Se verificaron versiones instaladas con npm ls. Hay 294 archivos de fuente frontend/backend. Las dependencias principales coinciden con package.json; frontend tiene dos paquetes auxiliares extraneous de sharp, sin evidencia de fallo por ello. No se actualizan versiones por conveniencia.

Persistencia: migraciones SQL 001–011 aplicadas por Database.onModuleInit al arrancar. La 011 implementa revisión contractual y aceptación inmutable. Su existencia local no verifica su aplicación en Neon. No se arranca la aplicación con el .env real durante las pruebas.

Módulos reutilizados: AuthModule/SessionGuard/AdminGuard/TeamGuard, BillingService y plan financiero, PdfService, QuoteRequestsService, TeamService, RecordList/RecordDetail/useAccessibleModal, proyecto del cotizador e historial local, NEXI/Groq y dictado por campo, portal y shell por rol.

Estado Git inicial: HEAD 69864e49f3bcbbcff73e3cbc451697bb12990423 y 44 archivos modificados/nuevos preexistentes. Copia, diff y hashes conservados en .qa-integral/baseline y baseline.json. Incluyen contratos virtuales, preparación desde IA y comprobantes; no se rehacen. No hay AGENTS.md en el checkout. Las reglas visuales de DESIGN.md y UX-CONTRACT.md permanecen vigentes.

Errores confirmados: recarga desigual de resumen/listas, contador sin estado de fallo, etiquetas técnicas expuestas. Funciones pendientes: asociaciones de fichas/cuentas, avisos durables, respuestas/versiones comerciales, seguimiento público del desarrollo, reportes de pago, interpretación revisable e informes IA, expediente y adendas.

Pruebas disponibles: scripts Node/HTTP/PGlite backend; tests TypeScript y comprobaciones SSR frontend; lint y build de exportación. Última entrega previa: 182 tests frontend y 42 rutas; no se presentan como ejecución nueva de esta fase. Habrá regresión completa al integrar módulos. Las pruebas nuevas usarán DB temporal y proveedores simulados; los resultados reales externos se informan por separado.

## Plan y estado por fase

| Fase | Trabajo | Estado |
| --- | --- | --- |
| 0 | Arquitectura, Git, versiones, reutilización, migraciones y pruebas | Implementada y verificada mediante lectura local |
| 1 | Sincronización, errores, catálogo comercial, asociación lógica auditada | Implementada y verificada localmente |
| 2 | Avisos persistentes, reintentos y decisiones/versiones de cotizaciones | No iniciada; depende de los límites de acceso de fase 1 |
| 3 | Seguimiento del proyecto y reportes de pago revisables | Implementada y verificada localmente |
| 4 | Ordenar mi idea e informes NEXI persistentes | Implementada y verificada con proveedor simulado; Groq real pendiente |
| 5 | Expediente, adendas, historial, UI y rendimiento | Funciones implementadas y verificadas; optimización de rendimiento parcial |
| 6 | Regresión/E2E, seguridad, respaldo de prueba y despliegue documentado | QA local y preparación realizadas; publicación y piloto externo pendientes |

## Decisiones de protección

- Asociar fichas mediante vínculo explícito, no fusionar por coincidencia de nombre/correo ni modificar identidades históricas aceptadas.
- Reportes de pago no alteran saldos hasta confirmación idempotente del administrador.
- Confirmar una propuesta comercial no acepta un contrato ni crea un cobro.
- Nuevas operaciones de IA requieren acción explícita y mantienen original, revisión, aprobación y deshacer. Los avances sin enviar permanecen en el navegador.
- Notas internas quedan separadas de documentos visibles al cliente.
- Migraciones aditivas se prueban en PGlite y con restauración aislada. No se ejecutan sobre Neon sin autorización explícita.
- Correo real, Groq real, micrófono físico y despliegue requieren comprobación externa; no se sustituyen funcionalidades por fixtures. Los datos sintéticos se limitan a pruebas.

## Evidencia

Directorio .qa-integral: baseline, resultados y estado de continuidad. Cada fase añadirá endpoints, archivos, pruebas ejecutadas y límites pendientes a este informe. No hay publicación, compra, rotación de secretos ni escritura en Neon autorizadas para esta entrega.

## Fase 1: cuenta coherente y asociaciones

El portal consulta `/api/account/overview` en una sola instantánea SQL que incluye solicitudes, contratos, cuotas y pagos. Tiene botón de actualización, fecha del servidor, actualización al regresar a la pestaña, cancelación por identidad y protección de formularios en edición. Conserva información anterior identificada como pendiente de actualización; una consulta fallida no se convierte en un saldo cero. Los estados de sesión, red, timeout y servicio permiten recuperarse.

El catálogo comercial traduce valores internos sin cambiar los identificadores de negocio; distingue elecciones registradas de valores del sistema. Las fichas se vinculan mediante previsualización de impacto, confirmación con motivo e historial. La cuenta conserva su ficha primaria; los alias explícitos se comprueban nuevamente en cada acceso sensible. No se fusionaron contratos ni clientes por nombre/correo.

Archivos principales: `auth/client-access.ts`, `auth/client-associations.ts`, `auth/account.controller.ts`, componentes `client-account-association`, `real-client-portal`, `use-account-resources` y catálogo `commercial-labels`. Migración 012. Endpoints de administración: `billing/client-accounts`, `billing/clients/:id/account-association` y sus operaciones `preview`/`confirm`. Referencias: [sincronización](PORTAL_CLIENTE_SINCRONIZACION.md), [asociaciones](CLIENT_ACCOUNT_ASSOCIATIONS.md).

Pruebas focalizadas: 10 del almacén de recursos y 53 comprobaciones HTTP de asociaciones. Incluyen consultas concurrentes, retención ante errores, expiración, aliases, revocación, historial inmutable y conservación de la identidad histórica. La validación integrada también se ejecutó en la suite final.

## Fase 2: comunicación y propuestas

La bandeja de salida se guarda dentro de la transacción de envío explícito. Tiene deduplicación por evento/destinatario, reserva limitada, reintentos con espera y errores sin contenido sensible. Se revalida que el administrador/responsable siga activo. El proveedor no decide si se guarda una solicitud. El envío automático viene desactivado; hay que revisar la bandeja antes de habilitarlo.

Las propuestas conservan instantáneas inmutables. El cliente puede pedir cambios, no continuar o confirmar una versión concreta. Las operaciones registran autor, comentarios e idempotencia y rechazan revisiones obsoletas. Confirmar permite preparar el contrato: no lo firma ni crea un pago. Las instantáneas recuperadas de registros antiguos se etiquetan como tales; no se inventa historia previa.

Archivos nuevos: `notifications/notifications.ts`, `notifications/outbox.ts`, `billing/quote-responses.ts`, `billing/quote-versions.ts`; componentes `notification-inbox` y `quote-responses`. Migraciones 013–014. Rutas `billing/notifications`, `account/quotes/:id/responses`, revisiones PDF por versión y vistas administrativas/equipo. Los enlaces privados de avisos abren el detalle autorizado y muestran un aviso si ya no existe acceso. Véase [comunicación y respuestas](COMUNICACION_Y_RESPUESTAS.md).

Pruebas: 79 comprobaciones de servicio y 38 HTTP, más SSR y parsers de enlaces frontend. La entrega real a un correo autorizado no se ha realizado. Variables añadidas: `NOTIFICATIONS_ENABLED=false` y `APP_PUBLIC_URL`; se reutilizan `RESEND_API_KEY` y `EMAIL_FROM`, solo en backend.

## Fase 3: proyecto y reportes de pago

Seguimiento separado de contrato y finanzas: contenido pendiente, diseño, desarrollo, revisión y entrega; responsable, fechas, próxima acción y hitos configurados por el equipo. La entrega exige al menos un hito, todos completados y fase Entrega. No hay porcentajes inventados. Notas internas se eliminan de la respuesta del cliente; el historial es inmutable. Un proyecto financiero vinculado al equipo utiliza el mismo seguimiento canónico.

El cliente reporta contrato/cuota, importe, fecha, método, referencia y comprobante privado. Administración confirma, observa o rechaza con motivo e historial. Confirmar utiliza el registro de pago existente dentro de la misma transacción. Reportar, observar o rechazar no cambia deuda ni cuotas; repetir la confirmación no duplica el pago. Se conservan los comprobantes anteriores al corregir un reporte.

Migraciones 015–016. Módulos `projects/project-tracking.ts`, `billing/payment-reports.ts`, validador reutilizado `receipt-validation.ts`. Rutas `account/project-tracking`, `team/projects/:id/tracking`, `billing/projects/:id/tracking`, `account/payment-reports` y `billing/payment-reports`. Componentes `ProjectTrackingList/Editor`, `PaymentReportPanel`, `AdminPaymentReportsInbox`. [Reportes de pago](PAYMENT_REPORTS.md).

Pruebas: 60 comprobaciones HTTP de seguimiento y 97 de reportes. Comprobaron IDOR, roles/asignación, alias revocados, notas privadas, versiones, doble clic, corrección, historial, saldo cambiado durante revisión y rollback. En navegador se creó un reporte sintético de S/25 con imagen: apareció Por revisar, el saldo permaneció S/400 y se visualizó la imagen privada en un móvil de 390 px. Escape cerró el detalle y devolvió el foco a su botón.

## Fase 4: interpretación y NEXI persistente

«Ordenar mi idea» conserva lo escrito/dictado y propone narración, requisitos, exclusiones y preguntas por separado. Requiere consentimiento para consultar y aprobación antes de aplicar. Permite editar, descartar, deshacer y seleccionar únicamente las sugerencias visuales deseadas. La interpretación aprobada forma parte del avance local y se guarda en el servidor solamente al enviar la solicitud. Las cantidades, negaciones y fuente se validan; un resultado incompatible falla de forma recuperable. No se genera HTML/CSS libre.

Los informes internos se generan desde una fuente canónica y una revisión exacta; el original y cada revisión humana se conservan. El equipo puede reabrir, revisar y aprobar con control de versión. Las notas internas no pasan al contrato ni al expediente público. El permiso y la fuente se revalidan después de esperar al proveedor. Migración 017, módulo `ai/nexi-reports.ts`, esquemas compartidos `idea.ts`, `idea-actions.ts`, `nexi-idea-organizer` y `nexi-reports-panel`.

Rutas: `quote-ai/organize`, `nexi-reports/:kind/:id`, `generate`, y `:reportId/reviews`. Se reutilizan Groq, cuota y cancelación existentes; el cuestionario sigue disponible sin IA. [Diseño y límites](NEXI_IDEAS_INFORMES.md).

Pruebas focales: 37 frontend relacionadas y 50 HTTP/backend con proveedor simulado. En navegador se comprobó consentimiento, rechazo seguro de un resultado incompatible, límite de consultas, comparación, edición y aplicación. Deshacer y recargar recuperó las respuestas originales y el avance en la misma pestaña. El proveedor real, su calidad y el micrófono físico no se probaron.

## Fase 5: documentos, historial y experiencia

El expediente permite seleccionar documentos y revisiones concretas; guarda un ZIP inmutable, manifiesto, fuentes y hashes. Incluye propuestas y contrato revisado original, registros de aceptación legibles/JSON, adendas, ejemplares firmados, informes NEXI aprobados y el boceto correspondiente. Los reportes originales no aprobados y las notas internas quedan fuera. Los expedientes del equipo son privados; el cliente no puede descargarlos por conocer el ID. Máximo 5 expedientes nuevos por usuario en 24 horas, 60 archivos seleccionados y 40 MB por archivo ZIP, con reintentos idempotentes.

Los acuerdos complementarios registran motivo, alcance añadido/retirado, impacto económico y plazos. Exigen conformidad previa del cliente con el contrato original. Cada propuesta conserva PDF y versión; la aceptación autenticada o el ejemplar firmado quedan separados. No recalculan cuotas/saldos previos: un ajuste financiero requiere una operación administrativa explícita independiente. El contrato original y su evidencia no se modifican.

Se corrigió además el origen visual de propuestas nuevas: su boceto queda congelado con la revisión comercial y se reutiliza al generar el contrato. Las propuestas históricas sin esa instantánea no reciben retroactivamente una aprobación visual inventada. Los listados del cliente, mensajes y documentos son compactos, con búsqueda, paginación, detalle y foco restaurado. Se preservaron las seis etapas, el dictado y la identidad visual.

Migraciones 018–019; módulos `billing/addenda.ts`, `documents/project-dossiers.ts`, `documents/zip.ts`; componentes `ContractAddenda`, `ProjectDossier` y seguimiento. Endpoints de acuerdos bajo `account|team/contracts/:contractId/addenda`; expediente bajo `account|team/project-dossiers/:kind/:projectId`. [QA y comandos](PRUEBAS_EXPEDIENTES_Y_ADENDAS.md).

Pruebas: 423 comprobaciones en la suite normal; 424 generando muestras por una descarga HTTP extra de QA. Ocho PDF y catorce páginas renderizadas; ZIP comprobado independientemente con CRC, fecha DOS y 17 hashes. Se corrigieron durante QA exposiciones de versiones/informes de un cliente anterior y un agregado financiero de otro responsable. No se afirma que se verificó un archivo descargado en el visor PDF del navegador.

Logotipo original conservado: PNG 423.979 bytes; versión de interfaz WebP 23.512 bytes (aprox.94,5% menos). El SEO social conserva su PNG. La comparación Lighthouse y sus advertencias se encuentra en `RENDIMIENTO_INTEGRAL.md`; son mediciones de laboratorio, no percentil75 real.

## Fase 6: regresión, seguridad y preparación

La suite final `npm test` de frontend pasó 216 pruebas TypeScript (203 reales + 13 modo demo) y verificaciones SSR/estilo/decisiones. El build de producción `npm run build:release` exportó 42 rutas. `npm test` de backend pasó con todas las pruebas nuevas integradas; también pasó `npm run build`. El resultado fue 21 pruebas Node y 1.959 comprobaciones de integración (contadores de aserciones/HTTP, no 1.959 recorridos completos). Véanse logs `.qa-integral/frontend-tests-final.log`, `backend-tests-final.log` y `frontend-build-final.log`. El aviso de Next sobre el plugin ESLint no configurado permanece como observación de herramientas; el lint independiente no presentó errores.

El recorrido de 21 pasos pasó 87 comprobaciones HTTP/modelo, incluyendo correo e IA simulados, respuesta/revisión comercial, contrato con PDF exacto, avance, reporte/confirmación de pago, consulta documental, entrega y opinión. El [informe de recorrido](INTEGRAL_JOURNEY_QA.md) distingue cada paso de las pruebas visuales/micrófono que HTTP no cubre.

Se detectaron y corrigieron dos carreras adicionales: respuestas tardías de sesión tras logout/otro login y estado visual del expediente/adendas/editor del proyecto anterior. Hay 11 regresiones nuevas (8 de sesión y 3 de identidad de componentes). [Auditoría de seguridad y límites](AUDITORIA_SEGURIDAD_INTEGRAL.md). Los 19 pares de módulos compartidos son idénticos; la revisión focal no encontró patrones de claves en fuentes/assets/export examinados. Esto no sustituye un pentest externo ni garantiza ausencia de toda vulnerabilidad.

PostgreSQL17 local: pg_dump + restauración de 26 tablas con hashes idénticos; actualización 012–019 conservó las 25 tablas históricas distintas del inventario de migraciones. Dos inicializaciones simultáneas verificaron 19 migraciones sin duplicados. No se leyó ni modificó Neon para estas pruebas. El archivo `next-env.d.ts` se restauró desde la copia anterior al build; se verifica diff y hashes finales.

La publicación y el piloto en servicios reales quedan pendientes de autorización y comprobación externa. [Guía paso a paso para actualizar los servicios existentes](ACTUALIZACION_INTEGRAL.md). No hace falta crear otro frontend/backend ni contratar un servicio nuevo.

## Pendientes externos y límites de entrega

- Respaldar y restaurar una copia real de Neon autorizada; consultar su inventario y aprobar las migraciones pendientes antes de desplegar. La prueba local no es ese respaldo.
- Publicar backend y frontend compatibles en los servicios existentes; comprobar permisos, sesiones y caché sobre el dominio real. No se hizo commit, push ni publicación en esta entrega.
- Revisar bandeja/destinatarios y autorizar entrega de un correo real; validar remitente y recuperación de acceso.
- Probar una consulta Groq real, calidad de interpretación y cuota, además de grabación con micrófono físico. Las fixtures no validan esos servicios externos.
- Revisar con asesoría correspondiente las condiciones comerciales/contractuales que se usarán con clientes; la aceptación del portal no se presenta como certificado digital.
- Ejecutar un piloto con usuarios y dispositivos reales y medir rendimiento de campo. El objetivo LCP/INP/CLS de p75 no se acredita con Lighthouse local.

Cierre de rendimiento: [mediciones y limitaciones](RENDIMIENTO_INTEGRAL.md). La transferencia bajó, pero el LCP móvil del cotizador quedó en 3,736 s en laboratorio; no se presenta como objetivo cumplido.

Cierre de artefactos: rama y HEAD conservados; diff sin errores de espacios; hashes de archivos en `.qa-integral/final-state.json`. Previews3320/3321/3322, backend de pruebas4406 y PostgreSQL QA55452 detenidos. Base temporal de navegador eliminada con ruta validada. No se mantuvieron sesiones de prueba abiertas.

Verificación adicional de navegador: reporte observado por administración sin alterar S/400 de saldo, acceso directo a supervisión y descarga real de un expediente ZIP de dos documentos. El ZIP descargado se comprobó con CRC y hashes del manifiesto; no se abrió el PDF en el visor del navegador. Evidencia en `browser-download-verification.json`.

Para revisar ahora sin tocar Neon: [prueba local aislada paso a paso](PRUEBA_LOCAL_INTEGRAL.md). El backend habitual migra al arrancar; no utilizar una conexión real para este piloto antes de verificar su respaldo.
