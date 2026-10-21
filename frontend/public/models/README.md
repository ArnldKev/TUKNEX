# Modelos 3D originales de TUKNEX

Los modelos se construyen a partir de geometría original editable en TypeScript, no dependen de servicios ni descargas de terceros.

- NEXI: `src/lib/3d/nexi-model.ts` y `fur-geometry.ts`.
- Modelo GLB neutro editable: `public/models/nexi-original.glb` (aproximadamente 1.7 MiB; el sitio no necesita descargarlo para renderizar).
- Portátil, monitor, productos, bolsa e interfaces: `src/components/3d/product-models.tsx` y `src/lib/3d/interface-textures.ts`.
- Exportación opcional GLB de NEXI: `src/lib/3d/export-nexi.ts`, función `exportNexiGLB()`, ejecutada en navegador.
- Fallback original 2D: `public/images/nexi-fallback.svg`.
- Emblema: `public/brand-symbol.jpeg`, logo oficial entregado por el cliente.

La geometría y la ilustración fueron creadas expresamente para este proyecto. Se entregan para su uso, edición y exportación por TUKNEX junto con el código fuente. No incorporan modelos descargados, texturas con licencias externas ni reproducciones de personajes ajenos. Las fotografías de referencia y el logo conservan los derechos de sus titulares; no se redistribuyen como parte de la malla 3D.

El recurso principal es el código procedural, disponible completo y sin minificar en el repositorio. No existe un `.glb` externo obligatorio. El exportador produce una pose neutra y nombres de grupos; las animaciones de interacción permanecen en `animateNexi()` y en los componentes React. Para regenerar el archivo local: `npx tsx src/lib/3d/generate-model.mts`.
