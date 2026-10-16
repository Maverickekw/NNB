// Element triangle: BLAZE > GALE > TIDE > BLAZE
export const ELEMENTS = {
  blaze: { id: 'blaze', name: 'BLAZE', color: '#ff3b30', beats: 'gale' },
  gale:  { id: 'gale',  name: 'GALE',  color: '#2fe07a', beats: 'tide' },
  tide:  { id: 'tide',  name: 'TIDE',  color: '#1e9bff', beats: 'blaze' },
};

export const ADVANTAGE_MULT = 1.5;
export const DISADVANTAGE_MULT = 0.75;

// Returns { mult, tag } where tag is 'weak' (attacker has advantage),
// 'resist' (attacker is at a disadvantage) or null.
export function elementMultiplier(attackerEl, defenderEl) {
  if (ELEMENTS[attackerEl]?.beats === defenderEl) return { mult: ADVANTAGE_MULT, tag: 'weak' };
  if (ELEMENTS[defenderEl]?.beats === attackerEl) return { mult: DISADVANTAGE_MULT, tag: 'resist' };
  return { mult: 1, tag: null };
}
