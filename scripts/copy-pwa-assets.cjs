/**
 * Copia el icono de la app a `public/` con nombres estándar PWA (antes de `expo export`).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'assets', 'icon.png');
if (!fs.existsSync(src)) {
  console.warn('[copy-pwa-assets] No se encuentra assets/icon.png; se omite.');
  process.exit(0);
}
const publicDir = path.join(root, 'public');
fs.mkdirSync(publicDir, { recursive: true });
for (const name of ['pwa-192.png', 'pwa-512.png']) {
  fs.copyFileSync(src, path.join(publicDir, name));
}
console.log('[copy-pwa-assets] Iconos PWA copiados a public/');
