# TUKNEX — Visual Evolution 2.0

Implementación iniciada el 27 de octubre de 2026; verificación y cierre local el 28 de octubre de 2026. Rama de trabajo: `codex/visual-evolution-2`.

La nueva dirección transforma la presentación pública y refina el aspecto del cotizador. El backend, las reglas de negocio y los procesos privados siguen teniendo los mismos propietarios. Esta entrega no publica automáticamente en Netlify ni Render.

## Dirección y elección

Se evaluaron dos conceptos compatibles con FUTURE CONNECTED y el turquesa existente:

| Concepto | Firma visual | Identidad y claridad | Rendimiento y complejidad |
|---|---|---|---|
| **Circuito de ideas — elegido** | Láminas de idea e interfaz conectadas por una estructura turquesa que desemboca en la demo real | Hace visible la transformación que propone TUKNEX; la demo continúa siendo utilizable y los proyectos reales aportan evidencia | CSS3D y SVG nativos, sin otra biblioteca ni render loop; se simplifica en móvil |
| Atlas digital — descartado | Planos isométricos que sitúan el negocio local en una red de soluciones | Vincula origen local y crecimiento digital; requiere más explicación visual y puede competir con el CTA | Más geometría y adaptación móvil; mayor riesgo de que la escena se convierta en decoración cartográfica |

La selección se hizo autónomamente, como autoriza el brief. Circuito de ideas ofrece mejor equilibrio entre reconocimiento, explicación del producto, ligereza y adaptación a teléfonos. Las formas no son un logotipo nuevo: el logotipo oficial y sus archivos se conservan.

## Sistema visual y alcance

El sitio tiene dos registros: presentación comercial expresiva y taller de cotización tranquilo. El primero usa fondo profundo, una fuente display autoalojada, composición asimétrica y profundidad localizada. El segundo conserva fondo claro, campos planos, preguntas legibles y los seis pasos existentes.

La propiedad de tokens sigue el **modelo B**: el CSS runtime es canónico y `DESIGN.md` refleja sus valores y explica las decisiones. No se genera un segundo tema desde Markdown.

| Fuente | Responsabilidad |
|---|---|
| `frontend/src/components/experience/evolution.css` | Tokens `--fc-*`, PublicShell, header, footer, bienvenida y PageIntro; importado por el shell |
| `frontend/src/components/experience/evolution-home.css` | Portada, circuito, productos y sus animaciones; importado solo por `home.tsx` |
| `frontend/src/components/experience/evolution-pages.css` | Composiciones de las demás páginas públicas; importado por Explorar, Proyectos, Información y Reseñas, no por PublicShell |
| `frontend/src/components/quote/quote-redesign.css` | Paleta clara y controles locales del cotizador, ya existentes |
| `frontend/src/components/quote/quote-evolution.css` | Refinamiento visual del cuestionario; deriva color y elevación de sus propietarios |
| `frontend/src/app/globals.css` y propietarios previos | Tema general, compatibilidad y superficies privadas |
| `UX-CONTRACT.md`, workflow y contratos de quote | Comportamiento, validación, estados, permisos y persistencia; no son reemplazados por el tema |

Se dividieron los imports para que el cotizador no herede las composiciones de marketing mediante PublicShell. Los archivos fuente de esta separación tienen 12 265 bytes (`evolution.css`), 29 419 bytes (`evolution-home.css`) y 36 287 bytes (`evolution-pages.css`) en el estado documentado; son tamaños de fuente sin minificar, no cifras de transferencia ni una medición de rendimiento. El presupuesto del export final está registrado en `.qa-visual/css-budget-final.json`; estos tamaños de fuente no sustituyen las métricas Lighthouse.

La capa nueva se limita a `.experience.future-connected`. En `/cotizar` también exige `.quote-workshop`. Admin, equipo, cuenta, autenticación y contratos no se convierten al tema cinematográfico.

Los colores canónicos públicos son fondo `#070c18`, panel `#101b2d`, elevada `#15243b`, texto `#edf5ff`, secundario `#a5b6cd`, acento `#43dce0`, foco `#73e8e3` y línea `#26394a`. El material de papel usa `#edf4f4` con tinta `#132a3e`; el error del formulario claro es `#9b2336`. `DESIGN.md` documenta el mapa completo y la paleta distinta del cotizador.

