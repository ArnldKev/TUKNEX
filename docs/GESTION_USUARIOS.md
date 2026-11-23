# Gestión de cuentas desde Usuarios

Implementación local del 21 de noviembre de 2026.

## Uso

En Administración → Usuarios (`/admin/usuarios`), el administrador principal puede abrir **Crear usuario**, introducir nombre, correo, rol y una contraseña inicial de al menos 12 caracteres. La creación no inicia sesión como el nuevo usuario ni envía correo automáticamente.

- Cliente: acceso a sus propios documentos. Puede crearse una ficha comercial o seleccionarse explícitamente una existente. No se vinculan documentos por coincidencia de nombre o correo.
- Subadministrador: acceso al espacio `/equipo` y únicamente a los proyectos asignados, con las capacidades existentes.
- Administrador: acceso global de operación, incluida la información financiera. No crea ni suspende cuentas.
- Administrador principal: conserva esas capacidades y la gestión de accesos. Sigue existiendo un único titular y su cuenta no puede suspenderse desde este panel.

La lista admite búsqueda y filtros por rol/estado. Suspender una cuenta revoca sus sesiones; reactivarla exige iniciar sesión de nuevo. No elimina documentos ni historial. No se ofrece cambio de rol ni un editor de permisos por módulo en esta entrega: los permisos se derivan de los roles y asignaciones anteriores.

**Enviar acceso por correo** es una acción separada: utiliza el proveedor de recuperación configurado para enviar un código de 10 minutos. La persona abre `/recuperar-acceso`, introduce su correo, elige **Ya tengo un código** y establece su contraseña. El panel solo confirma aceptación por el proveedor; no garantiza recepción. Si el proveedor no está disponible, la cuenta creada se conserva y se muestra el error.

## Servidor

- `GET /api/auth/users`: lista de cuentas para administradores, sin contraseñas ni hashes.
- `POST /api/auth/users`: alta exclusiva del titular; admite `name`, `email`, `password`, `role` y `clientId` opcional para clientes.
- `PATCH /api/auth/users/:id/status`: suspensión/reactivación exclusiva del titular.
- `POST /api/auth/users/:id/invitation`: solicitud explícita del correo de recuperación.

Se valida la sesión, el origen y la titularidad en servidor; las mutaciones vuelven a comprobar al titular bajo bloqueo transaccional. El alta de cliente y cuenta es atómica. Los cambios se registran con el actor real sin almacenar contraseñas en auditoría. El registro público continúa creando exclusivamente clientes.

## Migración y publicación

`021_user_management.sql` marca al administrador existente como titular (`is_owner`) y permite administradores adicionales manteniendo la unicidad del titular. No modifica la migración histórica 009. El comando privado `admin:create` sigue destinado al primer titular.

Publicar primero el backend con la migración y después el frontend compatible. Esta implementación no ejecuta migraciones sobre la base real, no publica ni envía correos reales. Validar la migración en preparación y conservar los procedimientos existentes de copia/restauración antes del despliegue.

Pruebas específicas: `npm run test:users` en backend; las pruebas usan una base temporal aislada. Consultar el resultado de la tarea para las verificaciones ejecutadas.

## Verificación ejecutada (22-11-2026)

- Backend compilado correctamente.
- Gestión de usuarios: 104 comprobaciones HTTP con PGlite temporal; incluye recuperación con proveedor simulado y nueva contraseña.
- Migración del titular: 1 prueba; CLI privado y migración histórica: 4 pruebas.
- Regresiones: autenticación 99 y equipo 77 comprobaciones.
- Frontend: 234 pruebas de aplicación, 13 de demo y scripts de resumen/estilo/respuestas aprobados; ESLint aprobado.
- Sin correos reales, llamadas a proveedores, publicación ni migraciones sobre datos de producción.

- Navegador: alta de subadministrador ficticio, rechazo de contraseñas distintas, suspensión confirmada, retorno del foco al cerrar con Escape y vista móvil de 390 px sin desbordamiento horizontal. Se revisaron capturas de escritorio y móvil. Sin errores de consola en la pantalla de usuarios.

- Compilación final del frontend aprobada (exit 0): validación de tipos y exportación de 42 páginas. Solo se observó el aviso existente de configuración ESLint sin el plugin de Next.js. Los servidores y el navegador de prueba se cerraron al terminar.
