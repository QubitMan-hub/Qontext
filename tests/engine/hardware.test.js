import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { examplePool, packPool, unpackPool, parsePool, poolSummary, canonicalShots } from '../../src/engine/index.js';
import { IBM_RUN } from '../../src/app/ibm-run.js';

test('a packed pool unpacks to exactly the same shots and details', () => {
  const pool = examplePool({ shots: 37 });
  const back = unpackPool(packPool(pool));
  assert.equal(canonicalShots(back), canonicalShots(pool));
  for (const k of ['format', 'backend', 'simulated', 'job_ids', 'created', 'shots', 'state_seed']) assert.deepEqual(back[k], pool[k]);
});

test('the bundled ibm_kingston run is the recorded file, shot for shot', () => {
  const raw = parsePool(readFileSync(new URL('../../data/hardware/ibm_kingston-2026-10-12.json', import.meta.url), 'utf8'));
  const run = unpackPool(IBM_RUN);
  assert.equal(canonicalShots(run), canonicalShots(raw));
  assert.equal(run.simulated, false);
  assert.equal(run.backend, 'ibm_kingston');
  const s = poolSummary(run);
  assert.ok(Math.abs(s.mermin.total - 5.2861) < 1e-3);
  assert.ok(Math.abs(s.chsh.S - 2.7324) < 1e-3);
  assert.ok(JSON.stringify(IBM_RUN).length < 12000, 'packed small enough to ship in the page');
});
