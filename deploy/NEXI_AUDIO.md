# Activar y comprobar el dictado del cotizador

Esta guía describe el flujo actual: **Dictar** en cada respuesta de texto. No existe un panel público para subir/escuchar archivos y ordenar la transcripción. El dictado añade texto literal; la ayuda generativa de NEXI requiere otra consulta y autorización. [Capacidades y evidencia](../docs/AUDIO_COTIZADOR.md).

## Configuración requerida

Referencia del backend; esta auditoría no cambia variables ni publica versiones:

| Variable | Valor requerido |
|---|---|
| NEXI_AI_ENABLED | true |
| NEXI_AI_PROVIDER | groq |
| NEXI_AI_MODEL | openai/gpt-oss-120b o openai/gpt-oss-20b |
| NEXI_AUDIO_ENABLED | true |
| NEXI_AUDIO_MODEL | whisper-large-v3-turbo |
| GROQ_API_KEY | Clave privada de la cuenta Groq, solo en backend |

La API comprueba flags, proveedor/modelo permitido y clave no vacía para devolver `enabled:true`. Eso no valida por sí solo la clave contra Groq ni garantiza cuota disponible. No colocar claves en `NEXT_PUBLIC_*`, capturas o Git. La aplicación no habilita facturación ni cambia de proveedor automáticamente; las condiciones de uso corresponden a la cuenta de la clave.

En Render las variables pertenecen al servicio backend. La configuración local es independiente y se carga desde `backend/.env`. El frontend necesita apuntar a la API correcta mediante `NEXT_PUBLIC_API_URL`; en desarrollo local normal usa `http://127.0.0.1:4000`. Mantener el mismo hostname en frontend y backend y su origen incluido en `CORS_ORIGINS`.

Para revisar localmente con la configuración y base local ya preparadas, se necesitan ambas terminales:

```powershell
cd D:\TUKNEX\backend
npm run dev
```

```powershell
cd D:\TUKNEX\frontend
npm run dev
```

No ejecutar de nuevo setup ni crear otra base solo para activar audio. Tras cambiar variables, reiniciar el servidor correspondiente y recargar el cotizador. Para una API local, comprobar `http://127.0.0.1:4000/api/quote-ai/audio/dictation-config`.

Para el sitio publicado, comprobar [dictation-config](https://tuknex.netlify.app/api/quote-ai/audio/dictation-config). Debe responder 200, `enabled:true`, la política compatible y los límites, sin credenciales. La URL antigua `audio/config` corresponde al panel de compatibilidad y muestra otros límites.

La vista estática de auditoría `http://127.0.0.1:3305` usa un fixture que desactiva las operaciones de audio a propósito. No demuestra una avería del micrófono ni queda conectada al backend real por iniciar el puerto 4000.

## Primera prueba del usuario

1. Abrir el cotizador en su dominio HTTPS o en el entorno local compatible. La aplicación exige contexto seguro, `getUserMedia` y `MediaRecorder`; el micrófono no se activa al cargar.
2. Ir a una pregunta de texto y leer «Límites y uso de tu voz». Pulsar **Dictar** y permitir el micrófono en el navegador.
3. Decir una respuesta ficticia corta. Pulsar **Detener**, o esperar el límite. Esa captura se envía para transcribirla; no hay un segundo botón «Transcribir audio».
4. Verificar que el texto se añadió al campo conservando lo anterior. Revisar nombres, cantidades y negaciones. Corregir o pulsar **Deshacer dictado** si el campo no se modificó después.
5. Para pedir un resumen o ideas visuales, abrir aparte el panel generativo NEXI, autorizar la consulta y analizar. Revisar las sugerencias antes de aplicar una al boceto. El dictado por sí solo no ordena la idea con un segundo modelo.

Caso sintético: «Tengo una pollería. Quiero mostrar 25 platos y recibir pedidos por WhatsApp. No quiero pagos en línea». Comprobar especialmente 25 y la negación. No usar datos reales de clientes en una primera prueba.

Si aparece «No pudimos comprobar el dictado», verificar que la API responde y usar **Volver a comprobar dictado**; un servidor que está arrancando puede superar los 8 segundos de la comprobación inicial. Si `enabled:false`, revisar la configuración del backend y recargar después de habilitarla. Si el permiso está bloqueado, el dispositivo está ocupado o el navegador no puede grabar, la aplicación informa el motivo y permite escribir.

## Límites y tratamiento

- Máximo 60 segundos y 4 MB; el formulario ofrece dictado en 20 campos. No admite subir un archivo como alternativa visible actual.
- Por conexión: 20 intentos diarios UTC y 4 por minuto. Global: 60 diarios y 6 por minuto. Una red compartida puede compartir límite. El proveedor puede rechazar antes; una operación fallida/cancelada puede consumir cuota.
- Captura, audio y reintento permanecen temporalmente en memoria; no se guarda una grabación en disco, base o sessionStorage. La voz se envía a Groq y no se anonimiza. La conservación externa depende de los controles vigentes del proveedor.
- Cancelar, ocultar la pestaña, cambiar de etapa, cerrar el apartado o desmontar invalida la captura/consulta. No se incorporan resultados tardíos. Un fallo no borra respuestas escritas y permite reintentar explícitamente o descartar.
- Solo se envía el audio al transcriptor, sin texto anterior ni proyecto completo. El texto incorporado sigue las reglas del formulario/historial local y del guardado explícito de solicitud; dictar no envía una solicitud, crea contratos ni acepta pagos.
- Servidor: hasta 25 segundos y respuesta máxima 16 KB; navegador: espera de hasta 30 segundos para transcripción. Cancelar intenta abortar la llamada, sin garantizar devolución de consumo externo.

## Evidencia y pendientes

La auditoría comprobó una consulta generativa real HTTP 201 (~4.6 s) y una transcripción real HTTP 201 de voz sintética Windows Sabina: 8.59 s/~275 KB; conservó pollería, 25 platos, WhatsApp y «No quiero pagos en línea». La operación completa de audio tardó 25.1 s, incluyendo arranque/red. No repetir esos ensayos automáticamente ni presentarlos como prueba de micrófono físico o de todos los acentos/navegadores.

Pendientes antes de declarar completa la experiencia de voz: micrófono físico y permisos, ruido, acento peruano, nombres/cifras/fechas, móvil, cancelar durante permiso, salida de etapa y cuota agotada. La narración automática revisable y persistente sería una función futura distinta, con confirmación explícita; no se activó en esta revisión.

Referencias oficiales consultadas para compatibilidad:
- [Transcripción y modelos Groq](https://console.groq.com/docs/speech-to-text).
- [Respuestas estructuradas y modelos compatibles](https://console.groq.com/docs/structured-outputs).
