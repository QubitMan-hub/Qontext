// Builds every deliverable from source:
//   dist/index.html              Website (complete document)
//   dist/studio.html             Qontext Atelier, the studio (complete document)
//   dist/privacy.html            Unobserved, the privacy page
//   dist/turntable.html          Turntable, the Pair Production sneakers in 3D
//   dist/404.html                Vacuum, the page for addresses that do not exist
//   dist/artifact.html           Website as a page fragment, for hosts that add their own document shell
//   dist/qontext-runtime.min.js  Observer runtime, browser global `Qontext`
//   dist/qontext-runtime.esm.js  Observer runtime, ES module
//   dist/fonts/                  The typefaces, self-hosted (src/fonts.css names them)
//   dist/ icons, link-preview image, robots.txt, sitemap.xml, and Cloudflare's _headers and _redirects
//   figma-plugin/dist/code.js    Superpose, the Figma plugin
// Usage: node scripts/build.mjs [--watch]

import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir, cp, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { watch } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cvdFilterValues } from '../src/engine/cvd.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => join(root, ...parts);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
// QONTEXT_DEV=1 keeps names readable for profiling. Never commit a dev build.
const DEV = process.env.QONTEXT_DEV === '1';
// The public site (package.json "homepage"), for canonical links, link previews, robots.txt and the sitemap.
const SITE = JSON.parse(await readFile(p('package.json'), 'utf8')).homepage.replace(/\/$/, '');
// Its pages by public address. Cloudflare drops ".html": studio.html is served at /studio.
const PAGES = ['/', '/studio', '/privacy', '/turntable'];

/**
 * Content Security Policy for the standalone pages. Scripts run only if they are the exact inline bundle
 * (pinned by hash), nothing can be fetched or framed, and there are no third parties: fonts come from the site.
 * Inline styles stay allowed: the pages set colors through style attributes, and styles cannot run code.
 * Pages without a bundle get no script-src at all, so `default-src 'none'` refuses every script. `connect` lets a page
 * fetch from its own site (Turntable loads its 3D model, whose textures it then reads back as blobs).
 */
