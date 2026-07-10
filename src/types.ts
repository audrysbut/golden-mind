export interface Question {
  id: number
  answer: string
  acceptableAnswers: string[]
  hints: string[]
  category: string
}

export interface Player {
  id: string
  name: string
  points: number
  isHost: boolean
  guessedCorrectly: boolean
  roundsWon: number
}

export type GamePhase = 'lobby' | 'playing' | 'roundEnd' | 'gameOver'

export interface GameState {
  phase: GamePhase
  round: number
  totalRounds: number
  currentQuestion: Question | null
  hintsRevealed: number
  players: Player[]
  hostId: string
  messages: ChatMessage[]
  timeRemaining: number
  currentAnswers: PlayerAnswer[]
  hintVotes: string[]
}

export interface ChatMessage {
  id: string
  type: 'system' | 'player' | 'correct' | 'wrong' | 'close'
  playerId?: string
  playerName?: string
  text: string
  timestamp: number
}

export interface PlayerAnswer {
  playerId: string
  playerName: string
  answer: string
  correct: boolean
  pointsEarned: number
}

export type Message =
  | { type: 'join'; playerName: string; playerId: string }
  | { type: 'player-joined'; player: Player }
  | { type: 'player-left'; playerId: string }
  | { type: 'start-game' }
  | { type: 'game-state'; state: GameState }
  | { type: 'guess'; playerId: string; playerName: string; text: string }
  | { type: 'guess-result'; playerId: string; playerName: string; text: string; correct: boolean; pointsEarned: number }
  | { type: 'hint-reveal'; hintsRevealed: number }
  | { type: 'chat-message'; message: ChatMessage }
  | { type: 'round-end'; answer: string; players: Player[] }
  | { type: 'game-over'; players: Player[] }
  | { type: 'timer-sync'; timeRemaining: number }
  | { type: 'hint-vote'; playerId: string; playerName: string }
  | { type: 'ping' }
  | { type: 'pong' }
