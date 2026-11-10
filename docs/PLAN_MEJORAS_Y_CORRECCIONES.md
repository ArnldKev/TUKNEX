# TUKNEX: plan detallado de correcciones y mejoras

Fecha: 9 de noviembre de 2026. Referencia: código local de D:\TUKNEX, rama codex/connected-contract-workflow, y auditorías guardadas. El estado de Netlify, Render, Neon y las credenciales reales requiere comprobación independiente.

## Cómo interpretar este diagnóstico

- Error confirmado: comportamiento incorrecto visible en el código actual.
- Función pendiente: parte del recorrido deseado que todavía no existe; no equivale a una excepción del programa.
- Mejora recomendada: propuesta para facilitar el uso, la operación o el crecimiento.
- Comprobación operativa: algo que exige revisar el servicio publicado o un dispositivo real.

Ya están implementados localmente los comprobantes visibles, la aceptación virtual de contratos, la preparación de contratos desde solicitudes/IA y los documentos diferenciados de la ficha del cliente. No se vuelven a incluir como funciones inexistentes. La aceptación virtual es autenticada, sin certificado digital. La última entrega requiere la migración 011 y publicación coordinada de frontend y backend.

## 1. Información del cliente actualizada — error confirmado, prioridad alta

Estado: el resumen de cuenta se consulta al abrir la pantalla o cambiar un contador interno. La lista de solicitudes se actualiza con otros eventos. Por eso el cliente puede ver listas recientes junto a contratos, saldos o contadores anteriores.

Cambio: añadir Actualizar información, recargar de forma controlada al volver a la pestaña y después de cambios relevantes, y mostrar fecha/hora de la última consulta correcta. Evitar sobrescribir un perfil que el usuario está editando. Cancelar las consultas de una sesión anterior.

Aceptación: registrar un pago o enviar un contrato desde administración; al actualizar la cuenta del cliente, todos los componentes muestran la misma información, sin duplicados ni pérdida de campos en edición.

Fuente: frontend/src/components/client/real-client-portal.tsx y frontend/src/components/quote/quote-requests-panel.tsx.

## 2. Errores de carga claros — error confirmado, prioridad alta

Estado: un fallo del contador de solicitudes termina como un guion, sin diferenciar fallo y carga. El reintento general se muestra solo en determinadas condiciones del resumen de cuenta.

Cambio: distinguir Cargando, Sin registros, Información actualizada y No disponible. Cada bloque que falle debe ofrecer Reintentar, conservar los datos anteriores identificándolos como pendientes de actualizar y mantener las respuestas que el cliente está completando.

Aceptación: simular error del resumen, fallo solo del contador, conexión lenta y sesión caducada. No debe mostrarse cero por un fallo ni quedar un indicador de carga permanente; el reintento debe recuperar la información correcta.

## 3. Etiquetas comprensibles en respuestas y documentos — error confirmado, prioridad alta

Estado: la presentación de respuestas imprime identificadores como essential, modern, standard y unsure. También hay campos de materiales, canales, dominio y alojamiento que utilizan valores internos.

Cambio: mantener los identificadores en la base y traducir su presentación con un catálogo común entre frontend y backend: Moderno, Plazo habitual, Necesito orientación, etc. Usar Por definir cuando corresponda y conservar las diferencias entre una respuesta elegida y un valor predeterminado.

Aceptación: revisar todas las opciones del cuestionario en pantalla, texto compartido y PDF. Ningún valor técnico debe aparecer como respuesta comercial sin traducción.

Fuente: frontend/src/lib/quote/presentation.ts.

## 4. Cuenta registrada y ficha de cliente — riesgo de coherencia, prioridad alta

Estado: una ficha manual y una cuenta creada después pueden tener identificadores diferentes. No se ha confirmado que existan duplicados en la base real. Los documentos se vinculan por identificador y no deben asociarse únicamente por coincidencia de nombre o correo.

Cambio: mostrar si una ficha tiene una cuenta vinculada y diseñar una conciliación administrativa revisable. Antes de vincular o unificar, enumerar solicitudes, cotizaciones, contratos y pagos afectados; comprobar permisos y conservar historial. No cambiar la identidad de un contrato ya aceptado silenciosamente.

Aceptación: probar ficha sin cuenta, cuenta posterior, nombres iguales y datos de contacto compartidos. Cada titular debe ver solo sus documentos y la administración debe poder explicar cada asociación.

## 5. Avisos al administrador — función pendiente, prioridad alta

Estado: el correo actual cubre recuperación/verificación; no existe una cola de avisos de solicitudes u orientación al equipo.

Cambio: guardar el aviso junto con la solicitud, enviarlo a administradores activos y mostrar proyecto, número, momento y enlace privado al detalle. Implementar reintentos, deduplicación y estados pendiente/enviado/fallido. Las respuestas sin enviar siguen en el navegador y no generan correos.