Los titulares públicos usan **Syne variable Latin**, autoalojada como `Tuknex Display`, con fallback Bahnschrift / Segoe UI Variable Display / Segoe UI / Arial. El cuerpo y el cotizador conservan Segoe del sistema. El archivo `frontend/public/fonts/tuknex-display.woff2` pesa **34 608 bytes (33.80KiB)** y admite el rango de pesos **400–800**, estilo normal. El subset Latin cubre las vocales acentuadas y la ñ del contenido en español. La fuente se obtuvo de la distribución oficial de Google Fonts y su licencia SIL OFL 1.1 original se conserva en `frontend/public/fonts/license-OFL.txt`.

La aplicación solicita ese único recurso al mismo origen; no importa CSS ni fuentes desde Google. `font-display: optional`, sin preload global, permite conservar el fallback si la fuente no llega durante la ventana inicial. No se impone otra tipografía al cuestionario ni a las rutas privadas. El peso es un dato del archivo; la evaluación real del rendimiento y el CLS se registra después de medir.

Origen verificado: [metadatos oficiales de Syne](https://raw.githubusercontent.com/google/fonts/main/ofl/syne/METADATA.pb), [WOFF2 Latin oficial](https://fonts.gstatic.com/s/syne/v24/8vIH7w4qzmVxm2BL9A.woff2) y [licencia original](https://raw.githubusercontent.com/google/fonts/main/ofl/syne/OFL.txt). SHA-256 del archivo distribuido: `68b623f0e45b905041b2edb9b2e4f563a505f13db1cd06b5f1946eb2e1f47048`.

## Cambios por página

| Ruta o superficie | Presentación nueva | Acciones y contenido que conserva |
|---|---|---|
| `/` | Hero editorial asimétrico, CircuitArt, demo protagonista, servicios con composiciones de producto y proyectos con screenshots reales | Tres selectores de solución, controles de la demo, precios de su hook actual, CTA, propósito y apertura de NEXI |
| `/explorar` | Navegación de cinco servicios, tipografía amplia, demo con capas en perspectiva y estimación legible | Tabs y teclado, query de servicio, anterior/siguiente, formato móvil/escritorio, comparación, precios y destinos de cotizar |
| Servicios | Se presentan dentro de Explorar; no se añade otra ruta | Los cinco servicios, sus descripciones, alcance, tiempos y reglas comerciales |
| `/proyectos` | Capturas reales más grandes, composiciones editoriales y marco de dispositivo | Casos desplegables, controles de dispositivo, carga de iframe solo tras acción, enlaces a los sitios originales y CTA |
| `/nosotros` | Propósito asimétrico, misión en papel, recorrido de trabajo y FAQ limpia | Misión, visión, objetivo, bienvenida, cuatro etapas de trabajo, notas de alcance y acordeón |
| `/contacto` | Formulario claro con campos amplios y bloque de contacto legible | Schema y límites, consentimiento, honeypot, submit, carga, error, confirmación y WhatsApp |
| `/resenas` | Encabezado editorial, invitación y opiniones con jerarquía clara | Datos reales, estados de carga/error/vacío, editor existente y enlaces según rol |
| `/asistente` y NEXI público | Escena sobria para la mascota y shell coherente | Modelo/fallback existentes, interacción con la mascota y apertura de la conversación |
| `/cotizar` | Progreso refinado, selección marcada, campos y micrófonos legibles, preview mejor enmarcada | Seis etapas y su orden, todas las preguntas, validación, dictado, navegación, respuestas, precio, NEXI, PDF y envío |
| Header y footer | Escala, espaciado, estados y adaptación móvil coherentes | Navegación pública, CTA, sesión, nombre y destino de cada rol |

Los últimos ajustes TSX separan imports de estilos y conservan los atributos presentacionales y accesibles existentes; no cambian handlers ni lógica. Los cambios TSX de esta fase son de presentación. Por ejemplo, `data-solution` permite variantes visuales en Explorar; no crea una nueva selección ni un estado. La apariencia no introduce tracking, guardado remoto de avances, modelos de IA, proveedores, formularios o pasos adicionales.

La decisión de privacidad **«Solo navegador hasta el envío»** sigue vigente. Los cambios previos de subadministradores se conservaron: administrador único, equipo y supervisión mantienen sus flujos, destinos y comprobaciones existentes.

## Recursos y tridimensionalidad

| Recurso | Técnica y finalidad | Coste y alternativa |
|---|---|---|
| `circuit-art.tsx` / `CircuitArt` | Geometría SVG y planos CSS3D que conectan idea, interfaz y producto | Sin canvas, peticiones ni ciclo de render JS; la escena sigue existiendo de forma estática sin WebGL |
| `ProductSilhouette` | Representaciones geométricas no interactivas para distinguir familias de solución | Marcadas como decorativas; no duplican el estado ni los botones de la demo |
| `SolutionPreview` | Componente interactivo ya existente, ahora dentro de la escena | Se conserva su estado y la lógica original; la decoración no intercepta sus acciones |
| Captura El Gringo J&M | `/images/projects/el-gringo-home.png`, 1265 × 712 | Archivo real existente; dimensiones reservadas y carga diferida donde corresponde |
| Captura CORRY SPORT | `/images/projects/corry-sport-home.png`, 1265 × 712 | Archivo real existente; misma política de geometría y carga |
| Identidades de proyectos | Logos originales de `portfolio.ts` | Sin proyectos, marcas, clientes o resultados inventados |
| Logotipo TUKNEX | Recurso oficial configurado en la marca | Sin redibujo ni cambio del archivo oficial |
| Syne variable Latin | Fuente display autoalojada, peso 400–800, 34 608 bytes | Un archivo WOFF2 local con licencia OFL; solo titulares públicos, sin preload global |
| NEXI | Modelo y pipeline 3D existentes con scene gate y fallback | No se añade otro canvas ni se cambia su presupuesto de carga |

CSS3D puede ser compuesto por la GPU según el navegador; no se presenta como una garantía de coste cero. La elección elimina un render loop WebGL adicional, carga de otro modelo y dependencias nuevas. Se revisó el stack existente —Three.js, React Three Fiber, Drei y Motion— antes de elegir la solución nativa.

La entrada es finita: demo de 800ms, láminas de 700/900ms y trazo de 1200ms. La transición pública base es de 180ms. No hay vídeo, servicio de generación de pago ni nueva animación perpetua. El scroll sigue siendo el del navegador. `prefers-reduced-motion` lleva la escena a una presentación estática y reduce los desplazamientos de interacción. El cotizador no hereda la coreografía del hero.

## Herramientas, skills y decisiones

Se inspeccionaron instrucciones y capacidades disponibles antes de implementar; la presencia de una carpeta de caché no se interpreta como una conexión activa a un servicio.

| Herramienta o skill | Uso o decisión en esta fase |
|---|---|
| Frontend Design Premium + Frontend Design | Dirección artística, separación de registros, preservación del comportamiento, tokens y revisión |
| Impeccable, Animate y design-taste-frontend | Lectura pertinente para composición, acabado y movimiento con propósito; el brief prevalece sobre sus recomendaciones incompatibles |
| Skillquiver | Dirección explícita, refactorización de presentación y verificación basada en evidencia |
| Superpowers | Planificación, aislamiento de trabajo, preservación y verificación antes de declarar terminado |
| Context7 | Consulta de documentación de Motion para patrones de animación y movimiento reducido; no se añade otra librería |
| Git | Rama local `codex/visual-evolution-2` y referencia del estado previo; no implica push ni despliegue |
| BrowserAct | CLI y `uv` no disponibles en este entorno; se utiliza CUA como alternativa de inspección del navegador |
| CUA | Navegación, revisión de render, teclado, controles y capturas locales |
| Lighthouse | CLI 12.8.2 con Chrome 156: comparación de exports equivalentes, reseñas final y tres comprobaciones específicas de movimiento reducido |
| Figma | Herramientas disponibles, sin archivo de referencia aportado; no fue necesario crear ni modificar un documento externo |
| scroll-world | No se usa: la escena no necesita secuestrar el scroll ni generar vídeo |
| Strix | Sin pentest intrusivo de producción; el alcance visual no requiere alterar permisos, endpoints o configuración de seguridad |

Las fuentes de instrucciones leídas se encuentran en la instalación local de Codex. Los elementos factuales del sitio vienen del repositorio; no se añadieron testimonios, estadísticas, marcas o resultados comerciales ficticios.

## Verificación y evidencia

El export local anterior se conservó en `.qa-visual/before-out`, junto a `before-hashes.json`, `before.diff` y `DESIGN.before.md`. Es una referencia del checkout que incluye trabajo previo, no una copia afirmada del estado actual de producción. Los cambios de subadministradores preexistían al rediseño y deben seguir presentes.

Las capturas muestran apariencia; las comprobaciones de navegador demuestran acciones concretas; los tests y hashes comprueban otras propiedades. No son evidencias intercambiables. La matriz requerida es 360, 390, 768, 1024 y 1440px, con comparación antes/después en el mismo entorno local.

### Resultados comprobados

La accesibilidad Lighthouse quedó entre 98 y 100 en los estados iniciales medidos; reseñas móvil y escritorio terminó en 100 después del último ajuste de contraste. El rendimiento presenta mejoras y pequeñas regresiones que se detallan abajo. Una puntuación automática no certifica cumplimiento integral de WCAG 2.2 AA.

| Comprobación | Resultado real | Evidencia o alcance |
|---|---|---|
| Baseline y aislamiento | Export, hashes y diff previos guardados; rama aislada | `.qa-visual/before-out`, `before-hashes.json`, `before.diff` |
| Tests frontend | 131 pruebas principales + 13 demo + comprobación SSR del cotizador; exit 0 | `.qa-visual/frontend-tests-final.log` |
| Typecheck y lint frontend | Ambos exit 0 | `.qa-visual/typecheck-final.log`, `lint-final.log` |
| Tests backend | 758 comprobaciones de integración + 10 pruebas Node; exit 0 | `.qa-visual/backend-tests.log`; sin correos ni proveedores reales |
| Build final de contraste | Exit 0, 40 rutas exportadas; incluye separación de CSS y corrección final de reseñas | `.qa-visual/build-final-contrast.log`; lint y tipos también pasaron en ese build |
| Invariantes de fuente | 0 cambios de hash en backend y frontend/lib respecto al inicio de esta fase; logotipo con el mismo hash | Baseline y comparación de fuentes; preserva trabajo previo |
| Responsive | 40 casos: 8 rutas × 360/390/768/1024/1440px; 0 desbordamientos y 0 controles fuera de pantalla detectados | `responsive-matrix-final.json` |
| Consola del navegador | Lista final vacía `[]` | `browser-console-final.json` |
| Cotizador | Seis etapas recorridas, selección y precio 200→250, diseño Elegante/Azul, preview ampliada y cierre con Escape | Navegador local y capturas de interacción |
| Recuperación y envío anónimo | Respuestas recuperadas sin contactos; enviar abre acceso y el avance permanece en 83%, no se simula 100% | Navegador local; sin solicitud real a producción |
| Contacto | Validación inválida y POST de éxito con fixture sintético | `contact-success-local.jpg`; no correo real |
| NEXI | Respuesta guiada sobre hosting en entorno local | `nexi-guided-local.jpg`; no se llamó a Groq |
| Menú móvil | Siete destinos y cierre al navegar | Interacción real de navegador |
| Explorar | Tabs con End/flechas, búsqueda «cafe», una selección, comparación y cambio de dispositivo | Navegador local y capturas |
| Proyectos | 0 iframes hasta la acción de cargar la vista; sandbox preservado después de optar por ella | Navegador local; fuente del componente |
| PDF | Smoke HTTP: respuesta 201 y PDF válido de aproximadamente 537KB; el botón de la UI volvió a estar disponible | La automatización del archivo descargado en navegador falló: no se afirma descarga confirmada desde UI |
| Design lint | 0 errores; 16 advertencias de tokens huérfanos | `.qa-visual/design-lint.log`; advertencias documentales, no fallos de runtime |
| Premium audit strict | 0 hallazgos en el scope revisado del cotizador | `.qa-visual/premium-audit.json`; no representa una auditoría universal de todas las rutas |
| Comparativa | Dos selectores y 32 imágenes comprobados en CUA | `COMPARATIVA_VISUAL.html` |
| Reseñas, CTA final | Tinta `rgb(7,12,24)` sobre `rgb(67,220,224)` confirmada en navegador; accesibilidad 100 móvil y escritorio | `review-contrast-proof.json` e informes finales de reseñas |
| Movimiento reducido | Tres rutas comprobadas, 3/3 auditorías específicas aprobadas | `after-reduced-motion-summary.json`; método y alcance abajo |
| Preservación final | `next-env.d.ts` restaurado desde el respaldo; hashes finales contra baseline y diff sin errores | `.qa-visual/final-source-audit.json`, `final-hashes.json`; incluye cambios previos de equipo |

El build muestra el aviso preexistente de detección del plugin ESLint de Next.js; no impidió la compilación y no se presenta como un error nuevo del rediseño.

### Capturas y comparativa

Abrir la [comparativa local interactiva](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/COMPARATIVA_VISUAL.html). Incluye ocho rutas y los viewports 390/1440px, con enlaces a cada original y desplazamiento independiente de los paneles.

- [Antes: Inicio a 1440px](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/before-home-1440.jpg) · [Después: Inicio a 1440px](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/after-home-1440.jpg).
- [Antes: Inicio a 390px](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/before-home-390.jpg) · [Después: Inicio a 390px](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/after-home-390.jpg).
- [Matriz responsive final](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/responsive-matrix-final.json) · [Consola final](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/browser-console-final.json).

Las capturas nativas se distribuyen como **JPEG con extensión `.jpg`**. Se corrigieron los nombres para que coincidan con su formato, sin alterar sus bytes ni editar las imágenes. «390» y «1440» nombran el viewport probado; la imagen del contenido puede excluir la barra de desplazamiento. Las capturas antes/después comparten ese criterio. La referencia «antes» es el export del checkout local, no una copia afirmada de producción.

### Rendimiento y accesibilidad medidos

Lighthouse 12.8.2, Chrome 156, build export estático local, mismo fixture anónimo y presets. El servidor QA no comprime las respuestas HTTP. Inicio móvil: mediana de 3; demás: una muestra por caso.

| Ruta / dispositivo | Rendimiento antes→después | Accesibilidad antes→después | LCP antes→después | TBT antes→después | CLS antes→después | Transferencia antes→después |
|---|---:|---:|---:|---:|---:|---:|
| / · mobile | 63→71 | 98→98 | 7.07→6.97 s | 427→77 ms | 0.000→0.000 | 1642→1323 KiB |
| / · desktop | 97→96 | 92→98 | 1.23→1.38 s | 7→10 ms | 0.007→0.006 | 1661→1979 KiB |
| /cotizar · mobile | 65→61 | 96→100 | 8.47→9.14 s | 244→334 ms | 0.000→0.000 | 1654→1677 KiB |
| /cotizar · desktop | 94→95 | 91→100 | 1.66→1.53 s | 9→7 ms | 0.000→0.000 | 1685→1709 KiB |
| /explorar · mobile | 75→71 | 100→100 | 6.01→7.08 s | 66→120 ms | 0.000→0.000 | 1234→1303 KiB |
| /proyectos · mobile | 73→71 | 100→100 | 7.69→7.49 s | 44→88 ms | 0.000→0.000 | 1851→1920 KiB |
| /nosotros · mobile | 72→70 | 100→100 | 8.80→9.19 s | 106→112 ms | 0.000→0.000 | 1996→2065 KiB |
| /resenas · mobile | 64→67 | 100→100 | 6.92→7.63 s | 98→73 ms | 0.174→0.071 | 1297→1367 KiB |
| /contacto · mobile | 73→69 | 100→100 | 6.91→7.96 s | 115→206 ms | 0.000→0.000 | 1352→1421 KiB |
| /asistente · mobile | 42→39 | 100→100 | 6.82→7.95 s | 8919→2945 ms | 0.000→0.000 | 4123→4192 KiB |

#### Método y límites

- Medición local: no mide latencia ni capacidad de Netlify/Render. Variación de CPU del equipo y corridas con advertencia de carga lenta conservadas en JSON completo; no se descartaron muestras selectivamente.
- Primera visita incluye bienvenida existente del home. Auth/me401 del visitante anónimo y endpoints de proveedores desactivados son diagnósticos esperados del fixture, conservados en los reportes.
- La auditoría automática evalúa estados iniciales. Las interacciones, teclado, formularios y matriz exacta de cinco anchos se verifican por separado en navegador. Accesibilidad automática ≥90 no certifica por sí sola WCAG2.2AA.
- before-* son anteriores; after-prefinal-* documentan una versión intermedia con problema de contraste durante el revelado; after-before-css-split-* conservan las mediciones previas a separar CSS por ruta. Ambas series se excluyen de esta tabla. Las otras mediciones after-* corresponden al diseño con CSS separado; reseñas se repite tras un último override de color limitado a su CTA.

Advertencias: 11/12 antes y 6/12 después. Todos los detalles y nodos fallidos se conservan en before-all-summary.json y after-all-summary.json.

La mediana móvil de inicio pasó de 63 a 71; la transferencia bajó 19.4%. El TBT pasó de 427 a 76.5ms, mientras el LCP continúa alrededor de siete segundos con la simulación móvil. La muestra de inicio con rendimiento 47 se conserva junto a 72 y 71; no se descartó por ser desfavorable.

Cotizar pasó de 65 a 61 en móvil: 8.47→9.14s de LCP y un incremento del 1.4% en transferencia. Separar el CSS evitó que recibiera las composiciones de portada y páginas comerciales; el incremento final de CSS es aproximadamente 22.5KB, sin esos imports. Las pequeñas caídas de otras rutas y el rendimiento bajo de la escena existente de NEXI quedan visibles en la tabla. Esto no demuestra una optimización completa ni valida Core Web Vitals en producción.

Se reutilizan once mediciones válidas del export con CSS dividido. El último cambio solo añade un override de tinta `!important` al CTA de reseñas, que venció una regla legacy. Se repitió reseñas móvil y se añadió escritorio sobre el build final; las demás rutas no recibieron cambios visuales ni lógicos entre esas versiones. Los reportes anteriores se conservan y no se mezclan como si fueran nuevas corridas. En reseñas escritorio el resultado final fue rendimiento 96 y accesibilidad 100.

[Tabla e interpretación completa](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/lighthouse-comparison.md) · [Datos comparables](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/lighthouse-comparison.json) · [Resumen anterior](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/before-all-summary.json) · [Resumen posterior](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/after-all-summary.json). Los JSON conservan URL, versión, user agent, perfil, throttling, fecha, advertencias y nodos observados; los informes HTML completos están en la misma carpeta.

### Movimiento reducido

Chrome se inició con `--force-prefers-reduced-motion`; un gatherer de Lighthouse de solo lectura inspeccionó `matchMedia`, estilos computados de elementos/pseudoelementos, `document.getAnimations()`, scroll y renderers. Es una comprobación específica del estado cargado en escritorio 1440×900, no otra puntuación de accesibilidad general ni una medición de fluidez de todos los dispositivos.

| Ruta | Preferencia detectada | Duraciones mayores de 10ms | Animaciones activas mayores de 10ms | Canvas | Resultado |
|---|---|---:|---:|---:|---|
| / | true | 0 | 0 | 0 | Aprobado |
| /cotizar | true | 0 | 0 | 0 | Aprobado |
| /asistente | true | 0 | 0 | 0 | Aprobado |

Los tres casos conservaron desplazamiento automático y presentación estática sin canvas en el estado observado: inicio usó `static-mini`, asistente `static` y cotizador no declaró renderer. Los tres informes conservaron una advertencia de carga lenta y resultados potencialmente incompletos; el resultado aprobado se limita a la evidencia DOM recogida y no garantiza la ausencia de efectos que carguen después. No se activaron ni evaluaron proveedores externos. Evidencia completa: [movimiento reducido](C:/Users/USER/.codex/visualizations/2026/10/17/01a1481b-0f01-7f42-b83f-dff42750eac9/visual-evolution2/after-reduced-motion-summary.json).

## Revisar localmente

En PowerShell, copiar solamente los comandos de los bloques: sin `PS D:\...>` ni los delimitadores de Markdown.

Desde una terminal:

```powershell
Set-Location D:\TUKNEX\frontend
npm run dev
```

Si faltan dependencias en una instalación nueva, ejecutar `npm ci` una vez en esa misma carpeta. Mantener una sola instancia del servidor dev por checkout y detenerla con Ctrl+C antes de reiniciar.

Abrir [la portada local](http://127.0.0.1:3000/) y revisar también `/explorar`, `/proyectos`, `/nosotros`, `/resenas`, `/contacto`, `/asistente` y `/cotizar`. Este comando no publica la web ni consume un despliegue de Netlify.

El frontend permite revisar la presentación sin iniciar NestJS. Las sesiones, solicitudes guardadas y operaciones completas requieren una API. Para probarlas, utilizar un entorno de desarrollo o fixtures aislados; no hace falta conectar la base de datos de producción para evaluar este rediseño.

En este workspace se preparó un servidor temporal de export con API anónima aislada: `.qa-visual/site.mjs`. Sirve la referencia anterior en el puerto 3304 y el nuevo export en 3305. Su API anónima de prueba utiliza fixtures: los proveedores externos y la base real no participan. Se ejercitan estados controlados, incluido éxito sintético de contacto; otros rechazos del laboratorio no demuestran un fallo del backend. La carpeta `.qa-visual` es evidencia local ignorada por Git, no una dependencia del producto.

Para comprobar el frontend:

```powershell
Set-Location D:\TUKNEX\frontend
npm test
npm run typecheck
npm run lint
npm run build
```

Para los tests de backend existentes, en otra terminal:

```powershell
Set-Location D:\TUKNEX\backend
npm test
```

No se necesita mostrar claves para estas instrucciones. La configuración de una API de desarrollo se gestiona mediante los archivos privados locales y ejemplos mantenidos del proyecto; no copiar credenciales a `NEXT_PUBLIC_*`, documentos, capturas ni al repositorio. `build:release` exige las URLs públicas válidas que verifica `check-release-env.mjs`; ejecutar un build no equivale a desplegarlo.

## Límites y continuidad

- La entrega visual local y su verificación están cerradas. Queda como mejora posterior reducir el LCP móvil y el coste de la escena existente del asistente; los valores actuales y las regresiones menores están documentados. No se alteró su activación o lógica para mejorar una cifra de laboratorio.
- El laboratorio de navegador no certifica todos los dispositivos físicos ni todos los navegadores. Registrar los que efectivamente se utilizaron.
- CSS3D depende de capacidades del navegador. La fuente display autoalojada tiene fallback de sistema y carga opcional; la apariencia puede variar cuando no se aplica. El contenido y las acciones deben seguir funcionando sin efectos.
- Las integraciones reales de voz, correo, pagos, autenticación y base de datos no se validan mediante una captura ni mediante la API visual aislada. Se preservan su código y contratos y se ejecutan las pruebas apropiadas, sin activar servicios externos en esta revisión.
- Los seis pasos, preguntas, cálculos y orden de cotización no se modifican para resolver un problema de presentación. Si un ajuste exigiera cambiar comportamiento, se documentaría por separado.
- PowerShell y Windows tienen límites de longitud de comando. Los archivos grandes se escribieron en bloques acotados; un fallo de longitud no es un error del frontend.
- No se aplican migraciones reales, no se crean privilegios en producción y no se publica automáticamente. Cualquier decisión posterior de lanzamiento debe basarse en los resultados finales de esta revisión.
