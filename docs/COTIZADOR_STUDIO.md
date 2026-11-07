# Cotizador Studio — entrega del 30 de octubre de 2026

Trabajo local en `D:\TUKNEX`, rama `codex/quote-studio-refinement`. Se conservaron permisos, tarifas, seis etapas, dictado, historial y la decisión «solo navegador hasta el envío». No se publicaron cambios ni se modificó la base de datos real.

La asignación de clientes y los apartados privados tienen una actualización posterior: [selector y separación de cotizaciones](CLIENTES_Y_COTIZACIONES.md). El selector actual permite nombre, DNI o correo.

## Correcciones de las capturas

| Observación | Resultado |
| --- | --- |
| 1. Formulario pequeño a la derecha al cotizar como administrador | El aviso de atención se separó del grid. El formulario ocupa la columna principal izquierda y el boceto la derecha. La estructura es compartida por administrador, subadministrador y visitante. |
| 2. Maqueta y estimación aparecían debajo | Se asignaron áreas explícitas al formulario y al boceto. En escritorio quedan alineados; en teléfono se apilan para conservar el ancho de lectura. |
| 3. PDF con una imagen genérica | La propuesta preliminar incluye una representación vectorial imprimible del modelo del proyecto: nombre, oferta, titular, rubro, colores, estilo y navegación. Se genera con las respuestas y decisiones actuales, sin aceptar HTML, imágenes arbitrarias ni URLs externas. |
| 4. No se encontraba cómo asignar una cotización a un cliente | Las solicitudes atendidas por el equipo tienen botón **Asignar cliente**, contador **Por asignar** y filtro de cuenta. Funciona para administrador y subadministrador. Un contacto escrito no se muestra como una cuenta vinculada. |
| 5. Solo dos destinos en la maqueta | La navegación web/catálogo tiene Inicio, oferta/carta/colección, negocio y destinos pertinentes como contacto, reservas o galería; hasta cinco. Cada botón muestra contenido distinto. Los sistemas conservan sus módulos elegidos; no se inventan funciones para llenar el menú. |
| 6. Las direcciones visuales se veían iguales | Moderno, Elegante, Sencillo, Llamativo y Profesional tienen miniaturas distintas y explicaciones concretas. Elegirlos aplica letras, espaciado, portada y fondo de partida; conserva color, tamaño y orden. Los ajustes manuales y Deshacer siguen disponibles. «No estoy seguro» mantiene las preferencias. |

## Entrada de nuevos visitantes

La bienvenida automática de la primera visita mantiene misión, visión y objetivo. Al cerrarla, omitirla o finalizarla, el visitante entra a `/cotizar?inicio=guiado`. El inicio invita a crear una web, catálogo o sistema eligiendo primero qué quiere lograr. No requiere registro para explorar.

La bienvenida no interrumpe a cuentas ya identificadas. Volver a abrir «Conoce nuestro propósito» manualmente no fuerza una redirección. La copia local existente se conserva al retomar una cotización; no se descartan respuestas sin una acción explícita del usuario.

## Paneles privados

Administración financiera, resto de administración, equipo y cliente usan `AccountShell`, con una navegación consistente, jerarquía tipográfica, nombre de la persona, indicador de rol, acciones principales y estados legibles. El cliente tiene un resumen basado en sus propuestas, contratos y saldo real; no hay gráficos o cifras ficticias añadidas al producto. El menú móvil conserva Escape, Tab, restauración del foco y enlaces ocultos fuera de navegación.

Las propuestas financieras se identifican como **Cotizaciones formales** y **Crear propuesta formal** para distinguirlas de las solicitudes del cuestionario.

## Cómo asignar un cliente

1. Administrador: **Solicitudes del cotizador**. Subadministrador: **Cotizaciones atendidas** en su espacio.
2. Pulsar **Por asignar** o filtrar **Pendientes de asignar**.
3. Pulsar **Asignar cliente**, introducir el correo exacto de una cuenta cliente activa y buscar.
4. Revisar nombre/correo y confirmar. La autoría y el responsable se conservan; el cliente puede consultar la solicitud desde su cuenta.

Una solicitud ya vinculada muestra ese cliente; no se ofrece transferirla arbitrariamente a otra persona. El servidor sigue comprobando permisos y revisión. La opción también está disponible dentro del detalle.

## PDF actual e historia

