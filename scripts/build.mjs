// Builds every deliverable from source:
//   dist/index.html              Studio as a complete standalone document
//   dist/artifact.html           Studio as a page fragment (for hosts that add their own document shell)
//   dist/qontext-runtime.min.js  Theme runtime, browser global `Qontext`
//   dist/qontext-runtime.esm.js  Theme runtime, ES module
//   figma-plugin/dist/code.js    Figma plugin main thread
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

async function buildStudio(version) {
  const js = await build({
    entryPoints: [p('src/app/main.js')],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: true,
    write: false,
    legalComments: 'none',
    define: { __QONTEXT_VERSION__: JSON.stringify(version) },
  });
  const css = await transform(await readFile(p('src/app/styles.css'), 'utf8'), { loader: 'css', minify: true });
  const script = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  let html = await readFile(p('src/app/index.html'), 'utf8');
  const replacements = {
    '/*__CSS__*/': css.code.trim(),
    '/*__JS__*/': script.trim(),
    '/*__CVD_protan__*/': cvdFilterValues('protan'),
    '/*__CVD_deutan__*/': cvdFilterValues('deutan'),
    '/*__CVD_tritan__*/': cvdFilterValues('tritan'),
  };
  for (const [k, v] of Object.entries(replacements)) {
    if (!html.includes(k)) throw new Error(`Template is missing ${k}`);
    html = html.split(k).join(v); // split/join, not replace: the bundle may contain "$" patterns
  }
  html = html.split('/*__VERSION__*/').join(version);
  const leftover = html.match(/\/\*__[A-Z_a-z]+__\*\//);
  if (leftover) throw new Error(`Unreplaced placeholder ${leftover[0]}`);

  const split = html.indexOf('<svg width="0"');
  const head = html.slice(0, split).trim();
  const body = html.slice(split).trim();
  const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  await writeFile(p('dist/index.html'), full);
  await writeFile(p('dist/artifact.html'), html.trim() + '\n');
  return full.length;
}

async function buildRuntime() {
  const common = { entryPoints: [p('src/runtime/qontext-runtime.js')], bundle: true, legalComments: 'none' };
  await build({ ...common, format: 'iife', globalName: 'Qontext', minify: true, target: ['es2018'], outfile: p('dist/qontext-runtime.min.js') });
  await build({ ...common, format: 'esm', target: ['es2020'], outfile: p('dist/qontext-runtime.esm.js') });
  return (await readFile(p('dist/qontext-runtime.min.js'))).length;
}

async function buildFigma() {
  await build({
    entryPoints: [p('figma-plugin/src/code.js')],
    bundle: true,
    format: 'iife',
    target: ['es2017'],
    minify: false,
    legalComments: 'none',
    outfile: p('figma-plugin/dist/code.js'),
  });
  return (await readFile(p('figma-plugin/dist/code.js'))).length;
}

async function buildAll() {
  const started = Date.now();
  const pkg = JSON.parse(await readFile(p('package.json'), 'utf8'));
  await mkdir(p('dist'), { recursive: true });
  await mkdir(p('figma-plugin/dist'), { recursive: true });
  const [studio, runtime, figma] = await Promise.all([buildStudio(pkg.version), buildRuntime(), buildFigma()]);
  console.log(`Qontext ${pkg.version} built in ${Date.now() - started} ms`);
  console.log(`  dist/index.html               ${kb(studio)}`);
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
