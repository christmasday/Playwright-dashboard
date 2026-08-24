
// Mock dependencies BEFORE importing the controller
jest.mock('../../models/user.js');
jest.mock('../../config/env.js', () => {
  const env = {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '7d',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '30d',
    BCRYPT_ROUNDS: 4,
  };
  return { __esModule: true, env, default: env };
});
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn((payload, secret) =>
    secret && String(secret).includes('refresh') ? 'mock-refresh-token' : 'mock-access-token'
  ),
  verify: jest.fn((token, secret) => {
    if (token === 'expired-token') throw new Error('jwt expired');
    return { id: 'user-1', email: 'test@example.com', role: 'viewer' };
  }),
}));

import authController from '../../api/controllers/authController.js';
import { User, RefreshToken } from '../../models/user.js';
import bcrypt from 'bcryptjs';

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('register', () => {
    it('should register a new user with valid data', async () => {
      User.findByEmail.mockResolvedValue(null);
      User.findByUsername.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'tester',
        role: 'viewer',
      });
      RefreshToken.create.mockResolvedValue({ id: 'rt-1' });
      User.setRefreshToken.mockResolvedValue({ id: 'user-1' });

      req = {
        body: {
          email: 'test@example.com',
          username: 'tester',
          password: 'password123',
        },
      };

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeTruthy();
      expect(body.data.refreshToken).toBeTruthy();
      expect(body.data.refreshToken).not.toEqual(body.data.accessToken);
    });

    it('should reject registration with short password', async () => {
      req = {
        body: { email: 'test@example.com', username: 'tester', password: 'short' },
      };
      await authController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('8 characters') })
      );
    });

    it('should reject duplicate email', async () => {
      User.findByEmail.mockResolvedValue({ id: 'existing' });
      req = {
        body: {
          email: 'test@example.com',
          username: 'tester',
          password: 'password123',
        },
      };
      await authController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      User.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'hashed',
        is_active: true,
      });
      User.verifyPassword.mockResolvedValue(true);
      RefreshToken.create.mockResolvedValue({ id: 'rt-1' });
      User.setRefreshToken.mockResolvedValue({ id: 'user-1' });
      User.updateLastLogin.mockResolvedValue({ id: 'user-1' });

      req = { body: { email: 'test@example.com', password: 'password123' } };
      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeTruthy();
      expect(body.data.refreshToken).toBeTruthy();
      expect(body.data.refreshToken).not.toEqual(body.data.accessToken);
    });

    it('should reject invalid credentials', async () => {
      User.findByEmail.mockResolvedValue({
        id: 'user-1',
        password_hash: 'hashed',
        is_active: true,
      });
      User.verifyPassword.mockResolvedValue(false);

      req = { body: { email: 'test@example.com', password: 'wrong' } };
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('refresh', () => {
    it('should issue new tokens for a valid refresh token', async () => {
      RefreshToken.findValid.mockResolvedValue({ id: 'rt-1', user_id: 'user-1' });
      User.findById.mockResolvedValue({ id: 'user-1', is_active: true });
      RefreshToken.revoke.mockResolvedValue();
      RefreshToken.create.mockResolvedValue({ id: 'rt-2' });
      User.setRefreshToken.mockResolvedValue({ id: 'user-1' });

      req = { body: { refreshToken: 'valid-token' } };
      await authController.refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeTruthy();
      expect(body.data.refreshToken).toBeTruthy();
    });

    it('should reject an expired refresh token', async () => {
      req = { body: { refreshToken: 'expired-token' } };
      await authController.refresh(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject a revoked refresh token', async () => {
      RefreshToken.findValid.mockResolvedValue(null);
      req = { body: { refreshToken: 'valid-token' } };
      await authController.refresh(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('logout', () => {
    it('should revoke tokens on logout', async () => {
      RefreshToken.revoke.mockResolvedValue();
      User.setRefreshToken.mockResolvedValue({ id: 'user-1' });
      RefreshToken.revokeAllForUser = jest.fn().mockResolvedValue();

      req = { user: { id: 'user-1' }, body: { refreshToken: 'valid-token' } };
      await authController.logout(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('me', () => {
    it('should return the current user profile', async () => {
      User.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'viewer',
      });
      req = { user: { id: 'user-1' } };
      await authController.me(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });
});
