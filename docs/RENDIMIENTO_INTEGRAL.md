# Rendimiento local y límites

Medición de laboratorio, Lighthouse 12.8.2, Chrome headless, perfil móvil predeterminado, misma máquina y servidor estático local con gzip. Tres muestras por ruta y versión, sin builds ni suites pesadas activos. Las mediciones se realizaron en franjas distintas del 10 de noviembre de 2026; la variación de CPU y del sistema no se controla como en un laboratorio dedicado. API anónima desactivada de forma equivalente en ambos previews; no incluye la reactivación de Render ni la latencia real de Groq.

Se conservó `frontend/out` anterior en `.qa-integral/export-before` antes de modificarlo. Las seis mediciones iniciales de `before-performance.json` se conservan, pero coincidieron con trabajo paralelo/advertencias y no se usan para presentar una ganancia favorable. La comparación controlada tiene 12 muestras; tras diferir componentes se repitieron solo las tres muestras de `/cotizar`, conservando las previas.

| Ruta y métrica (mediana) | Antes | Final | Interpretación |
|---|---:|---:|---|
| Inicio: transferencia | 744.578 B | 344.841 B | Aproximadamente 53,7% menos |
| Inicio: LCP | 3,273 s | 3,219 s | Informes parciales: no concluir mejora de tiempo |
| Inicio: TBT | 98 ms | 111 ms | Informes parciales y variación de máquina |
| Cotizador: transferencia | 816.586 B | 420.049 B | Aproximadamente 48,6% menos |
| Cotizador: LCP | 3,368 s | 3,736 s | No alcanzó la referencia de 2,5 s; tampoco mejoró respecto al original |
| Cotizador: TBT | 234 ms | 454 ms | Hay trabajo de hilo principal por reducir |
| CLS de ambas rutas | 0 | 0 | Sin desplazamiento detectado en estas muestras |

Los tres informes de inicio, tanto antes como después, avisan que la página cargó demasiado despacio para terminar íntegramente. Se muestran sus resultados con esa limitación; no se descartan muestras para mejorar el promedio. Los seis informes comparados de cotizador no tienen esa advertencia. El rango de LCP final del cotizador fue 3,309–4,183 s y el TBT 235–646 ms, por lo que la dispersión es relevante.

La primera versión con funciones integrales, antes de diferir paneles, dio LCP mediano 4,219 s y TBT 569 ms en `/cotizar`; la carga diferida redujo esos valores a 3,736 s/454 ms en las muestras finales. Esta comparación no acredita causalidad ni velocidad garantizada. La transferencia sí permite verificar directamente que se envían menos bytes.

## Cambios aplicados y conservados

- Logotipo original PNG: 423.979 bytes. WebP transparente de interfaz: 23.512 bytes, 600×200; reducción aproximada de94,5%. El PNG de origen y el usado para compartir en redes se conservan.
- Organización opcional de ideas e informes administrativos cargados de forma diferida. La primera carga de `/cotizar` reportada por Next bajó de282 KB a278 KB tras esa separación.
- Una instantánea conjunta para datos del cliente sustituye consultas independientes de sus secciones. Detalles y expedientes consultan su contenido al abrirse.
- El control existente de escenas3D/movimiento reducido permanece; no se agregó una escena3D ni una fuente externa nueva.
- Lighthouse dio accesibilidad98/100 en inicio y100/100 en cotizador. Es una comprobación automática parcial; se complementó con teclado, foco de detalles y móvil, sin presentarla como certificación WCAG.

## Lo que queda por optimizar y verificar

La parte de rendimiento se clasifica como **parcialmente implementada**: bajó el peso transferido y se difirieron módulos, pero los tiempos móviles de referencia no se alcanzaron en esta máquina. El siguiente trabajo debe analizar hidratación, validación/modelo inicial y evaluación del JavaScript común del primer paso, con una traza repetible; dividir las restantes pantallas solo si la medición confirma beneficio. No conviene reescribir el cotizador o quitar validaciones para obtener una puntuación.

No hay datos reales de usuarios al percentil75, ni medición de INP real. TBT es una métrica de laboratorio y no sustituye INP. Se requiere un piloto en móviles y redes reales, incluyendo arranque frío del backend, para afirmar cumplimiento de LCP≤2,5s, INP≤200ms y CLS≤0,1. No se instaló telemetría que capture borradores ni se publicaron datos de visitantes.

## Evidencia

`.qa-integral/controlled-before-*-*.json`, `controlled-after-*-*.json`, `optimized-after-quote-*.json`, `performance-summary.json`, `performance-controlled.log` y `performance-optimized.log`. Cada informe guarda advertencias y fecha. El servidor y el script de laboratorio están bajo `.qa-integral` y no se publican. El resumen de tamaños por ruta figura en `frontend-build-final.log`.