El navegador y el PDF comparten el mismo `buildSolutionPreview`, con prueba de paridad de fuente entre frontend y backend. La lámina es una representación imprimible, **no una captura píxel por píxel del navegador**. Las ilustraciones y productos de ejemplo siguen siendo referencias; no se convierten en requisitos confirmados.

- Descargar manualmente antes de enviar usa las respuestas y la estimación autorizadas en esa acción.
- Para solicitudes guardadas, las interfaces usan `GET .../quote-requests/:id/pdf?preview=current`. Conserva la estimación y fecha guardadas, aunque cambien las tarifas, y genera el boceto sin sobrescribir el PDF histórico.
- `GET .../pdf` sin query continúa devolviendo los bytes originales. Se probó su hash después de vincular un cliente y generar la vista actual.
- Una cotización formal nueva vinculada a un cuestionario obtiene la lámina de sus respuestas con comprobación de cliente. Una propuesta financiera manual sin cuestionario no tiene un boceto propio; su referencia se mantiene etiquetada como tal. Los documentos históricos/versiones archivadas se conservan.

Se verificaron dos ejemplos ficticios, una carta azul y una tienda violeta. Ambos quedaron en dos páginas, sin títulos o contactos separados en una página casi vacía. Se revisaron visualmente las cuatro páginas renderizadas con Poppler. Hubo avisos del entorno de render sobre fuentes de sustitución Symbol/ArialUnicode; las fuentes estándar utilizadas se visualizaron correctamente. No se afirma haber comprobado la descarga final del archivo mediante el navegador.

## Validación

- Frontend: **146 pruebas de modo real y 13 de demostración**, además de SSR de revisión, contacto de equipo y estilos/presets, sin fallos. Lint final sin advertencias y compilación de publicación correcta, con 40/40 tareas de generación de Next.
- Backend: batería completa con **920 comprobaciones de integración y 21 pruebas Node**, sin fallos. Tras el último ajuste de paginación se repitieron las pruebas de documentos/cobros y de solicitudes de equipo: **101 y 151 comprobaciones**. PGlite temporal, sin correos, proveedor de IA ni conexiones a la DB real.
- Navegador con fixture aislada: bienvenida a primera pregunta; formulario con boceto; cinco destinos distintos; estilos y selección única; asignación como administrador y subadministrador; administrador crea → asigna → cliente consulta; panel de cliente y menú móvil. Sin llamadas al proveedor real en esta entrega.
- Anchos revisados: 390, 1024, 1440 y 1920 px. En las comprobaciones de distribución no se observó desbordamiento horizontal de página. A 1920 y 1024 el formulario y el boceto tienen el mismo borde superior; a 390 se apilan. No se ejecutó una nueva medición de rendimiento ni se certifica accesibilidad integral mediante estas comprobaciones.

Evidencia local: `.qa-quote-studio/frontend-tests-final.log`, `frontend-lint-final.log`, `frontend-build-final.log`, `backend-full-tests.log`, `pdf-billing-final.log`, `pdf-staff-final.log` y `output/pdf/`. Capturas en `C:\Users\USER\.codex\visualizations\2026\10\17\01a1481b-0f01-7f42-b83f-dff42750eac9\quote-studio`.

## Revisión local

Actualiza el frontend local. Reinicia tu proceso de backend para cargar el renderer y las rutas de PDF nuevos; la auditoría no detuvo los servidores preexistentes de los puertos 3000/4000. El frontend y backend deben usar esta misma versión. Para probar la bienvenida como una primera visita, utiliza una ventana privada; no es necesario borrar tu avance actual.

No se instalaron dependencias ni complementos adicionales. Se usaron las skills disponibles de PDF y control del navegador. Los pendientes de IA generativa del [informe anterior](REVISION_PRELANZAMIENTO.md) siguen siendo un desarrollo separado de esta entrega visual.

## Ejemplos y capturas

- [Ejemplo PDF: carta azul](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/quote-studio/ejemplo-boceto-carta.pdf).
- [Ejemplo PDF: tienda violeta](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/quote-studio/ejemplo-boceto-tienda.pdf).

Todas las capturas y ejemplos siguientes usan datos sintéticos.

![Formulario principal y boceto lateral](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/quote-studio/quote-staff-final.jpg)

![Menú y estilo de la maqueta ampliada](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/quote-studio/expanded-bold.jpg)

![Panel del cliente en móvil](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/quote-studio/client-mobile-final.jpg)
