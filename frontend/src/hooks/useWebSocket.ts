import { useEffect, useRef, useState, useCallback } from 'react'
import { Client, IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuth } from '@/contexts/AuthContext'

// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max
function getBackoffDelay(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000)
}

export function useWebSocket() {
  const { isAuthenticated } = useAuth()
  const clientRef = useRef<Client | null>(null)
  const [connected, setConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(false)
  // Bumped on every successful CONNECT so subscribe() changes identity per broker
  // session — consumer effects re-run and resubscribe even after a silent reconnect.
  const [sessionEpoch, setSessionEpoch] = useState(0)
  const hasConnectedRef = useRef(false)
  const reconnectAttemptRef = useRef(0)

  // Track token changes to reconnect — listens for both cross-tab 'storage' and same-tab 'token-refreshed'
  const [tokenVersion, setTokenVersion] = useState(0)
  useEffect(() => {
    const bump = () => setTokenVersion(v => v + 1)
    window.addEventListener('storage', bump)
    window.addEventListener('token-refreshed', bump)
    return () => {
      window.removeEventListener('storage', bump)
      window.removeEventListener('token-refreshed', bump)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setConnected(false)
      setConnectionError(false)
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    hasConnectedRef.current = false
    reconnectAttemptRef.current = 0

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const brokerURL = `${wsProtocol}//${window.location.host}/ws`

    const createSockJSFallback = () => {
      const fallbackClient = new Client({
        webSocketFactory: () => new SockJS('/ws'),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 1000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          hasConnectedRef.current = true
          reconnectAttemptRef.current = 0
          fallbackClient.reconnectDelay = 1000
          setConnected(true)
          setConnectionError(false)
          setSessionEpoch(e => e + 1)
        },
        onDisconnect: () => {
          reconnectAttemptRef.current++
          // Re-read the attempt count so exponential backoff actually engages on the next retry.
          fallbackClient.reconnectDelay = getBackoffDelay(reconnectAttemptRef.current)
          setConnected(false)
        },
        onStompError: () => { /* handled by reconnect */ },
        onWebSocketError: () => {
          reconnectAttemptRef.current++
          fallbackClient.reconnectDelay = getBackoffDelay(reconnectAttemptRef.current)
          setConnected(false)
          setConnectionError(true)
        },
        // Abrupt drops (network loss, server restart) fire close without disconnect;
        // flip connected so consumers resubscribe on the next session.
        onWebSocketClose: () => {
          reconnectAttemptRef.current++
          fallbackClient.reconnectDelay = getBackoffDelay(reconnectAttemptRef.current)
          setConnected(false)
        },
      })
      fallbackClient.activate()
      clientRef.current = fallbackClient
    }

    const client = new Client({
      brokerURL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 1000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        hasConnectedRef.current = true
        reconnectAttemptRef.current = 0
        client.reconnectDelay = 1000
        setConnected(true)
        setConnectionError(false)
        setSessionEpoch(e => e + 1)
      },
      onDisconnect: () => {
        reconnectAttemptRef.current++
        // Re-read the attempt count so exponential backoff actually engages on the next retry.
        client.reconnectDelay = getBackoffDelay(reconnectAttemptRef.current)
        setConnected(false)
      },
      onStompError: () => { /* handled by reconnect */ },
      onWebSocketError: () => {
        if (!hasConnectedRef.current) {
          client.deactivate()
          createSockJSFallback()
        } else {
          reconnectAttemptRef.current++
          client.reconnectDelay = getBackoffDelay(reconnectAttemptRef.current)
          setConnected(false)
        }
      },
      // Abrupt drops (network loss, server restart) fire close without disconnect;
      // flip connected so consumers resubscribe on the next session.
      onWebSocketClose: () => {
        reconnectAttemptRef.current++
        client.reconnectDelay = getBackoffDelay(reconnectAttemptRef.current)
        setConnected(false)
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      clientRef.current?.deactivate()
      clientRef.current = null
      hasConnectedRef.current = false
      setConnected(false)
      setConnectionError(false)
    }
  }, [isAuthenticated, tokenVersion])

  const subscribe = useCallback(
    (destination: string, callback: (msg: IMessage) => void) => {
      const client = clientRef.current
      if (!client?.connected) return () => {}

      const sub = client.subscribe(destination, callback)
      return () => { sub.unsubscribe() }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connected, sessionEpoch]
  )

  const publish = useCallback(
    (destination: string, body: object) => {
      const client = clientRef.current
      if (!client?.connected) return
      client.publish({ destination, body: JSON.stringify(body) })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connected]
  )

  return { connected, connectionError, subscribe, publish }
}
