// Ember Duel — duel state, turn rules and the rival's choices.
// Pure rules: no DOM here, so the same state can drive the live game and the
// fixed screenshot scenes.

import {
  STARTING_LIFE,
  MAX_HAND,
  OPENING_HAND,
  buildDeck,
  shuffleDeck,
  makeSeededRandom,
  emberForRound,
  effectiveCost,
} from './deck.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

export function makeFighter() {
  return {
    life: STARTING_LIFE,
    guard: 0,
    deck: [],
    hand: [],
    discard: [],
  };
}

export function newDuel(seed) {
  const random = makeSeededRandom(seed);
  const state = {
    seed,
    random,
    phase: PHASE_TITLE,
    round: 1,
    turn: 'player',
    ember: emberForRound(1),
    emberMax: emberForRound(1),
    lastSuitPlayed: null,
    player: makeFighter(),
    rival: makeFighter(),
    playedByPlayer: [],
    playedByRival: [],
    log: [],
    cardsPlayed: 0,
    damageDealt: 0,
    damageTaken: 0,
  };
  state.player.deck = shuffleDeck(buildDeck(), random);
  state.rival.deck = shuffleDeck(buildDeck(), random);
  for (let i = 0; i < OPENING_HAND; i += 1) {
    drawCard(state.player);
    drawCard(state.rival);
  }
  state.log.push('The duel begins. You hold the first turn.');
  return state;
}

export function drawCard(fighter) {
  if (fighter.hand.length >= MAX_HAND) return null;
  if (fighter.deck.length === 0) {
    if (fighter.discard.length === 0) return null;
    fighter.deck = shuffleDeck(fighter.discard, Math.random);
    fighter.discard = [];
  }
  const card = fighter.deck.shift();
  fighter.hand.push(card);
  return card;
}

export function startDuel(state) {
  state.phase = PHASE_PLAY;
  state.log.push('Round 1 — your move. Click a card to play it.');
}

function soakDamage(fighter, amount, pierce) {
  if (!pierce && fighter.guard > 0) {
    const soaked = Math.min(fighter.guard, amount);
    fighter.guard -= soaked;
    return amount - soaked;
  }
  return amount;
}

function applyDamage(state, target, amount, pierce, attacker) {
  const through = soakDamage(target, amount, pierce);
  target.life = Math.max(0, target.life - through);
  if (attacker === 'player') state.damageDealt += through;
  if (attacker === 'rival') state.damageTaken += through;
  return through;
}

// Resolve one card. Returns a short line for the battle log.
export function resolveCard(state, side, card) {
  const actor = side === 'player' ? state.player : state.rival;
  const target = side === 'player' ? state.rival : state.player;
  const who = side === 'player' ? 'You' : 'Mara';
  state.cardsPlayed += 1;
  if (card.kind === 'strike' || card.kind === 'trick') {
    const through = applyDamage(state, target, card.power, card.pierce === true, side);
    let line = `${who} played ${card.name} — ${through} damage.`;
    if (card.pierce === true) line = `${who} played ${card.name} — ${through} damage, straight through guard!`;
    if (card.draw) {
      for (let i = 0; i < card.draw; i += 1) drawCard(actor);
      line += ` Drew ${card.draw}.`;
    }
    if (card.heal) {
      actor.life = Math.min(STARTING_LIFE, actor.life + card.heal);
      line += ` Healed ${card.heal}.`;
    }
    checkEnd(state);
    return line;
  }
  if (card.kind === 'guard') {
    actor.guard += card.power;
    checkEnd(state);
    return `${who} played ${card.name} — +${card.power} guard.`;
  }
  actor.life = Math.min(STARTING_LIFE, actor.life + card.power);
  checkEnd(state);
  return `${who} played ${card.name} — healed ${card.power} life.`;
}

export function canPlay(state, card) {
  if (state.phase !== PHASE_PLAY || state.turn !== 'player') return false;
  return effectiveCost(card, state.lastSuitPlayed) <= state.ember;
}

