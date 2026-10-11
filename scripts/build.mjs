// Builds every deliverable from source:
//   dist/index.html              Website (complete document)
//   dist/studio.html             Qontext Atelier, the studio (complete document)
//   dist/artifact.html           Website as a page fragment, for hosts that add their own document shell
//   dist/qontext-runtime.min.js  Observer runtime, browser global `Qontext`
//   dist/qontext-runtime.esm.js  Observer runtime, ES module
//   figma-plugin/dist/code.js    Superpose, the Figma plugin
// Usage: node scripts/build.mjs [--watch]

import { build, transform } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cvdFilterValues } from '../src/engine/cvd.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...parts) => join(root, ...parts);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

/** Bundles a page: template + CSS + JS entry. Returns { full, fragment }. */
async function buildPage({ entry, css, template, version }) {
  const js = await build({ entryPoints: [p(entry)], bundle: true, format: 'iife', target: ['es2020'], minify: true, write: false, legalComments: 'none' });
  const style = await transform(await readFile(p(css), 'utf8'), { loader: 'css', minify: true });
  let html = await readFile(p(template), 'utf8');
  const replacements = {
    '/*__CSS__*/': style.code.trim(),
    '/*__JS__*/': js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').trim(),
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
  const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  return { full, fragment: html.trim() + '\n' };
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
  const [site, studio, runtime, figma] = await Promise.all([
    buildPage({ entry: 'src/site/main.js', css: 'src/site/site.css', template: 'src/site/index.html', version }),
    buildPage({ entry: 'src/app/main.js', css: 'src/app/styles.css', template: 'src/app/index.html', version }),
    buildRuntime(),
    buildFigma(),
  ]);
  await writeFile(p('dist/index.html'), site.full);
  await writeFile(p('dist/artifact.html'), site.fragment);
  await writeFile(p('dist/studio.html'), studio.full);
  console.log(`Qontext ${version} built in ${Date.now() - started} ms`);
  console.log(`  dist/index.html (website)     ${kb(site.full.length)}`);
  console.log(`  dist/studio.html (Atelier)    ${kb(studio.full.length)}`);
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
