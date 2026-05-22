# Vibe Coding Bingo Project Plan

## Current Repository State

The workspace now contains a static Jekyll-compatible implementation in local/demo mode.

Implemented files:

- `_config.yml`
- `index.html` for the player bingo card
- `dashboard.html` for the companion presenter dashboard
- `assets/css/bingo.css`
- `assets/js/config.js`
- `assets/js/game.js`
- `assets/js/player.js`
- `assets/js/dashboard.js`
- `assets/js/firebase-adapter.js`
- `README.md`

## Core Concept

The site will host an interactive bingo game for an American Association of Law Libraries presentation about vibe coding. Each visitor gets a randomized bingo board made from AI and legal-tech buzzwords. Their browser keeps track of selected squares, assigns the player a unique identifier, and optionally reports progress to a companion host dashboard.

## Confirmed Game Decisions

- Presentation length: 75 minutes
- Board size: `4x4`
- Expected device: mostly phones
- Winning lines: rows, columns, and diagonals
- Four corners: does not count
- Buzzword distribution: every player gets the same 16 terms in a randomized order
- Player identity: anonymous generated ID, shown on the player's board
- Dashboard visibility: public but unlinked
- Realtime backend: build local/demo mode first; optionally enable Firebase Spark for conference use
- Player cap: limit live Firebase mode to 100 simultaneous players to stay within the Firebase Spark limit
- AI player direction: microphone-based browser transcription with automatic square marking
- Win behavior: alert the dashboard when a human player or AI player wins, but do not stop the game automatically
- Reset behavior: dashboard can reset the game for a second round

## Recommended Board Size

### Option A: 3x3

Best for a short demo, fast audience participation, or a presentation segment under 15 minutes.

Pros:

- Quick to understand
- Easy to win
- Works well on phones
- Good if the talk only mentions a few recurring concepts

Cons:

- Too easy if the talk is long
- Less satisfying as a game
- Fewer buzzwords visible

### Option B: 4x4

Best middle ground for a conference presentation.

Pros:

- More variety than 3x3
- Still fits well on mobile
- Less predictable than 3x3
- Can support multiple win types: row, column, diagonal, four corners

Cons:

- No traditional center free space unless intentionally added
- Slightly less familiar than 5x5 bingo

### Option C: 5x5

Best if you want the game to feel like classic bingo.

Pros:

- Familiar format
- Supports a center free square
- Plenty of room for jokes, jargon, and legal-library-specific terms
- Better for a full-length talk

Cons:

- More crowded on phones
- Harder to win unless the word list is tuned to the presentation

Decision: use `4x4`. Even though the presentation is 75 minutes, most players are expected to use phones, so a smaller board will be easier to read, tap, and complete during the talk.

## Candidate Buzzword Squares

The final game should use exactly 16 terms per card. Every player should receive these same terms, shuffled into a different order.

Draft 16-term set:

- vibe coding
- prompt engineering
- hallucination
- retrieval augmented generation
- context window
- tokens
- embeddings
- agentic workflow
- guardrails
- human in the loop
- prompt injection
- AI literacy
- legal research
- citation checking
- data governance
- responsible AI

Reserve pool or alternates:

- vibe coding
- prompt engineering
- agentic workflow
- hallucination
- retrieval augmented generation
- RAG
- context window
- tokens
- embeddings
- vector database
- model evaluation
- benchmark
- synthetic data
- guardrails
- human in the loop
- chain of thought
- multimodal
- fine tuning
- zero shot
- few shot
- copilots
- AI literacy
- automation
- no code
- low code
- responsible AI
- explainability
- model drift
- training data
- open weights
- proprietary model
- legal research
- citation checking
- access to justice
- metadata
- privacy
- copyright
- terms of service
- data governance
- policy
- prompt injection
- AI disclosure
- shadow AI
- workflow redesign
- productivity

These should probably be edited to match your actual slide deck and speaking notes. The best bingo terms are words you are likely to say, but not all at once.

## Player Page Requirements

The player page should:

- Generate a randomized `4x4` board from the fixed 16-term buzzword list.
- Store the board in `localStorage` so refreshing does not reset the player.
- Generate and persist a unique player identifier in `localStorage`.
- Show the player identifier on the board so a winner can identify their card.
- Let players mark and unmark squares.
- Detect wins across rows, columns, and diagonals.
- Show how many squares the player is away from the nearest winning line.
- Report status to the companion page if a realtime backend is configured.

## Unique Player Identifier

Each browser can receive a durable ID on first visit:

```js
const playerId = localStorage.getItem("vibeBingoPlayerId") || crypto.randomUUID();
localStorage.setItem("vibeBingoPlayerId", playerId);
```

That gives each page instance a unique identifier without requiring login. It will persist on that browser and device until local storage is cleared.

For a friendlier dashboard, the app could also generate a short display name:

- `Player 1842`
- `Table 07`
- `Blue Card`
- `Card A7Q9`

Decision: use a generated card-style ID such as `Card A7Q9`, and display it prominently on the player's board.

## Companion Dashboard Challenge

A purely static GitHub Pages site cannot count active players by itself because GitHub Pages does not run server-side code. The player page can generate IDs locally, but the host dashboard needs a shared place where browsers can write and read live game state.

Recommended options:

### Option A: Firebase Realtime Database or Firestore

Good fit for live counters. The browser can write player state directly using constrained security rules.

Tracks:

- player ID
- last seen timestamp
- selected square count
- nearest distance to bingo
- bingo status
- optional display name

Why it fits this project:

- It is designed for realtime browser updates.
- It works well from static sites such as GitHub Pages.
- The dashboard can update instantly as players tap squares.
- You do not need to run your own server.

Main concern:

- It requires creating a Firebase project and configuring database security rules carefully enough that random visitors can only write limited bingo status data.

### Option B: Supabase

Good fit if you prefer a SQL database and may later want analytics.

Tracks the same fields as Firebase, with row-level security policies.

Why it fits this project:

- It uses a familiar table/database model.
- It has realtime subscriptions.
- It is better if you later want reports, exports, or structured analytics.

Main concern:

- The setup is a little more database-oriented than Firebase, so it may feel less direct for a first realtime web demo.

### Option C: GitHub Issues, Gists, or Repository Writes

Not recommended for live play. Authentication, rate limits, and public write access make this awkward for a conference audience.

### Option D: Local-only Demo Mode

The dashboard can simulate several players for the presentation demo. This keeps the site fully static, but it will not reflect real audience activity.

Decision: build local/demo mode first, with Firebase Realtime Database as an optional conference mode.

Firebase conference mode should target the no-cost Spark plan only. Because Spark allows 100 simultaneous Realtime Database connections, the game should enforce a 100-active-player cap. If the cap is reached, new visitors should see a polite "room is full" message and can still play locally without appearing on the dashboard.

## Firebase vs Supabase in Plain Terms

For this bingo game, both services solve the same core problem: GitHub Pages can display pages, but it cannot remember live player activity for everyone. Firebase or Supabase would act as the shared notebook that every player's browser can update and the dashboard can read.

Firebase is usually the simpler choice for this specific use case. The data can look like a live JSON object:

```json
{
  "players": {
    "card-a7q9": {
      "lastSeen": 1779462000000,
      "markedCount": 6,
      "squaresAway": 1,
      "hasBingo": false
    }
  }
}
```

Supabase is more like a hosted spreadsheet/database table:

```text
players
id          last_seen              marked_count   squares_away   has_bingo
card-a7q9   2026-05-22 14:20:00    6              1              false
```

For a conference demo, Firebase is probably less work. Supabase is attractive if the project may grow into a more formal data app later.

Either way, the public website should not contain secret admin keys. The browser can use public project keys, but permissions must be limited by backend rules.

## Local/Demo Mode

Local/demo mode should be the first implementation target. It keeps the whole project static and avoids any Firebase dependency while the UI, board logic, dashboard, and AI player are being tested.

