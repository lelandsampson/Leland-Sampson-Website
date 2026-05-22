(function () {
  async function createFirebaseAdapter() {
    const config = window.VIBE_BINGO_CONFIG || {};
    const firebaseConfig = config.firebase || {};
    const required = ["apiKey", "authDomain", "databaseURL", "projectId"];
    const configured = required.every((key) => Boolean(firebaseConfig[key]));

    if (config.mode !== "firebase" || !configured) {
      return null;
    }

    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const dbModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js");
    const app = appModule.initializeApp(firebaseConfig);
    const database = dbModule.getDatabase(app);

    function refs(roundId) {
      return {
        game: dbModule.ref(database, "game"),
        players: dbModule.ref(database, `players/${roundId}`)
      };
    }

    return {
      async canJoin(roundId) {
        const snapshot = await dbModule.get(refs(roundId).players);
        const players = snapshot.val() || {};
        const active = window.VibeBingo.activePlayers(players, roundId);
        return active.length < (config.maxActivePlayers || 100);
      },
      async writePlayer(status) {
        const playerRef = dbModule.ref(database, `players/${status.roundId}/${status.id}`);
        await dbModule.set(playerRef, status);
      },
      watchPlayers(roundId, callback) {
        const playersRef = refs(roundId).players;
        return dbModule.onValue(playersRef, (snapshot) => callback(snapshot.val() || {}));
      },
      watchGame(callback) {
        const gameRef = dbModule.ref(database, "game");
        return dbModule.onValue(gameRef, (snapshot) => callback(snapshot.val() || null));
      },
      async resetRound(round) {
        await dbModule.set(refs(round.id).game, round);
      }
    };
  }

  window.VibeBingoFirebase = { createFirebaseAdapter };
})();

