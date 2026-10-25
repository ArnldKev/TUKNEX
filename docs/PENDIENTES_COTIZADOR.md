# Pendientes del cotizador visual con NEXI

Actualizado: 25 de octubre de 2026.
Base de trabajo: [alcance y recorrido](COTIZADOR_GENERATIVO.md).
Caso de revisión: [ejemplo de restaurante](EJEMPLO_COTIZADOR.md).

«Definido» significa documentado; «implementado» requiere código y validación. El avance actual completa la definición COT-00, el modelo e historial local COT-01 y el cotizador visual escrito COT-02. COT-03 incorpora borradores compartidos y acceso privado, implementados y verificados localmente. COT-04 tiene implementación local de IA revisable con Groq; su activación y evaluación con el proveedor real están pendientes de la clave. Audio, avisos de correo y firma siguen pendientes. La activación en producción del guardado remoto requiere la configuración de privacidad descrita en su guía.

## Orden de entrega

| Orden | Entrega | Estado | Resultado visible |
| --- | --- | --- | --- |
| COT-00 | Alcance, recorrido y pendientes | Definición completada; continuidad autorizada | Documentos y ejemplo coherente de principio a fin |
| COT-01 | Modelo común del proyecto e historial local | Implementado y verificado localmente | Respuestas, boceto y requisitos relacionados, con revisiones |
| COT-02 | Prototipo escrito y controles visuales | Implementado y verificado localmente | Cliente cambia diseño, compara y deshace |
| COT-03 | Guardado remoto y borradores en administración | Implementado y verificado localmente | Avances autorizados visibles aunque no se envíen |
| COT-04 | IA para interpretar y sugerir | Implementado localmente; activación y evaluación real pendientes | NEXI transforma lenguaje natural en propuestas revisables |
| COT-05 | Respuestas por audio | Pendiente | Grabar, transcribir, ordenar y confirmar |
| COT-06 | Estimación explicada y coherente con el boceto | Pendiente | Rango calculado con catálogo y evaluación de lo complejo |
| COT-07 | Orientación, envío, asignación y correos | Pendiente | Solicitud persistida, aviso y responsable asignado |
| COT-08 | Editor e informe del administrador | Pendiente | Revisar alcance, restricciones, diseño y precio |
| COT-09 | Expediente descargable | Pendiente | Información y capturas de una misma versión |
| COT-10 | Contrato y anexo visual | Pendiente | PDF revisado con alcance, diseño y precio acordados |
| COT-11 | Aceptación remota / firma elegida | Pendiente de decisión legal y técnica | Evidencias vinculadas al documento exacto |
| COT-12 | Validación integral y publicación gradual | Pendiente | Recorrido probado, monitorizado y publicado por etapas |

El orden representa dependencias de entrega, no una obligación de terminar todas las categorías de diseño antes de probar un primer caso. Las comprobaciones se realizan en cada etapa; COT-12 integra lo ya verificado.

## COT-01 — Modelo y revisiones

Entrega implementada: ver [guía del modelo e historial](../deploy/MODELO_E_HISTORIAL.md). No publicada todavía.

- Definir esquema validado con necesidades, evidencia, decisiones visuales, sugerencias y revisión.
- Reutilizar las respuestas actuales y mantener compatibilidad con solicitudes/PDF existentes.
- Separar datos comerciales, contactos y recursos del modelo de dibujo.
- Centralizar la definición del esquema o garantizar su paridad entre frontend y backend.
- Añadir acciones de cambio explícitas, historial local limitado y deshacer/restaurar.
- Evitar que una interpretación tardía sobrescriba una respuesta más reciente.

Terminado cuando: una revisión se serializa y restaura produciendo el mismo boceto; deshacer recupera la decisión anterior; un cambio visual no añade funciones ni altera el precio por sí solo.

## COT-02 — Cotizador visual escrito

Entrega implementada: ver [guía del cotizador visual](../deploy/COTIZADOR_VISUAL.md). Publicación pendiente.

