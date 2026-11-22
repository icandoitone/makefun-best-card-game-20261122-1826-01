// Ember Duel — fixed scenes for the entry's screenshots.
// Each scene plays the real rules forward from a fresh seeded duel, steered by
// a small autopilot, so every frame is what a real game looks like and the
// same seed always gives the same frame. Open game/index.html?shot=play (or
// title, win, loss) with an optional &seed= number.

import { newDuel, startDuel, playPlayerCard, endPlayerTurn, PHASE_PLAY } from './state.js';
import { effectiveCost } from './deck.js';

const MAX_ROUNDS = 30;

// The player autopilot: play the strongest affordable strike, guard when hurt,
// mend when badly hurt, then end the turn. `maxPlays` caps how many cards it
// spends in one turn, so a staged scene can keep cards in hand.
function autopilotPlayerTurn(state, maxPlays) {
  let played = 0;
  for (;;) {
    if (played >= maxPlays) return;
    let best = null;
    let bestScore = -1;
    for (const card of state.player.hand) {
      const cost = effectiveCost(card, state.lastSuitPlayed);
      if (cost > state.ember) continue;
      let score = 0;
      if (card.kind === 'strike' || card.kind === 'trick') score = card.power * 10 - cost;
      else if (card.kind === 'guard') score = state.player.life <= 15 ? card.power * 6 : card.power;
      else if (card.kind === 'mend') score = state.player.life <= 18 ? card.power * 8 : 0;
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    }
    if (best === null || bestScore <= 0) return;
    playPlayerCard(state, best.uid);
    played += 1;
    if (state.phase !== PHASE_PLAY) return;
  }
}

function playRounds(state, rounds, playerActs, maxPlays) {
  for (let i = 0; i < rounds && state.phase === PHASE_PLAY; i += 1) {
    if (playerActs) autopilotPlayerTurn(state, maxPlays);
    if (state.phase !== PHASE_PLAY) return;
    endPlayerTurn(state);
  }
}

export function sceneForQuery(query) {
  const shot = query.get('shot') || 'title';
  const seed = Number(query.get('seed') || '7');
  const state = newDuel(seed);
  if (shot === 'title') return state;
  startDuel(state);
  if (shot === 'play') {
    // Three full rounds, then stop mid-round with the player to move and a
    // busy table: played cards, changed life totals, a real mid-game. If a
    // seed ends the duel early, try the next seed until one stays in play.
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidate = newDuel(seed + attempt);
      startDuel(candidate);
      playRounds(candidate, 3, true, 1);
      if (candidate.phase === PHASE_PLAY) {
        autopilotPlayerTurn(candidate, 2);
        if (candidate.phase === PHASE_PLAY) return candidate;
      }
    }
    const fallback = newDuel(seed);
    startDuel(fallback);
    playRounds(fallback, 3, true, 1);
    return fallback;
  }
  if (shot === 'win') {
    playRounds(state, MAX_ROUNDS, true, Infinity);
    return state;
  }
  if (shot === 'loss') {
    // The player passes every turn; Mara's strikes finish the duel.
    playRounds(state, MAX_ROUNDS, false, 0);
    return state;
  }
  return state;
}
