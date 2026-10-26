---
version: alpha
name: "TUKNEX"
description: "Un taller de cotización guiada para transformar una idea en un boceto revisable."
colors:
  primary: "#43dce0"
  background: "#070c18"
  surface: "#101b2d"
  raised: "#15243b"
  foreground: "#edf5ff"
  secondary: "#a5b6cd"
  focus: "#73e8e3"
  quote-primary: "#076f75"
  quote-background: "#f3f7fa"
  quote-surface: "#ffffff"
  quote-raised: "#edf5f6"
  quote-foreground: "#132a3e"
  quote-secondary: "#506479"
  quote-line: "#ccdce4"
typography:
  sans:
    fontFamily: "'Segoe UI Variable', 'Segoe UI', Arial, sans-serif"
  mono:
    fontFamily: "ui-monospace, monospace"
rounded:
  DEFAULT: "0.8rem"
  control: "9px"
  quote-panel: "18px"
  quote-card: "12px"
spacing:
  touch-target: "44px"
  ai-panel: "20px"
components:
  nexi-analysis: {}
  quote-history: {}
  shared-draft: {}
  quote-audio: {}
  quote-workshop:
    scope: "/cotizar .quote-workshop"
    source: "frontend/src/components/quote/quote-redesign.css"
---

# TUKNEX Design System

## Overview

### Creative North Star

Un taller digital de proyectos para personas que no necesitan conocer tecnología: primero cuentan qué quieren conseguir, luego exploran funciones y un boceto. Las recomendaciones son puntos de partida que se pueden cambiar. La superficie clara de `/cotizar` prioriza preguntas breves, campos legibles y una estimación orientativa junto al formulario.

### Product context and register

Clientes de pequeños negocios y equipo administrador en Perú. Interfaz en español; fechas es-PE, zona America/Lima, importes PEN. Uso en celular y escritorio. El cotizador y la administración son producto. Las demás rutas conservan la identidad azul profundo y turquesa existente; este rediseño no cambia su tema.

La decisión de producto es «Solo navegador hasta el envío»: el avance y los textos del proyecto se recuperan en la misma pestaña, sin nuevas actualizaciones remotas de borradores. El cálculo usa únicamente opciones de precio. Dictado, consulta NEXI y descarga de PDF son acciones opcionales que transmiten datos y tienen avisos propios. No atribuir anonimato a los textos locales ni presentar un borrador como solicitud o contrato.

Tokens: `frontend/src/app/globals.css` sigue siendo la fuente del tema general. `frontend/src/components/quote/quote-redesign.css` define las sustituciones de variables bajo `.quote-workshop`, montado en `/cotizar`; `quote-flow.css` conserva la estructura del cuestionario. Esta guía documenta esos archivos, no genera otro tema. Los propietarios de comportamiento están en [UX-CONTRACT.md](UX-CONTRACT.md), `src/lib/quote/workflow.ts` y los contratos de `src/lib/quote`.

## Colors

Tema general: background, surface y raised existentes; texto foreground y secondary; primary y focus turquesa. Tema local del cotizador: fondo #f3f7fa, panel blanco, superficie elevada #edf5f6, texto #132a3e, texto secundario #506479, borde #ccdce4 y acción/foco #076f75. La selección usa borde, marca y `aria-pressed`, además del color. Los errores usan texto y tono de error; no representan progreso.

## Typography

Segoe del sistema para encabezados y cuerpo; monospace solo para identificadores técnicos. No cargar fuentes de terceros. Campos de al menos 16px, etiquetas completas, descripciones breves y altura de línea suficiente. Las explicaciones sobre tipografía y composición pertenecen a la personalización avanzada del boceto, no a las preguntas principales.

## Layout

Seis etapas: Qué necesitas, Tu negocio, Funciones, Diseño, Plazo y Tu cotización. Objetivos sin selección inicial implícita; el progreso representa etapas válidas completadas, no solo la posición. Las tarjetas ofrecen ejemplos concretos. La persona puede volver a etapas disponibles sin perder respuestas.

En escritorio el formulario ocupa la columna principal y el boceto/estimación una columna secundaria. En pantallas estrechas se apilan; la página posee el desplazamiento. La cabecera de progreso y las acciones conservan espacio y no deben tapar la pregunta enfocada. Al cambiar de etapa, el encabezado recibe el foco y se desplaza a la vista; los errores abren sus apartados opcionales y enfocan el campo correspondiente.

Los campos principales quedan visibles. Contexto adicional, publicación, contenido y personalización avanzada usan `details/summary` cerrado inicialmente. El editor visual se encuentra en Diseño. NEXI permanece opcional y colapsado, después de las preguntas. El administrador conserva su lectura de revisiones históricas en el panel privado.

## Elevation & Depth

El cotizador usa panel blanco con borde y elevación suave definidos en su CSS local. Tarjetas y campos permanecen tonales y sobrios. No superponer análisis sobre preguntas o boceto. Estas decisiones no se trasladan a las otras rutas.

## Shapes

