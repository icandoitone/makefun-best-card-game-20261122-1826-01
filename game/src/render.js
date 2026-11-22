// Ember Duel — renders the duel state into the page's DOM.
// Every card is a real DOM element: big value, suit glyph in its suit colour,
// cost badge and name, so the table stays legible at a glance.

import { SUITS, KIND_LABELS, effectiveCost } from './deck.js';
import { PHASE_TITLE, PHASE_WON, PHASE_LOST } from './state.js';

function suitOf(card) {
  return SUITS[card.suit];
}

function makeCardElement(card, options) {
  const el = document.createElement('div');
  el.className = 'card' + (options.mini ? ' mini-card' : '');
  el.dataset.uid = card.uid;
  const suit = suitOf(card);
  const cost = document.createElement('div');
  cost.className = 'card-cost';
  cost.textContent = String(options.cost !== undefined ? options.cost : card.cost);
  const glyph = document.createElement('div');
  glyph.className = 'card-suit ' + suit.cssClass;
  glyph.textContent = suit.glyph;
  const power = document.createElement('div');
  power.className = 'card-power ' + suit.cssClass;
  power.textContent = String(card.power);
  const kind = document.createElement('div');
  kind.className = 'card-kind';
  kind.textContent = KIND_LABELS[card.kind] + (card.pierce === true ? ' · pierces' : '');
  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = card.name;
  el.append(cost, glyph, power, kind, name);
  return el;
}

function makeCardBack() {
  const el = document.createElement('div');
  el.className = 'card card-back';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

export function renderTable(state, onPlayCard) {
  const $ = (id) => document.getElementById(id);

  $('roundBadge').textContent = 'ROUND ' + state.round;
  const turnBadge = $('turnBadge');
  turnBadge.textContent = state.turn === 'player' ? 'Your turn' : "Mara's turn";
  turnBadge.classList.toggle('enemy', state.turn !== 'player');

  renderFighter(state, 'player');
  renderFighter(state, 'rival');

  const rivalHand = $('rivalHand');
  rivalHand.replaceChildren();
  for (const card of state.rival.hand) rivalHand.appendChild(makeCardBack());

  const playerHand = $('playerHand');
  playerHand.replaceChildren();
  state.player.hand.forEach((card, position) => {
    const cost = effectiveCost(card, state.lastSuitPlayed);
    const el = makeCardElement(card, { cost });
    const affordable = cost <= state.ember && state.phase === 'play' && state.turn === 'player';
    el.classList.toggle('playable', affordable);
    el.classList.toggle('unaffordable', !affordable);
    el.title = `${card.name} — ${KIND_LABELS[card.kind]} ${card.power}, ${suitOf(card).name}, costs ${cost} ember (key ${position + 1})`;
    el.addEventListener('click', () => onPlayCard(card.uid));
    playerHand.appendChild(el);
  });

  renderPlayedRow($('rivalPlayed'), state.playedByRival);
  renderPlayedRow($('playerPlayed'), state.playedByPlayer);

  const pips = $('emberPips');
  pips.replaceChildren();
  for (let i = 0; i < state.emberMax; i += 1) {
    const pip = document.createElement('span');
    pip.className = 'ember-pip' + (i < state.ember ? '' : ' spent');
    pips.appendChild(pip);
  }
  $('emberText').textContent = `${state.ember} / ${state.emberMax}`;

  const log = $('battleLog');
  log.replaceChildren();
  for (const line of state.log.slice(-6)) {
    const row = document.createElement('div');
    row.textContent = line;
    if (line.startsWith('You')) row.className = 'log-you';
    else if (line.startsWith('Mara')) row.className = 'log-rival';
    else if (line.includes('Harmony') || line.includes('win')) row.className = 'log-good';
    log.appendChild(row);
  }

  $('endTurnButton').disabled = state.phase !== 'play' || state.turn !== 'player';
  $('harmonyNote').hidden = state.lastSuitPlayed === null;
  if (state.lastSuitPlayed !== null) {
    $('harmonyNote').textContent = `HARMONY — your next ${SUITS[state.lastSuitPlayed].name} card costs 1 less ember`;
  }

  const arena = $('arenaMessage');
  if (state.phase === 'play') {
    arena.textContent = state.turn === 'player'
      ? 'Your move — click a card to play it, then End Turn.'
      : "Mara is playing…";
  }
  renderEndScreen(state);
  $('titleScreen').hidden = state.phase !== PHASE_TITLE;
  $('status').textContent = arena.textContent;
}

function renderFighter(state, side) {
  const fighter = side === 'player' ? state.player : state.rival;
  const prefix = side === 'player' ? 'player' : 'rival';
  const lifeText = document.getElementById(prefix + 'LifeText');
  const lifeFill = document.getElementById(prefix + 'LifeFill');
  const guardText = document.getElementById(prefix + 'GuardText');
  lifeText.textContent = `${fighter.life} / 30`;
  lifeFill.style.width = `${Math.max(0, (fighter.life / 30) * 100)}%`;
  guardText.textContent = String(fighter.guard);
}

function renderPlayedRow(row, cards) {
  row.replaceChildren();
  for (const card of cards.slice(-3)) {
    const el = makeCardElement(card, { mini: true });
    el.classList.add('just-played');
    row.appendChild(el);
  }
}

function renderEndScreen(state) {
  const endScreen = document.getElementById('endScreen');
  if (state.phase !== PHASE_WON && state.phase !== PHASE_LOST) {
    endScreen.hidden = true;
    return;
  }
  const won = state.phase === PHASE_WON;
  const title = document.getElementById('endTitle');
  title.textContent = won ? 'VICTORY!' : 'DEFEAT';
  title.className = won ? 'win' : 'lose';
  document.getElementById('endText').textContent = won
    ? 'Mara’s life is spent. The table is yours, duelist.'
    : 'Mara takes the duel this time. Shuffle up and go again.';
  document.getElementById('endStats').textContent =
    `Rounds: ${state.round} · Cards played: ${state.cardsPlayed} · Damage dealt: ${state.damageDealt} · Damage taken: ${state.damageTaken}`;
  endScreen.hidden = false;
}
