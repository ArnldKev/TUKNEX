# Tercera parte: cotizador visual escrito

Entrega COT-02. Fecha: 25 de octubre de 2026. Implementación local; publicación pendiente.

## Qué cambia

Junto a la maqueta aparece «Personalizar mi boceto». Permite elegir el acento con un selector de color, tipografía (clara, editorial o redondeada), títulos equilibrados o protagonistas, espaciado amplio o compacto, portada dividida o centrada y fondo teñido o papel. El orden de navegación permite adelantar Contacto cuando esa función está seleccionada. No crea ni elimina funciones; los sistemas conservan su navegación por módulos y no usan una portada comercial.

Las tres direcciones de ejemplo son combinaciones locales explícitamente identificadas. Solo se aplican al pulsar su botón; reemplazan color, estilo, tipografía y composición, conservando las otras decisiones. La variante cálida se ofrece para gastronomía. No hay un proveedor de IA en esta entrega.

Las respuestas escritas personalizan el nombre, la oferta y el mensaje principal. La portada del catálogo tiene composición propia y el ejemplo gastronómico usa una ilustración original hecha con SVG. Los productos y las ilustraciones siguen marcados como ejemplos. La vista amplia y la lateral reciben la misma configuración; se respetan opciones de movimiento reducido y controles de teclado.

Al revisar, el cliente puede indicar si le gusta, desea cambios o necesita orientación y escribir un comentario opcional. Esto acompaña la cotización al guardarla y aparece en las respuestas para el administrador y en el PDF preliminar como información provisional. Abrir la guía de NEXI no genera una solicitud ni envía correos: el flujo de atención y notificaciones corresponde a COT-07.

Deshacer, Rehacer y Volver al inicio incluyen las nuevas decisiones. Después de calcular la propuesta se bloquea la edición visual; «Editar boceto y recalcular» devuelve a Estilo, invalida el cálculo y permite generar una nueva copia coherente antes de guardar.

## Datos y compatibilidad

- Esquema del proyecto versión 2; el lector valida proyectos versión 1 y añade valores visuales seguros sin cambiar ID, revisión ni respuestas.
- `visual.ts`, `form.ts` y `project.ts` mantienen copias idénticas en frontend y backend, comprobadas por una prueba.
- Las solicitudes anteriores siguen siendo válidas. Si no tenían preferencias o valoración, se indica que no quedaron registradas; no se atribuyen elecciones nuevas al cliente. Los nuevos campos de formulario son opcionales; las decisiones nuevas se guardan en el JSON existente de respuestas.
- No hace falta migración de base de datos ni variables nuevas. Desplegar frontend y backend para conservar las decisiones nuevas.
- Los controles visuales no entran en el cálculo de precios ni alteran las funciones seleccionadas. El nivel comercial Esencial/A medida/Más elaborado conserva su comportamiento de precios existente.
- Los parches parciales no rellenan campos ausentes con valores predeterminados: un cambio de color conserva tipografía y comentarios.
- El historial es de esta sesión. El borrador anónimo local existente mantiene su lista de opciones permitidas, sin texto libre, comentarios ni contactos. Guardar avances remotos sin envío formal sigue pendiente en COT-03.
- El PDF incorpora la dirección visual por escrito. Su imagen conceptual sigue siendo una referencia genérica del servicio; exportar capturas exactas de una revisión es COT-09.

## Comprobaciones

Se comprueban compatibilidad de formularios antiguos y proyecto v1, opciones permitidas, historial, parches parciales, privacidad del borrador, contraste de colores, orden de navegación y conservación del precio. La integración usa una base PGlite temporal y cuentas ficticias para verificar persistencia, lectura del administrador y generación del PDF. No envía correos ni SMS reales.

Validación local completada: 89 pruebas del frontend (76 reales y 13 del modo demo), 3 del modelo compilado del backend y 104 comprobaciones de integración, con lint y compilación de publicación correctos. En navegador se verificó escritorio y celular a 375 px, cambio de tipografía/portada/espaciado/fondo, historial, navegación, selección demo, foco al cerrar la vista amplia, guía NEXI, cálculo, bloqueo/edición y guardado con una cuenta ficticia. El portal mostró las decisiones y los comentarios guardados. Las dos páginas del PDF sintético se renderizaron y revisaron visualmente.

Desde el frontend:

```powershell
cd D:\TUKNEX\frontend
npm test
npm run lint
npm run build:release
```

La compilación usa las variables públicas de producción ya documentadas. Desde el backend:

```powershell
cd D:\TUKNEX\backend
npm run test:quote-project
node scripts/test-production-integration.mjs
```

Prueba manual: describir un restaurante ficticio, aplicar una dirección, ajustar tipografía/tamaño/portada, deshacer y rehacer. Abrir la vista amplia, probar navegación y selección demo sin compras. Completar el cuestionario en celular, valorar el boceto y calcular. Comprobar que «Editar boceto y recalcular» permite cambiar la propuesta. Guardar con una cuenta de prueba y revisar las respuestas desde administración.

## Publicar cuando corresponda

No se ha hecho commit, push ni despliegue en esta entrega.

```powershell
cd D:\TUKNEX
git add frontend backend docs deploy
git commit -m "Mejorar cotizador visual y controles de diseño"
git push
```

Tras los despliegues, repetir color → deshacer → rehacer → calcular → guardar, y revisar las preferencias desde administración. La siguiente entrega es COT-03: borradores remotos autorizados y acceso privado del administrador antes del envío formal.
