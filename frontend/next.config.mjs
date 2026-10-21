import { fileURLToPath } from 'node:url';

export default (phase) => ({
  output: 'export',
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  distDir: phase === 'phase-development-server' ? '.next-dev' : '.next',
  images: { unoptimized: true },
  devIndicators: false,
});
