(function () {
  const game = window.VibeBingo;
  const config = window.VIBE_BINGO_CONFIG || {};
  const AI_ID = "AI Player";
  let round = game.getRound();
  let firebaseAdapter = null;
  let firebasePlayers = null;
  let stopWatchingPlayers = null;
  let aiState = game.getBoardState(AI_ID, round.id);
  let recognition = null;
  let knownWinners = new Set();

  const activeCount = document.getElementById("active-count");
  const bingoCount = document.getElementById("bingo-count");
  const roomLimit = document.getElementById("room-limit");
  const roundId = document.getElementById("round-id");
  const updatedAt = document.getElementById("updated-at");
  const playersTable = document.getElementById("players-table");
  const winnerAlerts = document.getElementById("winner-alerts");
  const resetButton = document.getElementById("reset-button");
  const aiBoard = document.getElementById("ai-board");
  const aiStatus = document.getElementById("ai-status");
  const aiListenButton = document.getElementById("ai-listen-button");
  const aiStopButton = document.getElementById("ai-stop-button");
  const transcriptInput = document.getElementById("transcript-input");
  const transcriptTestButton = document.getElementById("transcript-test-button");

  const demoNames = ["Card D3MO", "Card L1BR", "Card R4GG", "Card C0DE", "Card T0KN", "Card A11L"];
  const demoPatterns = [
    [0, 1, 2],
    [4, 5, 6],
    [0, 4, 8],
    [1, 5, 9],
    [2, 6, 10],
    [3, 7, 10]
  ];

  function ensureDemoPlayers() {
    const players = game.readLocalPlayers();
    const active = game.activePlayers(players, round.id);
    if (active.length > 1) {
      return;
    }

    demoNames.forEach((id, playerIndex) => {
      const marked = demoPatterns[playerIndex];
      const state = {
        roundId: round.id,
        terms: game.TERMS,
        marked
      };
      const status = game.playerStatus(id, state, false);
      status.lastSeen = Date.now() - playerIndex * 7000;
      game.writeLocalPlayer(status);
    });
  }

  function renderDashboard() {
    const players = firebasePlayers || game.readLocalPlayers();
    const activePlayers = game.activePlayers(players, round.id);
    const winners = activePlayers.filter((player) => player.hasBingo);

    activeCount.textContent = String(activePlayers.length);
    bingoCount.textContent = String(winners.length);
    roomLimit.textContent = String(config.maxActivePlayers || 100);
    roundId.textContent = round.id.replace("round-", "");
    updatedAt.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;

    playersTable.innerHTML = "";
    activePlayers.forEach((player) => {
      const row = document.createElement("tr");
      if (player.hasBingo) {
        row.classList.add("winner-row");
      }
      if (player.isAI) {
        row.classList.add("ai-row");
      }

      row.innerHTML = `
        <td>${escapeHtml(player.id)}</td>
        <td>${player.markedCount}/16</td>
        <td>${player.hasBingo ? "0" : player.squaresAway}</td>
        <td>${player.hasBingo ? "Bingo" : player.squaresAway === 1 ? "Almost" : "Playing"}</td>
      `;
      playersTable.appendChild(row);
    });

    if (activePlayers.length >= (config.maxActivePlayers || 100)) {
      addAlert("Room limit reached. New visitors can play locally but will not join the live dashboard.", "limit");
    }

    winners.forEach((winner) => {
      const winnerKey = `${round.id}:${winner.id}`;
      if (!knownWinners.has(winnerKey)) {
        knownWinners.add(winnerKey);
        addAlert(`${winner.isAI ? "AI player" : winner.id} has bingo.`, "win");
      }
    });
  }

  function addAlert(message, type) {
    const duplicate = Array.from(winnerAlerts.children).some((child) => child.textContent === message);
    if (duplicate && type !== "win") {
      return;
    }
    const alert = document.createElement("div");
    alert.className = `alert ${type === "win" ? "win-alert" : ""}`;
    alert.textContent = message;
    winnerAlerts.prepend(alert);
  }

  function renderAiBoard() {
    const analysis = game.analyzeBoard(aiState.marked);
    const markedSet = new Set(aiState.marked);
    const winningIndexes = new Set(analysis.winningLines.flat());
    aiBoard.innerHTML = "";

    aiState.terms.forEach((term, index) => {
      const square = document.createElement("div");
      square.className = "mini-square";
      square.textContent = term;
      if (markedSet.has(index)) {
        square.classList.add("is-marked");
      }
      if (winningIndexes.has(index)) {
        square.classList.add("is-winning");
      }
      aiBoard.appendChild(square);
    });

    aiStatus.textContent = analysis.hasBingo ? "Bingo" : `${analysis.squaresAway} away`;
  }

  function publishAi() {
    const status = game.playerStatus(AI_ID, aiState, true);
    game.writeLocalPlayer(status);
    if (firebaseAdapter) {
      firebaseAdapter.writePlayer(status).catch(() => {
        addAlert("AI player could not update Firebase.", "limit");
      });
    }
    renderAiBoard();
    renderDashboard();
  }

  function markAiFromTranscript(text) {
    const matches = game.matchedTermIndexes(aiState.terms, text);
    if (matches.length === 0) {
      aiStatus.textContent = "No match";
      return;
    }

    const marked = new Set(aiState.marked);
    matches.forEach((index) => marked.add(index));
    aiState.marked = Array.from(marked).sort((a, b) => a - b);
    game.saveBoardState(AI_ID, aiState);
    publishAi();
  }

  function startMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      aiStatus.textContent = "Mic transcript unsupported";
      addAlert("Browser speech recognition is unavailable. Use Chrome or Edge, or paste transcript text.", "limit");
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.addEventListener("result", (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      markAiFromTranscript(transcript);
    });

    recognition.addEventListener("end", () => {
      aiStatus.textContent = "Mic stopped";
    });

    recognition.start();
    aiStatus.textContent = "Listening";
  }

  function stopMic() {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    aiStatus.textContent = "Stopped";
  }

  function resetRound() {
    const confirmed = window.confirm("Reset the game for a new round?");
    if (!confirmed) {
      return;
    }

    round = game.setNewRound();
    game.clearLocalPlayers();
    aiState = game.clearBoard(AI_ID, true);
    knownWinners = new Set();
    winnerAlerts.innerHTML = "";
    ensureDemoPlayers();
    publishAi();
    renderDashboard();

    if (firebaseAdapter) {
      firebaseAdapter.resetRound(round).catch(() => {
        addAlert("Firebase reset failed. Local dashboard was reset.", "limit");
      });
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function setupFirebase() {
    firebaseAdapter = await window.VibeBingoFirebase.createFirebaseAdapter();
    if (!firebaseAdapter) {
      return;
    }

    watchFirebasePlayers();

    firebaseAdapter.watchGame((remoteRound) => {
      if (!remoteRound || !remoteRound.id || remoteRound.id === round.id) {
        return;
      }
      round = remoteRound;
      game.writeJson("round", round);
      aiState = game.getBoardState(AI_ID, round.id);
      knownWinners = new Set();
      winnerAlerts.innerHTML = "";
      watchFirebasePlayers();
      renderAiBoard();
      renderDashboard();
    });
  }

  function watchFirebasePlayers() {
    if (!firebaseAdapter) {
      return;
    }

    if (typeof stopWatchingPlayers === "function") {
      stopWatchingPlayers();
    }

    stopWatchingPlayers = firebaseAdapter.watchPlayers(round.id, (players) => {
      firebasePlayers = players;
      renderDashboard();
    });
  }

  resetButton.addEventListener("click", resetRound);
  aiListenButton.addEventListener("click", startMic);
  aiStopButton.addEventListener("click", stopMic);
  transcriptTestButton.addEventListener("click", () => markAiFromTranscript(transcriptInput.value));

  window.addEventListener("storage", (event) => {
    if (event.key === game.storageKey("playersSignal")) {
      renderDashboard();
    }
    if (event.key === game.storageKey("roundSignal")) {
      round = game.getRound();
      aiState = game.getBoardState(AI_ID, round.id);
      renderAiBoard();
      renderDashboard();
    }
  });

  ensureDemoPlayers();
  renderAiBoard();
  publishAi();
  renderDashboard();
  setupFirebase();
  setInterval(() => {
    ensureDemoPlayers();
    publishAi();
    renderDashboard();
  }, 10000);
})();
