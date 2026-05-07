/**
 * Copia el worker CSP de mapbox-gl a public/ para cargarlo en el mismo origen (requerido por el navegador).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'mapbox-gl', 'dist', 'mapbox-gl-csp-worker.js');
const dest = path.join(root, 'public', 'mapbox-gl-csp-worker.js');

if (!fs.existsSync(src)) {
  console.warn('[copy-mapbox-worker] No se encuentra mapbox-gl; se omite.');
  process.exit(0);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('[copy-mapbox-worker] public/mapbox-gl-csp-worker.js actualizado');
