---
version: alpha
name: "TUKNEX"
description: "Un espacio de cotización donde una idea se convierte en un boceto revisable."
colors:
  primary: "#43dce0"
  background: "#070c18"
  surface: "#101b2d"
  raised: "#15243b"
  foreground: "#edf5ff"
  secondary: "#a5b6cd"
  focus: "#73e8e3"
typography:
  sans:
    fontFamily: "'Segoe UI Variable', 'Segoe UI', Arial, sans-serif"
  mono:
    fontFamily: "ui-monospace, monospace"
rounded:
  DEFAULT: "0.8rem"
  control: "9px"
spacing:
  touch-target: "44px"
  ai-panel: "20px"
components:
  nexi-analysis: {}
  quote-history: {}
  shared-draft: {}
  quote-audio: {}
---

# TUKNEX Design System

## Overview

### Creative North Star

Un taller digital de proyectos: las respuestas del cliente y el boceto se ven juntos; las recomendaciones aparecen como decisiones revisables, con evidencia. Se conserva la identidad azul profundo y turquesa existente, sin rebranding.

### Product context and register

Clientes de pequeños negocios y equipo administrador en Perú. Interfaz y mensajes en español; fechas es-PE, zona America/Lima, importes PEN. Uso en celular y escritorio. Cotizador y panel administrativo son producto; el sitio público conserva su composición de marca. La firma del panel NEXI es el hilo turquesa que conecta análisis y decisiones aplicables. No imitar una conversación infinita ni atribuir certezas a resultados generados.

Tokens: esta guía documenta el CSS canónico frontend/src/app/globals.css; no genera otro archivo. Las extensiones NEXI usan esas variables y frontend/src/components/quote/nexi-ai.css. Espejo de referencia: remote-draft y project-session. Evidencia de negocio: docs/COTIZADOR_GENERATIVO.md, docs/IA_GENERATIVA.md y contratos de src/lib/quote.

## Colors

Fondo background; contenido surface y raised; texto foreground y secondary; primary para la acción principal y focus para el foco. Bordes mediante --line. Los estados error y advertencia conservan los tonos de remote-draft.css (#ffc4b5, #ffb29c, #ffe19b); no son categorías de progreso. Los estados tienen texto, además de color.

## Typography

Segoe del sistema para encabezados y cuerpo, respetando la interfaz existente; monospace solo para identificadores técnicos. Cuerpo con altura de línea 1.65–1.7. No cargar fuentes de terceros. Encabezado del análisis 1.25rem, resumen 1.125rem, metadatos .875rem.

## Layout

Cotizador actual de preguntas y boceto en dos columnas cuando hay espacio. El panel de IA se integra después de las preguntas, antes de continuar; colapsado inicialmente. En administración aparece en el detalle de la revisión y reutiliza el mismo componente en modo lectura. A menos de 600px las acciones se apilan y los informes tienen una columna; el contenido largo envuelve sin ocultar acciones. La página, no el panel, posee el desplazamiento.

## Elevation & Depth

Superficies tonales y bordes existentes; sin sombras nuevas ni fondos de página adicionales. No superponer análisis sobre campos o boceto.

## Shapes

Contenedores con --radius; botones con 9px; etiquetas con 6px. Separación de informe por borde turquesa. No introducir iconos como sustituto del texto de una acción.

## Components

### Foundational visual states

Botones con texto, disabled, foco visible de 3px y objetivo de al menos 44px. Pendiente como estado textual indeterminado; no porcentajes ficticios. Errores inline con role=alert; estados aria-live=polite sin mover el foco. Una respuesta anterior queda marcada y deshabilitada.

### Buttons and actions

Analizar mi idea y Analizar esta revisión son las acciones principales por contexto. Cancelar consulta no altera respuestas. Aplicar sugerencia y Descartar sugerencia son explícitas e independientes; aceptar una propuesta la incorpora al historial y vuelve antiguo el análisis previo. La autorización se renueva por consulta.

### Navigation and data display

Disclosure nativo details/summary con indicador de apertura. No se añaden tabs, tablas ni selección múltiple. La revisión del administrador usa el select nativo ya existente: popup y teclado son del sistema operativo.

### Forms and overlays

Se conserva react-hook-form y zod como dueño del cuestionario; no nuevos formularios anidados, diálogos, toasts ni burbujas de validación. Checkbox real etiquetado para la consulta externa. Sin persistencia de informes IA en navegador.

### Respuestas por audio

Se reutiliza el disclosure del cotizador. Controles de captura con texto y contador de segundos real; revisión en dos bloques: transcripción corregible y propuesta de NEXI. No ondas decorativas ni reproducción automática. El navegador es dueño del permiso del micrófono; sin captura al cargar. Cerrar cancela y descarta lo no confirmado. El archivo local se escucha antes de autorizar el envío. CSS quote-audio.css reutiliza --surface-raised y los demás tokens canónicos.

### Iconography

Lucide React de la aplicación; Sparkles indica ayuda IA, Check aplicar, X cancelar o descartar. Iconos decorativos con aria-hidden.

### Motion

Sin animación de texto ni respuesta simulada. Respetar prefers-reduced-motion. Los cambios de estado pueden interrumpirse sin borrar respuestas.

### Content and data visualization

Español directo: sugerencia, propuesta, revisión y borrador se distinguen. No llamar confirmado a contenido generado. No mostrar tokens, claves o detalles internos como tareas del cliente.

## Do's and Don'ts

- Conservar el original y usar el historial existente.
- Mostrar qué cambió, qué falta y cuándo no hay IA disponible.
- No sustituir sugerencias por decisiones ni usar IA para fijar precios o contratos.

