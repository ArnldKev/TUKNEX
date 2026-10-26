# Cotizador rediseñado: guía de revisión local

Fecha: 25 de octubre de 2026. Cambios locales; sin publicación ni cambios de configuración en Netlify, Render o Neon.

## Qué se corrigió

El fallo de navegación tenía una causa de renderizado comprobada: el bloque de preguntas y el módulo general de audio eran hermanos con la misma `key={step}`. En producción, al llegar a la cuarta etapa quedaban cuatro bloques de preguntas visibles. La URL no cambiaba. Además, el foco automático, el desplazamiento suave global y los paneles de altura variable dificultaban ubicar el siguiente encabezado.

Ahora hay una sola etapa montada. El avance valida sus preguntas y mueve el foco al encabezado de la siguiente. Se conservan las respuestas al volver; no se usa un desplazamiento al inicio de la página para ocultar el problema.

## Recorrido para el cliente

1. **Qué necesitas:** seis objetivos sin una elección inicial fingida. La recomendación puede cambiarse.
2. **Tu negocio:** oferta, rubro y problema; nombre y contexto complementario opcionales.
3. **Funciones:** opciones pertinentes al tipo de solución. La ayuda para quien no está seguro no marca funciones ni aumenta el precio.
4. **Diseño:** estilos, colores y referencias. El editor avanzado permanece cerrado hasta abrirlo; el boceto puede ampliarse.
5. **Plazo:** prioridad, fecha y presupuesto opcional. Publicación, dominio y acompañamiento están en un apartado adicional.
6. **Tu cotización:** rango preliminar, resumen editable, dirección visual, plazo orientativo y costos separados antes del contacto. Incluye preferencia de frecuencia de pago y opinión del boceto opcionales. Al enviar se accede con una cuenta de cliente y el servidor vuelve a validar y calcular.

El progreso comienza en 0%. Cada etapa validada aporta una sexta parte. Volver no borra lo completado; si una respuesta deja de ser válida, esa etapa deja de contarse. El 100% aparece después de guardar correctamente la solicitud.

## Dictado por campo

`QuoteTextField` añade un control propio en los 20 campos de texto admitidos, incluidos los contactos. Fechas, selectores y controles de color usan sus controles nativos.

Un proveedor de captura coordina un solo micrófono. Al detenerlo, el audio va al endpoint de dictado y a Groq para transcripción en español. El texto se añade al valor vigente de ese mismo campo, incluyendo lo que el cliente haya escrito mientras esperaba. No hay pantalla de confirmación, reemplazo del formulario ni segunda llamada de reformulación. La transcripción recibida sigue editable; la última inserción puede deshacerse mientras no haya sido editada.

Se distinguen permisos bloqueados, dispositivo ausente u ocupado, incompatibilidad y errores de transcripción. Cambiar de etapa, ocultar la pestaña, cerrar el apartado o desmontar el campo cancela y descarta resultados tardíos. Un error permite reintentar explícitamente el audio temporal o seguir escribiendo. Los límites son 60 segundos, 4 MB y cuotas gratuitas acotadas. TUKNEX no archiva grabaciones. La voz enviada está sujeta a los controles del proveedor; no debe presentarse como anónima.

La transcripción utiliza el modelo ASR existente. No se añadió un modelo entrenado, proveedor pagado ni reescritura automática que pueda reinterpretar requisitos. Las sugerencias generativas de NEXI siguen siendo una consulta contextual opcional, separada y autorizada por consulta.

## Recuperación y administración

La decisión del usuario fue **solo navegador hasta el envío**. Se retiraron del flujo público los controles de gestión de borradores y su conexión automática al servicio remoto.

La recuperación usa `sessionStorage` de la pestaña, con copias de hasta 24 horas. Conserva textos y opciones del proyecto; excluye campos de nombre personal, correo, teléfono, aprobador y consentimientos. Los textos libres pueden contener datos personales: no se llaman anónimos. Los consentimientos y contactos se completan de nuevo al recargar. Un comentario demasiado largo se conserva para corregirlo. Después del envío se retira la copia temporal.

El administrador recibe las solicitudes enviadas por la API autenticada existente. No verá avances nuevos no enviados. Los endpoints y registros históricos autorizados se conservaron, con sus permisos y retención anteriores. No se añadieron tablas de seguimiento ni migraciones. Visitantes reciben 401 y clientes 403 al intentar consultar solicitudes administrativas. El servidor asigna el propietario y usa idempotencia por cuenta para evitar duplicaciones al reintentar.

El cálculo automático envía solo opciones necesarias para el precio y una bandera de presencia de funciones adicionales. No envía el contenido de esas funciones ni el contacto. Descargar un PDF o pedir dictado/NEXI son acciones manuales con avisos separados; no equivalen al envío de una solicitud.

## Archivos principales

