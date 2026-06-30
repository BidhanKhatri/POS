/**
 * Thin singleton that holds the Socket.IO server instance.
 * Controllers and services import `emit` to broadcast events
 * without coupling to the socket server directly.
 *
 * Usage:
 *   import { emit } from '../socket/emitter.js';
 *   emit(ROOMS.MANAGERS, EVENTS.OVERRIDE_NEW, payload);
 */

let _io = null;

export const setIO = (io) => { _io = io; };

/**
 * Emit to a room (or to a specific socket id).
 * Silently skips if Socket.IO hasn't initialised yet (offline/test mode).
 */
export const emit = (room, event, payload) => {
  if (!_io) return;
  _io.to(room).emit(event, payload);
};

/**
 * Broadcast to ALL connected sockets (rare — use rooms instead).
 */
export const broadcast = (event, payload) => {
  if (!_io) return;
  _io.emit(event, payload);
};
