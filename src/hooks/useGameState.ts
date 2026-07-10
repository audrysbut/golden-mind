import { useState, useCallback, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { GameState, Player, Question, Message, ChatMessage } from '../types'
import { getQuestions, checkAnswer, isCloseAnswer } from '../utils/questions'

const ROUND_DURATION = 120
const TOTAL_ROUNDS = 5
const HINT_TIMES = [0, 40, 80]
const TIMER_SYNC_INTERVAL = 1000

interface UseGameStateOptions {
  isHost: boolean
  playerId: string
  playerName: string
  players: Player[]
  sendToAll: (message: Message) => void
  sendToHost: (message: Message) => void
}

interface UseGameStateReturn {
  gameState: GameState
  handleMessage: (message: Message, senderId: string) => void
  startGame: () => void
  submitGuess: (text: string) => void
  sendChatMessage: (text: string) => void
  resetGame: () => void
}

function createInitialState(): GameState {
  return {
    phase: 'lobby',
    round: 0,
    totalRounds: TOTAL_ROUNDS,
    currentQuestion: null,
    hintsRevealed: 0,
    players: [],
    hostId: '',
    messages: [],
    timeRemaining: 0,
    currentAnswers: [],
  }
}

function pointsForHints(hintsRevealed: number): number {
  switch (hintsRevealed) {
    case 0: return 5
    case 1: return 3
    case 2: return 2
    default: return 0
  }
}

export default function useGameState(options: UseGameStateOptions): UseGameStateReturn {
  const { isHost, playerId, playerName, players, sendToAll, sendToHost } = options

  const [gameState, setGameState] = useState<GameState>(createInitialState)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionsRef = useRef<Question[]>([])
  const hostStateRef = useRef<GameState | null>(null)

  const addMessage = useCallback((type: ChatMessage['type'], text: string, pid?: string, pname?: string): ChatMessage => {
    return { id: uuidv4(), type, text, timestamp: Date.now(), playerId: pid, playerName: pname }
  }, [])

  const broadcastState = useCallback((state: GameState) => {
    sendToAll({ type: 'game-state', state })
  }, [sendToAll])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const endRound = useCallback((state: GameState) => {
    clearTimer()
    const newState: GameState = {
      ...state,
      phase: 'roundEnd',
      timeRemaining: 0,
    }
    if (state.currentQuestion) {
      const revealMsg = addMessage('system', `The answer was: ${state.currentQuestion.answer}`)
      newState.messages = [...newState.messages, revealMsg]
    }
    sendToAll({ type: 'round-end', answer: state.currentQuestion?.answer ?? '', players: newState.players })
    setGameState(newState)
    broadcastState(newState)
    hostStateRef.current = newState
  }, [clearTimer, addMessage, sendToAll, broadcastState])

  const startRound = useCallback((roundNum: number, questions: Question[]) => {
    const question = questions[roundNum - 1]
    const base = hostStateRef.current!
    const roundMsg = addMessage('system', `Round ${roundNum}/${TOTAL_ROUNDS} - Category: ${question.category}`)
    const hint1Msg = addMessage('system', `Hint 1: ${question.hints[0]}`)

    const newState: GameState = {
      ...base,
      phase: 'playing',
      round: roundNum,
      currentQuestion: question,
      hintsRevealed: 0,
      timeRemaining: ROUND_DURATION,
      currentAnswers: [],
      players: base.players.map(p => ({ ...p, guessedCorrectly: false })),
      messages: [...base.messages, roundMsg, hint1Msg],
    }
    setGameState(newState)
    broadcastState(newState)
    hostStateRef.current = newState

    clearTimer()
    let secondsElapsed = 0
    timerRef.current = setInterval(() => {
      secondsElapsed++
      const remaining = ROUND_DURATION - secondsElapsed
      const current = hostStateRef.current
      if (!current || current.phase !== 'playing') return

      let hints = current.hintsRevealed
      let msgs = current.messages

      if (secondsElapsed >= HINT_TIMES[1] && hints < 1) {
        hints = 1
        const hMsg = addMessage('system', `Hint 2: ${question.hints[1]}`)
        msgs = [...msgs, hMsg]
      }
      if (secondsElapsed >= HINT_TIMES[2] && hints < 2) {
        hints = 2
        const hMsg = addMessage('system', `Hint 3: ${question.hints[2]}`)
        msgs = [...msgs, hMsg]
      }

      const updated: GameState = { ...current, timeRemaining: remaining, hintsRevealed: hints, messages: msgs }
      hostStateRef.current = updated
      setGameState(updated)
      broadcastState(updated)

      if (remaining <= 0) {
        clearTimer()
        endRound(updated)
      }
    }, TIMER_SYNC_INTERVAL)
  }, [addMessage, broadcastState, clearTimer, endRound, sendToAll])

  const startGame = useCallback(() => {
    if (!isHost) return
    const questions = getQuestions(TOTAL_ROUNDS)
    questionsRef.current = questions
    const initialState: GameState = {
      phase: 'lobby',
      round: 0,
      totalRounds: TOTAL_ROUNDS,
      currentQuestion: null,
      hintsRevealed: 0,
      players: players.map(p => ({ ...p, guessedCorrectly: false, points: 0, roundsWon: 0 })),
      hostId: playerId,
      messages: [],
      timeRemaining: 0,
      currentAnswers: [],
    }
    const msg = addMessage('system', 'Game started! Get ready!')

    const stateWithMsg: GameState = { ...initialState, messages: [msg] }
    setGameState(stateWithMsg)
    hostStateRef.current = stateWithMsg
    broadcastState(stateWithMsg)

    setTimeout(() => {
      startRound(1, questions)
    }, 3000)
  }, [isHost, players, playerId, addMessage, broadcastState, sendToAll, startRound])

  const submitGuess = useCallback((text: string, senderPlayerId?: string, senderPlayerName?: string) => {
    const state = hostStateRef.current
    if (!state || state.phase !== 'playing') return
    const question = state.currentQuestion
    if (!question) return

    const actualPlayerId = senderPlayerId ?? playerId
    const actualPlayerName = senderPlayerName ?? playerName
    const player = state.players.find(p => p.id === actualPlayerId)
    if (!player) return

    const alreadyCorrect = player.guessedCorrectly
    const correct = checkAnswer(question, text)
    const points = correct && !alreadyCorrect ? pointsForHints(state.hintsRevealed) : 0

    if (correct) {
      const updatedPlayers = state.players.map(p =>
        p.id === actualPlayerId
          ? { ...p, points: p.points + points, guessedCorrectly: true, roundsWon: p.roundsWon + (points > 0 ? 1 : 0) }
          : p
      )
      const msgText = alreadyCorrect
        ? `${actualPlayerName} guessed: ${text} (already correct!)`
        : `${actualPlayerName} guessed correctly! (+${points} pts)`
      const msgType = alreadyCorrect ? 'player' as const : 'correct' as const
      const answer: ChatMessage = addMessage(msgType, msgText, actualPlayerId, actualPlayerName)
      const newState: GameState = {
        ...state,
        players: updatedPlayers,
        currentAnswers: [...state.currentAnswers, { playerId: actualPlayerId, playerName: actualPlayerName, answer: text, correct, pointsEarned: points }],
        messages: [...state.messages, answer],
      }

      if (!alreadyCorrect) {
        const allCorrect = updatedPlayers.every(p => p.guessedCorrectly)
        if (allCorrect) {
          endRound(newState)
          return
        }
      }

      hostStateRef.current = newState
      setGameState(newState)
      broadcastState(newState)
      sendToAll({ type: 'guess-result', playerId: actualPlayerId, playerName: actualPlayerName, text, correct, pointsEarned: points })
    } else {
      const close = !alreadyCorrect && isCloseAnswer(question, text)
      const msgType = alreadyCorrect ? 'player' as const : close ? 'close' as const : 'wrong' as const
      const answer: ChatMessage = addMessage(msgType, close ? `${actualPlayerName} is very close!` : `${actualPlayerName} guessed: ${text}`, actualPlayerId, actualPlayerName)
      const newState: GameState = {
        ...state,
        currentAnswers: [...state.currentAnswers, { playerId: actualPlayerId, playerName: actualPlayerName, answer: text, correct, pointsEarned: 0 }],
        messages: [...state.messages, answer],
      }
      hostStateRef.current = newState
      setGameState(newState)
      broadcastState(newState)
      sendToAll({ type: 'guess-result', playerId: actualPlayerId, playerName: actualPlayerName, text, correct, pointsEarned: 0 })
    }
  }, [playerId, playerName, addMessage, broadcastState, sendToAll, endRound])

  const sendChatMessage = useCallback((text: string) => {
    if (isHost) {
      submitGuess(text)
    } else {
      sendToHost({ type: 'guess', playerId, playerName, text })
    }
  }, [isHost, playerId, playerName, sendToHost, submitGuess])

  const resetGame = useCallback(() => {
    clearTimer()
    questionsRef.current = []
    hostStateRef.current = null
    const fresh = createInitialState()
    setGameState(fresh)
    if (isHost) {
      broadcastState(fresh)
    }
  }, [clearTimer, isHost, broadcastState])

  const handleMessage = useCallback((message: Message, _senderId: string) => {
    if (message.type === 'game-state') {
      setGameState(message.state)
      if (isHost) {
        hostStateRef.current = message.state
      }
      return
    }
    if (message.type === 'guess' && isHost) {
      submitGuess(message.text, message.playerId, message.playerName)
    }
  }, [isHost, submitGuess])

  useEffect(() => {
    if (!isHost) return
    if (gameState.phase === 'roundEnd' && gameState.round < TOTAL_ROUNDS) {
      const timeout = setTimeout(() => {
        startRound(gameState.round + 1, questionsRef.current)
      }, 4000)
      return () => clearTimeout(timeout)
    }
    if (gameState.phase === 'roundEnd' && gameState.round >= TOTAL_ROUNDS) {
      const timeout = setTimeout(() => {
        clearTimer()
        const endState: GameState = { ...gameState, phase: 'gameOver' }
        setGameState(endState)
        broadcastState(endState)
        sendToAll({ type: 'game-over', players: endState.players })
      }, 4000)
      return () => clearTimeout(timeout)
    }
  }, [isHost, gameState.phase, gameState.round, startRound, clearTimer, broadcastState, sendToAll])

  return {
    gameState,
    handleMessage,
    startGame,
    submitGuess,
    sendChatMessage,
    resetGame,
  }
}
