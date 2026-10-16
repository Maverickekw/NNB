// Pure summon logic (no DOM) so it can be unit-tested in Node.
import { ROSTER } from '../data/roster.js';

export const RATES = { 5: 0.04, 4: 0.18, 3: 0.78 };
export const SINGLE_COST = 300;
export const MULTI_COST = 3000;

export function rollRarity(rng = Math.random) {
  const r = rng();
  if (r < RATES[5]) return 5;
  if (r < RATES[5] + RATES[4]) return 4;
  return 3;
}

function pickOfRarity(rarity, rng, pool) {
  const list = pool.filter(c => c.rarity === rarity);
  return list[Math.floor(rng() * list.length)];
}

// Draw `count` characters. Any 10+ draw guarantees at least one 4★ or better:
// if none rolled, the final slot is upgraded to a 4★.
export function summon(count, rng = Math.random, pool = ROSTER) {
  const results = [];
  for (let i = 0; i < count; i++) results.push(pickOfRarity(rollRarity(rng), rng, pool));
  if (count >= 10 && !results.some(c => c.rarity >= 4)) {
    results[count - 1] = pickOfRarity(4, rng, pool);
  }
  return results;
}

// Free first multi-pull for new players.
export const starterMulti = (rng = Math.random) => summon(10, rng);

// Pick-one 5★ choices.
export const pickOneChoices = (pool = ROSTER) => pool.filter(c => c.rarity === 5);
