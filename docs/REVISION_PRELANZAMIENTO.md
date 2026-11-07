# Revisión previa al lanzamiento de TUKNEX

Fecha: 30 de octubre de 2026. Código local: `D:\TUKNEX`, rama `codex/release-readiness-audit`. Esta revisión conserva los cambios anteriores de subadministradores, registros compactos y evolución visual. No publica, modifica Neon ni envía correos a clientes.

## Dictamen

La aplicación tiene un recorrido real de cotización, cuentas, propuestas, contratos PDF y registro manual de pagos. La integración generativa y la transcripción respondieron en dos pruebas reales con datos sintéticos. Esto permite preparar un piloto supervisado; no acredita que toda la visión del cotizador generativo esté terminada ni que el servicio publicado contenga estas correcciones locales.

Antes de abrirlo ampliamente, completar la configuración y comprobaciones operativas indicadas abajo. La revisión automática y las pruebas aisladas no sustituyen la revisión final con un cliente y dispositivos reales. No se asigna un porcentaje global porque mezclar código existente, funciones pendientes y configuración externa daría una precisión falsa.

## Qué hace realmente la IA

| Parte | Comportamiento comprobado | Límite actual |
| --- | --- | --- |
| Cuestionario escrito | Las respuestas actualizan el modelo local del proyecto y su boceto. | No todos los textos producen un elemento visual: presupuesto, plazos, problemas y referencias también son información de alcance. |
| Dictar junto al campo | Groq transcribe la voz en español y el resultado se añade al campo. Se puede editar y deshacer. | No reformula automáticamente ni crea una narración nueva. No hay carga de archivos en este recorrido vigente. |
| Boceto | Combina tipo de proyecto, rubro, funciones, nombre, oferta, mensaje principal y preferencias visuales. | Utiliza composiciones, ilustraciones, productos y datos de ejemplo preparados; no genera un sitio libre ni código HTML/CSS terminado. |
| Panel «NEXI · dale forma a tu idea» | Consulta generativa opcional: resumen, alcance tentativo, exclusiones, preguntas, riesgos, criterios y sugerencias visuales/funcionales. | Requiere autorización; las sugerencias cambian el boceto solo al aceptarlas. El informe permanece en esa pantalla, no queda guardado como informe final. |
| NEXI para administración/equipo | Analiza la versión autorizada de una solicitud y muestra ideas para revisión interna. | No sustituye al editor, no fija precios ni modifica contratos. |
| Chat general de NEXI | Orientación guiada por reglas locales. | No es una conversación generativa con Groq. |
| Precio | Motor de reglas y catálogo del servidor. | La IA no fija el importe contractual. La propuesta final requiere revisión del responsable. |

El origen escrito/audio de cada campo es metadato del proyecto local; no debe presentarse como una prueba persistente de la procedencia de cada respuesta enviada. Se respeta la decisión del usuario: los avances no enviados permanecen en el navegador, sin seguimiento remoto automático.

## Pruebas reales del proveedor

Se realizaron dos llamadas explícitas al backend ya activado detrás de Netlify. No se consultaron claves privadas ni se usaron personas, cuentas, cotizaciones, contratos o pagos reales. Son pruebas distintas de las respuestas simuladas de las pruebas unitarias y de interfaz.

1. **Texto: HTTP 201, aproximadamente 4.6 segundos.** Ejemplo de pollería con 25 platos, WhatsApp, azul/blanco y negación de pagos/cuentas. El resultado conservó esa cifra y esas exclusiones, propuso alcance y preguntas y superó el contrato de respuesta de la aplicación. No implica precisión general: hace falta un conjunto de casos de negocio y evaluación humana. Incluso en este resultado hay supuestos por revisar, como atribuir preferencias visuales predeterminadas o mantenimiento manual al cliente; no deben trasladarse al contrato como confirmaciones.
2. **Transcripción: HTTP 201, aproximadamente 25.1 segundos totales de red/servicio.** WAV generado localmente con la voz sintética Microsoft Sabina, 8.59 segundos y aproximadamente 275 KB. Resultado: «Tengo una pollería. Quiero mostrar 25 platos y recibir pedidos por WhatsApp. No quiero pagos en línea». Conservó número y negación. No prueba un micrófono físico, acento peruano, ruido, permisos ni Safari/iPhone/Android. La latencia total no es una medición aislada del modelo.

Evidencia local sin credenciales: `.qa-release-audit/real-ai-result.json` y `real-audio-result.json`. La API pública indicaba IA y dictado activados; el backend local de puerto 4000 los indicaba desactivados. Por eso el icono local puede estar visible y no disponible: requiere configuración privada del backend, además del soporte/permiso del navegador. No se cambiaron esas variables ni se activó un servicio de pago.

