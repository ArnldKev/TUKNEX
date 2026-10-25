# Segunda parte: modelo del proyecto e historial local

Entrega: COT-01 del plan del cotizador. Fecha: 25 de octubre de 2026.

## Comportamiento

El cotizador utiliza un proyecto validado para relacionar respuestas, decisiones visuales, funciones seleccionadas y revisión. La vista previa y la referencia de inversión se derivan de esa misma revisión.

En el cuestionario aparecen Deshacer, Rehacer y Volver al inicio. El historial conserva hasta 30 cambios reversibles en memoria mientras la página permanezca abierta. La escritura continua de una respuesta se agrupa; una selección de varias opciones realizada por una misma acción se registra junta. No se conserva este historial después de recargar o cerrar la página.

Volver al inicio recupera las decisiones iniciales y también se puede deshacer. Los datos de contacto, responsable de aprobación y consentimientos actuales quedan fuera del historial y no se revierten. El guardado anónimo opcional existente mantiene su comportamiento: solo selecciones permitidas, sin texto libre/contacto.

Las decisiones visuales actuales son estilo, colores preferidos/evitados y mensaje de portada. El nivel de personalización comercial sigue siendo un dato distinto: puede afectar el precio conforme a las reglas existentes. Los controles adicionales de tipografía, tamaño y distribución pertenecen a COT-02.

## Modelo y compatibilidad

- Esquema versión 1, ID de proyecto y revisión monotónica, incluso al deshacer y rehacer.
- Respuestas parciales válidas para el borrador; el envío final conserva la validación completa actual.
- Contenido comercial separado de decisiones visuales. La entrada del dibujo utiliza una lista explícita de campos; no recibe contactos, presupuesto ni consentimiento.
- Requisitos derivados de las funciones elegidas, identificados como selección del formulario. No se presentan como promesas contractuales ni se atribuye al cliente una confirmación que no hizo.
- Propuestas futuras de NEXI con ID, proyecto, revisión base, motivo, campos de evidencia y cambios permitidos. Solo una aceptación explícita mediante la función correspondiente puede aplicarlas. Se rechazan propuestas antiguas o de otro proyecto; no hay proveedor de IA ni interfaz de sugerencias activados en esta entrega.
- Serialización y lectura JSON validadas, con límite de tamaño y rechazo de versiones/campos no admitidos.

El módulo `project.ts` tiene copias idénticas en `frontend/src/lib/quote/` y `backend/src/domain/quote/`. Una prueba comprueba su paridad y la de sus dependencias de formulario y catálogo. Se eligió esta solución para mantener los despliegues independientes existentes, sin cambiar las raíces de compilación ni introducir un paquete compartido en esta etapa.

El backend compila y prueba el modelo, pero no incorpora todavía una ruta nueva ni cambia la forma persistida de las solicitudes actuales. Para usarlo en guardado remoto hará falta la entrega COT-03 y su revisión de propiedad, privacidad y retención.

## Verificación

Las pruebas cubren: borradores incompletos, separación de contactos, serialización de todas las categorías, reproducción del boceto, precio sin cambios por decisiones visuales, recorrido deshacer/rehacer, restauración de contactos/consentimientos, ramas nuevas, grupos de escritura, límite de historial, ausencia de referencias mutables y rechazo de propuestas antiguas o campos no autorizados.

Comprobado localmente: 84 pruebas del frontend y 3 del modelo en backend, compilación del backend y recorrido en navegador de escritorio y celular. Se verificaron deshacer/rehacer, restauración reversible, escritura agrupada, conservación de contacto y cálculo de la propuesta preliminar.

Comandos desde cada carpeta:

```powershell
cd D:\TUKNEX\frontend
npm test
npm run build:release
```

La compilación de publicación requiere las variables públicas de producción descritas en las guías existentes; no se añaden variables nuevas en esta entrega.

```powershell
cd D:\TUKNEX\backend
npm run test:quote-project
```

## Publicar cuando corresponda

No se han enviado commits ni se ha publicado desde esta entrega. No requiere migración de base de datos, claves de IA ni un proveedor nuevo.

```powershell
cd D:\TUKNEX
git add frontend backend docs deploy
git commit -m "Agregar modelo del proyecto e historial del cotizador"
git push
```

Después de los despliegues, abrir el cotizador y seleccionar un objetivo distinto. Deshacer debe recuperar la solución anterior; Rehacer debe volver a la elección. Probar después un color en Estilo: el boceto cambia y la estimación permanece igual. Volver al inicio debe recuperar las decisiones iniciales sin borrar datos de contacto actuales.

La IA generativa, audio, guardado remoto, avisos y firma remota siguen en sus entregas posteriores.
