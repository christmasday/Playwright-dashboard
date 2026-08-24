/**
 * Authentication & Authorization Middleware
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import { User } from '../../models/user.js';
import { ApiKey } from '../../models/apiKey.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    logger.warn('Invalid access token', { error: error.message });
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
};

export const requireAdmin = requireRole('admin');

export const apiKeyAuth = async (req, res, next) => {
  if (!env.ENABLE_API_KEY_AUTH) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token && req.query?.token) {
    token = req.query.token;
  }

  // Dashboard UI authenticates with a JWT Bearer token.
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      // Token invalid/expired
    }
  }

  // Reporter / CI authenticates with an X-API-Key header or query parameter.
  const apiKey = req.headers['x-api-key'] || req.query?.apiKey || req.query?.['x-api-key'] || req.query?.key;
  if (apiKey) {
    try {
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const keyRow = await ApiKey.findByHash(hash);
      if (keyRow) {
        req.user = { id: keyRow.user_id };
        req.projectId = keyRow.project_id;
        req.apiKeyId = keyRow.id;
        await ApiKey.updateLastUsed(keyRow.id);
        return next();
      }
    } catch (error) {
      logger.error('apiKeyAuth error', { error: error.message });
    }
  }

  // Fallback for artifact files: allow browser links, video tags, & trace viewers to load files
  if (req.path === '/artifact-file' || req.originalUrl?.includes('/artifact-file')) {
    return next();
  }

  return res.status(401).json({ success: false, error: 'API key required' });
};

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

export default {
  authenticateToken,
  requireRole,
  requireAdmin,
  apiKeyAuth,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
