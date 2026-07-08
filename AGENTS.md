# Golden Mind

A multiplayer trivia party game built with Vite + React 19 + TypeScript + PeerJS. Hosted on GitHub Pages.

## How to run

```bash
npm run dev    # dev server
npm run build  # typecheck + production build
npm run deploy # push dist/ to gh-pages branch
```

Deployment is automated via `.github/workflows/deploy.yml` — pushes to `main` auto-deploy to GitHub Pages.

## Game overview

- **5 rounds**, 120 seconds each
- 1 secret answer per round (person, city, landmark, etc.)
- **3 hints auto-reveal** at 0s, 40s, 80s
- Players type guesses in a **chat window** — round continues after correct guesses
- **Scoring**: 5pts (0 hints), 3pts (1 hint), 2pts (2 hints), 0pts (all hints revealed)
- Each player scores at most once per round
- **Solo mode** available from main menu (same flow, no WebRTC)
- **Multiplayer** via PeerJS WebRTC (star topology: host is central peer)

## Project structure

```
src/
├── App.tsx                     # Screen orchestrator (home → lobby → game)
├── main.tsx                    # Entry point
├── index.css                   # Dark theme, gradients, animations
├── types.ts                    # GameState, Player, Question, Message, ChatMessage
├── data/questions.json         # 114 questions across 8 categories
├── hooks/
│   ├── usePeerConnection.ts    # PeerJS host/join, message passing, disconnection
│   └── useGameState.ts         # Game state machine, timer, scoring, broadcasting
├── components/
│   ├── HomeScreen.tsx          # Name input, solo/multiplayer choice, join form
│   ├── Lobby.tsx               # Player list, invite link copy, start button
│   └── GameScreen.tsx          # Timer, hints, chat, scoreboard, game over
└── utils/
    └── questions.ts            # getQuestions(count), checkAnswer(question, guess)
```

## Key architecture decisions

- **Host is authority**: all game state originates from host and is broadcast via `game-state` messages every second during gameplay
- **Chat as answer channel**: players type guesses in chat — host validates against `acceptableAnswers[]`, broadcasts result
- **Double-point prevention**: `submitGuess` checks `player.guessedCorrectly` before awarding points
- **Joiner screen transition**: `useEffect` in `App.tsx` watches `gameState.phase` to transition joiners from lobby to game screen

## State machine

`lobby → playing → roundEnd → (repeat 5x) → gameOver`

## PeerJS communication

Star topology with host as central node. Message types:
- `join` / `player-joined` / `player-left` — lobby
- `game-state` — full state sync (broadcast every second during play)
- `guess` — joiner → host
- `guess-result` — host → all (correct/wrong + points)
- `hint-reveal` — host → all
- `round-end` / `game-over` — host → all

## Question format

```json
{
  "id": 1,
  "answer": "Albert Einstein",
  "acceptableAnswers": ["einstein", "albert einstein"],
  "hints": ["subtle hint", "medium hint", "very obvious hint"],
  "category": "Famous Person"
}
```

Categories: Famous Person (20), City (20), Country (15), Movie (15), Landmark (12), Animal (10), Invention (12), Book (10) — 114 total.

## Code style

- Functional components with hooks (not class-based)
- No comments in code
- TypeScript strict mode
- No external state management library (React state + refs)
