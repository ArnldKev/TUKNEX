# Pruebas locales de expedientes y acuerdos complementarios

Entorno: `D:\TUKNEX`, rama `codex/connected-contract-workflow`. Pruebas realizadas con la aplicación Nest real, HTTP en loopback y una base PGlite temporal. La carga del `.env` real se anula expresamente; no se leen credenciales de Neon y la red externa se bloquea en el adaptador HTTP. NEXI, audio y correo permanecen desactivados.

## Ejecución reproducible

Desde `D:\TUKNEX\backend`, compilar y ejecutar de forma secuencial, sin competir por el directorio `dist` de un servidor activo:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.build.json --outDir .qa-documents-dist
$env:QA_DOCUMENTS_DIST = '.qa-documents-dist'
$env:QA_DOCUMENT_SAMPLES = '1'
node scripts/test-project-documents.mjs
```

El script elimina únicamente la base temporal que acaba de crear y verifica su ubicación antes de la limpieza. Los ocho PDF de muestra, el ZIP y su manifiesto permanecen en `.qa-integral/project-documents/`. Son datos sintéticos de QA; el ejemplar físico adjunto prueba la conservación del archivo, no representa una firma humana real.

## Casos cubiertos

- Autenticación, roles y acceso por asignación: administrador principal, dos subadministradores y dos clientes. Rechazo de otro cliente y de un desarrollador sin el proyecto.
- Borradores de adenda ocultos al cliente; control de versión del contrato y revisión más reciente; publicación explícita e idempotente.
- Publicar una adenda nueva conserva la anterior como sustituida. La versión sustituida no puede aceptarse.
- Aceptación en línea con nombre, versión, hash del PDF y consentimiento expreso; rechazo de nombre, hash o versión incorrectos y de ausencia de consentimiento.
- Aceptación física con archivo comprobado; rechazo de archivo ausente/inválido, conservación exacta del archivo y protección frente a doble clic.
- Contrato original, PDF revisado, datos financieros y cuotas sin modificaciones al aceptar una adenda. La aceptación no crea pagos. El expediente incluye constancias separadas en JSON y PDF legible, más el ejemplar físico adjunto.
- Triggers SQL que impiden modificar/borrar adendas, aceptaciones y expedientes.
- Publicación/aceptación rechazadas si el contrato original fue cancelado.
- Los originales virtuales y físicos firmados solo por TUKNEX no permiten crear adendas sin conformidad del cliente. Esa conformidad se comprueba también al publicar y aceptar una propuesta pendiente. Una adenda ya aceptada conserva su reintento idempotente.
- Catálogo de expediente limitado al proyecto/cliente y a documentos visibles. Las versiones de otro cliente, informes de su revisión anterior, documentos en borrador, informes no aprobados y notas internas quedan fuera del expediente del cliente.
- Archivos administrativos privados no listables ni descargables desde el portal del cliente.
- Expediente financiero reservado al administrador; el subadministrador utiliza el proyecto del equipo para impedir que un agregado financiero mezcle contratos de otros desarrolladores.
- Creación de ZIP idempotente, reintentos concurrentes y límite de cinco expedientes por autor en 24 horas. Los archivos existentes continúan descargables.
- Manifiesto con versión, tamaño y hash SHA-256 de cada archivo. Lectura independiente de cabeceras locales/centrales del ZIP y cálculo de CRC32 por bits, diferente del algoritmo por tabla del generador.
- PDF de contrato del ZIP idéntico byte a byte al PDF revisado y aceptado; PDF de cotización histórica con el alcance de su versión, sin tomar el alcance posterior.
- Captura del boceto de una cotización formal al crear su versión. Editar después las respuestas del cuestionario no altera ese boceto; tanto el PDF histórico como el actual utilizan la instantánea comercial. El contrato preparado desde esa cotización conserva el mismo boceto.

## Evidencia visual y comprobación independiente

Las muestras se obtienen de los endpoints reales y del ZIP. Se renderizan con Poppler (`pdfinfo`, `pdftoppm`), sin sustituir su contenido por un documento fabricado fuera de la aplicación.

La primera inspección incluyó doce páginas: dos de acuerdo virtual, dos de acuerdo físico, cuatro del contrato revisado, una de informe aprobado, una de boceto y dos de cotización. No se observaron solapamientos ni cortes en esas páginas. El contrato revisado muestra su estado anterior a la aceptación porque es exactamente el archivo que el cliente revisó; su evidencia posterior se conserva separadamente. El ZIP también se abrió con `zipfile` de Python y se verificaron sus CRC y los hashes del manifiesto.

La regeneración final contiene ocho PDF y catorce páginas, incluidos dos registros de aceptación legibles adicionales.

Resultado final: **424 comprobaciones correctas** contra la aplicación HTTP real y datos temporales. Incluye constancias legibles, contexto real de marca/estilo/paleta, bocetos comerciales congelados y conformidad del cliente con el contrato original. Compilación TypeScript aislada final correcta. Evidencia: `.qa-integral/project-documents/qa-test-final.log`, `qa-source-hashes.json` y `pdf-pages.json`. La comprobación independiente con Python confirmó CRC, fechas DOS válidas y los 17 hashes SHA-256 del manifiesto.

## Límites

Estas pruebas no aplican migraciones a Neon, no publican Netlify/Render, no envían correos y no utilizan Groq real. La validez jurídica del texto contractual y la comprobación humana de un ejemplar firmado no se deducen de un resultado técnico correcto. El uso de firma o aceptación auténtica requiere el flujo explícito del cliente y sus documentos reales, fuera de estas fixtures.

La suite normal npm test ejecutó 423 comprobaciones; la ejecución con QA_DOCUMENT_SAMPLES=1 ejecutó 424 por una descarga HTTP adicional para guardar la muestra. Las aserciones funcionales son iguales.
