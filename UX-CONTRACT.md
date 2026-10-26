# Contrato UX del cotizador y NEXI

Alcance: flujo público actual de `/cotizar`, con superficie clara local y dictado directo por campo (UX v2). Las demás rutas mantienen su tema. Decisión explícita de producto: **Solo navegador hasta el envío**; no iniciar nuevas actualizaciones remotas públicas de borradores ni seguimiento oculto. Las acciones manuales de dictado, NEXI y PDF tienen transmisión y aviso separados. Los esquemas, permisos y documentos existentes siguen siendo contratos de compatibilidad.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Form | React Hook Form + `frontend/src/lib/quote/form.ts` + `steps/shared.tsx` | Esquemas zod y decisión de producto del rediseño | Seis etapas; textos por `QuoteTextField`; sin formulario anidado | Typecheck, validación y navegador |
| Step progression | `frontend/src/lib/quote/workflow.ts` + `quote-stepper-form.tsx` | `stageIsValid`, `advanceQuoteFlow`, `quoteProgress` | Objetivo intencional antes de continuar; avance por etapas válidas; volver conserva campos | `workflow.test.ts` y navegador con errores/foco |
| Local recovery | `workflow.ts` + `sessionStorage` de la pestaña | Esquemas de recuperación y decisión Solo navegador | Copia automática con textos del proyecto; máximo 24h por copia; sin identidad/contacto/approver/consentimientos | Pruebas de exclusión, caducidad y recarga |
| Select/Listbox | `QuoteSelectField` y selects nativos existentes | Contratos de campos y UX existente | Popup/teclado del sistema; incertidumbre de plazo mapea a `flexible` | Navegador, teclado y opciones |
| Date | `QuoteTextField` con `type="date"` | `launchDate` del formulario | Selector de fecha nativo del navegador/sistema; notas opcionales en `deadlineReason` | Navegador y validación |
| Scrollbar | `frontend/src/app/globals.css` | `DESIGN.md` | Desplazamiento de página; sin nuevo marco vertical de panel | Escritorio, teléfono y foco con cabeceras fijas |
| Route theme | `/cotizar .quote-workshop` + `quote-redesign.css` | `DESIGN.md` y CSS local | Superficie clara solo en cotizador; conservar tema público/admin fuera de ese scope | Comparación de rutas y responsive |
| Automatic estimate | `quote/service.ts` + espejos `estimate-input.ts` + `POST /api/public/estimate` | `estimateQuote` y DTO mínimo estricto | Solo elecciones enumeradas y `hasOtherFunctions`; no textos/contactos; servidor conserva compatibilidad legacy | Pruebas de payload, paridad y rechazo de extras |
| Project mutations | `project-session.tsx` + `project.ts` | Modelo compartido y revisiones | Cambios manuales, aceptación de sugerencias y deshacer; dictado con origen transcribed | Pruebas de historial, dictado y navegador |
| Disclosure | HTML `details/summary` + `QuoteDetails` | Contrato nativo | Opcionales cerrados inicialmente; editor visual en Diseño; cerrar cancela dictado del campo oculto | Teclado, conservación y cancelación |
| Feedback | Mensajes inline existentes y estado de campos | UX del cotizador y propietarios de cada operación | `role=alert`, `aria-live=polite`; no nueva familia de toasts | Error, cancelación, disponibilidad y foco |
| Direct dictation | `field-dictation.tsx` + `dictation.ts` + `field-dictation-api.ts` + `QuoteAudioController.dictate` | `DICTATION_FIELDS` y schema de dictado | 20 campos; mic explícito; 60s/4MB; transcribir y añadir al campo sin reescritura | `dictation.test.ts`, `test-field-dictation.mjs` y navegador |
| Capture lifecycle | `audio-capture.ts` + `QuoteDictationProvider` | Tickets de dictado y contexto de campo/etapa | Audio en memoria; cancelar al cambiar de etapa/ocultar pestaña/cerrar details/desmontar; retry explícito | Recursos sintéticos, abortos y resultados tardíos |
| Optional generative analysis | `nexi-ai.tsx` + `ai-api.ts` | Consentimiento de consulta y schema IA | Cliente con sugerencias aceptables; admin de solo lectura; autorización vigente independiente del dictado | Cancelación, error, revisión antigua y permisos |
| Manual preliminary PDF | `QuotePdfDownload` + `PdfService.preliminary` | Contrato PDF existente | Acción manual con aviso: envía respuestas para generar PDF; no crea solicitud o contrato | PDF, precio vigente y navegador |
| Formal submission | `QuoteRequestsService` + endpoints account/billing | Sesión, verificación, idempotencia y schema final | Respuestas/PDF asociados a cuenta solo al enviar; estado formal existente visible al cliente | HTTP, duplicados, propiedad y PDF |
| Historical authorized drafts | `QuoteDraftsService` + panel privado existente | Autorización histórica, expiración y `AdminGuard` | Conservar registros/APIs v1; no montar guardado remoto público en el flujo actual | HTTP 401/403/404 y retención existente |

