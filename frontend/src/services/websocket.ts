/// <reference types="vite/client" />

/**
 * WebSocket Service
 * Handles real-time connections to the dashboard server
 */

import io, { Socket } from 'socket.io-client';

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3002';

export const initSocket = () => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const joinBuild = (buildId: string) => {
  const sock = getSocket();
  if (!sock) return;
  if (!sock.connected) {
    sock.once('connect', () => sock.emit('join-build', buildId));
  } else {
    sock.emit('join-build', buildId);
  }
};

export const leaveBuild = (buildId: string) => {
  const sock = getSocket();
  if (!sock) return;
  if (!sock.connected) {
    sock.once('connect', () => sock.emit('leave-build', buildId));
  } else {
    sock.emit('leave-build', buildId);
  }
};

export const onTestUpdate = (callback: (data: any) => void) => {
  const sock = getSocket();
  sock?.on('test-update', callback);
};

export const onBuildUpdate = (callback: (data: any) => void) => {
  const sock = getSocket();
  sock?.on('build-update', callback);
};

export const offTestUpdate = (callback: (data: any) => void) => {
  const sock = getSocket();
  sock?.off('test-update', callback);
};

export const offBuildUpdate = (callback: (data: any) => void) => {
  const sock = getSocket();
  sock?.off('build-update', callback);
};

export default {
  initSocket,
  getSocket,
  joinBuild,
  leaveBuild,
  onTestUpdate,
  onBuildUpdate,
  offTestUpdate,
  offBuildUpdate,
};