function csp(html, bundles, connect) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
  if (scripts.length !== bundles) throw new Error(`expected ${bundles} inline script(s), found ${scripts.length}`);
  return [
    "default-src 'none'",
    ...(bundles ? [`script-src ${scripts.join(' ')}`] : []),
    ...(connect ? [`connect-src ${connect}`] : []),
    "style-src 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    "media-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/**
 * The canonical address, link preview and icons of a public page, from its own title and description. `path` is
 * where the page lives on the site (Cloudflare serves studio.html at /studio).
 */
function share(head, path) {
  const title = /<title>([^<]+)<\/title>/.exec(head)[1];
  const description = /<meta name="description" content="([^"]+)">/.exec(head)[1];
  return [
    `<link rel="canonical" href="${SITE}${path}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Qontext">',
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${SITE}${path}">`,
    `<meta property="og:image" content="${SITE}/og.png">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="A square split on the diagonal into green and pink, beside the name Qontext.">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<link rel="icon" href="favicon.ico" sizes="32x32">',
    '<link rel="icon" href="favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
    '<meta name="theme-color" content="#eef0f4" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#121433" media="(prefers-color-scheme: dark)">',
  ].join('\n');
}

/**
 * Bundles a page: the typefaces + template + CSS (one file or several, in order) + JS entry (none for the static pages). Pages read their faces
 * from `fonts/` beside them; Vacuum is served at any depth, so it reads them from `/fonts/`. Returns { full, fragment }.
 */
async function buildPage({ entry, css, template, version, path, fonts = 'fonts/', connect }) {
  const js = entry && (await build({ entryPoints: [p(entry)], bundle: true, format: 'iife', target: ['es2020'], minify: !DEV, write: false, legalComments: 'none' }));
  const faces = (await readFile(p('src/fonts.css'), 'utf8')).replaceAll('url(fonts/', `url(${fonts}`);
  const sheets = await Promise.all([css].flat().map((f) => readFile(p(f), 'utf8')));
  const style = await transform(faces + sheets.join('\n'), { loader: 'css', minify: true });
  let html = await readFile(p(template), 'utf8');
  const replacements = {
    '/*__CSS__*/': style.code.trim(),
    '/*__JS__*/': js ? js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').trim() : '',
    '/*__CVD_protan__*/': cvdFilterValues('protan'),
    '/*__CVD_deutan__*/': cvdFilterValues('deutan'),
    '/*__CVD_tritan__*/': cvdFilterValues('tritan'),
    '/*__VERSION__*/': version,
  };
  for (const [k, v] of Object.entries(replacements)) html = html.split(k).join(v); // split/join: "$" in the bundle stays literal
  const leftover = html.match(/\/\*__[A-Za-z_]+__\*\//);
  if (leftover) throw new Error(`${template}: unreplaced placeholder ${leftover[0]}`);
  // The head ends where the first body-level element starts: the skip link (site) or the filter defs (studio).
  const split = Math.min(...['<a class="skip"', '<svg width="0"'].map((m) => html.indexOf(m)).filter((i) => i >= 0));
  const head = html.slice(0, split).trim();
  const body = html.slice(split).trim();
  const meta = path ? `\n${share(head, path)}` : '';
  const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp(body, js ? 1 : 0, connect)}">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}${meta}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  // The fragment is for hosts that wrap pages in their own document, and their own policy.
  return { full, fragment: html.trim() + '\n' };
}

/** Copies every face src/fonts.css names from its npm package (anybody-latin-... comes from @fontsource-variable/anybody). */
async function copyFonts() {
  await mkdir(p('dist/fonts'), { recursive: true });
  const names = [...(await readFile(p('src/fonts.css'), 'utf8')).matchAll(/url\(fonts\/([^)]+)\)/g)].map((m) => m[1]);
  const pkg = (name) => (name.startsWith('ibm-plex-mono') ? '@fontsource/ibm-plex-mono' : `@fontsource-variable/${name.split('-latin')[0]}`);
  await Promise.all(names.map((name) => copyFile(p('node_modules', pkg(name), 'files', name), p('dist/fonts', name))));
}

async function buildRuntime() {
  const common = { entryPoints: [p('src/runtime/qontext-runtime.js')], bundle: true, legalComments: 'none' };
  await build({ ...common, format: 'iife', globalName: 'Qontext', minify: true, target: ['es2018'], outfile: p('dist/qontext-runtime.min.js') });
  await build({ ...common, format: 'esm', target: ['es2020'], outfile: p('dist/qontext-runtime.esm.js') });
  return (await readFile(p('dist/qontext-runtime.min.js'))).length;
}

async function buildFigma() {
  await build({ entryPoints: [p('figma-plugin/src/code.js')], bundle: true, format: 'iife', target: ['es2017'], legalComments: 'none', outfile: p('figma-plugin/dist/code.js') });
  return (await readFile(p('figma-plugin/dist/code.js'))).length;
}

async function buildAll() {
  const started = Date.now();
  const { version } = JSON.parse(await readFile(p('package.json'), 'utf8'));
  await mkdir(p('dist/media'), { recursive: true });
  await mkdir(p('figma-plugin/dist'), { recursive: true });
  const page = (template) => ({ css: 'src/site/pages/page.css', template, version });
  const [site, studio, privacy, turntable, vacuum, runtime, figma] = await Promise.all([
    buildPage({ entry: 'src/site/main.js', css: 'src/site/site.css', template: 'src/site/index.html', version, path: PAGES[0] }),
    buildPage({ entry: 'src/app/main.js', css: 'src/app/styles.css', template: 'src/app/index.html', version, path: PAGES[1] }),
    buildPage({ ...page('src/site/pages/privacy.html'), path: PAGES[2] }),
    buildPage({ entry: 'src/turntable/main.js', css: ['src/site/pages/page.css', 'src/turntable/turntable.css'], template: 'src/turntable/index.html', version, path: PAGES[3], connect: "'self' blob:" }),
    buildPage({ ...page('src/site/pages/404.html'), fonts: '/fonts/' }),
    buildRuntime(),
    buildFigma(),
    copyFonts(),
  ]);
  await writeFile(p('dist/index.html'), site.full);
  await writeFile(p('dist/artifact.html'), site.fragment);
  await writeFile(p('dist/studio.html'), studio.full);
  await writeFile(p('dist/privacy.html'), privacy.full);
  await writeFile(p('dist/turntable.html'), turntable.full);
  await writeFile(p('dist/404.html'), vacuum.full);
  // Icons, the link-preview image, and Cloudflare's _headers and _redirects, as they are.
  await cp(p('src/site/public'), p('dist'), { recursive: true });
  await writeFile(p('dist/robots.txt'), `User-agent: *\nDisallow:\n\nSitemap: ${SITE}/sitemap.xml\n`);
  const urls = PAGES.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n');
  await writeFile(p('dist/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  console.log(`Qontext ${version} built in ${Date.now() - started} ms`);
  console.log(`  dist/index.html (website)     ${kb(site.full.length)}`);
  console.log(`  dist/studio.html (Atelier)    ${kb(studio.full.length)}`);
  console.log(`  dist/turntable.html           ${kb(turntable.full.length)}`);
  console.log(`  dist/qontext-runtime.min.js   ${kb(runtime)}`);
  console.log(`  figma-plugin/dist/code.js     ${kb(figma)}`);
}

await buildAll();

if (process.argv.includes('--watch')) {
  let timer = null;
  console.log('Watching src/ and figma-plugin/src/ ...');
  for (const dir of ['src', 'figma-plugin/src']) {
    watch(p(dir), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => buildAll().catch((e) => console.error(e.message)), 120);
    });
  }
}
