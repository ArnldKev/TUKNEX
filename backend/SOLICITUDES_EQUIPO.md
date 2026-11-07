# Solicitudes preparadas por el equipo

El administrador y los subadministradores pueden completar el cotizador real y guardar una solicitud preliminar antes de conocer la cuenta del cliente. No se crea ni se modifica ninguna cuenta con esta operación.

## Modelo y permisos

- `createdById` es el autor inmutable. `userId` y `clientId` son el destinatario, inicialmente nulos. El nombre y correo originales del formulario permanecen en `values`; `clientName` y `clientEmail` identifican la cuenta vinculada real.
- Cada solicitud de equipo crea su proyecto. Un subadministrador queda responsable; una solicitud del administrador queda sin responsable hasta asignarla con el flujo de equipo existente.
- El administrador ve todo. Un subadministrador solo ve y gestiona solicitudes del proyecto del que es responsable actualmente. Ser creador histórico no permite mantener acceso después de una reasignación.
- Antes de vincular una cuenta no se pueden emitir cotizaciones formales, contratos ni conversiones desde ese proyecto.
- Solo se vinculan cuentas registradas, activas y con rol cliente. La búsqueda exige correo completo y devuelve únicamente identidad mínima: sin DNI, contraseña ni acceso al directorio global.
- Una vinculación no se transfiere ni se elimina. No mueve cotizaciones, contratos firmados, cuotas o pagos. Si hubo un error de destinatario, requiere evaluación privada; no se cambia por una acción automática.

## HTTP

Todos los endpoints nuevos requieren sesión del equipo y los mismos controles de origen existentes.

| Método / ruta | Cuerpo o consulta | Resultado |
|---|---|---|
| POST `/api/team/quote-requests` | `{ values, idempotencyKey }` | Solicitud creada; mismo contrato de preguntas, validación, precios y PDF preliminar |
| GET `/api/team/quote-requests` | — | Array dentro del scope actual |
| GET `/api/team/quote-requests/:id` | — | DTO completo autorizado |
| PATCH `/api/team/quote-requests/:id` | `{ status }` | pending, reviewing, quoted o closed; incrementa revision si cambia |
| GET `/api/team/quote-requests/:id/pdf` | — | PDF preliminar original |
| GET `/api/team/client-accounts?email=...` | Correo completo, insensible a mayúsculas | `[]` o `[{userId,clientId,name,email}]` |
| PATCH `/api/team/quote-requests/:id/client` | `{ clientUserId, revision }` | Vinculación explícita y atómica |

El DTO conserva id, number, userId, clientId, values, result, status, createdAt y updatedAt. Añade createdById/Name/Role, clientName/Email, clientLinked, teamProjectId, assigneeId/Name, revision, linkedAt y linkedById. `detail.request` usa ese mismo DTO; el proyecto incluye clientId nullable y clientLinked.

Después de vincular, el cliente recibe la solicitud y su PDF por los endpoints `/api/account/quote-requests` existentes. El administrador conserva `/api/billing/quote-requests`. No necesita contraseña del cliente ni un cambio en su identidad.

## Consistencia e historial

La clave idempotente pertenece al autor, incluso después de vincular la solicitud. Cambiar respuestas bajo la misma clave produce409. Dos autores pueden usar la misma clave de forma independiente.

Vincular exige la revision actual. Un cambio simultáneo a otro destinatario produce409; repetir el mismo destinatario devuelve la vinculación existente sin duplicar eventos. El vínculo actualiza solicitud y proyecto en la misma transacción y conserva las respuestas, estimación y bytes del PDF original. Se auditan autor, responsable, cambios de seguimiento y vínculo. La revisión del proyecto y la revisión de la solicitud son contadores distintos.

La migración010 agrega autoría, revisión y metadatos de vínculo; permite cliente nulo hasta asignación. Conserva los registros existentes, sustituye la unicidad por autor/clave y protege autor y destinatario con un trigger. Es repetible y mantiene compatibilidad con importaciones antiguas que solo indican usuario_id. No se aplicó a una base real durante el desarrollo.

## Verificación

`npm run test:staff-quote-requests` ejecuta migración repetida y pruebas HTTP con PGlite temporal, red externa bloqueada, proveedores desactivados y dotenv interceptado. Comprueba permisos, búsqueda mínima, idempotencia tras el vínculo, carreras, pérdida de acceso al reasignar, PDF intacto y titularidad de contrato firmado/pago sin cambios. Las pruebas completas siguen en `npm test`.
