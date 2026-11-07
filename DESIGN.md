---
version: alpha
name: "TUKNEX"
description: "FUTURE CONNECTED: estudio digital público y taller de cotización guiada, con un mismo corazón funcional."
designRevision: "Visual Evolution 2.0 — 2026-10-27"
tokenOwnership:
  model: "B — runtime CSS canónico; DESIGN.md refleja y explica"
  public: "frontend/src/components/experience/evolution.css"
  quote: "frontend/src/components/quote/quote-redesign.css"
  legacy-private: "frontend/src/app/globals.css"
  private-workspace: "frontend/src/components/auth/account-workspace.css"
colors:
  primary: "#43dce0"
  background: "#070c18"
  surface: "#101b2d"
  raised: "#15243b"
  foreground: "#edf5ff"
  secondary: "#a5b6cd"
  focus: "#73e8e3"
  public-line: "#26394a"
  public-paper: "#edf4f4"
  public-paper-ink: "#132a3e"
  public-form-error: "#9b2336"
  quote-primary: "#076f75"
  quote-background: "#f3f7fa"
  quote-surface: "#ffffff"
  quote-raised: "#edf5f6"
  quote-foreground: "#132a3e"
  quote-secondary: "#506479"
  quote-line: "#ccdce4"
typography:
  display:
    fontFamily: "Tuknex Display, Bahnschrift, Segoe UI Variable Display, Segoe UI, Arial, sans-serif"
  sans:
    fontFamily: "'Segoe UI Variable', 'Segoe UI', Arial, sans-serif"
  mono:
    fontFamily: "ui-monospace, monospace"
rounded:
  DEFAULT: "0.8rem"
  control: "9px"
  public-control: "8px"
  public-panel: "16px"
  public-scene: "24px"
  quote-panel: "18px"
  quote-card: "12px"
spacing:
  touch-target: "44px"
  ai-panel: "20px"
  public-1: "4px"
  public-2: "8px"
  public-3: "12px"
  public-4: "16px"
  public-6: "24px"
  public-8: "32px"
  public-12: "48px"
  public-16: "64px"
  public-24: "96px"
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

FUTURE CONNECTED presenta a TUKNEX como un estudio digital que conecta una idea, una interfaz y un negocio. La firma «Circuito de ideas» une láminas en perspectiva con un trazo turquesa y desemboca en el ejemplo interactivo real de la portada. Composición editorial asimétrica, capturas de proyectos reales y profundidad selectiva sustituyen la repetición de tarjetas. El logotipo oficial, el turquesa y el contenido comercial se conservan.

El registro es híbrido: las rutas públicas persuaden y muestran resultados; `/cotizar` es un taller claro y tranquilo para personas que no necesitan conocer tecnología. Primero cuentan qué quieren conseguir, después exploran funciones y un boceto. Las recomendaciones siguen siendo puntos de partida editables, con una estimación orientativa junto al formulario.

### Product context and register

Clientes de pequeños negocios y equipo administrador en Perú. Interfaz en español; fechas es-PE, zona America/Lima, importes PEN. Uso en celular y escritorio. El cotizador y la administración son producto. Visual Evolution 2.0 reinventa la composición de las rutas públicas y refina visualmente el cotizador. Administración, cliente y equipo conservan sus permisos y flujos; la revisión Cotizador Studio del 30-10-2026 unifica su superficie privada en `account-workspace.css` y `AccountShell`. El detalle de entrega y sus evidencias se mantiene en [docs/VISUAL_EVOLUTION_2.md](docs/VISUAL_EVOLUTION_2.md).

La decisión de producto es «Solo navegador hasta el envío»: el avance y los textos del proyecto se recuperan en la misma pestaña, sin nuevas actualizaciones remotas de borradores. El cálculo usa únicamente opciones de precio. Dictado, consulta NEXI y descarga de PDF son acciones opcionales que transmiten datos y tienen avisos propios. No atribuir anonimato a los textos locales ni presentar un borrador como solicitud o contrato.