In local/demo mode:

- The player page works entirely in the browser.
- The dashboard shows simulated players.
- The dashboard can include the real AI player if opened on the presenter machine.
- No live audience state is shared across devices.
- No backend setup or cost is involved.

This mode is useful for:

- Development
- Rehearsal
- A fallback if conference Wi-Fi or Firebase setup is unavailable
- Demonstrating the game mechanics without collecting live audience data

## Firebase Spark Conference Mode

Firebase mode should be controlled by configuration, not by rewriting the app.

Suggested config:

```js
window.VIBE_BINGO_CONFIG = {
  mode: "demo", // "demo" or "firebase"
  maxActivePlayers: 100,
  firebase: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: ""
  }
};
```

In Firebase mode:

- The app should count active players seen within the last 60 to 120 seconds.
- If there are fewer than 100 active players, a player can join the live dashboard.
- If there are already 100 active players, the player can still play locally but should not write to Firebase.
- The dashboard should show the active-player count and make it obvious when the live room is full.
- The app should avoid writing unnecessary data to Firebase.

Firebase data should be small and minimal:

```json
{
  "game": {
    "roundId": "round-001",
    "resetAt": 1779462000000
  },
  "players": {
    "card-a7q9": {
      "roundId": "round-001",
      "lastSeen": 1779462000000,
      "markedCount": 6,
      "squaresAway": 1,
      "hasBingo": false,
      "isAI": false
    },
    "ai-player": {
      "roundId": "round-001",
      "lastSeen": 1779462000000,
      "markedCount": 8,
      "squaresAway": 0,
      "hasBingo": true,
      "isAI": true
    }
  }
}
```

## Dashboard Page Requirements

The companion dashboard should show:

- Number of active players
- Number of players with bingo
- Each active player/card ID
- How many squares each player is away from winning
- A sorted list of closest players
- Last updated time
- Alerts when a player wins
- A reset control for starting a new round

Suggested display logic:

- Active player: seen in the last 60 to 120 seconds
- Almost there: 1 square away
- Bingo: any completed winning line

Decision: the dashboard can be public but unlinked. It does not need password protection or authentication for viewers.

## Win Alerts

When any player completes a winning line, including the AI player:

- The player page should show that the card has bingo.
- The player status should update with `hasBingo: true`.
- The dashboard should display a visible alert with the winning card ID.
- The dashboard should distinguish the AI player from human anonymous card IDs.
- The game should continue running.
- Other players should be able to keep marking squares.
- Additional winners should continue to appear.

The dashboard should not automatically reset, lock, or stop the round when someone wins.

## Dashboard Reset

The dashboard needs a reset feature so the presenter can start a second round.

In local/demo mode:

- Reset should clear simulated player state.
- Reset should reset the AI player board and transcript matches.
- Reset should create a new local `roundId`.

In Firebase mode:

- Reset should update a shared `roundId` or `resetAt` timestamp.
- Player pages should detect the reset and clear their marked squares.
- Player pages should keep the same generated card ID unless the user clears browser storage.
- Player pages should reshuffle the same 16 terms for the new round.
- The dashboard should clear prior win alerts or move them into a previous-round area.

The reset control should be deliberate enough to avoid accidental use, such as a confirmation dialog.

## AI Player Ideas

### Simple AI Player: Transcript Keyword Matching

The AI player receives a live or pasted transcript and marks squares when buzzwords appear.

Implementation approaches:

- Browser Web Speech API for live microphone transcription
- Manual paste box for transcript chunks
- Upload or paste a transcript after the talk for replay mode

Decision direction: start with microphone-based browser transcription and automatic square marking.

This can be done mostly client-side, but Web Speech API support varies by browser. Chrome and Edge are the safest targets. Safari and Firefox support may be limited or inconsistent.

For the first version, the AI player should probably use keyword and phrase matching rather than calling an external AI model. That keeps the demo static-site-friendly and avoids needing API keys during the presentation.

