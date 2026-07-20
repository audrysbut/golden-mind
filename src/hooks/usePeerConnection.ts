import { useState, useCallback, useRef, useEffect } from 'react'
import Peer, { DataConnection } from 'peerjs'
import { v4 as uuidv4 } from 'uuid'
import { Message, Player } from '../types'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
]

interface PeerConnectionState {
  peer: Peer | null
  connections: DataConnection[]
  isHost: boolean
  peerId: string | null
  isReady: boolean
  error: string | null
  players: Player[]
}

interface UsePeerConnectionReturn {
  peerState: PeerConnectionState
  createRoom: (playerName: string) => string
  joinRoom: (roomId: string, playerName: string) => void
  sendToAll: (message: Message) => void
  sendToHost: (message: Message) => void
  onMessage: (callback: (message: Message, playerId: string) => void) => void
}

export default function usePeerConnection(): UsePeerConnectionReturn {
  const [peerState, setPeerState] = useState<PeerConnectionState>({
    peer: null,
    connections: [],
    isHost: false,
    peerId: null,
    isReady: false,
    error: null,
    players: [],
  })

  const connectionsMapRef = useRef<Map<string, DataConnection>>(new Map())
  const onMessageCallbackRef = useRef<((message: Message, playerId: string) => void) | null>(null)
  const peerRef = useRef<Peer | null>(null)
  const playersRef = useRef<Player[]>([])

  useEffect(() => {
    playersRef.current = peerState.players
  }, [peerState.players])

  const updateConnectionsArray = useCallback(() => {
    setPeerState(prev => ({
      ...prev,
      connections: Array.from(connectionsMapRef.current.values()),
    }))
  }, [])

  const sendToAll = useCallback((message: Message) => {
    connectionsMapRef.current.forEach(conn => {
      if (conn.open) conn.send(message)
    })
  }, [])

  const sendToHost = useCallback((message: Message) => {
    connectionsMapRef.current.forEach(conn => {
      if (conn.open) conn.send(message)
    })
  }, [])

  const createRoom = useCallback((playerName: string): string => {
    const roomId = uuidv4()
    const peer = new Peer(roomId, { config: { iceServers: ICE_SERVERS } })
    peerRef.current = peer

    peer.on('open', () => {
      const hostPlayer: Player = {
        id: roomId,
        name: playerName,
        points: 0,
        isHost: true,
        guessedCorrectly: false,
        roundsWon: 0,
      }
      setPeerState(prev => ({
        ...prev,
        peer,
        isHost: true,
        peerId: roomId,
        isReady: true,
        error: null,
        players: [hostPlayer],
      }))
    })

    peer.on('connection', (conn: DataConnection) => {
      const joinerPlayerId = conn.peer
      connectionsMapRef.current.set(joinerPlayerId, conn)
      updateConnectionsArray()

      conn.on('data', (data: unknown) => {
        const message = data as Message
        if (message.type === 'join') {
          const newPlayer: Player = {
            id: joinerPlayerId,
            name: message.playerName,
            points: 0,
            isHost: false,
            guessedCorrectly: false,
            roundsWon: 0,
          }

          playersRef.current.forEach(p => {
            conn.send({ type: 'player-joined', player: p })
          })

          setPeerState(prev => ({
            ...prev,
            players: [...prev.players, newPlayer],
          }))

          sendToAll({ type: 'player-joined', player: newPlayer })
        }
        onMessageCallbackRef.current?.(message, joinerPlayerId)
      })

      conn.on('close', () => {
        connectionsMapRef.current.delete(joinerPlayerId)
        updateConnectionsArray()
        setPeerState(prev => ({
          ...prev,
          players: prev.players.filter(p => p.id !== joinerPlayerId),
        }))
        const leftMsg: Message = { type: 'player-left', playerId: joinerPlayerId }
        sendToAll(leftMsg)
        onMessageCallbackRef.current?.(leftMsg, joinerPlayerId)
      })
    })

    peer.on('error', (err) => {
      setPeerState(prev => ({ ...prev, error: err.message }))
    })

    return roomId
  }, [sendToAll, updateConnectionsArray])

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    const playerId = uuidv4()
    const peer = new Peer(playerId, { config: { iceServers: ICE_SERVERS } })
    peerRef.current = peer

    peer.on('open', () => {
      setPeerState(prev => ({
        ...prev,
        peer,
        isHost: false,
        peerId: peer.id,
        isReady: true,
        error: null,
        players: [],
      }))

      const conn = peer.connect(roomId)

      conn.on('open', () => {
        connectionsMapRef.current.set(roomId, conn)
        updateConnectionsArray()

        conn.on('data', (data: unknown) => {
          const message = data as Message
          if (message.type === 'player-joined') {
            setPeerState(prev => {
              if (prev.players.some(p => p.id === message.player.id)) return prev
              return { ...prev, players: [...prev.players, message.player] }
            })
          }
          if (message.type === 'player-left') {
            setPeerState(prev => ({
              ...prev,
              players: prev.players.filter(p => p.id !== message.playerId),
            }))
          }
          onMessageCallbackRef.current?.(message, conn.peer)
        })

        conn.on('close', () => {
          connectionsMapRef.current.delete(roomId)
          updateConnectionsArray()
          setPeerState(prev => ({
            ...prev,
            isReady: false,
            error: 'Host disconnected',
          }))
        })

        conn.send({ type: 'join', playerName, playerId })
      })
    })

    peer.on('error', (err) => {
      setPeerState(prev => ({ ...prev, error: err.message }))
    })
  }, [updateConnectionsArray])

  const onMessage = useCallback((callback: (message: Message, playerId: string) => void) => {
    onMessageCallbackRef.current = callback
  }, [])

  const disconnect = useCallback(() => {
    connectionsMapRef.current.forEach(conn => conn.close())
    connectionsMapRef.current.clear()
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    setPeerState({
      peer: null,
      connections: [],
      isHost: false,
      peerId: null,
      isReady: false,
      error: null,
      players: [],
    })
  }, [])

  useEffect(() => {
    return () => disconnect()
  }, [disconnect])

  return {
    peerState,
    createRoom,
    joinRoom,
    sendToAll,
    sendToHost,
    onMessage,
  }
}