Modelo de propiedad B: el CSS de ejecución es canónico; esta guía refleja valores aceptados y su intención, sin generar un segundo tema. `frontend/src/components/experience/evolution.css` declara los tokens `--fc-*` bajo `.experience.future-connected`; `evolution-home.css` consume esos tokens y se importa únicamente desde `home.tsx`; `evolution-pages.css` se importa desde Explorar, Proyectos, Información y Reseñas. PublicShell conserva solo `evolution.css`: el cotizador no importa las composiciones de marketing a través del shell. La comprobación del resultado de esa separación corresponde al build exportado, no solo a sus imports. `frontend/src/components/quote/quote-redesign.css` conserva la paleta local `.quote-workshop`; `quote-evolution.css` solo deriva tinta, elevación y geometría, con el mismo scope público. `quote-flow.css` mantiene la estructura del cuestionario. `frontend/src/app/globals.css` conserva los tokens generales y privados. Los propietarios de comportamiento siguen siendo [UX-CONTRACT.md](UX-CONTRACT.md), `src/lib/quote/workflow.ts` y los contratos de `src/lib/quote`.

### Mapa de tokens y consumidores

| Rol documentado | Propietario runtime | Consumidores |
|---|---|---|
| Público: fondo, panel, elevada | `evolution.css`: `--fc-bg`, `--fc-panel`, `--fc-raised` | PublicShell y composiciones públicas |
| Público: texto, secundario, acento, foco, línea | `evolution.css`: `--fc-ink`, `--fc-muted`, `--fc-accent`, `--fc-focus`, `--fc-line` | Navegación, acciones, escenas y lectura |
| Público: papel, tinta de papel, error de formulario | `evolution.css`: `--fc-paper`, `--fc-paper-ink`, `--fc-form-error` | Lámina de idea, misión y formulario de contacto |
| Público: tipo, espaciado, radio, tiempo | `evolution.css`: `--fc-display`, `--fc-body`, `--fc-space-*`, `--fc-radius-*`, `--fc-duration`, `--fc-ease` | `evolution.css`, `evolution-home.css` y `evolution-pages.css` |
| Cotizador: color y controles claros | `quote-redesign.css`: variables locales de `.quote-workshop` | Cuestionario y `quote-evolution.css` |
| Cotizador: geometría derivada | `quote-evolution.css`: `--qe-tint`, `--qe-shadow`, `--qe-sticky-top` | Panel, selección y cabecera de progreso |
| Privado y legado | `globals.css` y propietarios existentes | Admin, equipo, cuenta y formularios privados |

Los valores del frontmatter son un espejo documental, no otra fuente de ejecución. Cambiar el propietario y después este espejo; no copiar colores a componentes. Las dimensiones de composición específicas de cada escena permanecen junto a su CSS, separadas de los tokens semánticos. No propagar `fc` al árbol privado.

## Colors

Público: fondo #070c18, panel #101b2d, elevada #15243b, texto #edf5ff, secundario #a5b6cd, acento #43dce0, foco #73e8e3 y línea #26394a. Papel #edf4f4 con tinta #132a3e permite descansar la vista en la lámina de idea, misión y contacto. El error #9b2336 corresponde a esa superficie clara. Los contrastes no dependen de halos o transparencias.

Cotizador: fondo #f3f7fa, panel blanco, elevada #edf5f6, texto #132a3e, secundario #506479, borde #ccdce4 y acción/foco #076f75. Su selección utiliza borde, marca y `aria-pressed`, además del color. Los errores tienen texto y tono de error; no representan progreso. Las mezclas de color derivan de los tokens del contexto y deben comprobarse en el render final.

## Typography

