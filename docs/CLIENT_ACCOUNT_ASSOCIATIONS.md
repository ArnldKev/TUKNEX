# Cuentas registradas y fichas administrativas

La migración `012_client_associations.sql` añade asociaciones de acceso explícitas. No fusiona fichas ni cambia `usuarios.cliente_id`: una cuenta conserva su ficha principal y puede acceder además a fichas manuales revisadas por administración. Los documentos emitidos, nombres, DNI y evidencias de contratos aceptados permanecen como se guardaron originalmente.

Solo el administrador principal activo puede buscar cuentas y proponer, confirmar o revocar asociaciones. La búsqueda admite nombre, DNI y correo y devuelve únicamente cuentas de clientes activas. Una coincidencia no crea una asociación. La ficha principal de cualquier cuenta está protegida contra transferencia por este flujo.

## Revisión y confirmación

1. En el detalle de la ficha, abrir «Asociar una cuenta existente».
2. Buscar y seleccionar una cuenta; revisar identidad y documentos afectados.
3. La API devuelve una revisión con token, versión, caducidad de 10 minutos y huella de ficha, cuenta, asociación y documentos.
4. Confirmar expresamente y registrar motivo (10–500 caracteres).
5. El backend vuelve a verificar permisos, cuenta activa, versión y huella. Si cambió el contexto, rechaza la operación y exige otra revisión.
6. Cada cambio queda en historial inmutable y auditoría, con autor, motivo y resumen. Repetir una confirmación válida no duplica el cambio.

La revisión enumera solicitudes, cotizaciones, contratos, pagos aplicados y reportes de pago. Dar acceso permite consultar documentos publicados y aceptar contratos virtuales pendientes de esa ficha; se explica antes de confirmar. Revocar elimina el acceso adicional inmediatamente y conserva los registros. Se puede revocar incluso si la cuenta fue desactivada.

## API

- `GET /api/billing/client-accounts?search=`
- `GET /api/billing/clients/:id/account-association`
- `POST .../preview`: `{userId, action: "link" | "unlink"}`
- `POST .../confirm`: `{previewId, confirmed: true, reason}`

El componente `ClientAccountAssociation({clientId,onChanged?})` se integra en el detalle de ficha administrativa. El helper `allowedClientIds(sql,actor)` en `backend/src/auth/client-access.ts` verifica la cuenta activa y devuelve la ficha principal más las asociaciones activas. Consultas de portal, solicitudes, PDFs, comprobantes, aceptación virtual, seguimiento y reportes usan ese límite lógico. Editar el perfil sigue afectando únicamente a la ficha principal.

`GET /api/account/overview` reúne perfil, solicitudes, cotizaciones, contratos, cuotas y pagos en una sola sentencia SQL e incluye `updatedAt`. Esa instantánea no mezcla versiones de varias consultas independientes.

## Validación local

`backend/scripts/test-client-associations.mjs` levanta una aplicación Nest aislada y PGlite temporal, sin leer la configuración de producción. Incluye nombres iguales, correos compartidos, ficha manual creada antes de la cuenta, revisión caducada o modificada, permisos, acceso a PDFs y comprobantes, inmutabilidad de identidades y revocación.

Puede compilarse fuera de `dist` y ejecutar con `QA_BACKEND_DIST=.qa-payment-dist`. La evidencia de ejecución está en `.qa-integral/client-associations-tests.log`. La migración y las rutas no se han aplicado ni probado contra Neon real en esta tarea. Antes de producción se requiere respaldo probado y la revisión normal del despliegue.