The AI player should have its own board, generated from the same 16 terms. When a transcript phrase matches a square, that square is marked automatically.

The AI player should report status like any other player, with `isAI: true`. If the AI completes a winning line, the dashboard should show the alert, but the game should continue.

## Surface Pro 7 Local Transcription Notes

The presenter machine may be a Surface Pro 7. That device can plausibly run lightweight local transcription, but the model choice should be conservative.

Surface Pro 7 hardware varies, but Microsoft lists 10th-generation Intel Core options with 4 GB, 8 GB, or 16 GB RAM. It is not a good target for larger speech models during a live presentation, especially while also running a browser, slides, and the dashboard.

Important distinction: the current browser microphone feature uses the Web Speech API. That is convenient, but it should not be treated as true local/offline transcription. In some browsers, speech recognition is handled by a server-based recognition engine, meaning audio may be sent to a web service and may not work offline.

Recommended local model path:

- First choice: `whisper-tiny.en`
- Better accuracy if the Surface Pro 7 is an i5/i7 model with 8 GB or 16 GB RAM: `whisper-base.en`
- Avoid for live use on this device: `small`, `medium`, `large`, and `turbo`

For this bingo game, transcript quality does not need to be perfect. The AI player only needs enough text to catch phrases such as `prompt engineering`, `hallucination`, `vibe coding`, and `retrieval augmented generation`. That makes `whisper-tiny.en` a practical first target.

Suggested implementation approach:

1. Keep the current Web Speech API microphone path as the simplest option.
2. Add a true local transcription mode using Transformers.js with `onnx-community/whisper-tiny.en`.
3. Use WebGPU when available, with a CPU/WASM fallback if performance is acceptable.
4. Keep the pasted transcript box as the emergency backup during the live talk.

Sources to revisit during implementation:

- Microsoft Surface Pro 7 specs: `https://support.microsoft.com/en-us/surface/models/surface-pro-7-specs-and-features`
- OpenAI Whisper model table: `https://github.com/openai/whisper/blob/main/README.md`
- Transformers.js WebGPU Whisper guide: `https://huggingface.co/docs/transformers.js/en/guides/webgpu`
- MDN Web Speech API notes: `https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API`

### Better AI Player: Semantic Matching

Instead of only exact keywords, the AI player can decide that a phrase matches a square semantically.

Examples:

- Transcript says "the model made up a source" and the AI marks `hallucination`.
- Transcript says "we searched our document collection before answering" and the AI marks `retrieval augmented generation`.
- Transcript says "a librarian reviews the generated answer" and the AI marks `human in the loop`.

This likely requires an API call to a model or embedding service, which means the static site should not expose private API keys directly. A serverless function would be needed.

This is better treated as a later enhancement after the basic microphone transcript flow is working.

### Replay AI Player

For a polished demo, provide a transcript file and let the AI player "listen" at accelerated speed.

Pros:

- Reliable during a live presentation
- No microphone permission issues
- Easy to test
- Great for showing the concept without depending on live transcription quality

### Human-Approved AI Player

The AI suggests squares as transcript text arrives, but the presenter or moderator approves them.

Pros:

- Safer and funnier
- Avoids questionable auto-marks
- Good for explaining why AI systems need human review

Decision: do not require approval in the first version. The AI player should auto-mark squares.

## Suggested First Build

Build in this order:

1. Static Jekyll player page with a generated `4x4` board.
2. Local win detection and "squares away" calculation.
3. Local dashboard demo mode with simulated players, winner alerts, and reset.
4. Host-only AI player panel using browser microphone transcription.
5. Firebase Realtime Database integration behind a config flag.
6. Firebase Spark guardrails: 100-active-player cap and minimal writes.

## Open Questions

1. Should the AI player be visible to attendees, or only visible on the presenter dashboard?
2. Should this project include AALL/conference styling, or stay visually neutral?
3. Do you want the final 16 buzzwords to match your slide deck more closely than the draft list above?
4. On reset, should the player's board reshuffle, or should the same card layout restart with all marks cleared?
