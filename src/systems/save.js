// Persistent player profile. Storage can throw (private mode, blocked site data),
// so every access is guarded and the game still runs from in-memory defaults.
const KEY = 'riotshift.save.v1';

const defaults = () => ({
  tutorialDone: false,
  starterMultiClaimed: false,
  starterPickClaimed: false,
  gems: 3000,
  collection: {},   // id -> copies owned
  squad: [],        // up to 3 ids
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch { /* fall through */ }
  return defaults();
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export const profile = () => state;

export function update(fn) { fn(state); save(); }

export function addToCollection(chars) {
  update(s => { for (const c of chars) s.collection[c.id] = (s.collection[c.id] || 0) + 1; });
}

export function resetProfile() { state = defaults(); save(); }
