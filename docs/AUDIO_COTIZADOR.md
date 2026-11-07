# Audio del cotizador: dictado directo por campo

El flujo público vigente usa el botón **Dictar** junto a 20 respuestas de texto. El usuario habla para rellenar ese campo; la transcripción se añade a lo que ya había escrito. No se reformula con una segunda IA ni se sustituye silenciosamente su respuesta. Contrato vigente: [UX-CONTRACT.md](../UX-CONTRACT.md). Configuración: [guía de dictado](../deploy/NEXI_AUDIO.md).

## Capacidades reales

- Los campos admitidos son nombre del negocio, oferta, ciudad, sitio actual, público, proceso de ventas, problema, otras funciones, colores preferidos y a evitar, referencias, competencia, mensaje principal, comentario del boceto, motivo de fecha límite, dominio actual, persona que aprueba, nombre, correo y WhatsApp. La lista canónica es `DICTATION_FIELDS`.
- **Dictar** solicita el permiso del micrófono. **Detener**, o alcanzar el límite de captura, inicia la transcripción de esa grabación. El aviso del formulario explica el envío de voz a Groq antes de usarla.
- El resultado se incorpora automáticamente al final del valor más reciente del campo. Conserva lo escrito mientras llegaba la respuesta, y el usuario puede corregir nombres, cifras y contactos. Un texto demasiado largo no se corta: queda disponible para editarlo.
- **Deshacer dictado** revierte la última inserción si el campo no cambió después. Los cambios de idea y diseño quedan en el historial local del proyecto y alimentan el boceto por los mecanismos existentes; no se envían respuestas a un servidor como avance automático.
- Cancelar, cambiar de etapa, ocultar la pestaña, cerrar un apartado que contiene el campo o desmontar el componente invalida la operación. Las respuestas tardías no se incorporan. Un fallo permite reintentar explícitamente el audio conservado en memoria o descartarlo.
- No hay carga de archivos, reproducción previa ni botón «Ordenar texto» en este flujo actual. Si el navegador no permite grabar, la alternativa visible es escribir.

## Dictado e IA generativa son operaciones distintas

El dictado usa `whisper-large-v3-turbo` para transcribir en español. Solo envía el audio: no manda al proveedor el texto anterior del campo, el proyecto completo ni una instrucción para reescribirlo. La voz puede contener datos personales y no se anonimiza antes del envío.

El panel **NEXI · dale forma a tu idea** es otra consulta, opcional y con autorización separada. Puede resumir respuestas, proponer alcance, exclusiones, preguntas, riesgos, criterios y decisiones visuales. Las sugerencias solo cambian el boceto cuando se aceptan y se pueden deshacer. El análisis interno de administrador/equipo no modifica la solicitud original, precios ni contratos.

El chat general de NEXI sigue siendo una guía local por reglas. No equivale al panel generativo. Tampoco existe una narración automática y persistente que se genere al enviar la cotización, ni generación libre de HTML/CSS, imágenes o un frontend terminado.

## API y límites vigentes

- Disponibilidad: `GET /api/quote-ai/audio/dictation-config`.
- Transcripción por campo: `POST /api/quote-ai/audio/dictate`; archivo y `field`, `consent`, `policyVersion`. El servidor valida origen permitido y política antes de consultar al proveedor.
- Máximo de 60 segundos y 4 MB (4,194,304 bytes). La captura deja aproximadamente un segundo de margen; la duración se verifica con la respuesta del proveedor.
- Dictado: 20 intentos al día UTC y 4 por minuto por conexión; 60 diarios y 6 por minuto globales. El proveedor puede limitar antes. Los intentos fallidos o cancelados pueden consumir cuota y no hay reintentos automáticos.
- Consulta al proveedor: hasta 25 segundos en servidor; espera de transcripción de hasta 30 segundos en navegador. Respuesta de audio limitada a 16 KB. La comprobación inicial de disponibilidad tiene un límite de 8 segundos y puede fallar durante un arranque lento del servidor.
- Los contadores reutilizan la migración 008 y no contienen la IP en claro, el audio ni los textos. TUKNEX no archiva la grabación en disco, base de datos ni almacenamiento del navegador. Un audio fallido permanece temporalmente en memoria para un reintento hasta cancelarlo o salir; no se garantiza borrado instantáneo de memoria ni de sistemas externos.

## Compatibilidad anterior

`QuoteAudio`, las API `audio/config`, `audio/transcribe` y `audio/organize`, y los contratos antiguos siguen en el código para compatibilidad. El panel anterior permitía subir/escuchar un archivo y revisar una propuesta de reescritura para cuatro campos. **No está montado en el cotizador público vigente** y sus límites de cinco intentos por conexión no describen el dictado actual de 20 campos. No usar esa interfaz antigua como guía de activación o como funcionalidad ya disponible.

## Evidencia de la auditoría

- Prueba real de texto generativo, realizada por el agente principal vía Netlify con datos sintéticos: HTTP 201 en aproximadamente 4.6 segundos. Conservó 25 platos, WhatsApp, exclusión de pagos/cuentas y paleta azul/blanco.
- Prueba real de transcripción: voz sintética Windows Sabina, 8.59 segundos y aproximadamente 275 KB, HTTP 201. Conservó pollería, 25 platos, WhatsApp y «No quiero pagos en línea». Los 25.1 segundos totales incluyen arranque/red; no representan solo inferencia. Evidencia local: `.qa-release-audit/real-audio-result.json`.
- Estas pruebas demuestran respuestas reales de las API en ese momento; no verifican un micrófono físico, permisos del navegador, acento peruano, ruido ni todos los dispositivos.
- Regresiones nuevas con proveedor falso: diez pruebas Node de límites/cierre de streams y metadatos ASR malformados. Antes del arreglo fallaban nueve y pasaba una; después pasan las diez. Archivo: `backend/scripts/test-ai-provider-boundaries.mjs`; evidencia `.qa-ai-audit/provider-boundaries-before.log` y `provider-boundaries-after.log`. No usan base real ni llamadas al proveedor.
- Las pruebas existentes de dictado, captura y proyecto cubren inserción íntegra, edición concurrente, deshacer, cancelación y resultados tardíos. Deben mantenerse junto con la evaluación semántica real.

Antes del lanzamiento, probar micrófono y permiso reales, negación, cantidades, nombres, red caída, cuotas y salida de etapa, manteniendo siempre la alternativa escrita. Una transcripción válida no garantiza fidelidad semántica en todos los casos.
