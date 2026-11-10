# Auditoría de seguridad e integración de TUKNEX

Fecha: 10 de noviembre de 2026. Revisión del árbol de trabajo de `D:\TUKNEX`, rama `codex/connected-contract-workflow`, sobre el commit base `69864e4` y sus cambios locales. No se revisó la copia antigua de C:.

## Alcance y método

Se revisaron frontend, backend, contratos de datos compartidos, permisos y nuevas conexiones entre cuentas, solicitudes, propuestas, contratos, cuotas, comprobantes, seguimiento, NEXI y expedientes. Se inspeccionaron archivos versionados, patrones reconocibles de secretos, recursos públicos y el export estático existente durante la revisión.

No se cargaron archivos `.env` privados ni se mostraron claves, contraseñas o cadenas de conexión. No se consultaron Neon, Groq, Resend, Render o Netlify, ni se ejecutaron pruebas de micrófono. No se hizo push, publicación, compra ni cambio de plan. Las reproducciones usan el código actual en memoria, usuarios ficticios, promesas controladas y cero red real.

Este documento distingue comprobaciones de código y pruebas locales de las verificaciones que todavía requieren un navegador o la infraestructura de producción. No es una certificación de ausencia de vulnerabilidades, una auditoría de dependencias ni una revisión legal del contrato.

## Fallos confirmados y corregidos

| Hallazgo | Evidencia reproducida | Corrección y validación |
|---|---|---|
| P2: una comprobación de sesión iniciada por `focus` podía restaurar al usuario después de cerrar sesión o de entrar con otra cuenta. | Ejecutando `auth.tsx` real con servicio simulado: después del logout el usuario era `null`; al resolver la respuesta antigua reaparecía el usuario anterior. El backend simulado ya había recibido el cierre. | `AuthRequestScope` invalida respuestas mediante una generación, aborta lecturas anteriores y suspende las verificaciones durante cambios explícitos de cuenta. El proveedor cancela al vencer sesión o desmontarse. `ApiAuthService` también protege su caché y el indicador de sesión de facturación, y evita eventos tardíos de un logout anterior. Se conserva el mensaje de sesión caducada. Ocho regresiones ejecutan los módulos reales con dependencias controladas y pasan. |
| P2: el expediente podía mostrar documentos del proyecto A mientras cargaba el proyecto B, incluso después de fallar la carga de B, si React reutilizaba la instancia. | Reproducción del componente real conservando estado entre cambios de `projectId`: las llamadas apuntaban a A y B correctamente, pero seguía visible el documento de A. La protección del backend impedía operar con IDs de otra fuente; el error estaba en la presentación. | El contenedor del expediente tiene identidad React por tipo de proyecto, ID y ámbito cliente/equipo. Se aplicó el mismo aislamiento a acuerdos complementarios y al editor de seguimiento. Tres regresiones verifican identidad `type + key`, descarte de documentos al cambiar entidad y conservación del estado al actualizar la versión del mismo contrato. |

Los tests de identidad usan elementos React reales y un ejecutor que respeta la frontera `type + key`; no se presentan como pruebas de DOM o de navegador. Se comprobó que actualizar `contract.version` mantiene la identidad del editor y que cambiar el contrato o el ámbito crea otra instancia. Esto evita borrar un formulario solo por actualizar la misma entidad.

Archivos principales de la corrección de sesión: `frontend/src/lib/platform/auth.tsx`, `api-auth.ts`, `auth-request-scope.ts`, `types.ts` y `auth-races.test.ts`. Regresiones de identidad: `frontend/src/lib/billing/detail-identity.test.ts`.

## Controles confirmados en el código actual

