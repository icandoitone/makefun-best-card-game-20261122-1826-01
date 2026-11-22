// Ember Duel — suits, cards and decks.
// Four original elemental suits. Each suit has its own colour and shape,
// so a card's suit is readable by colour and by glyph, never by text alone.

export const SUITS = {
  flame: { key: 'flame', name: 'Flame', glyph: '▲', cssClass: 'suit-flame' },
  wave: { key: 'wave', name: 'Wave', glyph: '●', cssClass: 'suit-wave' },
  leaf: { key: 'leaf', name: 'Leaf', glyph: '◆', cssClass: 'suit-leaf' },
  stone: { key: 'stone', name: 'Stone', glyph: '■', cssClass: 'suit-stone' },
};

export const KIND_LABELS = {
  strike: 'Strike',
  guard: 'Guard',
  mend: 'Mend',
  trick: 'Trick',
};

// One catalogue entry per unique card. `power` means damage for a strike or
// trick, guard points for a guard, healing for a mend. `draw` draws cards,
// `pierce` ignores the target's guard.
export const CARD_CATALOGUE = [
  { id: 'ember-strike', name: 'Ember Strike', suit: 'flame', kind: 'strike', cost: 1, power: 3 },
  { id: 'flame-lash', name: 'Flame Lash', suit: 'flame', kind: 'strike', cost: 2, power: 5 },
  { id: 'inferno', name: 'Inferno', suit: 'flame', kind: 'strike', cost: 4, power: 9 },
  { id: 'ember-ward', name: 'Ember Ward', suit: 'flame', kind: 'guard', cost: 1, power: 4 },
  { id: 'warm-hearth', name: 'Warm Hearth', suit: 'flame', kind: 'mend', cost: 2, power: 6 },
  { id: 'spark-burst', name: 'Spark Burst', suit: 'flame', kind: 'trick', cost: 3, power: 6, draw: 1 },
  { id: 'tide-slash', name: 'Tide Slash', suit: 'wave', kind: 'strike', cost: 1, power: 3 },
  { id: 'wave-crash', name: 'Wave Crash', suit: 'wave', kind: 'strike', cost: 3, power: 6 },
  { id: 'tide-wall', name: 'Tide Wall', suit: 'wave', kind: 'guard', cost: 2, power: 7 },
  { id: 'spring-water', name: 'Spring Water', suit: 'wave', kind: 'mend', cost: 2, power: 7 },
  { id: 'deep-current', name: 'Deep Current', suit: 'wave', kind: 'trick', cost: 3, power: 5, draw: 1 },
  { id: 'thorn-jab', name: 'Thorn Jab', suit: 'leaf', kind: 'strike', cost: 1, power: 3 },
  { id: 'vine-whip', name: 'Vine Whip', suit: 'leaf', kind: 'strike', cost: 2, power: 4 },
  { id: 'bark-shield', name: 'Bark Shield', suit: 'leaf', kind: 'guard', cost: 1, power: 5 },
  { id: 'leaf-salve', name: 'Leaf Salve', suit: 'leaf', kind: 'mend', cost: 1, power: 4 },
  { id: 'overgrowth', name: 'Overgrowth', suit: 'leaf', kind: 'trick', cost: 3, power: 6, heal: 4 },
  { id: 'stone-slam', name: 'Stone Slam', suit: 'stone', kind: 'strike', cost: 2, power: 5 },
  { id: 'boulder-drop', name: 'Boulder Drop', suit: 'stone', kind: 'strike', cost: 3, power: 7 },
  { id: 'stone-skin', name: 'Stone Skin', suit: 'stone', kind: 'guard', cost: 2, power: 8 },
  { id: 'quake', name: 'Quake', suit: 'stone', kind: 'strike', cost: 4, power: 8, pierce: true },
];

export const STARTING_LIFE = 30;
export const MAX_HAND = 7;
export const OPENING_HAND = 4;
export const MAX_EMBER = 10;

// Small deterministic generator so a seeded duel always deals the same cards.
export function makeSeededRandom(seed) {
  let value = (seed >>> 0) || 1;
  return function nextRandom() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// Build a fresh 40-card deck: two copies of every catalogue card.
export function buildDeck() {
  const deck = [];
  for (const card of CARD_CATALOGUE) {
    deck.push({ ...card, uid: card.id + '-a' });
    deck.push({ ...card, uid: card.id + '-b' });
  }
  return deck;
}

export function shuffleDeck(deck, random) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const held = deck[i];
    deck[i] = deck[j];
    deck[j] = held;
  }
  return deck;
}

// Ember available at the start of a turn: 3 on round 1, +1 each round to 10.
export function emberForRound(round) {
  return Math.min(MAX_EMBER, round + 2);
}

// The price of a card on this turn: 1 less when its suit matches the suit of
// the card played just before it (Harmony), never below zero.
export function effectiveCost(card, lastSuitPlayed) {
  if (lastSuitPlayed !== null && card.suit === lastSuitPlayed) {
    return Math.max(0, card.cost - 1);
  }
  return card.cost;
}
