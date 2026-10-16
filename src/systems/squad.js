// Starter squad: the picked 5★ plus the two best other fighters (distinct,
// preferring elements the pick doesn't cover).
export function autoSquad(pick, pulls) {
  const ids = [pick.id];
  const sorted = [...new Map(pulls.map(c => [c.id, c])).values()]
    .filter(c => c.id !== pick.id)
    .sort((a, b) => b.rarity - a.rarity || (a.element === pick.element) - (b.element === pick.element));
  for (const c of sorted) { if (ids.length < 3) ids.push(c.id); }
  return ids;
}