- Mejorar la composición y jerarquía del lienzo, con contenido ajustado al negocio.
- Añadir paleta, tipografía, escala, espaciado, portada y secciones dentro de opciones controladas.
- Distinguir sugerencias, elecciones y contenido de ejemplo.
- Incluir valorar el boceto y acceso a orientación.
- Diseñar escritorio y celular, foco de teclado y movimiento reducido.
- Probar primero el restaurante ficticio sin pagos ni envíos reales.

Terminado cuando: las decisiones escritas/seleccionadas se reflejan, conservan y deshacen; se puede completar el formulario en celular; el usuario sabe que está viendo un prototipo. Si las sugerencias iniciales son locales, se identifican como tales.

## COT-03 — Borradores y acceso

Entrega implementada: ver [guía de borradores compartidos](../deploy/BORRADORES_COMPARTIDOS.md). Publicación y activación pendientes.

- Diseñar migración aditiva para borradores y revisiones; no alterar de forma destructiva solicitudes/contratos.
- Definir aviso y autorización/base aplicable antes de guardar respuestas libres en servidor.
- Sesión visitante con identificador opaco y prueba de propiedad; límites de tamaño/cuota y caducidad definidos.
- Vinculación segura a la cuenta al identificarse, sin apropiación de borradores por conocer su ID.
- Control de concurrencia; estado guardando/guardado/error y recuperación local.
- Panel privado de avances para administradores, con progreso y fecha de última actividad.
- Definir eliminación y retención; no usar borradores como listas de marketing por defecto.

Terminado cuando: el administrador ve un borrador autorizado sin envío formal; otro visitante/cliente no puede consultarlo ni modificarlo; no se activa el guardado remoto sin su configuración de privacidad.

## COT-04 — IA generativa

Implementación local: [diseño y verificación](IA_GENERATIVA.md). Activación: [guía de Groq gratuito](../deploy/NEXI_IA_GRATUITA.md). El usuario comprobó COT-03 en producción y eligió empezar con un proveedor gratuito. No se considera completada la evaluación real de IA hasta configurar la clave y probar sus respuestas.

- Comparar proveedores/modelos con el caso de prueba y un presupuesto acordado.
- Conectar desde backend, sin claves en el navegador; establecer límites reales de consumo.
- Preparar instrucciones y conocimiento aprobado de servicios y restricciones de TUKNEX.
- Validar respuestas estructuradas; tratar el texto del visitante como datos.
- Aplicar propuestas solo a la revisión correcta y con confirmación donde corresponda.
- Definir tiempos de espera, cancelación, reintentos limitados y alternativa local.
- Evaluar negaciones, ambigüedad, datos insuficientes y funciones fuera de catálogo.

Terminado cuando: se obtienen sugerencias útiles y trazables sin inventar requisitos confirmados; una caída o límite del proveedor no rompe el cuestionario; el consumo puede controlarse.

## COT-05 — Audio

- Control grabar/detener/cancelar, permiso explícito y alternativa escrita.
- Límites de duración/formato/tamaño y número de grabaciones.
- Transcripción y texto ordenado separados; revisión y corrección por el cliente.
- Probar español peruano, ruido y nombres/cantidades/fechas.
- Configurar conservación y acceso del audio original solo si se necesita.

Terminado cuando: funciona en los navegadores/dispositivos acordados, se puede cancelar y corregir, y no se añade una interpretación no confirmada al proyecto.

## COT-06 — Precio

- Mapear requisitos aceptados a partidas del catálogo existente.
- Acordar tarifas nuevas antes de activarlas; evitar doble cobro de funciones incluidas.
- Identificar funciones sin tarifa y combinaciones que necesitan revisión.
- Mostrar rango, supuestos, conceptos y gastos de terceros por confirmar.
- Versionar reglas/estimación; invalidar el cálculo si cambia el alcance.

