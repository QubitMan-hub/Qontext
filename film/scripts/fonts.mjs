// Copies the site's typefaces from the main project's node_modules into public/, so renders never depend on the
// network and use exactly the faces the site uses.
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../node_modules/', import.meta.url);
const out = new URL('../public/fonts/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const [from, to] of [
  ['@fontsource-variable/anybody/files/anybody-latin-wdth-normal.woff2', 'anybody.woff2'],
  ['@fontsource-variable/literata/files/literata-latin-opsz-normal.woff2', 'literata.woff2'],
  ['@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', 'plexmono.woff2'],
]) copyFileSync(new URL(from, root), new URL(to, out));
console.log('fonts ready in', fileURLToPath(out));
