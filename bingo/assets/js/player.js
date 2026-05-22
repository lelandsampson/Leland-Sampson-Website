(function () {
  const game = window.VibeBingo;
  const playerId = game.getPlayerId();
  let round = game.getRound();
  let boardState = game.getBoardState(playerId, round.id);
  let firebaseAdapter = null;
  let firebaseJoined = false;

  const board = document.getElementById("bingo-board");
  const playerIdElement = document.getElementById("player-id");
  const statusElement = document.getElementById("player-status");
  const roomNote = document.getElementById("room-note");
  const newCardButton = document.getElementById("new-card-button");
  const clearCardButton = document.getElementById("clear-card-button");

  function renderBoard() {
    const analysis = game.analyzeBoard(boardState.marked);
    const winningIndexes = new Set(analysis.winningLines.flat());
    const markedSet = new Set(boardState.marked);

    board.innerHTML = "";
    boardState.terms.forEach((term, index) => {
      const button = document.createElement("button");
      button.className = "bingo-square";
      button.type = "button";
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-pressed", markedSet.has(index) ? "true" : "false");
      button.textContent = term;

      if (markedSet.has(index)) {
        button.classList.add("is-marked");
      }
      if (winningIndexes.has(index)) {
        button.classList.add("is-winning");
      }

      button.addEventListener("click", () => toggleSquare(index));
      board.appendChild(button);
    });

    playerIdElement.textContent = playerId;
    statusElement.textContent = statusText(analysis);
  }

  function statusText(analysis) {
    if (analysis.hasBingo) {
      return "Bingo";
    }
    if (analysis.squaresAway === 1) {
      return "1 square away";
    }
    return `${analysis.squaresAway} squares away`;
  }

  function toggleSquare(index) {
    const marked = new Set(boardState.marked);
    if (marked.has(index)) {
      marked.delete(index);
    } else {
      marked.add(index);
    }
    boardState.marked = Array.from(marked).sort((a, b) => a - b);
    game.saveBoardState(playerId, boardState);
    renderBoard();
    publishStatus();
  }

  async function publishStatus() {
    const status = game.playerStatus(playerId, boardState, false);
    game.writeLocalPlayer(status);

    if (firebaseAdapter && firebaseJoined) {
      try {
        await firebaseAdapter.writePlayer(status);
      } catch (error) {
        roomNote.textContent = "Live dashboard update failed; your card still works locally.";
      }
    }
  }

  async function setupFirebase() {
    firebaseAdapter = await window.VibeBingoFirebase.createFirebaseAdapter();
    if (!firebaseAdapter) {
      roomNote.textContent = "Demo mode: your card is local to this browser.";
      return;
    }

    firebaseJoined = await firebaseAdapter.canJoin(round.id);
    if (firebaseJoined) {
      roomNote.textContent = "Live dashboard mode is on.";
      publishStatus();
      firebaseAdapter.watchGame((remoteRound) => {
        if (!remoteRound || !remoteRound.id || remoteRound.id === round.id) {
          return;
        }
        game.writeJson("round", remoteRound);
        refreshForRoundChange();
      });
      return;
    }

    roomNote.textContent = "The live room is full. You can still play locally, but this card will not appear on the dashboard.";
  }

  function refreshForRoundChange() {
    const currentRound = game.getRound();
    if (currentRound.id === round.id) {
      return;
    }

    round = currentRound;
    boardState = game.getBoardState(playerId, round.id);
    renderBoard();
    publishStatus();
  }

  newCardButton.addEventListener("click", () => {
    boardState = game.clearBoard(playerId, true);
    renderBoard();
    publishStatus();
  });

  clearCardButton.addEventListener("click", () => {
    boardState.marked = [];
    game.saveBoardState(playerId, boardState);
    renderBoard();
    publishStatus();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === game.storageKey("roundSignal") || event.key === game.storageKey("round")) {
      refreshForRoundChange();
    }
  });

  renderBoard();
  publishStatus();
  setupFirebase();
  setInterval(publishStatus, 30000);
  setInterval(refreshForRoundChange, 2000);
})();
