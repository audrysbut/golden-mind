import { useState, useRef, useEffect } from 'react'
import type { GameState } from '../types'

interface GameScreenProps {
  gameState: GameState
  playerId: string
  onSendGuess: (text: string) => void
}

export default function GameScreen({ gameState, playerId, onSendGuess }: GameScreenProps) {
  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const draftRef = useRef('')

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [gameState.messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [gameState.round])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSendGuess(text)
    setInput('')
    historyRef.current.push(text)
    historyIndexRef.current = -1
    draftRef.current = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const history = historyRef.current
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      if (historyIndexRef.current === -1) {
        draftRef.current = input
        historyIndexRef.current = history.length - 1
      } else if (historyIndexRef.current > 0) {
        historyIndexRef.current--
      }
      setInput(history[historyIndexRef.current])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndexRef.current === -1) return
      if (historyIndexRef.current < history.length - 1) {
        historyIndexRef.current++
        setInput(history[historyIndexRef.current])
      } else {
        historyIndexRef.current = -1
        setInput(draftRef.current)
      }
    } else if (e.key === 'Escape') {
      historyIndexRef.current = -1
      setInput(draftRef.current)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const sortedPlayers = [...gameState.players].sort((a, b) => b.points - a.points)

  if (gameState.phase === 'gameOver') {
    const winner = sortedPlayers[0]
    return (
      <div className="screen gameover-screen">
        <h1 className="game-title">Game Over!</h1>
        <div className="card">
          {winner && (
            <div className="winner-announcement">
              <span className="trophy">&#127942;</span>
              <h2>{winner.name} wins!</h2>
              <p>{winner.points} points total</p>
            </div>
          )}
          <div className="final-standings">
            <h3>Final Standings</h3>
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className={`standing-row ${i === 0 ? 'winner' : ''}`}>
                <span className="rank">#{i + 1}</span>
                <span className="name">{p.name}{p.id === playerId ? ' (You)' : ''}</span>
                <span className="score">{p.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (gameState.phase === 'lobby') {
    return (
      <div className="screen game-screen">
        <div className="card">
          <h2>Waiting for game to start...</h2>
        </div>
      </div>
    )
  }

  const question = gameState.currentQuestion

  return (
    <div className="screen game-screen">
      <div className="game-layout">
        <div className="game-main">
          <div className="top-bar">
            <div className="round-indicator">Round {gameState.round}/{gameState.totalRounds}</div>
            <div className={`timer ${gameState.timeRemaining <= 20 ? 'timer-warning' : ''}`}>
              {formatTime(gameState.timeRemaining)}
            </div>
          </div>

          {question && (
            <>
              <div className="category-badge">{question.category}</div>
              <div className="hints-container">
                {question.hints.map((hint, i) => (
                  <div key={i} className={`hint-card ${i <= gameState.hintsRevealed ? 'hint-visible' : 'hint-hidden'}`}>
                    <div className="hint-number">Hint {i + 1}</div>
                    <div className="hint-text">
                      {i <= gameState.hintsRevealed ? hint : '???'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="game-sidebar">
          <div className="chat-container">
            <div className="chat-messages">
              {gameState.messages.map(msg => (
                <div key={msg.id} className={`chat-msg msg-${msg.type}`}>
                  <span className="msg-text">{msg.text}</span>
                  <span className="msg-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-row" onSubmit={handleSend}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your guess..."
                maxLength={100}
                disabled={gameState.phase !== 'playing'}
              />
              <button type="submit" className="btn btn-accent" disabled={!input.trim() || gameState.phase !== 'playing'}>
                Send
              </button>
            </form>
          </div>

          <div className="scoreboard">
            <h3>Scoreboard</h3>
            {sortedPlayers.map(p => (
              <div key={p.id} className={`score-row ${p.id === playerId ? 'current' : ''} ${p.guessedCorrectly ? 'correct' : ''}`}>
                <span className="s-name">{p.name}{p.id === playerId ? ' (You)' : ''}</span>
                <span className="s-pts">{p.points}</span>
                {p.guessedCorrectly && <span className="s-check">&#10003;</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
