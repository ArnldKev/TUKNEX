# COT-05 — Audio revisable
Fecha de entrega local: 25-10-2026. Plan: [decisiones](COT-05_AUDIO_PLAN.md). Activación y evaluación real: [guía](../deploy/NEXI_AUDIO.md).

## Comportamiento
Panel opcional al pie de las preguntas. Se elige qué respuesta dictar, se graba o sube un archivo, se escucha localmente y se autoriza su transcripción. La transcripción recibida queda disponible como referencia; el usuario puede corregirla. Ordenar con NEXI requiere otra autorización. Ambas versiones son propuestas hasta que se elige una para reemplazar exclusivamente el campo seleccionado.

Los campos son oferta, problema, otras funciones y primera impresión. Primera impresión pertenece al diseño del proyecto; los demás a las respuestas. La aceptación valida el formulario actual y la revisión, conserva contactos, registra la procedencia y permite deshacer. Cambiar el proyecto invalida la aplicación de una revisión antigua. No se fija precio, añade alcance ni firma un contrato por dictar.

El micrófono no se activa al cargar. Permiso del navegador tras Grabar; detener, cancelar, cerrar o salir libera recursos. Ocultar la pestaña detiene para revisión, sin envío automático. Cancelar durante una autorización pendiente evita que un permiso tardío reinicie la grabación. La captura deja margen de aproximadamente un segundo antes del límite de 60 s.

## Servidor y datos
Groq whisper-large-v3-turbo para transcribir en español y el modelo textual ya configurado para ordenar. Endpoints fijos, sin URLs de audio aportadas por el cliente, herramientas ni llamadas pagadas alternativas. Bandera de audio desactivada por defecto y clave solo en backend.

Multipart: un archivo, 4 MB, tres campos de permiso; formato básico por MIME y cabecera. La duración se comprueba con la respuesta del proveedor; no se presenta como validación previa al envío de archivos manipulados. TUKNEX no archiva audio, ni transcripciones rechazadas, ni informes generados. El borrador/solicitud existentes reciben solo texto confirmado con las autorizaciones ya previstas. La conservación externa depende de Groq y sus Data Controls.

Contadores persistentes reutilizan migración 008, aislados por acción de audio. Global 20/día UTC y 2/min; conexión 5/día y 1/min por acción. HMAC diario, sin IP en claro, audio o texto en los contadores; limpieza existente de 48 h. Cancelar intenta abortar la llamada sin devolver reserva ni garantizar reversión de consumo remoto. El servidor comprueba desconexión también después de esperar la transacción de cuotas.

## Evidencia local
- Pruebas escritas primero: fallaron por contrato ausente y HTTP 404; luego pasaron tras implementación.
- Frontend completo: 105 pruebas de modo real + 13 de modo demostración, sin fallos. Incluye permiso denegado simulado, cancelación durante permiso, limpieza al salir, límite temporal y tamaño, revisión antigua, texto inválido, campo visual y deshacer.
- Backend completo: sin fallos; 47 comprobaciones específicas de audio con PGlite temporal y proveedor simulado. Permiso/origen, formato/tamaño, ASR separado de ordenado, duración/silencio, errores, respuesta excesiva, cuotas concurrentes y desconexión durante SQL. Ninguna llamada real a Groq en estas pruebas.
- Tipos y lint: verificados. Auditoría estática estricta de UI: cero hallazgos.
- Revisión independiente de código: detectó un P2 en el campo visual firstImpression; se reprodujo con prueba fallida y se corrigió en ambos contratos. Prueba verde posterior.
- Navegador de escritorio: carga de WAV sintético, consentimiento, transcripción, propuesta separada, confirmación y deshacer; boceto actualizado únicamente tras confirmación.
- Compilación de publicación final: correcta, 38 páginas exportadas. Permanece el aviso previo de Next sobre su plugin de ESLint; no impide compilar.
- Navegador final a 375 px: controles dentro del panel (select termina a 312 px dentro de un panel de 325 px), sin desplazamiento horizontal. Textareas con resize:none y altura mínima de 144 px. Error simulado y cancelación conservaron el texto. Confirmación del campo visual incorporada correctamente.
- Navegador de escritorio a 1280 px: panel y boceto visibles juntos; no desborde horizontal. Capturas de evidencia guardadas en el directorio de visualizaciones de la sesión.

## Límites de esta evidencia
La simulación acredita contratos y comportamiento, no calidad acústica. Pendientes al publicar: modelo real con clave privada, micrófono físico/permiso real, español peruano, ruido, nombres/cifras/fechas y dispositivos Safari/iPhone/Android. No se declara COT-05 validado en producción. La interfaz escrita sigue disponible.