Un intento directo a Render agotó la espera; el proxy de Netlify respondió después. Esto no demuestra una caída del backend. Los arranques lentos pueden superar la espera inicial del frontend: existe reintento y escritura como alternativa.

## Defectos corregidos

| Hallazgo | Corrección y alcance |
| --- | --- |
| Menú móvil de la cuenta permanecía abierto al navegar, especialmente hacia anclas del equipo. | Cierre al elegir destino, Escape, foco al botón, navegación Tab, estado expandido y exclusión de enlaces ocultos. |
| Un fallo inicial al cargar la cuenta dejaba el estado «Cargando» sin recuperación. | Fin de carga, mensaje visible y botón para volver a cargar; cancelación al salir. |
| Resumen de consentimiento real decía «sesión demo». | Texto coherente con el modo real. |
| Texto sobre entrenamiento convertía salud/educación en una tienda deportiva en el boceto. | El rubro profesional explícito prevalece sobre las palabras deportivas. Comercio/otro conserva esa especialización. |
| El acceso validaba el correo antes de quitar espacios. | Normaliza antes de validar, igual que el registro. |
| Planes válidos para el esquema pero imposibles financieramente producían HTTP 500. | Error de datos HTTP 400 con explicación, tanto al cotizar como al crear contrato. No cambia tarifas ni fórmulas. |
| Una cotización vinculada a un proyecto de equipo permitía cambiar su cliente desde la edición general. | Se impide la relación incompatible. Las cotizaciones generales sin vínculo conservan su edición habitual. |
| Conversión de una cotización de equipo desde administración perdía el vínculo del contrato con el equipo. | La creación conserva la relación; la conversión repetida continúa siendo idempotente. No repara registros históricos automáticamente. |
| Respuestas rechazadas del proveedor dejaban el stream sin cancelar; metadatos de audio nulos provocaban un error interno. | Cierre de recursos sin filtrar detalles del proveedor y error controlado para transcripciones malformadas. |
| Dependencias del backend tenían avisos de seguridad. | Actualizaciones transitivas acotadas: `multer` 2.5.0 y `body-parser` 2.4.0, sin forzar una migración mayor de Nest. |
| Tras aceptar una sugerencia, la tarjeta aún decía «no aplicada». | Etiqueta coherente con su aplicación en una revisión anterior; conserva el bloqueo de análisis antiguos y Deshacer. |
| Las guías de audio describían un panel antiguo no montado. | Documentación del dictado actual en 20 campos y separación clara del análisis generativo. |

Los fallos de acceso, plan inválido y cliente incompatible se reprodujeron con regresiones antes de aplicar el arreglo. Los nuevos casos se ejecutan junto a las pruebas existentes; la base de datos utilizada es temporal y está aislada.

Los avisos originales son [multer GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m) y [body-parser GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828). El primero requiere condiciones de filtrado asíncrono; encontrar la versión afectada no demuestra que ese ataque fuese reproducible en TUKNEX. La auditoría inicial registró tres paquetes afectados por estos avisos.

## Pendientes antes del piloto público

1. **Secretos de producción.** En capturas anteriores se mostraron credenciales de base de datos, proveedor de correo y secreto de verificación. Sustituirlas en sus paneles y en Render, sin pegarlas en chat o repositorio. La revisión no acredita un uso indebido; su exposición impide tratarlas como privadas.
2. **Publicar una versión coherente después de aprobarla.** Frontend y backend deben corresponder al mismo código y migraciones 009/010 de equipo/solicitudes atendidas. Comprobar respaldo y proceso de migración con el despliegue autorizado. Esta revisión no ejecutó migraciones ni comprobó datos privados de Neon.
3. **Recuperación de contraseña y correo.** El código existe, pero falta comprobar entrega real a una bandeja controlada, remitente autorizado, caducidad y cambio de acceso. El mensaje público neutro no prueba que el correo haya salido. No se enviaron mensajes externos en esta revisión.
4. **Micrófono/dispositivos.** Probar voz real con permisos aceptados/denegados, ruido, cifras y negaciones, en Chrome/Edge y un móvil; conservar siempre la escritura. La prueba de voz sintética cubre el servidor/proveedor, no esta matriz física.
5. **Documentos y cobros del negocio.** Revisar emisor y datos del cliente antes de enviar el primer PDF real. Hay cuotas, registro manual, comprobantes y anulación auditada; no se implementó una pasarela de cobro. El documento con estados de firma externa no equivale a un proceso de firma electrónica con DNI/audio/certificado.
6. **Rendimiento.** La medición anterior del rediseño registró LCP móvil alto: aproximadamente 7 s en inicio y 9.14 s en cotizar, en Lighthouse local sin compresión. Se conserva ese límite; no se presenta como un resultado nuevo de esta revisión ni como Core Web Vitals reales. El elemento LCP era texto en ambas rutas. El retraso de renderizado simulado y la carga inicial de CSS/JS son candidatos de investigación, no una prueba de bloqueo real de CPU durante esos segundos. El LCP observado localmente fue aproximadamente 1.19/0.77 s; tres corridas móviles de inicio tenían advertencias de carga incompleta. Priorizar variantes de logo adecuadas a su tamaño visible (el PNG común pesa unos 424 KB) y evaluar carga diferida de acceso/resultado/PDF que no se necesitan en la primera etapa. Sus beneficios no están medidos todavía; repetir una comparación controlada y medir el despliegue/dispositivos objetivo antes de atribuir mejoras. Ver [informe visual](VISUAL_EVOLUTION_2.md).