Panel del cotizador de 18px, tarjetas de 12px y controles de 9–10px según el propietario CSS. Mantener los radios del tema general fuera de `.quote-workshop`. Los iconos acompañan acciones con texto.

## Components

### Foundational visual states

Botones con texto, foco visible de 3px y objetivos de al menos 44px. Selección, pendiente, error y disponibilidad tienen texto accesible. No mostrar porcentajes ficticios de desarrollo ni simular respuestas de IA. Al cargar o fallar una función opcional se puede continuar escribiendo.

### Buttons and actions

Continuar valida la etapa actual; Volver conserva los datos. Elegir un objetivo aplica una recomendación ajustable. «Tengo otra idea» usa el objetivo `unsure`; no abre una conversación ni inventa un requisito. La ayuda «No estoy seguro» en Funciones conserva las selecciones. En Plazo, la incertidumbre usa `flexible` y no introduce urgencia.

Las operaciones externas tienen acciones explícitas: dictar, consultar NEXI, descargar PDF y enviar solicitud. Sus avisos distinguen qué se transmite. Cancelar una operación conserva las respuestas ya escritas. Los reintentos de dictado son explícitos.

### Navigation and data display

Disclosure nativo `details/summary` con indicador de apertura. Selects y fecha mantienen sus controles nativos, con popup del sistema. Los campos y los importes mantienen los contratos existentes. La administración usa `AdminGuard`; ocultar un panel en frontend no sustituye permisos del servidor.

### Forms and overlays

React Hook Form y zod siguen siendo dueños del cuestionario. Reutilizar `QuoteTextField`, `QuoteSelectField`, `QuoteCheckboxField` y `QuoteDetails`; no crear formularios anidados ni una validación paralela. Todo texto editable usa el campo compartido para ofrecer dictado cuando corresponda. Los campos de fecha, selects y checks no reciben micrófono.

El avance se copia automáticamente a `sessionStorage` de la pestaña, con caducidad máxima de 24 horas por copia y cierre de pestaña. Incluye textos del proyecto y decisiones, pero excluye campos dedicados de identidad/contacto, responsable de aprobación y consentimientos. No llamarlo anónimo: los textos libres pueden contener datos personales. Las solicitudes enviadas y los borradores remotos históricos siguen contratos separados.

### Dictado directo por campo (UX v2)

El flujo público actual ofrece dictado en 20 campos de texto, incluidos los de contacto. Antes de cada micrófono se muestra que la acción solicita enviar esa grabación a Groq. El permiso del navegador no sustituye ese aviso; no hay captura al cargar.

Una grabación de hasta 60 segundos y 4 MB se transcribe y añade automáticamente al final del texto que ya exista en el campo. Se conserva lo escrito mientras llega la respuesta, el resultado queda editable y la última inserción se puede deshacer si no fue modificada después. No hay un segundo modelo para ordenar, corregir nombres o reescribir, ni un segundo paso de confirmación. El resultado no se recorta silenciosamente si supera el límite del campo: se muestra el error para editarlo.

Audio solo en memoria. Cambiar de etapa, ocultar la pestaña, cerrar el apartado que contiene el campo o desmontarlo cancela la operación y descarta resultados tardíos. En un fallo el audio puede permanecer en memoria para un reintento explícito hasta cancelar o abandonar ese contexto. No hay selector de archivos ni reintentos automáticos en este flujo. Los contratos anteriores de transcribir/organizar audio permanecen como compatibilidad legacy; no describen el flujo actual.

### NEXI generativo

Consulta separada del dictado, con autorización vigente para cada análisis. Envía una selección de respuestas y preferencias a Groq; ocultar contactos reconocibles no garantiza anonimato. El informe es orientativo y no se persiste como informe. Solo las sugerencias aceptadas pasan al proyecto e historial local. Nunca fija tarifas, permisos ni contratos.

### Iconography

Lucide React existente; Mic para dictar, Square para detener, Undo para deshacer, Sparkles para ayuda IA y Check para selección. Iconos decorativos con `aria-hidden` y acciones con nombre accesible en español.

### Motion

Sin animación de texto ni respuesta simulada. Respetar `prefers-reduced-motion`. Los cambios de etapa y de estado se pueden interrumpir sin borrar respuestas ni aceptar respuestas de una petición cancelada.

### Content and data visualization

Español directo: idea, boceto, estimación, solicitud y contrato son objetos distintos. El cálculo automático transmite únicamente elecciones de precio y `hasOtherFunctions`; no contactos ni textos. Descargar el PDF preliminar es una acción manual que sí envía las respuestas para generarlo y requiere su aviso separado. Mostrar las reglas de alcance y costes externos sin convertirlas en compromisos.

## Do's and Don'ts

- Conservar respuestas e historial al navegar; validar antes de avanzar.
- Mantener la superficie clara limitada a `/cotizar`.
- Explicar las acciones externas antes de ejecutarlas; no iniciar guardado remoto público de avances.
- Mantener acceso administrativo privado a registros históricos autorizados, sin borrar sus APIs ni documentos.
- No prometer anonimato, cumplimiento legal ni decisiones comerciales a partir de un aviso técnico.
