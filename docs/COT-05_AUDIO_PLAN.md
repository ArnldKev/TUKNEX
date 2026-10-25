# COT-05 — Respuestas por audio
Fecha: 25-10-2026. Continuación autorizada del alcance COTIZADOR_GENERATIVO.md. El usuario confirma COT-04 funcional en producción.

## Decisiones
- Control único opcional debajo de las preguntas. Elegir respuesta: oferta, problema, otras funciones o primera impresión. Alternativa escrita siempre disponible.
- Grabar/detener/cancelar con permiso del navegador; archivo corto como alternativa. Máximo 60 s / 4 MB, WebM, MP4/M4A, Ogg y WAV.
- Escuchar localmente; autorización separada para enviar audio a Groq, sin almacenamiento en TUKNEX.
- Transcripción reconocida editable; ordenar con NEXI es opcional y conserva el original visible. Confirmar un texto lo incorpora a la revisión vigente y permite deshacer.
- Bandera NEXI_AUDIO_ENABLED desactivada por defecto. Reutiliza clave privada de Groq, whisper-large-v3-turbo, sin servicios de pago ni fallbacks.
- Límites persistentes por acción: global 20/día y 2/min; visitante 5/día y 1/min. Intentos fallidos/cancelados pueden consumir cuota; cancelación no garantiza reversión de consumo remoto.
- Audio no se archiva ni equivale a firma. Solo texto confirmado sigue las reglas existentes de borradores/envío.
- Duración del archivo se valida con el resultado del proveedor; tamaño y formato se comprueban antes. No asegurar que un archivo malicioso largo no alcance al proveedor.

## Ejecución y verificación
1. RED: contratos de permiso, límites, revisión vigente e integración HTTP sin llamadas reales.
2. Backend: multipart acotado, inspección básica de formato, Groq transcripción/ordenado, cancelación, cuotas, errores seguros.
3. Captura: ciclo de vida, cancelación durante permiso, límite y limpieza de micrófono.
4. Frontend: estados disponibles/no compatible/error/ocupado/revisión, confirmación explícita y resguardo ante cambios.
5. Verificar suites completas, tipos, lint, compilación y vista móvil/escritorio con datos sintéticos.
6. Entregar guía Render/Netlify y matriz honesta de pruebas reales pendientes (acento, ruido y dispositivos).