Aceptación: una solicitud produce un único aviso por destinatario previsto; un proveedor caído no impide guardar la solicitud; al recuperarse se reintenta sin duplicar. Comprobar una entrega real en una bandeja controlada.

## 6. Responder una cotización formal — función pendiente, prioridad alta

Estado: el cliente puede descargar la cotización formal. Falta una respuesta estructurada sobre esa propuesta, distinta de la aceptación del contrato virtual ya implementada.

Cambio: añadir Solicitar cambios, No continuar y Confirmar propuesta, definiendo antes qué compromiso representa cada acción. Registrar versión, comentario, autor y fecha. El responsable recibe un aviso y la propuesta original queda conservada. Una revisión de precio o alcance debe presentarse como una nueva versión.

Aceptación: el cliente responde a su versión vigente; una propuesta sustituida no se puede confirmar como si fuera la actual; repetir un envío no duplica respuestas.

## 7. Seguimiento del desarrollo — función pendiente, prioridad alta

Estado: el espacio del cliente muestra documentos y cobros. El avance que registra el equipo no se ofrece como un seguimiento completo del desarrollo en ese portal.

Cambio: mostrar fases como contenido pendiente, diseño, desarrollo, revisión y entrega; responsable, entregables, última actualización y próxima acción. Identificar claramente qué debe aportar el cliente. Mantener separados estado del proyecto, estado contractual y estado del pago. Preferir hitos reales a porcentajes arbitrarios.

Aceptación: un avance registrado por el desarrollador responsable aparece únicamente al cliente del proyecto y es visible al administrador principal. Los comentarios internos conservan su privacidad.

## 8. Reportar un pago desde el cliente — función pendiente, prioridad media

Estado: el administrador registra el pago y su archivo; el cliente ya puede consultar los comprobantes propios.

Cambio: añadir Reportar pago con importe, fecha, método, referencia, contrato/cuota y archivo. Crear un registro Por revisar que no reduzca el saldo. Solo la confirmación autorizada genera el pago aplicado; una observación o rechazo permite corregir el reporte y conserva su historial.

Aceptación: un comprobante duplicado no se contabiliza dos veces; una carga incompleta no crea un pago confirmado; otro cliente no accede al archivo; confirmar una vez actualiza las cuotas que corresponden.

## 9. Interpretar texto y dictado con revisión — función pendiente, prioridad alta para la visión generativa

Estado: el dictado transcribe y se puede editar. NEXI propone análisis y sugerencias; no convierte automáticamente todo texto en una narración aprobada ni genera una web libre.

Cambio: añadir Ordenar mi idea. Presentar respuesta original, interpretación propuesta, requisitos detectados, exclusiones y preguntas pendientes. El cliente puede editar, aplicar o descartar la propuesta. Conservar cifras, negaciones y límites; distinguir hechos del cliente de ideas sugeridas. Aplicar decisiones al modelo del boceto después de su aprobación.

Aceptación: probar casos ambiguos y frases como No quiero pagos en línea, Solo vendo por WhatsApp y Tengo 25 productos. El sistema debe conservar esas restricciones, permitir deshacer y continuar sin IA si el proveedor falla.

## 10. Informe NEXI persistente y expediente — función parcial, prioridad media

Estado: el análisis completo vive en la pantalla. Los términos revisados que pasan al contrato sí se guardan. El boceto de origen ya se incorpora al contrato cuando hay una solicitud vinculada, pero eso no constituye un expediente completo de diseño aprobado.

Cambio: guardar informes por revisión con respuestas originales, decisiones del cliente, alcance revisado, exclusiones, dudas, dirección visual y criterios de entrega. Identificar qué aprobó el responsable y mantener notas internas fuera de la copia del cliente. Después añadir descarga conjunta de documentos, paleta, tipografía y vistas del boceto aprobado.

Aceptación: cerrar y reabrir conserva el informe correcto; una respuesta nueva no altera el informe aprobado anterior; el expediente descargado reúne archivos de la misma revisión y cuenta.

## 11. Historial cómodo y coherencia visual — mejora, prioridad media

Estado: varias listas del cliente muestran todos los registros completos, sin búsqueda ni paginación. Administración ya dispone de registros compactos y detalles.

Cambio: reutilizar filas o tarjetas resumidas, búsqueda por proyecto/número, filtros y páginas. Abrir todo el contenido al pulsar Ver detalles. Mostrar una acción principal por pantalla y explicar la diferencia entre solicitud, cotización formal y contrato.

Aceptación: con numerosos proyectos se encuentra un documento por nombre o número en móvil y escritorio; cerrar detalles devuelve el foco a la fila; los controles funcionan con teclado y no desbordan.

## 12. Cambios posteriores al contrato — mejora, prioridad media