Público: titulares con Syne variable Latin autoalojada bajo el alias CSS `Tuknex Display`, con fallback Bahnschrift / Segoe UI Variable Display / Segoe UI / Arial; lectura con Segoe UI Variable / Segoe UI / Arial del sistema. El único archivo de fuente, `frontend/public/fonts/tuknex-display.woff2`, pesa 34 608 bytes (33.80KiB), admite pesos 400–800 y conserva su licencia SIL OFL 1.1 en `license-OFL.txt`. Se sirve desde el propio sitio con `font-display: optional` y sin preload global: no hay peticiones a Google Fonts desde el producto. Si no llega a tiempo se mantiene el fallback para evitar un intercambio tardío. El cotizador conserva Segoe; Syne se limita a titulares públicos fuera de `.quote-workshop`. Monospace solo para identificadores técnicos. Los tamaños y el tracking fluidos de cada composición viven en su CSS propietario; no imponer la escala cinematográfica al cuestionario. Campos de al menos 16px, etiquetas completas, descripciones breves y altura de línea suficiente. Las explicaciones sobre tipografía y composición pertenecen a la personalización avanzada del boceto, no a las preguntas principales.

## Layout

Público: contenedor máximo de 1320px, respiración amplia y composiciones distintas para portada, servicios, proyectos y contacto. Los servicios públicos siguen en `/explorar?servicio=...`; no se añade una ruta ni un formulario. La portada conserva su demo interactiva y sus tres selectores. Los proyectos muestran screenshots reales con geometría reservada y vista en vivo solo tras la acción existente. En móvil se simplifican las capas, se apilan las composiciones y permanecen los controles. Matriz de revisión requerida: 360, 390, 768, 1024 y 1440px.

Seis etapas: Qué necesitas, Tu negocio, Funciones, Diseño, Plazo y Tu cotización. Objetivos sin selección inicial implícita; el progreso representa etapas válidas completadas, no solo la posición. Las tarjetas ofrecen ejemplos concretos. La persona puede volver a etapas disponibles sin perder respuestas.

En escritorio el formulario ocupa la columna principal y el boceto/estimación una columna secundaria. En pantallas estrechas se apilan; la página posee el desplazamiento. La cabecera de progreso y las acciones conservan espacio y no deben tapar la pregunta enfocada. Al cambiar de etapa, el encabezado recibe el foco y se desplaza a la vista; los errores abren sus apartados opcionales y enfocan el campo correspondiente.

Los campos principales quedan visibles. Contexto adicional, publicación, contenido y personalización avanzada usan `details/summary` cerrado inicialmente. El editor visual se encuentra en Diseño. NEXI permanece opcional y colapsado, después de las preguntas. El administrador conserva su lectura de revisiones históricas en el panel privado.

## Elevation & Depth

Público: superficies sólidas, iluminación localizada y sombras con desplazamiento. `evolution-home.css` posee las geometrías y entradas de portada; la fuente de sus tokens sigue siendo `evolution.css`. CSS3D y SVG forman el circuito de la portada; las demos y los proyectos reales aportan el contenido. No se añade un render loop WebGL, video, librería o dependencia. Las escenas de NEXI ya existentes mantienen su carga diferida, presupuesto y fallback.

El cotizador utiliza panel blanco y elevación derivada de sus propios tokens. Tarjetas y campos permanecen tonales, planos y sobrios. No superponer análisis sobre preguntas o boceto ni trasladar los efectos de la portada a los campos.

## Shapes

Público: radios canónicos de 8px para controles, 16px para paneles y 24px para escenas, con excepciones geométricas de la ilustración documentadas en el CSS propietario. Espaciado compartido 4/8/12/16/24/32/48/64/96px. Cotizador: panel de 18px, tarjetas de 12px y controles de 9–10px según sus propietarios CSS. El árbol privado mantiene sus radios previos. Los iconos acompañan acciones con texto.

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

