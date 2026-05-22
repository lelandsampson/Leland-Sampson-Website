# Vibe Coding Bingo

Mobile-first bingo game for a 75-minute AALL presentation about vibe coding.

## Pages

- `index.html`: player bingo card
- `dashboard.html`: presenter dashboard, simulated demo players, AI player, and round reset
- `PROJECT_PLAN.md`: planning notes, requirements, and future Firebase notes

## Current Mode

The app currently runs in local/demo mode. It does not require a backend, account, API key, or paid service.

In demo mode:

- Each player gets a generated card ID.
- Each player gets the same 16 terms in a shuffled order.
- The dashboard shows simulated players.
- The AI player can auto-mark squares from pasted transcript text.
- Browser microphone transcription is available where supported, usually Chrome or Edge.
- Reset starts a new round, clears marks, reshuffles boards, and keeps card IDs.

## Run Locally

From this folder:

```powershell
python -m http.server 4000
```

Then open:

- Player page: `http://localhost:4000/index.html`
- Dashboard: `http://localhost:4000/dashboard.html`

The files are static and are compatible with GitHub Pages/Jekyll hosting.

## Firebase Conference Mode

Firebase is intentionally disabled for now. To prepare for conference mode, edit `assets/js/config.js`:

```js
window.VIBE_BINGO_CONFIG = {
  mode: "firebase",
  maxActivePlayers: 100,
  activeWindowMs: 120000,
  firebase: {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project"
  }
};
```

The app is designed to stay within Firebase Spark's 100 simultaneous Realtime Database connection limit. If the room is full, additional visitors can still play locally, but they will not appear on the live dashboard.

