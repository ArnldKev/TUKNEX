# Equipo y subadministradores de TUKNEX

## Política acordada

Hay un administrador principal y cuentas de subadministrador (desarrollador), además de clientes.
El subadministrador puede preparar y enviar directamente propuestas y contratos de los proyectos asignados. No necesita una aprobación previa del titular. El titular conserva acceso global, puede reasignar y desactivar cuentas, y consulta los cambios y sus autores.

## Cómo usarlo

- Titular: entrar por /acceder y abrir Administración → Equipo y actividad (/admin/equipo).
- Abrir Gestionar subadministradores para crear una cuenta privada del equipo. Introducir nombre, correo y una contraseña inicial de al menos 12 caracteres, que no se muestra en listados ni registros.
- Asignar una solicitud enviada a un desarrollador. También se puede crear el proyecto sin responsable y asignarlo después.
- Desarrollador: entrar por el mismo acceso. Su destino es /equipo; solo aparecen sus proyectos.
- Consultar las respuestas originales; crear/editar cotizaciones, preparar contratos, descargar PDF y actualizar seguimiento.
- Una cotización guardada como Enviada se consulta en la cuenta del cliente. El contrato pasa de Borrador a Enviado mediante su control de estado, conservando las validaciones previas de datos del cliente y del prestador.
- El envío significa disponibilidad en la cuenta y PDF. No se añadió envío automático de correo ni firma remota. La aceptación y las firmas que se registran en el panel siguen correspondiendo a acuerdos externos.
- El desarrollador puede definir alcance, precio y condiciones por proyecto. Las tarifas globales, datos de TUKNEX, registro/anulación de cobros y gestión del equipo siguen reservados al titular.
- NEXI puede analizar las respuestas del proyecto asignado si la integración existente está habilitada. Sus ideas son sugerencias; no fijan el contrato ni se guardan como informe nuevo.
- Historial: muestra quién hizo el cambio, fecha y proyecto. Las revisiones de propuestas y contratos conservan alcance, condiciones, importes y versiones anteriores. El botón Ver actividad anterior permite continuar más allá de los primeros 150 eventos.

Desactivar una cuenta revoca sus sesiones. Los documentos y la asignación se conservan para que el titular pueda reasignarlos. La persona que deja de ser responsable pierde acceso a solicitudes y documentos del proyecto.

No se envían avances nuevos no presentados del cotizador: permanece vigente Solo navegador hasta el envío.

## Migración y precauciones antes de publicar

009_team.sql amplía los roles, añade proyectos del equipo y vínculos en cotizaciones/contratos, y atribuye los eventos futuros de auditoría. Los documentos anteriores permanecen conservados y bajo acceso del titular; las propuestas nuevas del espacio de equipo se vinculan a sus proyectos. No se reasignan documentos históricos por inferir que comparten cliente.

La migración impide crear un segundo administrador principal. Si encuentra varios administradores existentes, se detiene con una explicación antes de cambiar roles. No elige ni degrada cuentas automáticamente: resolver de forma privada cuál es el titular y qué cuentas pasarán al equipo antes de desplegar. Los clientes no pueden solicitar roles privilegiados en el registro.

El comando admin:create se conserva exclusivamente para el primer administrador principal en una base vacía. Los desarrolladores se crean desde el panel privado del titular.

Antes de publicar, realizar copia/restauración de preparación, comprobar la cantidad de administradores y aplicar la migración en una base de preparación. No se han consultado ni modificado cuentas de Neon durante el desarrollo de esta entrega.

Publicar backend compatible antes que frontend. No activar estas pantallas contra un backend antiguo. No subir credenciales, archivos temporales de QA ni bases de prueba.

## Permisos comprobados

El servidor comprueba sesión, rol y asignación en cada lectura, modificación, análisis y descarga del espacio de equipo. Se bloquean recursos ajenos incluso proporcionando sus identificadores directamente. No se comparte AdminGuard con desarrolladores ni se les expone el estado financiero global.

Las operaciones de proyecto bloquean la asignación mientras guardan cambios. Reasignar y cambiar avances comprueba revisión; editar cotizaciones/contratos comprueba su versión. El registro de auditoría usa el actor autenticado del servidor, no un identificador enviado por el navegador. Los registros históricos sin autor permanecen identificados como anteriores; no se atribuyen retroactivamente.

## Verificación

- npm test (backend) incluye test-team-integration.mjs y test-team-migration.mjs.
- Pruebas aisladas: un titular, dos desarrolladores y cliente; altas públicas, separación de proyectos, edición con versión, envío directo, visibilidad del cliente, PDFs ajenos, bloqueo de tarifas y gestión del equipo, reasignación, IA fuera de asignación, revocación de sesiones y conservación de una base histórica con varios administradores.
- npm test, npm run typecheck, npm run lint y npm run build:release (frontend).
- Revisar interfaces en escritorio y móvil con cuentas sintéticas locales.
- Estas pruebas no certifican configuración de producción ni entrega de correos y no crean usuarios reales.

## Resultado local de esta entrega

- Frontend: npm test pasó 131 pruebas normales y 13 demo, más la comprobación del resumen; typecheck y ESLint correctos; exportación de 40 páginas.
- Backend: npm test completo terminó con exit 0. Incluye 71 comprobaciones nuevas del equipo y la migración conservadora. Todos los proveedores externos estuvieron simulados o deshabilitados.
- En navegador: acceso y destino del desarrollador, envío directo de propuesta, edición de alcance/precio con versión 2, lectura global y comparación antes/después por el titular, bloqueo del panel del titular para desarrolladores y vistas de 1280/390 px sin desbordamiento observado.
- La creación privada sí pasó las pruebas HTTP automatizadas. La prueba adicional de dar de alta otra cuenta desde el navegador fue bloqueada por revisión automática al considerarla acceso privilegiado; no se ejecutó ni se reintentó por otra vía. La interfaz de alta se conserva implementada.
- No se publicaron cambios, no se consultaron credenciales y no se migró Neon ni la base real.