## Funciones de la visión original que aún faltan

- Avisos por correo a administradores al enviar cotización o pedir orientación. Ahora se guarda la información, pero no existe ese servicio de notificación ni su cola/reintento.
- Reformulación opcional y revisable del texto/dictado, conservando la respuesta original y distinguiendo hechos, propuestas y preguntas faltantes.
- Informe final persistente para el administrador, ligado a la revisión exacta del proyecto, con alcance aprobado, decisiones visuales, exclusiones y trazabilidad de cambios.
- Expediente descargable completo con capturas del diseño aprobado, paleta y tipografía; anexo visual coherente con el contrato y precio.
- Aceptación remota y firma con un mecanismo concreto elegido y revisado por el titular. No presentar fotos de DNI o un audio como una firma digital ya implementada.
- Generación libre de interfaces o código si se decide ese producto después. El boceto actual es un prototipo configurable y debe seguir mostrándose como tal.

Para acercarse al objetivo central, el siguiente desarrollo recomendable es un **brief revisable**: respuesta original → interpretación propuesta → aprobación del usuario → actualización del modelo visual → versión enviada al administrador. A continuación, persistencia del informe y avisos al equipo. No es necesario entrenar un modelo propio para esta etapa.

## Verificación de esta entrega

Pruebas completas aprobadas: **906 comprobaciones de integración y 21 pruebas Node en backend**, con PGlite temporal y proveedores simulados; **139 pruebas de modo real y 13 de demostración en frontend**, más dos comprobaciones SSR. Lint de frontend sin errores. La compilación de publicación de Next completó 40/40 tareas de generación; el aviso existente sobre el plugin ESLint de Next sigue siendo informativo. `npm audit` terminó con cero vulnerabilidades conocidas en ambos paquetes después de la actualización; esto no certifica ausencia de fallos en el código.

El navegador verificó en un entorno aislado la recuperación de una cuenta tras un HTTP 503, Escape/Tab/foco/cierre del menú móvil y navegación por anclas del equipo, actualización del boceto con datos de ejemplo, aplicación y deshacer de una sugerencia simulada y el rubro salud con texto de entrenamiento. Se comprobaron 390 px y escritorio, sin desbordamiento horizontal observado ni errores de consola en esos recorridos. Esta fixture no usa la DB, cuentas reales ni el proveedor: sus resultados no se confunden con las dos llamadas reales anteriores. La inspección del export encontró 36 HTML y 85 referencias internas únicas, todas presentes.

Evidencia: `.qa-release-audit/backend-full-tests.log`, `frontend-tests.log`, `frontend-lint.log`, `frontend-build-final.log`, auditorías npm y `test-summary.json`. No hay acceso a datos de clientes, cambios de contraseñas reales, cobros, firmas ni despliegue automático como parte de estas pruebas.

## Cómo revisar localmente

Los cambios están en `D:\TUKNEX`. El frontend de desarrollo usa el puerto 3000 y el backend el 4000. Si ya están abiertos, actualiza el navegador y reinicia tu terminal del backend para que cargue el código corregido; la auditoría dejó esos procesos existentes intactos. En terminales separadas, los comandos habituales son `npm run dev` desde `D:\TUKNEX\frontend` y desde `D:\TUKNEX\backend`.

La IA local requiere configuración privada del backend según [la guía vigente](../deploy/NEXI_AUDIO.md); no basta con que esté activada en Render. No copies claves al frontend. La prueba de interfaz aislada del puerto 3311 se detuvo al finalizar.

Prueba visual con datos sintéticos y respuesta IA simulada; demuestra aplicación de una paleta, no una nueva llamada real al proveedor:

![Sugerencia aplicada y boceto actualizado](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/release-audit/quote-ai-accepted-desktop.jpg)
