import type { Player } from '../types'

interface LobbyProps {
  players: Player[]
  isHost: boolean
  roomId: string
  onStartGame: () => void
}

export default function Lobby({ players, isHost, roomId, onStartGame }: LobbyProps) {
  const inviteUrl = `${window.location.origin}/golden-mind/?room=${roomId}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      const input = document.createElement('input')
      input.value = inviteUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
  }

  return (
    <div className="screen lobby-screen">
      <h1 className="game-title">Golden Mind</h1>
      <div className="card">
        <h2>Lobby</h2>
        <p className="player-count">{players.length} player{players.length !== 1 ? 's' : ''} joined</p>
        <div className="player-list">
          {players.map(p => (
            <div key={p.id} className={`player-item ${p.isHost ? 'host' : ''}`}>
              <span className="player-dot" />
              <span className="player-name">{p.name}</span>
              {p.isHost && <span className="host-badge">Host</span>}
            </div>
          ))}
        </div>
        {isHost && (
          <div className="lobby-actions">
            <div className="invite-row">
              <input type="text" readOnly value={inviteUrl} className="invite-input" onClick={e => e.currentTarget.select()} />
              <button className="btn btn-accent" onClick={copyLink}>Copy Link</button>
            </div>
            <button
              className="btn btn-primary btn-large"
              onClick={onStartGame}
              disabled={players.length < 1}
            >
              Start Game
            </button>
          </div>
        )}
        {!isHost && (
          <p className="waiting-text">Waiting for host to start the game...</p>
        )}
      </div>
    </div>
  )
}