Estado: se preservan el contrato emitido y la evidencia aceptada; editar ese documento para incorporar nuevas peticiones no corresponde al flujo existente.

Cambio: añadir acuerdos complementarios o adendas con motivo, cambios de alcance, impacto en precio/plazo y aceptación de la nueva propuesta. No reemplazar el PDF original aceptado.

Aceptación: se puede consultar el acuerdo inicial y cada modificación, con sus evidencias y total acordado. Los saldos existentes no se recalculan sin una operación explícita y revisada.

## 13. Rendimiento y conectividad — comprobación operativa, prioridad alta antes de promoción amplia

Estado: las mediciones históricas locales registraron lentitud móvil en varias rutas. No son mediciones actuales del despliegue y no demuestran por sí solas la causa exacta.

Cambio: medir la versión publicada; revisar logo/imágenes, CSS y JavaScript iniciales y cargar los recursos pesados cuando se necesiten. Mantener el contenido principal y los controles utilizables durante la carga de efectos. Probar móviles físicos y conexión limitada.

Objetivos de referencia al percentil 75: LCP hasta 2,5 segundos, INP hasta 200 ms y CLS hasta 0,1. Separar los resultados de laboratorio de las mediciones reales de visitantes.

Render Free suspende el backend tras 15 minutos sin tráfico y puede tardar aproximadamente un minuto en reactivarlo. Si se mantiene ese plan, comprobar ese arranque y ofrecer mensajes/reintentos que conserven la idea. Definir las necesidades de disponibilidad antes de elegir otro plan; este informe no propone una compra automática.

Referencias: https://web.dev/articles/vitals y https://render.com/docs/free.

## 14. Preparación operativa y publicación — prioridad alta

- Respaldar Neon y comprobar una restauración en una base de prueba antes de aplicar cambios de esquema.
- Publicar backend y frontend de la misma revisión e incluir la migración 011. Confirmar primero las migraciones realmente aplicadas.
- Completar datos reales del prestador y de las partes antes de emitir documentos reales.
- Comprobar que se reemplazaron las credenciales visibles en capturas anteriores; no volver a pegarlas en chat ni incluirlas en el repositorio.
- Probar recuperación de contraseña con entrega real y caducidad; un mensaje neutral en pantalla no demuestra entrega.
- Probar micrófono con permiso concedido/denegado, ruido, cancelación y móvil; mantener escritura alternativa.
- Registrar errores técnicos con identificadores de incidente sin guardar contraseñas, claves, archivos privados ni respuestas completas por defecto.
- Preparar un procedimiento de recuperación de servicio y seguimiento de cuotas de IA/alojamiento.

## Qué simplificar y qué conservar

Simplificar: textos muy largos en la primera vista, valores técnicos, bloques repetidos, carga inicial de efectos que se pueden diferir y acciones sin relación con el estado actual. Mantener explicaciones ampliables y controles accesibles.

Conservar: las seis etapas del cotizador, escritura y dictado opcional, cotización sin cuenta hasta el envío autorizado, borradores sin enviar en el navegador, revisión humana del precio/alcance, separación de roles y documentos, historial de pagos y opción física/virtual de contrato.

La bienvenida con misión y visión puede ser breve y omisible. El estilo futurista puede mantenerse con animaciones ligeras, foco visible, buen contraste y movimiento reducido. Una pasarela de pago, entrenamiento de ML propio o generación libre de HTML/CSS pueden quedar para una fase posterior según la demanda comprobada.

## Orden recomendado de ejecución

1. Corregir actualización de cuenta, estados de error y etiquetas; revisar asociaciones de clientes.
2. Implementar avisos al equipo y respuestas a propuestas.
3. Integrar seguimiento del desarrollo y reportes de pago revisables.
4. Añadir interpretación revisable de texto/audio e informe persistente.
5. Completar expediente visual y acuerdos complementarios.
6. Medir rendimiento, terminar pruebas operativas y hacer un piloto con personas invitadas antes de ampliar la promoción.

Cada entrega debe comprobar su recorrido y sus permisos antes de avanzar. La optimización se mide desde el principio y se repite al cerrar el piloto.

## Prueba final de aceptación

Un caso completo debe cubrir: visitante que escribe/dicta y conserva su idea; envío explícito; aviso al administrador; asignación; propuesta formal; petición de cambios; versión revisada; contrato físico o virtual; avance del proyecto; reporte de pago y confirmación; consulta de comprobante; entrega y opinión. Repetir con caída de red, IA sin cuota, correo no disponible, sesión caducada, doble clic y acceso de otro cliente.

No se afirma que una aplicación esté libre de cualquier error por aprobar una batería de pruebas. El objetivo de salida es que los recorridos definidos funcionen, se recuperen de fallos habituales, respeten permisos y tengan seguimiento operativo.
