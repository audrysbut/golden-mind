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
  const [mode] = useState<'menu' | 'join'>(initialRoomId ? 'join' : 'menu')

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
    if (!name.trim() || !initialRoomId) return
    onJoinRoom(name.trim(), initialRoomId)
  }

  const handleSolo = () => {
    if (!name.trim()) return
    onStartSolo(name.trim())
  }

  if (mode === 'join') {
    return (
      <div className="screen home-screen">
        <h1 className="game-title">Golden Mind</h1>
        <p className="subtitle">Join Game</p>
        <div className="card">
          <label htmlFor="join-name">Your Name</label>
          <input
            id="join-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
          />
          <button className="btn btn-accent" onClick={handleJoin} disabled={!name.trim()} style={{ marginTop: '0.5rem', width: '100%' }}>
            Join
          </button>
          {error && <p className="error">{error}</p>}
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
        <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim()}>
          Create Game
        </button>
        <button className="btn btn-secondary" onClick={handleSolo} disabled={!name.trim()}>
          Solo Practice
        </button>
      </div>
    </div>
  )
}
