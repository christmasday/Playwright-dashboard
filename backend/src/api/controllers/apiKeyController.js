/**
 * API Key Controller
 * Handles generation, listing and revocation of a user's API keys.
 */
import { ApiKey } from '../../models/apiKey.js';
import logger from '../../utils/logger.js';

export const listKeys = async (req, res, next) => {
  try {
    const keys = await ApiKey.listByUser(req.user.id);
    res.json({ data: keys });
  } catch (error) {
    logger.error('Error listing API keys', { error: error.message });
    next(error);
  }
};

export const createKey = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Key name is required' });
    }

    const created = await ApiKey.generate({ userId: req.user.id, name: name.trim() });
    // `key` is the plaintext secret — returned only this once.
    const { key, ...safe } = created;
    res.status(201).json({ data: { ...safe, key } });
  } catch (error) {
    logger.error('Error creating API key', { error: error.message });
    next(error);
  }
};

export const revokeKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ok = await ApiKey.revoke(id, req.user.id);
    if (!ok) {
      return res.status(404).json({ error: 'API key not found' });
    }
    res.json({ data: { id, success: true } });
  } catch (error) {
    logger.error('Error revoking API key', { error: error.message });
    next(error);
  }
};

export default {
  listKeys,
  createKey,
  revokeKey,
};
