// The site's script knows the two paper colors so it never has to force a style calculation to read them.
// This keeps that copy honest.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/site/site.css', import.meta.url), 'utf8');
const world = readFileSync(new URL('../../src/site/world.js', import.meta.url), 'utf8');

test('the paper colors in world.js match site.css', () => {
  const light = css.match(/:root \{[^}]*?--paper: (#[0-9a-f]{6})/)[1];
  const dark = css.match(/:root\[data-theme="dark"\] \{[^}]*?--paper: (#[0-9a-f]{6})/)[1];
  assert.ok(world.includes(`light: '${light}'`), `light paper ${light}`);
  assert.ok(world.includes(`dark: '${dark}'`), `dark paper ${dark}`);
});
