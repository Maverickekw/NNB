// All characters are original. Visuals come ONLY from /Assets (see Assets/manifest.json);
// an id without a manifest entry renders as a labeled gray placeholder.
//
// skill.type: 'single' hits the current target, 'aoe' hits every enemy.
// skill.cooldown is in seconds (real-time).

export const ROSTER = [
  // ---- 5★ ----
  { id: 'kaito',  name: 'Kaito Renjo',     title: 'Neon Rebel',         rarity: 5, element: 'blaze', hp: 1450, atk: 168,
    skill: { name: 'Crimson Overdrive', type: 'aoe',    power: 4.2, cooldown: 14 } },
  { id: 'mirei',  name: 'Mirei Aozora',    title: 'Rooftop Tidecaller', rarity: 5, element: 'tide',  hp: 1520, atk: 156,
    skill: { name: 'Riptide Requiem',   type: 'aoe',    power: 4.0, cooldown: 13 } },
  { id: 'juno',   name: 'Juno Kestrel',    title: 'Skyline Breaker',    rarity: 5, element: 'gale',  hp: 1380, atk: 176,
    skill: { name: 'Cyclone Verdict',   type: 'single', power: 6.5, cooldown: 12 } },
  { id: 'dante',  name: 'Dante Okabe',     title: 'Midnight Ace',       rarity: 5, element: 'blaze', hp: 1600, atk: 150,
    skill: { name: 'Afterburn Encore',  type: 'single', power: 6.8, cooldown: 13 } },
  { id: 'selene', name: 'Selene Marchetti', title: 'Undertow Queen',    rarity: 5, element: 'tide',  hp: 1400, atk: 170,
    skill: { name: 'Black Current',     type: 'single', power: 6.4, cooldown: 12 } },
  { id: 'hiro',   name: 'Hiro Tachibana',  title: 'Storm Prodigy',      rarity: 5, element: 'gale',  hp: 1500, atk: 160,
    skill: { name: 'Thousand Gusts',    type: 'aoe',    power: 4.1, cooldown: 14 } },

  // ---- 4★ ----
  { id: 'ryo',    name: 'Ryo Kanzaki',     title: 'Back-Alley Spark',   rarity: 4, element: 'blaze', hp: 1180, atk: 132,
    skill: { name: 'Ember Rush',        type: 'single', power: 5.0, cooldown: 10 } },
  { id: 'sora',   name: 'Sora Minase',     title: 'Rain Runner',        rarity: 4, element: 'tide',  hp: 1250, atk: 124,
    skill: { name: 'Downpour Lance',    type: 'single', power: 5.0, cooldown: 10 } },
  { id: 'nadia',  name: 'Nadia Voss',      title: 'Wind Courier',       rarity: 4, element: 'gale',  hp: 1150, atk: 136,
    skill: { name: 'Tailwind Spiral',   type: 'aoe',    power: 3.2, cooldown: 11 } },
  { id: 'taiga',  name: 'Taiga Morikawa',  title: 'Hall Monitor',       rarity: 4, element: 'blaze', hp: 1300, atk: 120,
    skill: { name: 'Detention Flare',   type: 'aoe',    power: 3.0, cooldown: 11 } },
  { id: 'lin',    name: 'Lin Shaw',        title: 'Harbor Ghost',       rarity: 4, element: 'tide',  hp: 1120, atk: 140,
    skill: { name: 'Fog Bank Feint',    type: 'single', power: 5.2, cooldown: 10 } },
  { id: 'eiji',   name: 'Eiji Fujimura',   title: 'Track Star',         rarity: 4, element: 'gale',  hp: 1200, atk: 130,
    skill: { name: 'Slipstream Kick',   type: 'single', power: 5.0, cooldown: 9 } },

  // ---- 3★ ----
  { id: 'mako',   name: 'Mako Ishida',     title: 'Arcade Regular',     rarity: 3, element: 'blaze', hp: 950,  atk: 104,
    skill: { name: 'Coin-Op Combo',     type: 'single', power: 4.0, cooldown: 9 } },
  { id: 'yuna',   name: 'Yuna Hoshi',      title: 'Swim Club',          rarity: 3, element: 'tide',  hp: 1000, atk: 98,
    skill: { name: 'Lane Splash',       type: 'single', power: 4.0, cooldown: 9 } },
  { id: 'kenta',  name: 'Kenta Oda',       title: 'Kite Fighter',       rarity: 3, element: 'gale',  hp: 920,  atk: 108,
    skill: { name: 'Line Cutter',       type: 'single', power: 4.0, cooldown: 9 } },
  { id: 'priya',  name: 'Priya Nair',      title: 'Robotics Club',      rarity: 3, element: 'blaze', hp: 980,  atk: 100,
    skill: { name: 'Overclock',         type: 'aoe',    power: 2.4, cooldown: 10 } },
  { id: 'theo',   name: 'Theo Lindqvist',  title: 'Transfer Student',   rarity: 3, element: 'tide',  hp: 1020, atk: 96,
    skill: { name: 'Cold Open',         type: 'aoe',    power: 2.4, cooldown: 10 } },
  { id: 'aiko',   name: 'Aiko Sakamoto',   title: 'Skate Park Local',   rarity: 3, element: 'gale',  hp: 940,  atk: 106,
    skill: { name: 'Kickflip Gale',     type: 'single', power: 4.0, cooldown: 9 } },
];

// Enemies are never summonable.
export const ENEMIES = [
  { id: 'rusthound',  name: 'Rust Hound',    title: 'Street Gang Bruiser', element: 'blaze', hp: 900,  atk: 70,
    attackEvery: [3.2, 4.6] },
  { id: 'phantom',    name: 'Street Phantom', title: 'Graffiti Wraith',    element: 'gale',  hp: 820,  atk: 76,
    attackEvery: [2.8, 4.2] },
  { id: 'drainer',    name: 'Gutter Drainer', title: 'Storm Drain Lurker', element: 'tide',  hp: 860,  atk: 72,
    attackEvery: [3.0, 4.4] },
  { id: 'marquee',    name: 'The Marquee',   title: 'Boss of the Strip',   element: 'tide',  hp: 2600, atk: 95,
    attackEvery: [2.6, 3.6], boss: true },
];

const byId = new Map([...ROSTER, ...ENEMIES].map(c => [c.id, c]));
export const getChar = id => byId.get(id);
export const byRarity = r => ROSTER.filter(c => c.rarity === r);

// Loaner squad used during the tutorial (one per element).
export const TUTORIAL_SQUAD = ['ryo', 'sora', 'nadia'];