| Área | Comprobación | Límite práctico |
|---|---|---|
| Identidad y roles | La sesión del servidor procede de una cookie HttpOnly, con Secure en producción y acceso restringido al prefijo `/api`. Los guards consultan la cuenta activa. El rol mostrado en React no concede permisos al servidor. | No se inspeccionaron cookies ni configuración del despliegue real. Un cierre sin conexión no demuestra la revocación de una sesión en el servidor. |
| Administrador y subadministrador | Las asociaciones de fichas a cuentas y la revisión financiera de reportes de pago requieren administrador. El trabajo del subadministrador usa la asignación actual del proyecto y valida cuenta/rol activos. | La configuración organizativa y las asignaciones reales deben revisarse con datos de producción por su propietario. |
| Asociación de clientes | El acceso a fichas históricas se concede mediante asociaciones explícitas. No se infiere por coincidencias de nombre, DNI o correo. La asociación exige previsualización, confirmación, motivo y comprobación de versión/huella. | Una asociación autorizada concede acceso a los documentos de esa ficha. El administrador debe revisar la previsualización completa antes de confirmarla. |
| Portal cliente | Documentos y solicitudes proceden del servidor y admiten las fichas explícitamente asociadas. El resumen, listas y contadores financieros usan un mismo snapshot de cuenta. No se filtra únicamente por la ficha principal. | Seguimiento, reportes de pago e historiales especializados mantienen sus propias cargas y estados; no constituyen una única transacción con todo el portal. |
| Estados de carga y error | El portal distingue carga, información anterior, fallo, reintento y sesión caducada. Cancela lecturas al cambiar identidad/desmontar y conserva cambios no guardados del perfil. | No equivale a que la red nunca falle. Un servidor en reposo o sin conexión puede requerir reintento. |
| Cotización pública | El borrador y el historial permanecen en la pestaña hasta el envío explícito. Descargar PDF procesa las respuestas para ese documento y no equivale a enviar una solicitud al equipo. | El texto libre puede contener datos personales; la omisión de campos dedicados no implica anonimización completa. |
| Propuestas y respuestas | Responder una propuesta requiere la versión actual, una cuenta autorizada y una decisión explícita. Los reintentos usan idempotencia. Confirmar una propuesta no firma un contrato ni registra un pago. | No se enviaron propuestas o correos reales durante esta revisión. |
| Pagos reportados | El reporte del cliente conserva comprobante e historial, pero no modifica el saldo hasta la confirmación administrativa. Se verifican propiedad, cuota, versión, fecha e importe. La confirmación usa el servicio financiero y una operación idempotente. | Una captura de Yape u otro medio sigue requiriendo contraste humano con el movimiento real; no se conectó con una entidad de pago. |
| Archivos de comprobantes | Se limita a 5 MB y se comprueba cabecera de PDF, PNG o JPEG. Se conserva hash y se descarga por rutas autenticadas con `no-store`, `nosniff` y nombre controlado. Las vistas revocan sus URLs temporales al desmontarse. | La cabecera no prueba que todo el archivo sea íntegro, que una captura sea auténtica o que un PDF carezca de contenido malicioso. No hay análisis antivirus ni validación documental completa en esta comprobación. |
| Contrato y acuerdos adicionales | Se vinculan versión, PDF y hash. La aceptación autenticada y la incorporación de un ejemplar firmado son modalidades distintas. Las adendas conservan evidencia propia y no recalculan silenciosamente cuotas anteriores. | Una aceptación autenticada en el portal no se presenta como firma con certificado digital. Identidad, capacidad contractual y texto jurídico requieren su propia revisión. |
| Seguimiento | Se separa nota interna de comentario público. La proyección para clientes elimina la nota interna. La entrega exige fase de entrega e hitos completados; el historial conserva versiones. | Las fechas y los hitos los registra el equipo; no son una predicción garantizada de IA. |
| Organización con NEXI | La consulta requiere consentimiento independiente; usa JSON acotado, conserva cantidades y frases negativas, y rechaza cambios numéricos introducidos. La interpretación es editable y se aplica solo después de aprobación. Las opciones visuales no vienen seleccionadas. Se conserva el original y se permite deshacer. | Estas comprobaciones conservadoras no demuestran que el modelo haya comprendido todo el significado. La revisión humana sigue siendo necesaria. |
| Proveedor de IA | Se reutilizan límites globales/por conexión, cancelación y tiempos máximos. No se habilitan herramientas ni código HTML/CSS/JS generado para ejecutar en la aplicación. Los cambios del boceto pertenecen al catálogo controlado. | Las pruebas usaron proveedor simulado. No confirman el cupo, latencia, calidad o disponibilidad de la cuenta real. |
| Informes NEXI | Solo fuentes guardadas, con permiso y revisión canónicos, generan informes persistentes. Se comprueba la fuente otra vez después de consultar al proveedor. Generación y revisiones humanas son inmutables y se conservan por separado; las notas son internas. | Los campos de aprobación aportados por el navegador no son una firma ni una acreditación legal de identidad. |
| Expediente digital | La selección procede del conjunto autorizado del proyecto. Se conservan versiones, archivos, manifiesto y hashes. El ZIP rechaza nombres absolutos o con `..`, tiene límite de tamaño y cupo de preparación. El cliente no descarga expedientes privados del equipo. | No se verificó el archivo descargado en el navegador durante esta auditoría de código. Los tests de archivos y del recorrido global se documentan en el informe de integración. |
| Exportación de NEXI al expediente | Se selecciona el informe revisado y aprobado. La consulta y el payload exportable omiten `nota_interna`; no exportan el sobre original como si fuera una aprobación humana. | Un texto que el propio revisor incluya dentro del alcance aprobado se considera parte de ese contenido compartible, no una nota interna. |
| Avisos por correo | La cola se crea dentro de la transacción de negocio; la entrega no bloquea esa operación. Se valida destinatario activo/rol/asignación actual y enlace al origen permitido. Hay reintentos, cupo de intentos e idempotencia del proveedor. | Una operación guardada no demuestra que el correo haya llegado. El estado del aviso debe consultarse y la entrega real requiere configuración y prueba posterior. |

