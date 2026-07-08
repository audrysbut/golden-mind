import { useState, useEffect } from 'react'

const STORAGE_KEY = 'golden-mind-player-name'

interface HomeScreenProps {
  onStartSolo: (name: string) => void
  onCreateRoom: (name: string) => void
  onJoinRoom: (name: string, roomId: string) => void
  error: string | null
  initialRoomId?: string
}

export default function HomeScreen({ onStartSolo, onCreateRoom, onJoinRoom, error, initialRoomId }: HomeScreenProps) {
  const [name, setName] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [roomId, setRoomId] = useState(initialRoomId ?? '')
  const [mode, setMode] = useState<'menu' | 'solo' | 'multi'>(initialRoomId ? 'multi' : 'menu')

  useEffect(() => {
    if (name) localStorage.setItem(STORAGE_KEY, name)
  }, [name])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    localStorage.setItem(STORAGE_KEY, e.target.value)
  }

  const handleCreate = () => {
    if (!name.trim()) return
    onCreateRoom(name.trim())
  }

  const handleJoin = () => {
    if (!name.trim() || !roomId.trim()) return
    onJoinRoom(name.trim(), roomId.trim())
  }

  const handleSolo = () => {
    if (!name.trim()) return
    onStartSolo(name.trim())
  }

  if (mode === 'solo') {
    return (
      <div className="screen home-screen">
        <h1 className="game-title">Golden Mind</h1>
        <p className="subtitle">Solo Practice</p>
        <div className="card">
          <label htmlFor="solo-name">Your Name</label>
          <input
            id="solo-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleSolo} disabled={!name.trim()}>
            Start Practice
          </button>
          <button className="btn btn-secondary" onClick={() => setMode('menu')}>Back</button>
        </div>
      </div>
    )
  }

  if (mode === 'multi') {
    return (
      <div className="screen home-screen">
        <h1 className="game-title">Golden Mind</h1>
        <p className="subtitle">Multiplayer</p>
        <div className="card">
          <label htmlFor="multi-name">Your Name</label>
          <input
            id="multi-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
          />
          {!initialRoomId && (
            <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim()}>
              Create Game
            </button>
          )}
          {!initialRoomId && <div className="divider"><span>or</span></div>}
          <label htmlFor="room-id">Room ID</label>
          <div className="join-row">
            <input
              id="room-id"
              type="text"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
              placeholder="Paste room ID"
              maxLength={36}
              readOnly={!!initialRoomId}
            />
            <button className="btn btn-accent" onClick={handleJoin} disabled={!name.trim() || !roomId.trim()}>
              Join
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-secondary" onClick={() => setMode('menu')}>Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen home-screen">
      <h1 className="game-title">Golden Mind</h1>
      <p className="subtitle">Guess the secret before time runs out!</p>
      <div className="card">
        <label htmlFor="menu-name">Your Name</label>
        <input
          id="menu-name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Enter your name"
          maxLength={20}
          autoFocus
        />
        <button className="btn btn-primary" onClick={() => setMode('multi')} disabled={!name.trim()}>
          Play Multiplayer
        </button>
        <button className="btn btn-secondary" onClick={() => setMode('solo')} disabled={!name.trim()}>
          Solo Practice
        </button>
      </div>
    </div>
  )
}
