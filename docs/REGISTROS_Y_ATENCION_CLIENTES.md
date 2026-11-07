# Registros compactos y cotización atendida por el equipo

Implementación local: 29 de octubre de 2026, rama `codex/admin-records-client-assignment`.

## Flujo de atención

1. El administrador o subadministrador entra con su propia cuenta y elige **Nueva cotización** o **Cotizar para un cliente**.
2. Completa el mismo cuestionario de seis etapas con las respuestas del cliente. El aviso **Atención de cliente** identifica este modo; los contactos opcionales pertenecen al cliente atendido y no se completan con los datos del operador.
3. Al guardar se registra la solicitud y su estimación calculada por el servidor. Se crea un proyecto de equipo: el desarrollador queda como responsable de su propia solicitud; las del titular pueden asignarse desde Equipo.
4. La solicitud queda **pendiente de cliente**, con autor, responsable, respuestas, boceto y PDF conservados. No necesita crear primero una cuenta para la persona atendida. El avance anterior al guardado sigue solo en el navegador.
5. El cliente crea su cuenta mediante el registro habitual, con sus propias credenciales. Si recibe ayuda presencial, debe conservar el control de su contraseña; la vinculación no solicita ni permite consultar contraseñas.
6. En el detalle de la solicitud o proyecto, el operador abre **Asignar cliente**, selecciona una cuenta activa del listado o la busca por **nombre, DNI o correo**. Revisa la persona seleccionada y confirma la asignación.
7. La solicitud aparece en **Mis cotizaciones** del cliente. El autor y el responsable se conservan. Con el cliente vinculado se pueden preparar propuestas comerciales y contratos del proyecto mediante los flujos existentes.

El registro financiero de un cliente y su cuenta de acceso son objetos distintos. Para esta vinculación debe existir una cuenta registrada de rol cliente; el servidor valida la relación con su registro financiero. No basta con escribir un correo en las respuestas del cuestionario.

## Listas y detalles

- Solicitudes: fila con proyecto/número, cliente, tipo, estado, rango orientativo y fecha. Búsqueda local, filtros por estado/tipo y páginas de 25 registros.
- Clientes, cotizaciones PDF, contratos, cuotas y pagos: filas compactas, búsqueda y páginas de 20 registros.
- Equipo: lista de proyectos y listas de sus cotizaciones/contratos con el mismo patrón.
- **Ver detalles** abre una vista de pantalla completa con desplazamiento propio. Se conservan acciones, descargas, edición, versiones, seguimiento y operaciones financieras según permisos.
- Cierre por botón o Escape; foco confinado al diálogo superior y restaurado al cerrar. Los editores anidados conservan el bloqueo de scroll mientras el detalle continúe abierto.

La búsqueda y paginación de listas son locales sobre los datos ya cargados. Reducen el contenido visible; no sustituyen una futura paginación del servidor para volúmenes muy altos. La búsqueda de cuentas para vincular se consulta al servidor y devuelve como máximo 50 cuentas de cliente activas por respuesta. Administrador y subadministrador pueden buscar por nombre, DNI o correo; no se exponen contraseñas ni otros campos del usuario. Detalle actualizado: [CLIENTES_Y_COTIZACIONES.md](CLIENTES_Y_COTIZACIONES.md).

## Permisos e integridad

El titular supervisa todas las solicitudes y proyectos. El subadministrador solo consulta y opera los proyectos de los que es responsable actualmente; ser autor histórico no conserva acceso después de reasignar el proyecto. El cliente consulta únicamente sus solicitudes vinculadas y los documentos enviados que permiten los flujos actuales.

La vinculación comprueba sesión, rol activo, responsabilidad, cuenta destino activa y revisión de la solicitud. Se ejecuta en una transacción y queda auditada con autor autenticado y destino. Repetir el mismo destino es idempotente. Vincular a otro cliente después se rechaza: esta acción no traslada contratos firmados, pagos ni documentos de otro titular. Una solicitud sin cliente no admite emitir propuestas o contratos comerciales.

El autor (`creado_por_id`) es independiente del usuario destinatario (`usuario_id`) y cliente financiero (`cliente_id`). La clave idempotente pertenece al autor, por lo que un reintento después del vínculo no crea otra solicitud. Las respuestas originales y su PDF preliminar se conservan; el nombre/correo de la cuenta vinculada se muestran por separado.

## Contrato técnico

