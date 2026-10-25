# COT-05: activar respuestas por audio
Implementación local; publicación y prueba con voz real pendientes. Continúa COT-04, que el usuario confirmó funcional.

## Publicar
Desde PowerShell copia solo las líneas del bloque:
```powershell
cd D:\TUKNEX
git add backend frontend docs deploy DESIGN.md UX-CONTRACT.md
git commit -m "Agregar respuestas por audio revisables al cotizador"
git push
```
La .dockerignore preexistente queda fuera del cambio. No se añade una migración nueva: se reutilizan los contadores de la migración 008. Render y Netlify deben publicar este commit antes de activar el audio.

## Render
Servicio tuknex-backend → Environment → Environment Variables:
| KEY | VALUE |
| --- | --- |
| NEXI_AUDIO_ENABLED | true |
| NEXI_AUDIO_MODEL | whisper-large-v3-turbo |

Mantener NEXI_AI_ENABLED=true, NEXI_AI_PROVIDER=groq, NEXI_AI_MODEL y GROQ_API_KEY ya funcionales. Se reutiliza la clave privada; no agregar claves al frontend ni a Netlify. Guardar y desplegar. Usar la cuenta Free de Groq; no habilitar Developer, facturación ni otro proveedor para esta prueba. La disponibilidad exacta depende de la cuenta.

Abrir [configuración pública de audio](https://tuknex.netlify.app/api/quote-ai/audio/config). Debe mostrar enabled true y límites, sin credenciales. No hace falta cambiar Neon, DATABASE_URL, usuarios o contratos. Para desactivar nuevas consultas, NEXI_AUDIO_ENABLED=false y volver a desplegar; lo ya confirmado permanece.

## Prueba del cliente
1. En el cotizador, abrir «Prefiero contarlo por audio».
2. Elegir qué respuesta dictar. Pulsar Grabar y aceptar el permiso del micrófono, o subir un audio corto.
3. Hablar, detener y escuchar. Máximo un minuto / 4 MB. Cancelar no envía una grabación.
4. Autorizar el envío a Groq y pulsar Transcribir audio. Todavía no cambia el cuestionario.
5. Corregir la transcripción. Opcionalmente autorizar el envío del texto y pulsar Ordenar texto con NEXI.
6. Comparar el original, las correcciones y la propuesta. Confirmar una versión con Usar mi transcripción o Usar texto ordenado. Reemplaza únicamente la respuesta elegida y permite Deshacer.
7. Comprobar que el boceto refleja la respuesta. Si editas el cuestionario mientras revisas el audio, no se permite aplicar un resultado antiguo.

Ejemplo ficticio: «Tengo una pollería. Quiero mostrar 25 platos y que me escriban por WhatsApp. No quiero pagos en línea. El negocio se llama El Gringo». Verificar nombres, cifra 25 y la negación tanto en transcripción como en redacción propuesta. No usar datos reales de clientes para la primera prueba.

## Micrófono y navegadores
Se usa MediaRecorder en HTTPS (o localhost de pruebas), escogiendo un formato soportado por el navegador. No se usa reconocimiento de voz del sistema ni se activa el micrófono al cargar la página. Permitir micrófono solo en la pestaña del cotizador que tú abras.

Matriz pendiente de prueba física: Chrome/Edge de escritorio y Android; Safari/iPhone con MP4. Si la grabación no está soportada, quedan subir audio y escribir. No se ha confirmado compatibilidad real en todos esos dispositivos. En archivos, formatos de esta entrega: WebM, MP4/M4A, Ogg y WAV; MP3 todavía no se admite.

La parada automática deja aproximadamente un segundo de margen antes del límite del proveedor. Detener libera el micrófono al finalizar el evento de grabación. Cancelar, cerrar el apartado, salir del paso o desmontar libera recursos y descarta el audio no confirmado. Al ocultar la pestaña se detiene la captura para revisión; no se transcribe automáticamente. Revisa permisos del navegador si se denegó el acceso.

## Datos y límites
- La voz se envía a Groq solo tras autorizar y transcribir. Esta función no anonimiza la voz antes de enviarla; evita dictar datos personales o confidenciales.
- TUKNEX no escribe archivos de audio en disco, base de datos ni almacenamiento del navegador. El audio y los textos en revisión viven temporalmente en la página/memoria del servidor; cerrar o descartar elimina las referencias locales. No supone borrado instantáneo garantizado de memoria o del proveedor.
- Para ordenar se envía solo el campo elegido y el texto corregido. Se ocultan correos, enlaces y números reconocibles según las reglas existentes; comprueba que no se haya eliminado una cantidad importante. La transcripción original queda visible en la página mientras la revisas.
- Solo la versión textual que confirmes pasa al historial, borrador compartido autorizado y eventual solicitud. El administrador ve el texto confirmado; no hay archivo de audio, transcripciones rechazadas o informe IA persistente.
- La conservación por Groq se rige por sus controles. No conserva inferencia por defecto, con excepciones de fiabilidad/abuso; revisar Data Controls y Zero Data Retention según las necesidades del servicio. [Política oficial de datos](https://console.groq.com/docs/your-data).
- Por acción (transcribir / ordenar): 20 intentos globales al día UTC, 2 por minuto; visitante 5 al día y 1 por minuto. El identificador por conexión y día es HMAC; conexiones compartidas pueden compartir límite. Los intentos fallidos/cancelados consumen reserva; no hay reintentos automáticos.
- Tamaño multipart máximo 4 MB, un archivo, tres campos de permiso; inspección básica de cabecera y MIME. El proveedor valida el medio. La duración de archivos se comprueba con la respuesta del proveedor: un archivo manipulado puede alcanzar el proveedor antes de ser rechazado por durar más de un minuto.
- Tiempo de consulta: 25 segundos servidor / 30 navegador; respuesta máxima 16 KB. La cancelación intenta abortar, sin garantizar reversión del consumo remoto.
- No crea contratos ni fija precios ni transforma dictado en aceptación contractual. La estimación explicada es COT-06.

## Evaluación antes de darlo por validado en producción
Probar voz peruana con y sin ruido, nombres de negocios, números (25, 250, 2,500), fechas y «no quiero». Comparar ambas versiones antes de confirmar; no hay garantía automática de equivalencia semántica. Probar permiso denegado, cancelar durante permiso, grabación vacía, salir de paso, archivo largo, cuota agotada y red caída. Confirmar que escribir siempre sigue disponible.

Referencias verificadas el 25-10-2026:
- [Transcripción y modelos Groq](https://console.groq.com/docs/speech-to-text).
- [Límites del proveedor](https://console.groq.com/docs/rate-limits).
- [Captura de micrófono y requisitos de contexto seguro](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder).

