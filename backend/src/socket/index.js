import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { setIO } from './emitter.js';
import { ROOMS } from './events.js';

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://192.168.1.95:5173',
  'http://192.168.1.95:5174',
  'http://192.168.1.95:5175',
];

function originAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.ngrok(-free)?\.(?:app|dev|io)$/.test(origin);
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      // Socket.IO cors.origin must use the callback form (origin, cb) => cb(err, allow)
      origin: (origin, cb) => cb(null, originAllowed(origin)),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Tune transport for mobile reliability: polling first, then upgrade
    transports: ['polling', 'websocket'],
    pingTimeout:  30000,
    pingInterval: 25000,
    connectTimeout: 10000,
  });

  // ── JWT authentication middleware ──────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('AUTH_MISSING'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name role isActive');

      if (!user || !user.isActive) return next(new Error('AUTH_INVALID'));

      socket.user = user;
      next();
    } catch {
      next(new Error('AUTH_FAILED'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { _id, role, name } = socket.user;

    // Every authenticated user joins the store-wide room
    socket.join(ROOMS.STORE);

    // Managers and Admins also join the managers room
    if (role === 'Manager' || role === 'Admin') {
      socket.join(ROOMS.MANAGERS);
    }

    // Personal room for targeted notifications
    socket.join(ROOMS.employee(_id.toString()));

    console.log(`[socket] ✅ ${role} "${name}" connected (${socket.id})`);
    console.log(`[socket]    rooms: store${role !== 'Employee' ? ', managers' : ''}, employee:${_id}`);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] ❌ ${role} "${name}" disconnected: ${reason}`);
    });

    // Ping/pong for client-side connection health checks
    socket.on('ping', () => socket.emit('pong'));
  });

  // Register the io instance in the emitter singleton
  setIO(io);

  console.log('[socket] Socket.IO initialised');
  return io;
}