| Responsabilidad | Archivos |
| --- | --- |
| Flujo, foco y coordinación | `frontend/src/components/quote-stepper-form.tsx`, `src/lib/quote/workflow.ts` |
| Preguntas y resumen | `frontend/src/components/quote/steps/` |
| Superficie clara de la ruta | `frontend/src/app/cotizar/page.tsx`, `quote/quote-redesign.css` |
| Dictado y captura | `quote/field-dictation.tsx`, `src/lib/quote/dictation.ts`, `field-dictation-api.ts`, `audio-capture.ts` |
| Historial sin pérdida de texto | `quote/project-session.tsx`, `src/lib/quote/project-actions.ts` |
| Boceto reutilizado | `quote/solution-preview.tsx`, `live-solution-preview.tsx`, editor existente |
| API de dictado compatible | `backend/src/ai/quote-audio.ts`, contrato compartido `dictation.ts` |
| Precio mínimo compatible | `estimate-input.ts` compartido, servicio frontend y `PublicController` |
| Decisiones y avisos | `DESIGN.md`, `UX-CONTRACT.md`, `/privacidad` |

## Pruebas ejecutadas

- `frontend: npm test`: 131 pruebas del modo real y 13 del modo demostración; cero fallos. Incluye paridad de 7.776 combinaciones de precio, recuperación, dictado e historial. Comprobación adicional de render del resumen antes del contacto.
- `backend: npm test`: exit 0; 686 comprobaciones de integración y 9 pruebas Node. Incluye endpoints legacy y nuevos, cuotas, límites de audio, permisos, propiedad, idempotencia y PDFs. Bases temporales PGlite; cero llamadas a proveedores reales.
- Revisión independiente: tipos y ESLint sin fallos; pruebas focalizadas y correcciones de errores de micrófono y recuperación revalidadas.
- Navegador local de desarrollo: seis etapas, acceso y envío sintético único, avance hasta 100%, edición posterior, recuperación tras recargar, editor avanzado y Escape con retorno de foco. Anchos 360, 390, 768 y 1280 sin desbordamiento horizontal observado.

La compilación y el reporte final sobre la exportación están registrados en la sección de evidencia final. Las capturas no sustituyen la prueba con micrófono físico.

## Cómo probar antes de desplegar

En dos terminales, desde la carpeta del proyecto:

```powershell
cd D:\TUKNEX\backend
npm run dev
```

```powershell
cd D:\TUKNEX\frontend
npm run dev
```

Utiliza tu configuración local existente para conectar frontend y backend; no copies claves en el código o en capturas. El frontend abre en `http://127.0.0.1:3000/cotizar`. El backend debe permitir ese origen CORS.

Para verificar la entrega:

```powershell
cd D:\TUKNEX\backend
npm test
cd D:\TUKNEX\frontend
npm test
npm run typecheck
npm run lint
npm run build:release
```

`build:release` exige `NEXT_PUBLIC_SITE_URL` con el dominio HTTPS real, `NEXT_PUBLIC_API_URL=/` o un origen HTTPS público y modo demo desactivado. Rechaza localhost intencionalmente; `npm run dev` es la alternativa para pruebas locales. No cambies esta protección para compilar.

Para el dictado, conserva la configuración Groq del backend: IA y audio habilitados, clave solo en el servidor y modelo ASR existente. Si faltan proveedor, permisos o cuota, el formulario se completa escribiendo.

## Límites de la verificación

No se probó un micrófono físico ni la precisión de transcripción de una voz peruana real. No se realizaron llamadas reales a Groq, correos ni SMS. La corrección ortográfica adicional por LLM no se activó; se conserva el resultado ASR. Las comprobaciones de accesibilidad son parciales (etiquetas, foco, teclado, objetivos táctiles, contraste de la superficie y adaptación); no son una certificación WCAG completa ni una prueba en Safari/Firefox. Los avisos y la minimización de datos no sustituyen una revisión legal de la operación del negocio. No hubo despliegue, commit ni modificación de credenciales.

## Evidencia final de la exportación

`npm run build:release` terminó con exit 0 y generó las 38 páginas. El navegador comprobó la exportación local con 21 aserciones finales, todas satisfechas. El caso 5→6 se reprodujo primero mostrando un error prematuro; después de cancelar la acción predeterminada de «Continuar», el mismo recorrido abre el resumen sin errores ni envío automático.

El doble clic final produjo una sola solicitud adicional en la base temporal (1 anterior, 2 después); su preferencia semanal quedó guardada una sola vez. Una recarga posterior vuelve a un inicio neutral, sin recuperar el formulario ya enviado. No se observaron errores ni advertencias de consola durante el recorrido final.

Se corrigieron tres sondas de prueba, documentadas en el JSON: el conteo geométrico incluía campos de apartados cerrados; el puente DOM de lectura no expone `compareDocumentPosition`; la espera corta predeterminada venció antes de terminar el servidor local. El envío no se repitió durante esa espera. No se confunden estas limitaciones del instrumento con fallos de la interfaz.

Capturas y reportes locales:

- [Escritorio, 1280 px](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/redesign-desktop.png).
- [Móvil, 390 px](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/redesign-mobile-390.png).
- [Móvil, 360 px](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/redesign-mobile-360.png).
- [Tablet y resumen, 768 px](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/redesign-tablet-768.png).
- [Aserciones de navegador](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/redesign-ui-green.json).
- [Compilación final](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/redesign-build-release.log).

Las pruebas de dictado usan captura simulada, transcripciones sintéticas y comprobaciones HTTP; queda pendiente probar la captura y la transcripción completas con el micrófono y la voz de una persona. No se afirma que esa prueba física se haya realizado.
