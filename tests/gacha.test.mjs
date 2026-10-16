import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summon, starterMulti, pickOneChoices, rollRarity, RATES } from '../src/systems/gacha.js';
import { ROSTER } from '../src/data/roster.js';
import { autoSquad } from '../src/systems/squad.js';
import { elementMultiplier } from '../src/data/elements.js';

// Deterministic PRNG (mulberry32).
const seeded = seed => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

test('starter multi always has 10 results with a 4★+', () => {
  for (let s = 0; s < 5000; s++) {
    const r = starterMulti(seeded(s));
    assert.equal(r.length, 10);
    assert.ok(r.some(c => c.rarity >= 4), `seed ${s} had no 4★+`);
  }
});

test('guarantee kicks in even when every roll is 3★', () => {
  const r = summon(10, () => 0.99);
  assert.equal(r.filter(c => c.rarity >= 4).length, 1);
  assert.equal(r[9].rarity, 4);
});

test('single pulls have no guarantee', () => {
  assert.equal(summon(1, () => 0.99)[0].rarity, 3);
});

test('rarity rates are roughly as published', () => {
  const rng = seeded(42), n = 200000, counts = { 3: 0, 4: 0, 5: 0 };
  for (let i = 0; i < n; i++) counts[rollRarity(rng)]++;
  for (const r of [3, 4, 5]) assert.ok(Math.abs(counts[r] / n - RATES[r]) < 0.01);
});

test('pick-one offers exactly the 5★ roster', () => {
  const choices = pickOneChoices();
  assert.ok(choices.length >= 3);
  assert.ok(choices.every(c => c.rarity === 5));
  assert.equal(choices.length, ROSTER.filter(c => c.rarity === 5).length);
});

test('starter squad = pick + two distinct others', () => {
  const pick = ROSTER.find(c => c.id === 'kaito');
  const pulls = summon(10, seeded(7));
  const squad = autoSquad(pick, [...pulls, pick]);
  assert.equal(squad[0], 'kaito');
  assert.equal(new Set(squad).size, squad.length);
  assert.ok(squad.length <= 3);
});

test('element triangle', () => {
  assert.deepEqual(elementMultiplier('blaze', 'gale'), { mult: 1.5, tag: 'weak' });
  assert.deepEqual(elementMultiplier('gale', 'blaze'), { mult: 0.75, tag: 'resist' });
  assert.deepEqual(elementMultiplier('tide', 'tide'), { mult: 1, tag: null });
  assert.equal(elementMultiplier('gale', 'tide').tag, 'weak');
  assert.equal(elementMultiplier('tide', 'blaze').tag, 'weak');
});
