// A Wavefunction code can be shared by anyone, so everything it carries is untrusted. These tests feed
// hostile project names through every export and check nothing escapes its context.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeProject, encodeProject, decodeProject, paletteOf, buildExportData, toCss, toTokens, toTailwind, toSvgGrid,
  measureAll, makeState, mulberry32, kcbsProbs, oneLine, xmlEscape, commentSafe,
} from '../../src/engine/index.js';

const HOSTILE = [
  "x */ body { background: url(https://example.invalid/steal) } /*",
  "x\nrequire('child_process').execSync('touch pwned')\n//",
  'x\u2028require("fs")',
  '</title><script>alert(1)</script><title>',
  'tab\there\u0000null\u007fdel\u009bcsi',
];

function exportsFor(name) {
  const p = sanitizeProject({ name });
  const out = measureAll(makeState('random', 7), mulberry32(1));
  const data = buildExportData(paletteOf(p), out, kcbsProbs(0, 0), { name: p.name });
  return { css: toCss(data), tokens: toTokens(data), tailwind: toTailwind(data), svg: toSvgGrid(data) };
}

test('project names are one printable line of at most 80 characters', () => {
  for (const name of HOSTILE) {
    const clean = sanitizeProject({ name }).name;
    assert.equal(clean, oneLine(clean));
    assert.ok(!Array.from(clean).some((ch) => ch.codePointAt(0) < 0x20 || (ch.codePointAt(0) >= 0x7f && ch.codePointAt(0) < 0xa0) || ch === '\u2028' || ch === '\u2029'), JSON.stringify(clean));
    assert.ok(Array.from(clean).length <= 80);
  }
  assert.equal(sanitizeProject({ name: '\n\t ' }).name, 'Untitled system');
  assert.equal(Array.from(sanitizeProject({ name: '🎨'.repeat(200) }).name).length, 80);
});

test('a hostile name in a shared Wavefunction code arrives sanitized', () => {
  const code = 'QX1.' + Buffer.from(JSON.stringify({ name: HOSTILE[1], base: 10 })).toString('base64url');
  const p = decodeProject(code);
  assert.ok(!p.name.includes('\n'));
  assert.equal(decodeProject(encodeProject(p)).name, p.name);
});

test('CSS export: the name cannot close its comment', () => {
  for (const name of HOSTILE) {
    const { css } = exportsFor(name);
    const first = css.split('\n')[0];
    assert.ok(first.startsWith('/* ') && first.endsWith(' */'), first);
    assert.equal(first.indexOf('*/'), first.length - 2, first);
    assert.ok(!css.split('\n').slice(1).join('\n').includes('example.invalid'), 'the payload stays inside the comment');
  }
});

test('Tailwind export: the name cannot add a line of JavaScript', () => {
  for (const name of HOSTILE) {
    const lines = exportsFor(name).tailwind.split('\n');
    assert.ok(lines[0].startsWith('// '));
    assert.equal(lines[1], '// tailwind.config.js');
    assert.equal(lines[2], 'module.exports = {');
    assert.ok(!/[\u2028\u2029]/.test(lines[0]));
  }
});

test('SVG export: the name cannot add markup', () => {
  for (const name of HOSTILE) {
    const { svg } = exportsFor(name);
    assert.ok(!/<script/i.test(svg));
    assert.equal((svg.match(/<title>/g) || []).length, 1);
    assert.equal((svg.match(/<\/title>/g) || []).length, 1);
  }
});

test('design tokens stay valid JSON whatever the name', () => {
  for (const name of HOSTILE) assert.doesNotThrow(() => JSON.parse(exportsFor(name).tokens));
});

test('text helpers', () => {
  assert.equal(oneLine(' a\r\n b\u2029c '), 'a b c');
  assert.equal(xmlEscape(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;');
  assert.equal(commentSafe('a */ b'), 'a * / b');
  assert.equal(toCss(buildExportData(paletteOf(sanitizeProject({})), measureAll(makeState('random', 7), mulberry32(1)), kcbsProbs(0, 0)), '} body {').includes('} body {'), false);
});
