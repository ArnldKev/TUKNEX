# Portal de cliente: sincronización y estados recuperables

Fecha: 9 de noviembre de 2026. Código local de `D:\TUKNEX`. No se cambian precios, permisos ni registros reales.

## Lectura coherente

`useAccountResources` consulta `/api/account/overview`, cuyo contrato ampliado incluye `requests` y `updatedAt`. Solicitudes, documentos, cuotas y pagos se publican en un único cambio de estado. El contador y la lista de solicitudes usan el mismo conjunto de registros. El servidor resuelve las fichas autorizadas; el navegador no filtra solo por el identificador principal ni une datos por nombre/correo.

Como compatibilidad transitoria, si un backend anterior no incluye `requests`, se consulta `/api/account/quote-requests` usando la misma cancelación y se publica el resultado solo al completar ambas lecturas. Esa compatibilidad no sustituye el despliegue coordinado del backend con su lectura coherente.

La hora mostrada proviene de `updatedAt` del servidor cuando está disponible. El botón **Actualizar información**, el retorno a una pestaña visible y el evento `billing-change` activan la lectura. Foco y visibilidad se agrupan con una espera mínima de 15 segundos entre intentos y no duplican una consulta activa. Una acción importante o el botón manual sí puede sustituir una lectura anterior.

## Cancelación y fallos

`AccountResourceStore` invalida los resultados anteriores mediante un identificador de actualización y `AbortController`. Desmontar la cuenta o cambiar de usuario cancela la operación; una respuesta tardía no puede reemplazar datos actuales.

Cada sección distingue carga, datos vacíos, información actualizada, conexión fallida, indisponibilidad y sesión caducada. Las secciones conservan la última instantánea coherente al fallar una actualización y explican que está pendiente de actualizar. No se convierten errores en cero registros. Los botones de reintento de una sección recargan la misma instantánea compartida para mantener coherencia financiera.

Una respuesta 401 retira datos privados de la memoria del coordinador y permite volver a iniciar sesión. El transporte también informa al proveedor de autenticación mediante `account-expired`. Las lecturas tienen límite de espera de 20 segundos. Un 403/5xx o una respuesta no válida no muestra detalles técnicos del servidor.

## Perfil en edición

Los cambios de nombre, teléfono y dirección marcan el formulario como pendiente de guardar. Las actualizaciones de datos no reemplazan esos campos mientras haya cambios. Guardar conserva lo que el usuario escriba mientras la petición está en curso, usando una revisión de edición. **Descartar cambios** vuelve explícitamente a los valores guardados.

## Historial compacto

Solicitudes, cotizaciones formales, contratos, cuotas y pagos reutilizan `RecordList` con búsqueda y paginación. `RecordDetail` conserva el foco y el cierre accesible. Los comprobantes y la aceptación virtual existentes siguen disponibles dentro del detalle correspondiente, sin introducir nuevas operaciones financieras.

`QuoteRequestsPanel` recibe opcionalmente `clientResource={resource,onRetry}`. En ese modo no crea una segunda consulta de solicitudes. Las variantes de administración/equipo conservan sus rutas y comportamiento.

## Extensiones siguientes

El detalle de cotización formal permite integrar las respuestas a propuestas; el detalle de cuota/contrato permite integrar el reporte de pagos; el apartado de proyectos puede incluir el seguimiento real. Cada operación nueva deberá ejecutar `refresh()` o emitir `billing-change` al completarse.

## Verificación

Pruebas unitarias del coordinador en `frontend/src/lib/client/account-resources.test.ts`: publicación conjunta, cancelación, respuestas fuera de orden, conservación de datos al fallar, reintento, caducidad de sesión, límite de espera, hora del servidor, agrupación de foco y reinicio de efectos.

La revisión en navegador del perfil sucio, foco, móvil, mensajes y actualizaciones tras una operación forma parte de la comprobación integral. Las pruebas unitarias no acreditan el estado de los servicios publicados.
