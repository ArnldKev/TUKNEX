import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createNexiModel, disposeNexi } from './nexi-model';

/** Optional editor utility. Invoke in a browser to download the editable neutral-pose model. */
export async function exportNexiGLB() {
  const rig = createNexiModel();
  try {
    const result = await new GLTFExporter().parseAsync(rig.root, { binary: true, onlyVisible: true });
    if (!(result instanceof ArrayBuffer)) throw new Error('No se pudo generar el modelo GLB.');
    const url = URL.createObjectURL(new Blob([result], { type: 'model/gltf-binary' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nexi-tuknex-original.glb';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    disposeNexi(rig);
  }
}
