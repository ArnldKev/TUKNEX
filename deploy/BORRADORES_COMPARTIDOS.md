# COT-03: borradores compartidos y acceso privado

Entrega del 25 de octubre de 2026. Implementación local; publicación pendiente.

## Recorrido

El cliente o visitante puede autorizar «Activar guardado y compartir mi avance». El aviso muestra el plazo configurado, que el equipo administrador podrá consultar sus respuestas y boceto, y que el borrador no es una solicitud formal ni una autorización de publicidad. Antes de esa acción no se envían textos del proyecto al servicio de borradores.

Después de autorizar, el cotizador guarda las revisiones tras una pausa de escritura y muestra Guardando, Guardado, Cambios pendientes o el problema encontrado. Deshacer/rehacer y las decisiones visuales también se guardan. Las escrituras son secuenciales y las respuestas tardías nunca reemplazan texto que el cliente acaba de escribir. Ante un conflicto se detiene el guardado: recuperar el servidor es una acción explícita y reemplaza las respuestas visibles, conservando los contactos actuales y reiniciando el historial local.

El visitante puede recuperar el borrador desde el navegador autorizado. Para llevarlo a otro dispositivo debe acceder como cliente, recuperar su borrador si corresponde y pulsar «Vincular borrador a mi cuenta». La vinculación requiere tanto una sesión válida como la prueba de propiedad del visitante; no basta conocer el ID. Una vez vinculado, la cuenta pasa a controlar el acceso; cerrar sesión deja de permitir acceder solo con la cookie de visitante.

Pausar deja de actualizar el servidor, pero conserva lo ya compartido. «Retirar y borrar este borrador» elimina el borrador y sus revisiones del servicio activo, conserva las respuestas en pantalla y no toca solicitudes formales, pagos ni contratos existentes. Si el borrador ya no está disponible, se puede continuar con una copia nueva de las respuestas y autorizar otro guardado.

La copia de recuperación de la pestaña es una autorización adicional y está apagada inicialmente. Incluye textos del boceto en sessionStorage hasta cerrar la pestaña o durante un máximo de 24 horas desde la última actualización, sin superar la caducidad remota. Se valida antes de recuperarla y se comprueba la propiedad del borrador. Si hay una revisión diferente en el servidor, no se sobrescribe: se ofrece descargar la copia local y recuperar el servidor. Esta descarga es una copia de recuperación JSON, no el expediente final de COT-09.

## Administración

En Administración → Solicitudes del cotizador aparece «Avances compartidos», antes de las solicitudes formales. Muestra visitante o nombre/correo de la cuenta vinculada, paso, respuestas esenciales disponibles, última actualización, caducidad y versión. El detalle permite consultar las respuestas, el mismo boceto y hasta 30 revisiones conservadas. El original del cliente es de solo lectura. «Actualizar avances» consulta la actividad reciente; «Actualizar este borrador» carga su revisión actual.

Un borrador puede coexistir con una solicitud formal del mismo cliente; todavía no se vinculan automáticamente esos dos registros. La distinción se indica en pantalla. Los borradores no crean cotizaciones formales, no envían correos y no crean contratos. El seguimiento de atención y correos es COT-07, y la propuesta editable del administrador es COT-08.

## Activación en Render

La función está desactivada por defecto. Después de publicar el backend y frontend, configurar en el backend:

```dotenv
QUOTE_DRAFTS_ENABLED=true
QUOTE_DRAFTS_RETENTION_DAYS=30
```

El plazo de 30 días es la configuración inicial recomendada; se admite un entero de 7 a 90 días. El operador debe elegirlo antes de activar el servicio. La activación sin plazo válido impide arrancar la aplicación. El aviso consulta estos valores al backend; no hay que incluir claves ni un flag privado en el frontend.

Publicar ambos componentes. La migración aditiva `007_quote_drafts.sql` se aplica mediante el mecanismo existente al arrancar el backend. Añade las tablas de dispositivos, borradores y revisiones; no reescribe cuentas, solicitudes ni documentos existentes. Mantener el acceso por el proxy `/api` de Netlify y los orígenes CORS exactos ya configurados. No requiere IA, correo o servicios nuevos de almacenamiento.

