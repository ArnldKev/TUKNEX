# Cotización, contrato y pagos: revisión del 9 de noviembre de 2026

Código revisado en `D:\TUKNEX`, rama `codex/connected-contract-workflow`. Cambios locales; no publicados. No se aplicaron migraciones en Neon ni se modificaron cuentas, contratos, pagos o credenciales reales.

## Correcciones realizadas

| Observación | Resultado |
| --- | --- |
| La cuota pagada no mostraba el comprobante. | El detalle ahora reúne los pagos aplicados a esa cuota, método, operación, observación, fecha, imagen y descarga. Si un pago se distribuyó entre varias cuotas se muestra el importe aplicado, además del importe total del registro. Los anulados permanecen identificados y no cuentan como pagado. |
| La imagen solo podía descargarse desde gestión. | El cliente también puede consultar sus comprobantes privados. Se comprueba en el servidor su cuenta, contrato publicado y pertenencia del pago; un identificador ajeno no da acceso. PNG/JPEG se previsualizan; PDF permite abrir o descargar. |
| «Contrato manual» parecía ser la única modalidad. | El origen de los términos y la modalidad de aceptación son controles separados. Hay firma física para imprimir y aceptación en línea desde la cuenta del cliente. Los contratos anteriores conservan la modalidad física. |
| Se perdía el alcance después de usar NEXI. | «Preparar contrato» abre un borrador con cliente, proyecto, alcance, exclusiones, condiciones, observaciones y precio orientativo o formal. Las ideas de NEXI se identifican como propuestas para revisar. Guardar requiere confirmar la revisión de términos y precio. No acepta ni envía automáticamente la cotización o el contrato. |
| Faltaba el mismo recorrido en las tres clases de cotización. | Disponible desde solicitudes de clientes, cotizaciones propias del equipo y cotizaciones formales. También desde proyectos del subadministrador, respetando su asignación. |
| Contadores del cliente en cero pese a tener solicitudes. | Se muestran tres categorías independientes: solicitudes del cotizador, cotizaciones formales y contratos, con nombre, número, estado y acceso al documento. Un error de carga se muestra como no disponible, en lugar de cero. |
| Fechas de pago con una cadena técnica en inglés. | Fechas normalizadas y presentación DD/MM/AAAA en el historial. |

## Recorrido para el administrador y subadministrador

1. Abrir una solicitud o una cotización formal y revisar sus datos.
2. Si la solicitud todavía no tiene cuenta, usar «Asignar cliente». No se crean ni se unen cuentas por coincidencia de nombre.
3. Opcionalmente, pedir el análisis de NEXI. El análisis de una cotización formal utiliza sus términos guardados en el servidor, no un texto sustituto enviado por el navegador.
4. Pulsar «Preparar contrato», revisar el alcance, resolver preguntas pendientes, acordar el importe y plan, corregir fechas y elegir modalidad de aceptación.
5. Guardar el borrador. Después revisar su PDF y cambiar el estado a «Enviado». Se conservan identificador y versión de origen y, cuando hay una solicitud vinculada, su boceto imprimible capturado.
6. En modalidad física, descargar, obtener las firmas fuera de la plataforma y registrar los estados correspondientes.
7. En modalidad virtual, el titular entra en «Mis contratos y cuotas», abre y revisa el PDF, confirma su nombre y acepta expresamente esa versión. El equipo ve la constancia y registra también su conformidad para activar el contrato.
8. Registrar el pago en administración y adjuntar su comprobante. Abrir la cuota o el pago para consultar la evidencia. El subadministrador conserva sus permisos actuales y no obtiene acceso a cobros globales.

## Alcance de la aceptación en línea

Se conserva el PDF exacto presentado, su SHA-256, versión, cuenta que acepta, nombre, fecha y texto de consentimiento. La aceptación es explícita e idempotente; se rechazan archivos o términos alterados, versiones antiguas, cuentas desactivadas, otro cliente y una aceptación simulada por el administrador. La base impide modificar o eliminar las revisiones y evidencias por las operaciones ordinarias de actualización o borrado.

El PDF posterior incluye la constancia; el PDF original aceptado sigue disponible por separado. No se implementó firma digital certificada, validación oficial de identidad, certificado digital, fotos del DNI ni grabación de voz como firma. La aceptación de una cuenta no demuestra identidad oficial. Antes de usar contratos reales, completar datos del titular de TUKNEX y de ambas partes y revisar los términos que se desean contratar.

Los análisis de IA anteriores que solo estuvieron en pantalla no se pueden recuperar retroactivamente. A partir de este recorrido, los términos revisados se guardan en el contrato. El boceto es una referencia del origen; no genera código final ni amplía el alcance por sí mismo.

