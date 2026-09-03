/**
 * Express Server
 * Main entry point for Playwright Dashboard API
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import env from './config/env.js';
import logger from './utils/logger.js';
import * as db from './config/database.js';
import * as redis from './config/redis.js';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler.js';
import buildRoutes from './api/routes/builds.js';
import testRoutes from './api/routes/tests.js';
import authRoutes from './api/routes/auth.js';
import webhookRoutes from './api/routes/webhooks.js';
import conditionalRoutes from './api/routes/conditionalExecution.js';
import projectRoutes from './api/routes/projects.js';
import apiKeysRoutes from './api/routes/apiKeys.js';
import flakyRoutes from './api/routes/flaky.js';
import analyticsRoutes from './api/routes/analytics.js';
import aiRoutes from './api/routes/ai.js';

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Socket.IO for real-time updates
export const io = new SocketIOServer(server, {
  cors: {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests, please try again later',
  });
  app.use(limiter);
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/apikeys', apiKeysRoutes);
app.use('/api/builds', buildRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/flaky', flakyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/conditionalExecution', conditionalRoutes);
app.use('/api/ai', aiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New WebSocket connection', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('WebSocket disconnected', { socketId: socket.id });
  });

  socket.on('join-build', (buildId) => {
    socket.join(`build:${buildId}`);
    logger.debug('Socket joined build room', { socketId: socket.id, buildId });
  });

  socket.on('leave-build', (buildId) => {
    socket.leave(`build:${buildId}`);
    logger.debug('Socket left build room', { socketId: socket.id, buildId });
  });
});

// Export io for use in other modules
export const broadcastTestUpdate = (buildId, data) => {
  io.to(`build:${buildId}`).emit('test-update', data);
};

export const broadcastBuildUpdate = (buildId, data) => {
  io.to(`build:${buildId}`).emit('build-update', data);
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
const start = async () => {
  try {
    // Initialize Redis connection
    await redis.connect();
    logger.info('Redis connected');

    server.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`, {
        environment: env.NODE_ENV,
        apiUrl: env.API_URL,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Only start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export default app;
