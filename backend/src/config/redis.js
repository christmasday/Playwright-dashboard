import { createClient } from 'redis';
import env from './env.js';
import logger from '../utils/logger.js';

const client = createClient({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Max Redis reconnection attempts reached');
        return new Error('Max retries reached');
      }
      return retries * 50;
    },
  },
});

client.on('error', (err) => {
  logger.error('Redis client error', { error: err.message });
});

client.on('connect', () => {
  logger.info('Connected to Redis');
});

client.on('ready', () => {
  logger.info('Redis client ready');
});

export const connect = async () => {
  await client.connect();
};

export const disconnect = async () => {
  await client.quit();
};

export const get = async (key) => {
  return await client.get(key);
};

export const set = async (key, value, expiry = null) => {
  if (expiry) {
    await client.setEx(key, expiry, value);
  } else {
    await client.set(key, value);
  }
};

export const del = async (key) => {
  await client.del(key);
};

export const getJson = async (key) => {
  const value = await client.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (err) {
    logger.warn('Invalid JSON stored in Redis for key', { key });
    return null;
  }
};

export const setJson = async (key, value, expiry = null) => {
  try {
    await set(key, JSON.stringify(value), expiry);
  } catch (err) {
    logger.error('Failed to set JSON in Redis', { key, error: err.message });
    throw err;
  }
};

export const incr = async (key) => {
  return await client.incr(key);
};

export const expire = async (key, seconds) => {
  await client.expire(key, seconds);
};

export default client;
