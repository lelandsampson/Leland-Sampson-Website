(function () {
  const STORAGE_PREFIX = "vibeBingo:";
  const BOARD_SIZE = 4;
  const TERMS = [
    "vibe coding",
    "prompt engineering",
    "hallucination",
    "retrieval augmented generation",
    "context window",
    "tokens",
    "embeddings",
    "agentic workflow",
    "guardrails",
    "human in the loop",
    "prompt injection",
    "AI literacy",
    "legal research",
    "citation checking",
    "data governance",
    "responsible AI"
  ];

  const MATCH_ALIASES = {
    "retrieval augmented generation": ["retrieval augmented generation", "rag"],
    "human in the loop": ["human in the loop", "human review", "librarian reviews"],
    "prompt injection": ["prompt injection", "injected prompt"],
    "AI literacy": ["ai literacy", "artificial intelligence literacy"],
    "citation checking": ["citation checking", "check citations", "checking citations"],
    "data governance": ["data governance", "governance"],
    "responsible AI": ["responsible ai", "ethical ai"],
    "hallucination": ["hallucination", "hallucinate", "made up a source", "made-up source"]
  };

  function storageKey(name) {
    return `${STORAGE_PREFIX}${name}`;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(storageKey(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  }

  function makeCardId() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const values = new Uint8Array(4);
    crypto.getRandomValues(values);
    const suffix = Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
    return `Card ${suffix}`;
  }

  function getPlayerId() {
    const key = storageKey("playerId");
    let id = localStorage.getItem(key);
    if (!id) {
      id = makeCardId();
      localStorage.setItem(key, id);
    }
    return id;
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  function getRound() {
    let round = readJson("round", null);
    if (!round) {
      round = createRound();
      writeJson("round", round);
    }
    return round;
  }

  function createRound() {
    return {
      id: `round-${Date.now().toString(36)}`,
      resetAt: Date.now()
    };
  }

  function setNewRound() {
    const round = createRound();
    writeJson("round", round);
    localStorage.setItem(storageKey("roundSignal"), String(round.resetAt));
    return round;
  }

  function getBoardState(ownerId, roundId) {
    const key = `board:${ownerId}`;
    const existing = readJson(key, null);
    if (existing && existing.roundId === roundId && Array.isArray(existing.terms)) {
      return existing;
    }

    const state = {
      roundId,
      terms: shuffle(TERMS),
      marked: []
    };
    writeJson(key, state);
    return state;
  }

  function saveBoardState(ownerId, state) {
    writeJson(`board:${ownerId}`, state);
  }

  function clearBoard(ownerId, reshuffle) {
    const round = getRound();
    const current = getBoardState(ownerId, round.id);
    const state = {
      roundId: round.id,
      terms: reshuffle ? shuffle(TERMS) : current.terms,
      marked: []
    };
    saveBoardState(ownerId, state);
    return state;
  }

  function winningLines() {
    const lines = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      lines.push([0, 1, 2, 3].map((column) => row * BOARD_SIZE + column));
    }
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      lines.push([0, 1, 2, 3].map((row) => row * BOARD_SIZE + column));
    }
    lines.push([0, 5, 10, 15], [3, 6, 9, 12]);
    return lines;
  }

  function analyzeBoard(marked) {
    const markedSet = new Set(marked);
    const lines = winningLines();
    let bestMissing = BOARD_SIZE;
    const winners = [];

    lines.forEach((line) => {
      const missing = line.filter((index) => !markedSet.has(index)).length;
      if (missing === 0) {
        winners.push(line);
      }
      bestMissing = Math.min(bestMissing, missing);
    });

    return {
      hasBingo: winners.length > 0,
      squaresAway: bestMissing,
      winningLines: winners,
      markedCount: markedSet.size
    };
  }

  function playerStatus(id, state, isAI) {
    const analysis = analyzeBoard(state.marked);
    return {
      id,
      roundId: state.roundId,
      lastSeen: Date.now(),
      markedCount: analysis.markedCount,
      squaresAway: analysis.squaresAway,
      hasBingo: analysis.hasBingo,
      isAI: Boolean(isAI)
    };
  }

  function readLocalPlayers() {
    return readJson("players", {});
  }

  function writeLocalPlayer(status) {
    const players = readLocalPlayers();
    players[status.id] = status;
    writeJson("players", players);
    localStorage.setItem(storageKey("playersSignal"), String(Date.now()));
  }

  function clearLocalPlayers() {
    writeJson("players", {});
    localStorage.setItem(storageKey("playersSignal"), String(Date.now()));
  }

  function activePlayers(players, roundId) {
    const config = window.VIBE_BINGO_CONFIG || {};
    const activeWindowMs = config.activeWindowMs || 120000;
    const cutoff = Date.now() - activeWindowMs;
    return Object.values(players)
      .filter((player) => player.roundId === roundId && player.lastSeen >= cutoff)
      .sort((a, b) => a.squaresAway - b.squaresAway || b.markedCount - a.markedCount);
  }

  function normalize(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function matchedTermIndexes(terms, transcript) {
    const normalizedTranscript = ` ${normalize(transcript)} `;
    const matches = [];
    terms.forEach((term, index) => {
      const phrases = MATCH_ALIASES[term] || [term];
      const found = phrases.some((phrase) => normalizedTranscript.includes(` ${normalize(phrase)} `));
      if (found) {
        matches.push(index);
      }
    });
    return matches;
  }

  window.VibeBingo = {
    BOARD_SIZE,
    TERMS,
    storageKey,
    readJson,
    writeJson,
    getPlayerId,
    getRound,
    setNewRound,
    getBoardState,
    saveBoardState,
    clearBoard,
    analyzeBoard,
    playerStatus,
    readLocalPlayers,
    writeLocalPlayer,
    clearLocalPlayers,
    activePlayers,
    matchedTermIndexes
  };
})();

