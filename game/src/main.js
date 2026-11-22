// Ember Duel — boot and input: mouse clicks, keyboard, and the fixed
// screenshot scenes (?shot=title|play|win|loss). The duel itself lives in
// state.js; this file only wires it to the page.

import { newDuel, startDuel, playPlayerCard, endPlayerTurn } from './state.js';
import { renderTable } from './render.js';
import { sceneForQuery } from './shots.js';

let state = null;
let shotMode = false;

function refresh() {
  renderTable(state, onPlayCard);
}

function onPlayCard(uid) {
  if (shotMode) return;
  const line = playPlayerCard(state, uid);
  if (line !== null) refresh();
}

function startNewDuel() {
  const seed = (Date.now() % 2147483647) || 1;
  state = newDuel(seed);
  startDuel(state);
  refresh();
}

function endTurn() {
  if (shotMode) return;
  if (state.phase !== 'play' || state.turn !== 'player') return;
  endPlayerTurn(state);
  refresh();
}

function boot() {
  const query = new URLSearchParams(window.location.search);
  shotMode = query.has('shot');
  state = shotMode ? sceneForQuery(query) : newDuel((Date.now() % 2147483647) || 1);
  refresh();

  document.getElementById('startButton').addEventListener('click', () => {
    startNewDuel();
  });
  document.getElementById('againButton').addEventListener('click', () => {
    startNewDuel();
  });
  document.getElementById('endTurnButton').addEventListener('click', endTurn);

  window.addEventListener('keydown', (event) => {
    if (shotMode) return;
    const key = event.key;
    if (key >= '1' && key <= '7') {
      const index = Number(key) - 1;
      const card = state.player.hand[index];
      if (card) onPlayCard(card.uid);
    } else if (key === 'Enter') {
      endTurn();
    } else if (key === 'n' || key === 'N') {
      startNewDuel();
    }
  });
}

boot();
