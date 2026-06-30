import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

console.log('[socket.js] module loaded — SOCKET_URL:', SOCKET_URL);

let socket = null;

export function connectSocket(token) {
  console.log('[socket] connectSocket called — token present:', !!token, '— existing socket:', !!socket);

  if (socket) {
    console.log('[socket] reusing existing socket, connected:', socket.connected);
    return socket;
  }

  console.log('[socket] creating new io connection to', SOCKET_URL);

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.3,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[socket] ✅ connected — id:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[socket] ❌ disconnected —', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] connect_error —', err.message);
  });

  socket.on('reconnect', (attempt) => {
    console.log('[socket] 🔄 reconnected after', attempt, 'attempt(s)');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    console.log('[socket] disconnecting');
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