- `GET/POST /api/team/quote-requests`: solicitudes accesibles y guardado del cuestionario `{values,idempotencyKey}`.
- `GET /api/team/quote-requests/:id` y `GET .../:id/pdf`: detalle y PDF con alcance del responsable.
- `PATCH /api/team/quote-requests/:id`: seguimiento `{status}`.
- `GET /api/team/client-accounts?email=...`: coincidencia exacta activa; devuelve `userId`, `clientId`, nombre y correo.
- `PATCH /api/team/quote-requests/:id/client`: `{clientUserId,revision}`.
- Las rutas anteriores de cuenta cliente y administración se conservan. El cliente recibe la solicitud por `/api/account/quote-requests`.

La migración `010_staff_quote_requests.sql` preserva registros existentes, separa autor/destinatario, admite solicitudes/proyectos pendientes de cliente y protege el autor y una vinculación ya establecida. Se prueba contra PGlite aislado; no se ha aplicado a Neon ni a otra base real durante el desarrollo. Publicar backend compatible antes que frontend, con respaldo y prueba previa de la migración en una base de preparación.

## Validación y revisión local

- Frontend: **137 pruebas normales +13 demo**, más comprobaciones SSR del resumen de cliente y atención staff; sin fallos. Fuente: `.qa-admin-records/frontend-tests-final.log`.
- Backend: suite completa **895 comprobaciones de integración +11 pruebas Node**, sin fallos. Incluye137 comprobaciones nuevas, migración010 repetida preservando los PDF históricos, concurrencia, idempotencia antes/después del vínculo y revocación de acceso tras reasignación. Fuente: `.qa-staff-requests/backend-full-tests.log`.
- Export final: **40 rutas**, compilación, lint y tipos aprobados. Fuente: `.qa-admin-records/frontend-build-delivery.log`. Se conserva el aviso previo sobre detección del plugin de ESLint de Next.js.
- Navegador: cinco listados ×1440/1024/390px, **15 casos sin desbordamiento horizontal de página ni controles inesperadamente fuera del área visible**. En móvil se conserva la navegación financiera horizontal existente; se comprobó que sus enlaces se alcanzan con scroll y teclado. La matriz conserva por separado esos enlaces desplazables.
- Interacciones: paginación25/5 y búsqueda; detalle de1440×900; búsqueda exacta de cliente; confirmación del vínculo y aparición de la solicitud en la cuenta cliente (tres solicitudes visibles); cambios de estado sin duplicar el panel; cierre/foco de detalles y editores anidados; recuperación del buscador cuando desaparece la fila por un filtro.
- Atención staff: se recorrieron las seis etapas en sesión de desarrollador. El aviso obligatorio bloqueó el primer envío; después se guardó al100% sin pedir acceso de cliente, apareció el proyecto y las acciones comerciales estuvieron deshabilitadas hasta vincularlo.
- Errores: un rechazo deliberado de PDF del fixture quedó visible dentro del detalle superior, con retorno del foco al documento padre al cerrar. Los servicios de verificación y NEXI no simulados muestran avisos esperados del laboratorio; no demuestran un fallo del backend real.
- La revisión detectó claves React repetidas entre asignación y NEXI. Se corrigieron con prefijos distintos y se comprobó que permaneciera **un único panel de cliente** al actualizar o vincular.
- La evidencia de navegador usa datos sintéticos **en memoria**, sin base, proveedores ni cuentas reales. Las reglas financieras, permisos, PDF e integridad se comprueban por separado con HTTP/PGlite; no se afirma un ensayo completo contra Neon ni una descarga de archivo confirmada por navegador. No se probó registrar o anular dinero real.

[Captura de solicitudes en escritorio](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/admin-records/solicitudes-1440.jpg) · [Detalle móvil](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/admin-records/request-detail-mobile.jpg) · [Detalle de contrato](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/admin-records/contract-detail-desktop.jpg) · [Matriz responsive](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/admin-records/responsive-admin.json) · [Comprobaciones funcionales](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/admin-records/functional-checks.json).

La matriz final corresponde al export de entrega. Las comprobaciones funcionales anteriores al último ajuste CSS de densidad se conservaron porque su código no cambió; la corrección de claves React sí se repitió en el export posterior.

Para revisar el frontend: `Set-Location D:\TUKNEX\frontend` y `npm run dev`; abrir `http://localhost:3000`. Guardar/vincular requiere también un backend compatible conectado a una base de desarrollo. Las claves privadas siguen exclusivamente en el backend. No se publican automáticamente estos cambios.