Para pausar nuevas escrituras, configurar `QUOTE_DRAFTS_ENABLED=false`. Los propietarios todavía pueden recuperar o retirar registros existentes, y la limpieza continúa. Revertir el código no requiere borrar las tablas nuevas ni alterar la base anterior.

## Límites, acceso y conservación

- Cookie de dispositivo aleatoria de 256 bits, HttpOnly, SameSite=Lax, Secure en producción y duración máxima de 90 días; el servidor guarda su hash. La cookie se establece con autorización antes de aceptar contenido del visitante, de modo que una respuesta inicial perdida no deje un proyecto sin prueba de recuperación.
- Identidad de cuenta comprobada en servidor; los campos de identidad suministrados por el navegador solo sirven para detectar una sesión que cambió, nunca para asignar privilegios. Administradores activos y autenticados acceden a la bandeja privada.
- Proyectos validados, sin campos de contacto del cuestionario, contraseñas ni DNI. El texto libre puede contener lo que el usuario escriba; el aviso no lo presenta como anónimo. La asociación a una cuenta permite mostrar su nombre y correo al equipo.
- Límite de 64 KB por escritura, 3 borradores activos por dispositivo visitante y 10 por cuenta/contexto autenticado; últimas 30 revisiones por borrador y página administrativa de 25 elementos. Límites HTTP adicionales por IP para creación y escritura. La paginación conserva la precisión temporal de PostgreSQL.
- Caducidad absoluta desde la creación; escribir no la prolonga. Los registros caducados dejan de ser consultables inmediatamente. La limpieza elimina el contenido al arrancar y cada hora mientras el proceso esté activo; si Render está suspendido, se completa al reanudar. Retirar un borrador elimina sus revisiones en cascada.
- Las copias de seguridad del alojamiento tienen su propio ciclo. La retirada del servicio activo no promete borrar respaldos inmediatamente. El operador debe configurar y atender su conservación y las solicitudes sobre datos por separado.
- Se conserva el borrador anónimo local anterior con su lista de opciones permitidas; no se añaden textos a ese almacenamiento.

## Verificación

Verificación local completada: 95 pruebas del frontend (82 en modo real y 13 demo), 124 comprobaciones HTTP/base de datos de borradores y 104 comprobaciones de regresión del flujo existente. Compilación del backend, lint y compilación de publicación del frontend correctos. En navegador se comprobó autorización, guardado automático, recarga y recuperación de textos/paso, pausa, conflicto real entre dos pestañas sin sobrescritura, recuperación explícita, lectura administrativa del visitante y de sus revisiones, vinculación a la cuenta y recuperación autenticada. Los controles se revisaron también a 375 px sin desbordamiento horizontal.

Pruebas del frontend: cola secuencial, escritura durante una petición, errores, conflictos, respuesta tardía después de cambiar de borrador, desmontaje, recuperación validada y rechazo de contactos/campos ajenos. Pruebas HTTP con PGlite temporal: servicio desactivado, consentimiento, origen, cookies, aislamiento entre visitantes/cuentas, vinculación, reintentos, concurrencia, cuotas, 30 revisiones, paginación con microsegundos, retirada, caducidad y límites HTTP. No se envían mensajes reales ni se utilizan cuentas o bases de producción.

```powershell
cd D:\TUKNEX\frontend
npm test
npm run lint
npm run build:release

cd D:\TUKNEX\backend
npm run test:quote-drafts
node scripts/test-production-integration.mjs
```

La compilación del frontend utiliza las variables públicas de producción existentes. Para la prueba de navegador, se usa un backend aislado con el flag activado y datos ficticios. Verificar también que el cálculo formal, el acceso y el PDF existentes sigan funcionando.

## Publicar

No se ha hecho commit, push ni despliegue desde esta entrega. Los cambios están en D:\TUKNEX.

```powershell
cd D:\TUKNEX
git add frontend backend docs deploy
git commit -m "Agregar borradores compartidos y vista privada de avances"
git push
```

Después, agregar las dos variables indicadas en Render, volver a desplegar el backend y comprobar con una cuenta de prueba: autorización → escritura → Guardado → recargar y recuperar → administración → consultar una revisión. Probar además retirar un borrador ficticio. Si no se activa el flag, el cotizador mantiene el comportamiento anterior.

La siguiente etapa es COT-04: interpretación y sugerencias de IA revisables, con proveedor y presupuesto por definir.