Terminado cuando: el backend reproduce el cálculo y rechaza importes manipulados; sugerencias rechazadas no se cobran; presupuesto y preferencia de pago no sustituyen el cálculo del alcance.

## COT-07 — Solicitudes, atención y correos

- Acción explícita para pedir orientación con contacto mínimo y avance disponible.
- Envío formal con copia inmutable e idempotencia.
- Bandeja de salida persistente guardada en la misma transacción que el evento de atención.
- Avisos a todos los administradores activos configurados, por separado.
- Remitente autorizado; separar avisos comerciales de la verificación de registro.
- Deduplicar eventos/reintentos y agrupar peticiones repetidas de orientación abiertas.
- Definir ejecución durable de reintentos, límites y visibilidad de fallos.
- Asignar atención de forma atómica; mostrar responsable y permitir reasignación controlada.

Terminado cuando: orientar y enviar generan un evento cada uno; autosave no manda correos; el proveedor caído no pierde la solicitud; dos administradores concurrentes no obtienen la misma atención. Comprobar la entrega real en las cuentas previstas antes de publicar.

## COT-08 — Revisión administrativa

- Abrir una revisión del cliente sin modificarla; crear propuesta administrativa derivada.
- Comparar respuestas, bocetos, alcance y precio entre versiones.
- Informe: necesidades, entregables, exclusiones, restricciones, dudas y criterios de aceptación.
- Editar diseño, funciones, condiciones y precio; documentar motivos de cambios.
- Revisar antes de compartir con el cliente; no enviar notas internas.

Terminado cuando: el administrador conserva el original, puede editar su propuesta y exporta exactamente la revisión seleccionada.

## COT-09 — Expediente

- Definir formatos de descarga y almacenamiento privado según tamaño/coste.
- Capturas reproducibles de las pantallas/estados acordados, usando recursos disponibles y autorizados.
- Paleta, tipografías, especificación, respuestas y cotización de la misma revisión.
- Identificadores/revisiones visibles y permisos en cada descarga.

Terminado cuando: una descarga reproduce el diseño aprobado sin depender del navegador del administrador; no expone datos a terceros ni recursos sin autorización de reutilización.

## COT-10 y COT-11 — Contratos

- Revisar plantilla comercial con un abogado peruano y acordar condiciones reales del servicio.
- Añadir anexo de alcance, imágenes, colores y tipografías con referencia inequívoca de versión.
- Mantener PDF para impresión y firma externa.
- Elegir por separado aceptación electrónica remota o firma digital con certificado y proveedor.
- Vincular identidad, voluntad y documento exacto según el mecanismo aprobado.
- Conservar contrato/anexos aceptados sin alteración; cambios mediante nueva versión.
- No tratar un estado del panel, una foto de DNI o un audio como firma digital con certificado.

Terminado cuando: el mecanismo elegido funciona y está revisado; las evidencias se relacionan con el PDF y sus anexos exactos; ambos firmantes pueden obtener la copia correspondiente.

## COT-12 — Publicación y operación

- Validar en cada entrega y después el recorrido integrado cliente → administrador → propuesta → contrato.
- Probar migraciones, permisos y recuperación; mantener las funciones actuales.
- Casos: visitante, cliente, borrador incompleto, audio cancelado, red caída, IA fallida, sugerencia rechazada, revisión antigua, correo fallido y concurrencia de administradores.
- Activar por etapas con indicadores de disponibilidad; no mostrar funciones como activas si no están configuradas.
- Limitar costes y abuso; medir errores, latencia y utilidad con casos representativos.
- Preparar instrucciones de despliegue y recuperación sin modificar documentos ya aceptados.

## Dependencias externas pendientes

El prototipo local no requiere contratar servicios. Antes de integraciones reales se necesitan: presupuesto IA/audio; privacidad/retención; catálogo de tarifas; remitente y destinatarios de avisos; ejecución de trabajos pendientes; revisión contractual y elección de firma.

No se necesitan copias del DNI, claves privadas ni datos reales de clientes para revisar los primeros prototipos.
