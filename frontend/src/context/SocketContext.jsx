import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket } from '../socket/socket';
import useAuthStore from '../store/useAuthStore';

console.log('[SocketContext] module loaded');

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const token = useAuthStore((s) => s.token);
  const user  = useAuthStore((s) => s.user);
  const [socket, setSocket] = useState(null);

  console.log('[SocketProvider] render — token:', !!token, '— user:', !!user);

  useEffect(() => {
    console.log('[SocketProvider] useEffect fired — token:', !!token, '— user:', !!user);

    if (!token || !user) {
      console.log('[SocketProvider] no token/user — skipping socket connect');
      disconnectSocket();
      setSocket(null);
      return;
    }

    console.log('[SocketProvider] calling connectSocket...');
    const s = connectSocket(token);
    setSocket(s);

    const onConnect = () => {
      console.log('[SocketProvider] onConnect fired, updating socket state');
      setSocket(s);
    };
    s.on('connect', onConnect);

    return () => {
      s.off('connect', onConnect);
    };
  }, [token, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketEvent(event, handler) {
  const socket = useContext(SocketContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket || !event) {
      console.log('[useSocketEvent] skip —', event, '— socket:', !!socket);
      return;
    }

    console.log('[useSocketEvent] ✅ registered listener for', event);
    const listener = (...args) => {
      console.log('[useSocketEvent] 📨 received', event, args[0]);
      handlerRef.current(...args);
    };
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}

export function useSocketContext() {
  return useContext(SocketContext);
}