## Pendientes y recomendaciones, por prioridad

1. **Publicar backend y frontend de la misma revisión.** El backend necesita la migración `011_online_contract_acceptance.sql`. Es aditiva y se probó en bases temporales; no se aplicó en la base real. Antes de publicar, hacer y comprobar un respaldo privado. El arranque normal del backend aplica las migraciones pendientes. No cambiar la URL de Neon ni crear otra base como sustituto.
2. **Completar datos del prestador y del cliente.** El envío real exige documento y dirección de ambas partes. La aplicación no inventa estos datos ni convierte ejemplos en información legal real.
3. **Comprobar los servicios reales después de publicar.** En esta revisión NEXI, audio y correo se probaron con proveedores simulados. Hacer una prueba propia de texto, micrófono y recuperación de contraseña con la configuración privada vigente, incluyendo móvil. Las pruebas reales históricas del proveedor están descritas en `REVISION_PRELANZAMIENTO.md`; no equivalen a una comprobación actual de las credenciales.
4. **Avisos por correo a administradores al recibir solicitudes u orientación.** Continúan pendientes. Configurar Resend no añade por sí solo esos avisos. Conviene cola de envíos, reintentos y estado visible de entrega para no perder solicitudes cuando el proveedor falle.
5. **Comprobantes enviados por el propio cliente.** Actualmente el administrador registra pagos y archivos; el cliente consulta los suyos. Si se añade autoservicio, crear un reporte de pago «por revisar», separado del pago confirmado y del saldo, hasta la validación administrativa.
6. **Fichas duplicadas y cuenta del cliente.** Los documentos se relacionan por el identificador de cliente. Una ficha creada manualmente y una cuenta registrada después pueden ser registros diferentes; no se deben fusionar automáticamente por nombre o correo. Hace falta un procedimiento administrativo de conciliación de fichas con historial y revisión de asociaciones si existen casos antiguos de ese tipo.
7. **Conservar y revisar cambios de alcance posteriores.** Hoy el contrato emitido y su aceptación se preservan; una ampliación acordada después requiere un nuevo acuerdo/documento. Una futura interfaz de adendas y comparación de versiones facilitaría ese trabajo.
8. **Experiencia generativa pendiente.** El dictado transcribe y el usuario puede editar; NEXI propone un resumen y alcance. La maqueta sigue un modelo de componentes y reglas. No se genera una aplicación libre ni un frontend HTML/CSS listo para producción. El precio contractual sigue a cargo del responsable.

## Verificación y límites

Se usaron bases PGlite temporales, cuentas ficticias, proveedor IA simulado y servidor visual aislado. No se llamó a Groq, Resend ni a Neon en esta revisión. Las pruebas comprueban permisos, versiones, persistencia, PDF, distribución de pagos, aislamiento entre clientes y transporte de alcance. La interfaz visual utiliza datos ficticios; no demuestra una aceptación ni un pago real.

Los resultados finales y evidencias locales están en `.qa-contract-flow/`. La guía de despliegue general continúa en `deploy/RENDER_NETLIFY.md`; para este cambio debe publicarse la rama y revisión actuales, no reutilizar el nombre de rama de una revisión anterior.

### Resultados comprobados

- Suite completa del backend: aprobada; incluye 1.013 comprobaciones de integración, 21 pruebas Node y el lote de contratos virtuales. Tras ampliar la matriz de permisos, el lote focal de contratos pasó 59 comprobaciones. Las 101 comprobaciones de facturación/PDF también se repitieron después de corregir los saltos de página.
- Frontend: 169 pruebas con modo real y 13 con modo demo, todas aprobadas. Lint y compilación de producción aprobados; 42 rutas generadas.
- Navegador: ficha del cliente con 2 solicitudes/1 cotización formal/1 contrato; cuota con imagen PNG y comprobante PDF; solicitud sin cliente impide preparar contrato; solicitud del administrador con IA simulada precarga términos y exige revisión; cotización formal del subadministrador abre el mismo flujo; confirmación virtual ficticia y acceso al PDF aceptado; móvil de 390 px sin desbordamiento horizontal en los nuevos diálogos.
- PDF: inspección visual de todas las páginas de las muestras físicas, virtuales y de la revisión original. Son documentos sintéticos sin valor contractual. Las pruebas visuales no crearon contratos reales.
- Los archivos de tipos, validación y mapeo formal compartidos entre frontend/backend coinciden. `frontend/next-env.d.ts` restaurado desde su copia anterior a la compilación.

El build no publica por sí solo. Estos resultados no validan el estado actual de Netlify/Render, la cuenta real de Groq/Resend ni un micrófono físico.