## Secretos, artefactos y recursos públicos

Comprobaciones efectuadas sin mostrar valores:

- `git ls-files` encontró únicamente los tres `.env.example` previstos; no encontró `.env` privado, dumps, claves PEM/KEY ni archivos de `.local-data`, `dist`, `out` o directorios `.qa-*` entre las rutas versionadas consultadas.
- La búsqueda de patrones reconocibles de claves Groq, Resend, GitHub, AWS y claves privadas no produjo coincidencias en las carpetas de fuentes, recursos públicos, assets, documentación y despliegue examinadas. No es una prueba de que todo secreto posible de cualquier formato esté ausente.
- El export estático existente no produjo coincidencias con esos patrones ni con los nombres de configuración privada consultados. No se encontraron sourcemaps `.map` en ese export.
- Los 28 recursos de `frontend/public` examinados pertenecen al conjunto estático de marca, proyectos, fuentes, referencias y modelo. No se encontraron rutas públicas de comprobantes, DNI, backups o credenciales en la inspección de nombres.
- `git check-ignore -v` confirmó que `backend/.qa-ai-dist`, `backend/.qa-projectdist`, el build/export de Next, `.qa-integral` y el `.env` privado del backend quedan ignorados. Los directorios QA locales no deben añadirse con `git add -f`.
- `.dockerignore` excluye configuración privada, datos locales, Git, logs y archivos de respaldo/entrega de su contexto previsto; las imágenes de ejecución copian únicamente los artefactos necesarios.
- Las identidades y credenciales de demostración de frontend son ejemplos públicos, no credenciales de producción. El build de release rechaza el modo demo y los permisos reales dependen del backend.

El análisis se limita al árbol actual. No se escanearon todos los commits históricos, el registro de contenedores, copias externas, capturas antiguas del chat, archivos privados ignorados o la configuración almacenada en los proveedores. No se certifica una rotación de claves que esta revisión no realizó.

## Paridad y pruebas locales

Se compararon 19 pares de módulos entre `frontend/src/lib` y `backend/src/domain`, normalizando solo BOM y saltos de línea: **19 idénticos, 0 diferencias**. Incluye precios, finanzas, schemas/tipos, avance, cotización, audio, dictado, interpretación, vista previa, IA y modelo de proyecto. La comprobación de los nuevos contratos de IA también verificó ausencia de los marcadores de mojibake detectados y corregidos durante el trabajo.

Regresiones de esta auditoría:

```powershell
cd D:\TUKNEX\frontend
node --import tsx --test src/lib/platform/auth-races.test.ts src/lib/billing/detail-identity.test.ts
```

Resultado: **11 pruebas correctas, 0 fallidas y 0 llamadas reales de red**. Se ejecutaron además comprobaciones de TypeScript y ESLint acotadas a los cambios de sesión y a las nuevas pruebas. Los resultados del build final y de la regresión completa pertenecen al informe integral; esta revisión no los sustituye.

Comprobaciones relacionadas realizadas antes en la misma implementación: 37 pruebas frontend de organización/modelo/flujo/IA y 50 comprobaciones backend del flujo NEXI con PGlite temporal y proveedor simulado. Los tests de proveedor simulado no demuestran que un modelo real cumpla sus instrucciones en todos los casos.

## Validación pendiente antes de publicación

1. Recorrido manual con administrador, subadministrador asignado, otro no asignado y dos cuentas cliente distintas: registro, inicio/cierre, cotización, asignación, respuesta, contrato, reporte y confirmación de pago, comprobante, seguimiento, adenda y expediente. Comprobar también enlaces de notificación y cambio de cuenta con solicitudes lentas.
2. En la infraestructura de producción, confirmar variables de entorno, orígenes CORS, proxy y cookie reales, migraciones previstas, almacenamiento persistente y respaldo/restauración. No sustituir esta verificación por que compile el frontend.
3. Con autorización y presupuesto reales, probar una consulta breve de Groq, la degradación cuando no hay cupo y un correo de aviso. Revisar texto interpretado y restricciones con datos de prueba sin información personal.
4. Verificar micrófono y dictado en navegador compatible, permisos denegados y cancelación. La transcripción y la organización con IA son pasos diferentes.
5. Abrir los PDFs y ZIP descargados, contrastar versión/hash y comprobar que no contengan notas internas. Probar al menos una vista móvil y teclado en los formularios principales.
6. Revisar la política de conservación, la identidad declarada y el contenido contractual antes de tratar documentos reales. Los historiales inmutables requieren una política de acceso y retención; no se añadieron borrados automáticos de evidencias en esta auditoría.

No se identificó una escalada de permisos o una publicación de credenciales de producción en las rutas examinadas. Esa conclusión se limita a las comprobaciones descritas y no afirma seguridad total del servicio desplegado.
