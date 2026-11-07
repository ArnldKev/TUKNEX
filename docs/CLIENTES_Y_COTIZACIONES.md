# Clientes y cotizaciones del equipo

Actualización local del 30 de octubre de 2026 en D:\TUKNEX.

## Asignar un cliente

En cada fila sin cuenta asignada, pulsa **Asignar cliente**. El selector carga las cuentas de cliente registradas y activas. Selecciona una persona y confirma; abrir el selector o buscar no asigna automáticamente.

Si necesitas localizarla, usa **Buscar cliente** con nombre, DNI o correo, completos o parciales. Las búsquedas admiten mayúsculas y nombres con tildes. **Mostrar todos** recupera la lista inicial. Se muestran hasta 50 coincidencias; el buscador permite precisar más allá de ese primer grupo.

Las filas ya vinculadas muestran **Cliente asignado**, que permite consultar la cuenta actual. Se conserva la protección existente frente a transferir una solicitud a otra persona. La autoría y el responsable también se conservan.

Solo aparecen clientes con una cuenta de acceso activa y vinculada a su ficha. Una ficha financiera sin cuenta de acceso todavía no es destinataria de una cotización en el portal.

## Apartados separados

- **Solicitudes de clientes** (`/admin/solicitudes`): enviadas desde cuentas de clientes.
- **Mis cotizaciones** (`/admin/mis-cotizaciones`): creadas por el administrador que inició sesión. Permanecen aquí después de asignar el cliente.
- **Cotizaciones formales** (`/admin/cotizaciones`): documentos financieros; ya no intercala solicitudes del cuestionario.
- El subadministrador dispone de su propio **Mis cotizaciones** (`/equipo/mis-cotizaciones`) dentro del alcance de sus proyectos.

Al guardar una nueva cotización como equipo, **Gestionar cotización y cliente** abre el apartado de cotizaciones propias. La supervisión de otros desarrolladores sigue en **Equipo y actividad**.

## Implementación

El directorio utiliza GET /api/team/client-accounts?search=, autenticado para equipo activo. Devuelve como máximo 50 cuentas de rol cliente y solo los identificadores necesarios, nombre, correo y DNI. Mantiene la compatibilidad con el parámetro anterior email. Búsqueda parametrizada y coincidencia literal; no interpreta comodines SQL introducidos por el usuario. No necesita migraciones ni nuevas dependencias.

La separación de listas usa el creador original (createdById / createdByRole), nunca el cliente asignado o el desarrollador responsable. Los permisos de acceso a proyectos se siguen comprobando en el backend.

## Verificación de esta entrega

- Frontend: 153 pruebas reales y 13 de demostración aprobadas; revisión SSR de cotizador y estilos correcta; lint sin errores. Compilación de publicación completada, incluidas las dos rutas nuevas. La exportación de prueba usó API del mismo origen; no se modificó .env.local.
- Backend: compilación correcta y 192 comprobaciones de solicitudes/equipo aprobadas en una base temporal aislada. Incluyen directorio, nombre/DNI/correo, tildes, caracteres literales, límite de 50, roles e inactividad y el flujo de asignación.
- Navegador con datos ficticios: listado inicial, búsqueda por los tres campos, selección y confirmación, mensaje sin resultados, Mostrar todos, separación entre autor y destinatario, cotizaciones propias del subadministrador y cotizaciones formales sin solicitudes intercaladas. Revisión móvil a 390 px sin desbordamiento horizontal.
- Backend local reiniciado para cargar el buscador. Precomprobación de esquema: cero migraciones pendientes; esta entrega no requirió ni aplicó migraciones. No se creó ni asignó una cotización de prueba en la base real. Frontend del puerto 3000 preservado.
- No se hizo commit, push ni publicación.

Capturas con datos ficticios:

![Selector de clientes](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/client-assignment/selector-cliente.jpg)

![Cotizaciones propias separadas](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/client-assignment/mis-cotizaciones.jpg)

Para revisarlo en tu sesión, actualiza la página local y entra a **Mis cotizaciones** en el menú lateral. No es necesario volver a crear la cotización ni la cuenta del cliente.
