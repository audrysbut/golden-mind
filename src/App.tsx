import { useState, useCallback, useEffect, useRef } from 'react'
import usePeerConnection from './hooks/usePeerConnection'
import useGameState from './hooks/useGameState'
import HomeScreen from './components/HomeScreen'
import Lobby from './components/Lobby'
import GameScreen from './components/GameScreen'
import type { Message, GameState } from './types'
import { getQuestions, checkAnswer } from './utils/questions'
import { v4 as uuidv4 } from 'uuid'

const TOTAL_ROUNDS = 5
const ROUND_DURATION = 120
const HINT_TIMES = [0, 40, 80]

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const initialRoomId = params.get('room')

  const [screen, setScreen] = useState<'home' | 'lobby' | 'game'>('home')
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { peerState, createRoom, joinRoom, sendToAll, sendToHost, onMessage } = usePeerConnection()

  const isHost = peerState.isHost
  const peerId = peerState.peerId || ''
  const players = peerState.players

  const {
    gameState,
    handleMessage,
    startGame: hostStartGame,
    sendChatMessage,
  } = useGameState({
    isHost,
    playerId: peerId,
    playerName,
    players,
    sendToAll,
    sendToHost,
  })

  useEffect(() => {
    onMessage((message: Message, senderId: string) => {
      handleMessage(message, senderId)
    })
  }, [onMessage, handleMessage])

  const handleCreateRoom = useCallback((name: string) => {
    setPlayerName(name)
    setError(null)
    try {
      const roomId = createRoom(name)
      if (roomId) {
        setScreen('lobby')
        const url = `${window.location.origin}/golden-mind/?room=${roomId}`
        window.history.replaceState(null, '', url)
      }
    } catch (err) {
      setError('Failed to create room. Please try again.')
    }
  }, [createRoom])

  const handleJoinRoom = useCallback((name: string, roomId: string) => {
    setPlayerName(name)
    setError(null)
    try {
      joinRoom(roomId, name)
      setScreen('lobby')
    } catch (err) {
      setError('Failed to join room. Please check the room ID.')
    }
  }, [joinRoom])

  const handleStartSolo = useCallback((name: string) => {
    setPlayerName(name)
    setScreen('game')

    const playerId = uuidv4()
    const questions = getQuestions(TOTAL_ROUNDS)
    const soloState: GameState = {
      phase: 'playing',
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      currentQuestion: questions[0],
      hintsRevealed: 0,
      players: [{ id: playerId, name, points: 0, isHost: true, guessedCorrectly: false, roundsWon: 0 }],
      hostId: playerId,
      messages: [
        { id: uuidv4(), type: 'system' as const, text: 'Solo Practice - Good luck!', timestamp: Date.now() },
        { id: uuidv4(), type: 'system' as const, text: `Round 1 - Category: ${questions[0].category}`, timestamp: Date.now() },
        { id: uuidv4(), type: 'system' as const, text: `Hint 1: ${questions[0].hints[0]}`, timestamp: Date.now() },
      ],
      timeRemaining: ROUND_DURATION,
      currentAnswers: [],
    }

    hostedGameRef.current = { questions, round: 1, state: soloState, timer: 0 }
    setSoloGameState(soloState)
    startSoloTimer()
  }, [])

  const [soloGameState, setSoloGameState] = useState<GameState | null>(null)
  const hostedGameRef = useRef<any>(null)
  const soloTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startSoloTimer = useCallback(() => {
    if (soloTimerRef.current) clearInterval(soloTimerRef.current)
    soloTimerRef.current = setInterval(() => {
      setSoloGameState((prev: GameState | null) => {
        if (!prev || prev.phase !== 'playing') return prev
        const remaining = prev.timeRemaining - 1
        const elapsed = ROUND_DURATION - remaining
        let hintsRevealed = prev.hintsRevealed

        if (elapsed >= HINT_TIMES[1] && hintsRevealed < 1) {
          hintsRevealed = 1
        }
        if (elapsed >= HINT_TIMES[2] && hintsRevealed < 2) {
          hintsRevealed = 2
        }

        if (remaining <= 0) {
          clearInterval(soloTimerRef.current!)
          return {
            ...prev,
            timeRemaining: 0,
            hintsRevealed,
            phase: 'roundEnd' as const,
            messages: [...prev.messages, {
              id: uuidv4(), type: 'system' as const,
              text: `The answer was: ${prev.currentQuestion!.answer}`,
              timestamp: Date.now(),
            }],
          }
        }

        return { ...prev, timeRemaining: remaining, hintsRevealed }
      })
    }, 1000)
  }, [])

  const handleSoloGuess = useCallback((text: string) => {
    setSoloGameState((prev: GameState | null) => {
      if (!prev || prev.phase !== 'playing') return prev
      const player = prev.players[0]
      if (!player) return prev
      const alreadyCorrect = player.guessedCorrectly
      const question = prev.currentQuestion!
      const correct = checkAnswer(question, text)
      const points = correct && !alreadyCorrect
        ? (prev.hintsRevealed === 0 ? 5 : prev.hintsRevealed === 1 ? 3 : prev.hintsRevealed === 2 ? 2 : 0)
        : 0

      const msgType = correct ? 'correct' as const : 'wrong' as const
      const msgText = correct && !alreadyCorrect
        ? `You guessed correctly! (+${points} pts)`
        : correct ? `You guessed: ${text} (already correct!)` : `You guessed: ${text}`

      return {
        ...prev,
        players: [{ ...player, points: player.points + points, guessedCorrectly: player.guessedCorrectly || correct }],
        messages: [...prev.messages, { id: uuidv4(), type: msgType, text: msgText, timestamp: Date.now() }],
        currentAnswers: [...prev.currentAnswers, { playerId: player.id, playerName: player.name, answer: text, correct, pointsEarned: points }],
      }
    })
  }, [])

  useEffect(() => {
    if (!soloGameState || soloGameState.phase !== 'roundEnd') return
    if (soloGameState.round < TOTAL_ROUNDS) {
      const timeout = setTimeout(() => {
        const nextRound = soloGameState.round + 1
        const questions = hostedGameRef.current?.questions
        const q = questions[nextRound - 1]
        setSoloGameState((prev: GameState | null) => {
          if (!prev) return prev
          return {
            ...prev,
            phase: 'playing',
            round: nextRound,
            currentQuestion: q,
            hintsRevealed: 0,
            timeRemaining: ROUND_DURATION,
            currentAnswers: [],
            players: prev.players.map(p => ({ ...p, guessedCorrectly: false })),
            messages: [
              ...prev.messages,
              { id: uuidv4(), type: 'system' as const, text: `Round ${nextRound} - Category: ${q.category}`, timestamp: Date.now() },
              { id: uuidv4(), type: 'system' as const, text: `Hint 1: ${q.hints[0]}`, timestamp: Date.now() },
            ],
          }
        })
        startSoloTimer()
      }, 4000)
      return () => clearTimeout(timeout)
    }
    if (soloGameState.round >= TOTAL_ROUNDS) {
      const timeout = setTimeout(() => {
        setSoloGameState((prev: GameState | null) => {
          if (!prev) return prev
          return { ...prev, phase: 'gameOver' }
        })
      }, 4000)
      return () => clearTimeout(timeout)
    }
  }, [soloGameState?.phase, soloGameState?.round, startSoloTimer])

  const handleStartGame = useCallback(() => {
    hostStartGame()
    setScreen('game')
  }, [hostStartGame])

  const handleSendGuess = useCallback((text: string) => {
    if (peerState.isHost || peerState.connections.length > 0) {
      sendChatMessage(text)
    } else {
      handleSoloGuess(text)
    }
  }, [peerState, sendChatMessage, handleSoloGuess])

  const displayState = isHost || peerState.connections.length > 0 ? gameState : soloGameState

  if (screen === 'home') {
    return (
      <HomeScreen
        onStartSolo={handleStartSolo}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        error={error || peerState.error}
        initialRoomId={initialRoomId ?? undefined}
      />
    )
  }

  if (screen === 'lobby') {
    return (
      <Lobby
        players={peerState.players}
        isHost={peerState.isHost}
        roomId={peerState.peerId || initialRoomId || ''}
        onStartGame={handleStartGame}
        error={peerState.error}
      />
    )
  }

  if (displayState) {
    return (
      <GameScreen
        gameState={displayState}
        playerId={peerState.peerId || soloGameState?.players[0]?.id || ''}
        onSendGuess={handleSendGuess}
      />
    )
  }

  return (
    <div className="screen">
      <div className="card">
        <h2>Connecting...</h2>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