// Play a card from the player's hand by its uid. Returns the log line or null.
export function playPlayerCard(state, uid) {
  const index = state.player.hand.findIndex((card) => card.uid === uid);
  if (index < 0) return null;
  const card = state.player.hand[index];
  const cost = effectiveCost(card, state.lastSuitPlayed);
  if (cost > state.ember) return null;
  state.ember -= cost;
  state.player.hand.splice(index, 1);
  state.player.discard.push(card);
  state.playedByPlayer.push(card);
  const harmony = state.lastSuitPlayed !== null && card.suit === state.lastSuitPlayed;
  state.lastSuitPlayed = card.suit;
  const line = resolveCard(state, 'player', card);
  state.log.push(harmony ? `${line} Harmony!` : line);
  checkEnd(state);
  return line;
}

export function checkEnd(state) {
  if (state.phase !== PHASE_PLAY) return;
  if (state.rival.life <= 0) {
    state.phase = PHASE_WON;
    state.log.push('Mara falls. You win the duel!');
  } else if (state.player.life <= 0) {
    state.phase = PHASE_LOST;
    state.log.push('Your life is spent. Mara wins the duel.');
  }
}

export function beginPlayerTurn(state) {
  state.round += 1;
  state.turn = 'player';
  state.emberMax = emberForRound(state.round);
  state.ember = state.emberMax;
  state.lastSuitPlayed = null;
  const drawn = drawCard(state.player);
  state.log.push(`Round ${state.round} — you draw ${drawn ? drawn.name : 'nothing'} and gain ${state.emberMax} ember.`);
}

export function endPlayerTurn(state) {
  if (state.phase !== PHASE_PLAY || state.turn !== 'player') return [];
  state.turn = 'rival';
  // Clear last turn's played cards now, so Mara's new plays fill the table
  // and stay visible while the player plans the next turn.
  state.playedByPlayer = [];
  state.playedByRival = [];
  state.log.push('You end your turn. Mara is thinking…');
  return runRivalTurn(state);
}

// Mara's turn, played out at once: she draws, spends her ember on the best
// cards she can afford, then the round passes back to the player.
export function runRivalTurn(state) {
  const lines = [];
  const rival = state.rival;
  const ember = emberForRound(state.round);
  let left = ember;
  let lastSuit = null;
  drawCard(rival);
  let guard = 0;
  for (;;) {
    const pick = chooseRivalCard(state, left, lastSuit);
    if (pick === null) break;
    const cost = effectiveCost(pick.card, lastSuit);
    left -= cost;
    guard += pick.card.kind === 'guard' ? pick.card.power : 0;
    rival.hand.splice(pick.index, 1);
    rival.discard.push(pick.card);
    state.playedByRival.push(pick.card);
    lastSuit = pick.card.suit;
    lines.push(resolveCard(state, 'rival', pick.card));
    if (state.phase !== PHASE_PLAY) break;
  }
  state.log.push(...lines);
  if (state.phase === PHASE_PLAY) {
    beginPlayerTurn(state);
  }
  return lines;
}

// Mara's heuristic: finish the player when she can, mend when she is hurt,
// guard when she is exposed, otherwise hit as hard as her ember allows.
export function chooseRivalCard(state, emberLeft, lastSuit) {
  const rival = state.rival;
  const player = state.player;
  let best = null;
  let bestScore = -1;
  for (let index = 0; index < rival.hand.length; index += 1) {
    const card = rival.hand[index];
    const cost = effectiveCost(card, lastSuit);
    if (cost > emberLeft) continue;
    let score = 0;
    if (card.kind === 'strike' || card.kind === 'trick') {
      const hit = card.pierce === true ? card.power : Math.max(0, card.power - player.guard);
      score = hit * 10 + card.power;
      if (hit >= player.life) score += 1000;
      if (card.draw) score += 6;
      if (card.heal) score += 4;
    } else if (card.kind === 'guard') {
      score = rival.life <= 12 ? card.power * 8 : card.power * 2;
      if (rival.guard >= 8) score = 0;
    } else if (card.kind === 'mend') {
      const missing = STARTING_LIFE - rival.life;
      score = missing <= 0 ? 0 : Math.min(card.power, missing) * 7;
      if (rival.life <= 10) score += 40;
    }
    score -= cost;
    if (score > bestScore) {
      bestScore = score;
      best = { index, card };
    }
  }
  return bestScore > 0 ? best : null;
}
