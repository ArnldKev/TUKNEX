# Reportar pagos y revisión administrativa

La migración `016_payment_reports.sql` agrega reportes de pago, decisiones idempotentes e historial inmutable. El módulo reutiliza `comprobantes`, el cálculo de saldos y `BillingService.recordPayment`; no añade proveedores ni modifica automáticamente el precio de contratos.

## Flujo operativo

El cliente elige un contrato publicado con cuotas pendientes, opcionalmente una cuota específica, e indica importe, fecha, medio, referencia y un comprobante. Se guarda «Por revisar». Un reporte pendiente, observado o rechazado **no genera un pago ni disminuye la deuda**.

El administrador principal revisa el comprobante privado y registra un motivo visible para el cliente:

- **Confirmar:** revisa otra vez versión y saldo, registra el pago, distribuye el importe a la cuota elegida o a las pendientes por vencimiento y cambia el reporte a confirmado, dentro de la misma transacción.
- **Solicitar corrección:** conserva el saldo y permite corregir/reemplazar el comprobante y reenviar una nueva versión.
- **Rechazar:** conserva el saldo y el historial. Ese reporte ya no se edita; el cliente puede emitir uno nuevo con la información correcta.

El cliente consulta estado, respuesta de administración, comprobante e historial desde el detalle. Los pagos confirmados también aparecen en el historial de pagos existente. Si el resumen de cuenta no se consigue actualizar después de guardar, se informa; no se confunde ese fallo con un envío fallido.

## Validaciones y privacidad

- Cuenta activa de cliente y ficha principal o asociación explícita vigente, verificadas en cada lectura y operación.
- Solo administración principal confirma, observa o rechaza; el subadministrador no aplica pagos mediante estas rutas.
- Importe positivo en céntimos, fecha no futura y cuota perteneciente al contrato. Se comprueba el saldo al reportar y de nuevo al confirmar. Un contrato cancelado o finalizado no admite confirmación de nuevos pagos.
- Adjuntos obligatorios al crear; PDF, PNG o JPEG reconocidos por firma de bytes y máximo 5 MB. El MIME declarado no basta. Nombres saneados; archivos almacenados de forma privada, sin URL pública.
- Clave UUID de reintento por envío; clave de decisión, versión y motivo por revisión. Duplicados de contenido y comprobante del mismo contrato se detectan incluso entre cuentas expresamente vinculadas a la ficha.
- Un doble clic o reintento no aplica dos pagos. Si cambió el saldo, falla la transacción completa y el reporte sigue pendiente.
- Las correcciones conservan el archivo anterior en almacenamiento y el ID anterior en el historial; el detalle descarga el comprobante vigente. El autor original del reporte permanece inalterado y cada corrección identifica a su actor. Una nueva cuenta explícitamente autorizada para esa ficha puede corregir un reporte observado sin reescribir la autoría original.
- Historial y decisiones impiden UPDATE/DELETE mediante triggers. La confirmación referencia el pago aplicado, con la idempotencia financiera existente.
- Envío y corrección dejan avisos en la bandeja de salida durable, dentro de la transacción. Estas pruebas no enviaron correos.

## API e integración

Cliente: `GET/POST /api/account/payment-reports`, `GET/PATCH /:id`, `GET /:id/receipt`.

Administración: `GET /api/billing/payment-reports`, `GET /:id`, `POST /:id/decision`, `GET /:id/receipt`.

Crear y corregir usan `multipart/form-data`: campo `data` con JSON y campo `file` con comprobante. Crear exige `contractId,idempotencyKey,amountCents,date,method,reference,observation`; `installmentId` es opcional. Corregir usa `version` y no permite cambiar el contrato. Decidir usa `{idempotencyKey,version,action,reason}`, con `action` confirm/observe/reject. Las descargas exigen sesión, comprueban acceso y llevan `no-store` y `nosniff`.

Componentes:

- `PaymentReportPanel({contracts,installments,onChanged?})`, portal de pagos del cliente.
- `AdminPaymentReportsInbox({onChanged?})`, pagos administrativos.
- `PaymentReportContent` y `PaymentReportProof`, detalles e imágenes/PDF privados.

Las listas reutilizan `RecordList` y `RecordDetail`; formularios legibles, estados con texto y color, navegación de teclado y controles mínimos de 44 px. Peticiones con límite de espera y cancelación al desmontar; refrescar no sobrescribe lo que el usuario escribe.

## Pruebas y límites

La suite `backend/scripts/test-payment-reports.mjs` levanta HTTP real sobre Nest y PGlite temporal, aplica migraciones y crea datos sintéticos aislados. Se ejecuta con `QA_BACKEND_DIST=.qa-payment-dist` después de compilar a ese directorio. Evidencia: `.qa-integral/payment-reports-tests.log`.

Incluye validación de archivos y tamaño, permisos de cliente/admin/subadministrador, IDOR de comprobantes, corrección y versiones obsoletas, reintentos, doble clic concurrente, historial inmutable, saldos intactos sin confirmar, confirmación atómica, comprobante en historial existente y rollback cuando otro pago cambió el saldo. También cubre fichas asociadas y pérdida de acceso tras revocación. La comprobación de tipos del frontend pasó.

La UI integrada requiere la prueba de navegador descrita en la revisión integral. No se han enviado comprobantes reales, aplicado migraciones en Neon, usado proveedores de pago, enviado correos ni desplegado en Render/Netlify. La administración sigue siendo responsable de verificar que el abono efectivamente fue recibido.