## Comportamiento del recorrido

Las primeras cinco etapas priorizan preguntas breves: objetivo, negocio, funciones, diseño y plazo. La sexta conserva revisión y envío. El objetivo no está marcado antes de una elección intencional; elegir una recomendación permite cambiar el tipo. «Tengo otra idea» y la ayuda de Funciones no inventan funciones ni tarifas. Las opciones de presupuesto y fecha admiten incertidumbre. Los apartados opcionales no se abren al cargar; la validación puede abrir el que contiene un error.

Continuar valida únicamente la etapa actual y actualiza el progreso de etapas válidas. El foco llega al encabezado de la siguiente pregunta; un error enfoca su campo. Volver y revisar etapas disponibles conserva respuestas. Recargar recupera la copia local válida de esa pestaña, con los consentimientos nuevamente desmarcados y sin recuperar contactos ni responsable de aprobación.

## Fronteras de datos

La recuperación automática usa `sessionStorage`, incluye textos libres del proyecto y decisiones, y tiene un máximo de 24 horas por copia; termina con la sesión de la pestaña. Excluye los campos dedicados de nombre personal, correo, teléfono, responsable de aprobación y consentimientos. Los textos libres pueden contener información personal: no calificarlos de anónimos. No se guardan nuevas respuestas ni estados de avance en el servidor por recorrer el cuestionario.

El cálculo automático puede solicitar al servidor el precio usando solo `projectType`, `features`, `design`, `timeline`, rangos de productos/usuarios y `hasOtherFunctions`. Este boolean conserva la clasificación de complejidad sin transmitir el texto. El endpoint mantiene la entrada legacy para consumidores previos; el cliente actual usa la proyección mínima.

Dictado, NEXI y PDF son acciones externas distintas del envío formal. El aviso de cada acción informa qué sale del navegador. Descargar un PDF preliminar sí envía respuestas para generarlo; enviar la solicitud formal persiste las respuestas y el PDF con los permisos e idempotencia existentes. Ninguna de esas operaciones crea por sí sola un contrato.

## Dictado directo y compatibilidad

Los 20 campos admitidos están definidos en `DICTATION_FIELDS`, incluidos nombre, correo y teléfono. Pulsar el micrófono solicita enviar la grabación a Groq y el navegador gestiona el permiso. Se muestra el aviso antes del micrófono; no hay grabación inicial ni envío de los textos ya escritos para este dictado.

Al detener o alcanzar el límite, la transcripción se añade automáticamente al final del valor actual, conservando las ediciones realizadas durante la espera. El resultado queda editable; nombres, cifras y contactos deben revisarse en el campo. No se llama a un segundo modelo, no se ordena ni reescribe, y no se recorta silenciosamente una respuesta larga. Deshacer solo revierte la última inserción si el valor no cambió después.

Cancelar, salir de etapa, ocultar la pestaña, cerrar el apartado del campo o desmontarlo invalida su ticket y aborta la operación; un resultado tardío no se incorpora. El audio vive solo en memoria y puede conservarse tras un fallo para un reintento explícito hasta cancelar o abandonar el contexto. No hay reintento automático. El procesamiento externo queda sujeto a la política de Groq enlazada desde privacidad.

Las rutas anteriores de transcripción y organización de texto, las revisiones de borradores remotos autorizados y los contratos de documentos se conservan para compatibilidad v1. No son el flujo público actual ni justifican nuevas actualizaciones remotas. Las consultas sobre registros históricos se atienden desde Contacto; no prometer botones públicos de pausar o borrar que ya no se muestran.

NEXI generativo solicita autorización vigente independiente para cada consulta. Su informe no fija precio, viabilidad ni contrato y no se guarda como informe. Las sugerencias aceptadas pasan al proyecto e historial local; la administración puede analizar registros autorizados desde sus rutas privadas. IA o dictado no disponibles no bloquean escritura, cálculo ni navegación.
