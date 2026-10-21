import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createNexiModel, disposeNexi } from './nexi-model';

// GLTFExporter uses this browser API for binary buffers; no images are needed in the neutral export.
class BinaryFileReader {
  result: ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
}
Object.defineProperty(globalThis, 'FileReader', { value: BinaryFileReader, configurable: true });

const rig = createNexiModel();
try {
  const result = await new GLTFExporter().parseAsync(rig.root, { binary: true, onlyVisible: true });
  if (!(result instanceof ArrayBuffer)) throw new Error('La exportación no produjo un GLB binario.');
  const folder = resolve(process.cwd(), 'public/models');
  await mkdir(folder, { recursive: true });
  const file = resolve(folder, 'nexi-original.glb');
  await writeFile(file, new Uint8Array(result));
  process.stdout.write(`NEXI original exportado: ${file} (${Math.round(result.byteLength / 1024)} KiB)\n`);
} finally {
  disposeNexi(rig);
}
