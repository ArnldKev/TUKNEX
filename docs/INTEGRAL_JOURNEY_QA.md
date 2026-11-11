# Recorrido integral aislado

`backend/scripts/test-integral-journey.mjs` arranca `createApp()` real con todas sus rutas, filtros, permisos, cookies, migraciones y generación de PDF. Bloquea la carga de `.env`, elimina credenciales de producción heredadas y utiliza PGlite en un directorio temporal. Intercepta las únicas llamadas permitidas a Groq y Resend con respuestas sintéticas; cualquier otra petición externa falla.

Última ejecución: **87 comprobaciones aprobadas de HTTP y modelo compartido**. Evidencias: `.qa-integral/integral-journey-tests.log` y `.qa-integral/integral-journey-results.json`.

## Flujo comprobado

1. Disponibilidad del cotizador/IA por API.
2. Escritura en el modelo compartido con deshacer y rehacer.
3. Serialización y recuperación del modelo, sin crear una solicitud.
4. «Ordenar mi idea» con respuesta estructurada de IA simulada, conservando cantidades y negaciones.
5. Interpretación aprobada representada explícitamente en el modelo de envío.
6. Registro, perfil, solicitud explícita e idempotencia del envío.
7. Aviso durable al administrador: proveedor de correo simulado falla, conserva el aviso, se reintenta y confirma la entrega simulada.
8. Asignación de desarrollador y acceso a la solicitud correcta.
9. Informe NEXI persistente, revisión humana y cotización formal con precio fijado por el equipo.
10. Solicitud de cambios por el cliente y bloqueo de otro cliente.
11. Nueva versión formal que conserva la versión y respuesta anteriores.
12. Confirmación idempotente de la propuesta, separada del contrato.
13. Contrato virtual creado desde la propuesta confirmada y enviado expresamente.
14. Descarga HTTP del PDF de revisión; SHA-256 de sus bytes igual al revisado; aceptación autenticada de esa versión, firma del emisor y activación.
15. Hito, próxima acción y tarea del cliente publicados sin las notas internas.
16. Reporte de pago multipart con comprobante privado; saldo intacto mientras está pendiente.
17. Lectura administrativa del archivo exacto y confirmación idempotente.
18. Instantánea de cuenta con una sola aplicación de pago y saldo correcto.
19. Descarga por HTTP de PDFs de solicitud, propuesta y contrato, además del comprobante; acceso de otra cuenta denegado.
20. Entrega con hito completado y fecha de registro, separada del estado financiero.
21. Opinión real de la cuenta sintética, con consentimiento y moderación pendiente; no se publica automáticamente.

Se completan DNI/RUC y direcciones **sintéticos** mediante los formularios/API normales antes de emitir documentos. El test conserva la validación que exige datos completos de las partes antes de enviar contratos.

## Qué no acredita esta prueba

Los pasos de entrada visual, escritura real en campos, micrófono físico, permisos de audio, persistencia efectiva en `sessionStorage`, clic de aprobación y experiencia responsive requieren navegador. Los pasos 1–3 y 5 identifican expresamente su cobertura parcial/modelo, no una aprobación visual. Tampoco se verifican calidad o latencia del proveedor real, correo recibido en una bandeja real ni renderizado de un PDF descargado dentro del navegador. Se verifican los bytes y hash obtenidos por HTTP.

No se declara un E2E de navegador completo ni una prueba de producción. No se conectó a Neon ni se envió correo real.

## Ejecución local

Desde `D:\TUKNEX\backend`:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.build.json --outDir .qa-journey-dist
$env:QA_BACKEND_DIST = '.qa-journey-dist'
node scripts/test-integral-journey.mjs
```

El modo normal cierra la aplicación y elimina el directorio temporal al finalizar, tanto en éxito como en error.

Para revisión visual local autorizada:

```powershell
node scripts/test-integral-journey.mjs --serve
```

Solo si pasa el recorrido completo conserva el servidor en `127.0.0.1:4406`. Guarda URL, IDs y credenciales exclusivamente sintéticas en `.qa-integral/journey-fixture.json`. El frontend de prueba puede usar el proxy de `3321` hacia esa API; se admiten los orígenes locales 3000 y 3321. Antes de esperar la revisión visual, el modo --serve vacía únicamente las cuotas de IA de esta base sintética, después de aprobar todos los checks. Los límites y cuotas del producto permanecen intactos. El proceso maneja SIGINT/SIGTERM para cerrar Nest y PGlite y eliminar su directorio temporal. Una interrupción forzada del runner puede evitar finally: en ese caso se debe comprobar que el puerto 4406 está libre y eliminar exclusivamente la ruta temporal del fixture, verificando que su directorio padre es el Temp del usuario, su nombre empieza por tuknex-integral-journey- y no es un enlace. No dejarlo ejecutando al terminar la revisión visual. No reutilizar esas credenciales o datos como configuración de producción.

## Pruebas focales complementarias

- Asociaciones: 53 comprobaciones HTTP (`test-client-associations.mjs`).
- Reportes de pago: 97 comprobaciones HTTP (`test-payment-reports.mjs`), incluyendo archivos, IDOR, alias, saldo, historial, cancelación del contrato, doble clic y confirmación repetida.
- Seguimiento: 60 comprobaciones HTTP (`test-project-tracking.mjs`), incluyendo subadministrador asignado/ajeno, notas filtradas, versión obsoleta, entrega, canonicalización financiero/equipo y borradores financieros ocultos. Los proyectos del equipo vinculados directamente a la solicitud propia sí muestran campos públicos antes del contrato; no publican sus documentos en borrador.

Estas suites usan bases temporales independientes y sus logs están en `.qa-integral`.