Portada: una entrada finita del circuito (trazo de 1200ms), láminas de 700/900ms y demo de 800ms; controles públicos con transición base de 180ms y curva `cubic-bezier(.22,.68,0,1)`. Sin loop nuevo, video, scroll secuestrado ni desplazamiento artificial del documento. El hover indica profundidad o confirma una acción. El contenido existe antes de la animación. `prefers-reduced-motion` elimina animaciones y desplazamientos no esenciales; los estados siguen siendo legibles.

En formularios no hay animación de texto ni respuesta simulada. Respetar `prefers-reduced-motion`. Los cambios de etapa y de estado se pueden interrumpir sin borrar respuestas ni aceptar respuestas de una petición cancelada.

### Content and data visualization

Español directo: idea, boceto, estimación, solicitud y contrato son objetos distintos. El cálculo automático transmite únicamente elecciones de precio y `hasOtherFunctions`; no contactos ni textos. Descargar el PDF preliminar es una acción manual que sí envía las respuestas para generarlo y requiere su aviso separado. Mostrar las reglas de alcance y costes externos sin convertirlas en compromisos.

## Do's and Don'ts

- Conservar respuestas e historial al navegar; validar antes de avanzar.
- Mantener el cuestionario claro limitado a `.quote-workshop`; las superficies de papel públicas usan sus propios tokens y no alteran el árbol privado.
- Explicar las acciones externas antes de ejecutarlas; no iniciar guardado remoto público de avances.
- Mantener acceso administrativo privado a registros históricos autorizados, sin borrar sus APIs ni documentos.
- No prometer anonimato, cumplimiento legal ni decisiones comerciales a partir de un aviso técnico.

## Equipo y supervisión (27 de octubre de 2026)
Tres roles: cliente, administrador principal único y subadministrador/desarrollador. El equipo dispone de una superficie consistente con el portal actual. El desarrollador puede enviar cotizaciones/contratos de sus asignaciones directamente; el titular supervisa todas las revisiones y administra responsables y accesos. Las pantallas y las API comprueban el alcance por proyecto. Las propuestas siguen empleando los formularios y estados financieros existentes. El historial muestra actor, proyecto, fecha y diferencias, con consulta paginada del pasado. Guía: docs/SUBADMINISTRADORES.md. El guardado del cotizador permanece solo en el navegador hasta el envío.

## Gestión de registros y atención presencial (29 de octubre de 2026)
Los listados privados presentan filas compactas con datos esenciales y una acción explícita Ver detalles. El detalle ocupa el viewport, conserva acciones según permisos y admite cierre con Escape y retorno del foco. Las superficies compartidas viven en components/records; no propagar el tema público a las pantallas privadas.
El equipo puede guardar el cuestionario de seis etapas pendiente de cliente y vincularlo después a una cuenta registrada desde el selector, con búsqueda por nombre, DNI o correo. Mantener separados autor, responsable y titular cliente; las respuestas originales y el PDF preliminar no se reescriben al vincular. La autorización depende del responsable actual, no del autor histórico. El guardado es manual y el avance previo permanece solo en el navegador. Guía: docs/REGISTROS_Y_ATENCION_CLIENTES.md.


## Cotizador Studio — 30-10-2026

La distribución de atención del equipo separa el aviso del grid `questions / preview`. Las muestras de estilo pertenecen a `steps/style-step.css`; elegir una dirección inicializa fuente, espaciado, portada y fondo manteniendo color, escala y orden. La maqueta y la representación imprimible consumen un modelo compartido. Los paneles privados usan `account-workspace.css`, con tokens `--console-*` locales y un único shell también para finanzas. La entrada pública tras la bienvenida automática dirige al cotizador; abrir el propósito manualmente no redirige. Evidencia, alcance y límites: [COTIZADOR_STUDIO.md](docs/COTIZADOR_STUDIO.md).

Las solicitudes privadas se separan por autoría: Solicitudes de clientes, Mis cotizaciones del operador y Cotizaciones formales. Asignar un cliente no mueve una cotización fuera de la lista de su creador. Guía actual: docs/CLIENTES_Y_COTIZACIONES.md.
