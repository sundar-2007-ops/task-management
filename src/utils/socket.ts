import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Connect to the current window location origin
    socket = io(window.location.origin, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function connectSocket() {
  const token = getToken();
  if (!token) return;

  const s = getSocket();
  s.connect();
  s.emit('authenticate', token);
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
  socket = null;
}
