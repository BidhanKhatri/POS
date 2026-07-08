import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket } from '../socket/socket';
import useAuthStore from '../store/useAuthStore';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const token = useAuthStore((s) => s.token);
  const user  = useAuthStore((s) => s.user);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) {
      disconnectSocket();
      setSocket(null);
      return;
    }

    const s = connectSocket(token);
    setSocket(s);

    const onConnect = () => setSocket(s);
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
    if (!socket || !event) return;

    const listener = (...args) => handlerRef.current(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}

export function useSocketContext() {
  return useContext(SocketContext);
}
