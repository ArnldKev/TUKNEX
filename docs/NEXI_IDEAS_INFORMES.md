# NEXI: ordenar ideas e informes internos

## Comportamiento implementado

En las etapas 2–5 del cotizador, la sección **NEXI · ordenar mi idea** consulta el mismo proveedor Groq y comparte los límites que ya usa el análisis. Funciona sobre respuestas escritas o incorporadas mediante el dictado existente; no introduce otro grabador, ni envía audio a este endpoint.

1. La persona autoriza una consulta independiente del guardado y de la publicidad.
2. NEXI devuelve narración, requisitos explícitos, exclusiones, dudas y hasta cuatro propuestas de cambios del catálogo visual/funcional.
3. Se muestra el texto original junto a la interpretación editable. Se destacan cantidades y frases negativas.
4. Ninguna propuesta visual viene marcada. La persona compara, edita, marca las opciones que quiere y confirma expresamente su aprobación.
5. Una operación del historial incorpora la interpretación separada y solo los cambios marcados. Las respuestas originales no se sustituyen. Se puede deshacer o rehacer con el historial; el botón inmediato **Deshacer aprobación** recupera la versión previa.
6. Cambiar la fuente invalida una interpretación pendiente de aplicar. Si se modifican respuestas después de aprobar, se avisa de la diferencia y esa interpretación antigua no se incorpora al siguiente contexto de IA.

El contrato `approvedIdea` es opcional y validado en ambos lados. Incluye fuente, revisión, fecha, original filtrado para ocultar contactos reconocibles y texto revisado. Es un dato aportado por el navegador, no una firma ni evidencia legal de identidad. La versión completa de las respuestas originales sigue en sus campos originales.

Antes de enviar una solicitud, el avance y la interpretación aprobada permanecen en la recuperación de la pestaña. `/api/quote-ai/organize` no crea solicitudes ni informes internos; conserva únicamente los contadores anónimos de cuota existentes. La recuperación no incluye los campos dedicados de nombre, correo, teléfono, aprobador ni consentimiento. El texto libre puede contener datos personales: el aviso pide revisarlo y el contexto saliente filtra patrones de contactos, sin prometer una anonimización perfecta. Descargar PDF sigue siendo una operación explícita de procesamiento en el servidor y no envía la solicitud al equipo.

## Validación y límites

- JSON estructurado, campos desconocidos rechazados, texto acotado y sin HTML, bloques de código o enlaces en la interpretación.
- Máximo seis requisitos/exclusiones/preguntas y cuatro propuestas del catálogo existente; ninguna función arbitraria, precio, permiso o código ejecutable.
- Las cantidades se comparan como tokens numéricos. No se acepta un resultado que cambie `25` por `250` u omita un número del contexto enviado.
- Las frases con `no`, `nunca`, `sin`, `ni` o `tampoco` deben conservarse literalmente en la interpretación o listas; el cliente puede ajustar la redacción restante. Esta comprobación conservadora puede rechazar una paráfrasis correcta y pedir reintentar. No verifica todo el significado del lenguaje natural: la comparación y revisión humana siguen siendo necesarias.
- Contactos reconocibles omitidos antes de consultar al proveedor. No se transmiten los campos dedicados de cuenta o importes comerciales.
- Se reutilizan los límites globales y por conexión, temporizadores, cancelación y validación de evidencia del proveedor existente. Las respuestas llegan vinculadas al ID y revisión; resultados tardíos no se aplican.
- Tiempo de proveedor: 20 segundos; espera del navegador: 25. Los límites gratuitos pueden agotarse y el cuestionario continúa sin IA.

## Informes persistentes del equipo

`NexiReportsModule` y `017_nexi_reports.sql` añaden informes para fuentes ya guardadas:

- `GET /api/nexi-reports/request/:id` y `/formal/:id`: fuente actual e informes recientes.
- `POST .../generate`: `{version, consent:true, policyVersion}`. Carga la solicitud o cotización formal canónica, verifica versión, consulta el mismo servicio de IA y vuelve a comprobar fuente y permisos antes de guardar.
- `POST .../:reportId/reviews`: `{expectedVersion, reviewed, approved, internalNote, idempotencyKey}`. Añade una revisión; no reemplaza generaciones o revisiones previas.

El administrador tiene acceso global. Un subadministrador solo puede operar sobre el proyecto que tenga asignado actualmente; se comprueba la cuenta activa y la asignación en cada lectura o mutación. La reasignación revoca el acceso anterior también al historial. Las cuentas cliente no tienen estos endpoints. No hay endpoints públicos de informes ni notas internas.

`nexi_informes` conserva fuente, revisión, instantánea canónica y sobre original generado. `nexi_informe_revisiones` conserva versiones humanas, autor, aprobación, nota interna e idempotencia. Triggers rechazan UPDATE/DELETE para ambas tablas. Una misma operación se puede repetir sin duplicar; si cambió su contenido o la versión esperada, se devuelve conflicto. Si la fuente cambia durante la consulta, no se guarda un informe obsoleto. Los informes antiguos se consultan, pero no se aprueban como si fueran de la versión actual.

Las pantallas de NEXI para solicitudes y cotizaciones formales ya usan el guardado canónico. El historial se puede reabrir, editar y aprobar. **Usar revisión aprobada para preparar contrato** recupera esa versión revisada en el análisis y conserva el paso existente de preparación de borrador; no envía, firma ni crea acuerdos automáticamente. La nota interna no forma parte del AiReport que se pasa al contrato. El expediente exportable debe seleccionar las revisiones aprobadas y omitir `nota_interna`.

Se muestran como máximo los 50 informes recientes de una fuente; las revisiones de cada informe se conservan completas. Un historial no disponible presenta error y reintento, mantiene datos anteriores identificables y no presenta una lista vacía falsa. Una sesión vencida solicita iniciar sesión nuevamente. La interfaz evita usar informes si cambió la versión de la cotización que está abierta.

## Configuración y comprobación

Se reutilizan `NEXI_AI_ENABLED`, `NEXI_AI_PROVIDER`, `NEXI_AI_MODEL` y `GROQ_API_KEY`, exclusivamente en backend. No hay claves nuevas ni claves en frontend. La migración se aplica por el mecanismo existente del backend; no se aplicó a Neon en esta tarea.

Pruebas automatizadas añadidas:

- `frontend/src/lib/quote/idea.test.ts`: paridad de contratos, rechazo de código/cantidades/negaciones perdidas, evidencia, aprobación explícita sin cambios implícitos, deshacer también en el formulario, recuperación local y contexto aprobado solo si corresponde al original.
- `backend/scripts/test-nexi-reports.mjs`: organización sin guardar solicitud/informe, persistencia solo al envío, acceso cliente/subadministrador/asignación, fuente canónica, reapertura, original inmutable, versiones humanas, idempotencia, conflictos, cambio de fuente durante generación y privacidad de las notas. Base PGlite temporal y proveedor simulado; carga `.env` deshabilitada y red externa bloqueada.

La calidad real de un modelo gratuito, el cupo de la cuenta real y el permiso de micrófono requieren una prueba manual posterior. Los tests no contactan al proveedor real, Neon, Resend ni micrófono; no prueban rendimiento real del modelo. No se publicó ni se hizo push.
