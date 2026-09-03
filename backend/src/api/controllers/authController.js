/**
 * Authentication Controller
 * Handles registration, login, token refresh, logout, and profile.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import { User, RefreshToken, Project } from '../../models/user.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../services/emailService.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const register = async (req, res) => {
  try {
    const { email, username, firstName, lastName, password, role } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, username and password are required',
      });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }

    // Only admins may create admin users; default to 'viewer' otherwise
    const assignedRole = req.user?.role === 'admin' && role ? role : 'viewer';

    const user = await User.create({ email, username, firstName, lastName, password, role: assignedRole });

    // Auto-accept any pending project invitations for this email
    try {
      const pendingInvs = await Project.findPendingInvitationsByEmail(email);
      for (const inv of pendingInvs) {
        await Project.acceptInvitation(inv.id, user.id);
      }
    } catch (invErr) {
      logger.error('Failed processing pending project invitations', { error: invErr.message });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await User.setVerificationToken(user.id, verificationToken);

    // Send verification email (non-blocking)
    sendVerificationEmail(
      email,
      verificationToken,
      env.FRONTEND_URL || 'http://localhost:5173'
    ).catch((err) => logger.error('Verification email send failed', { error: err.message }));

    logger.info('User registered', { userId: user.id, username });
    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your address.',
      data: {
        user: { id: user.id, email: user.email, username: user.username, firstName: user.first_name, lastName: user.last_name, role: user.role },
        emailVerified: false,
      },
    });
  } catch (error) {
    logger.error('Registration failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email/username and password are required',
      });
    }

    const user = email ? await User.findByEmail(email) : await User.findByUsername(username);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check email verification
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Email not verified. Please check your inbox for a verification link.',
        emailVerified: false,
      });
    }

    const valid = await User.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const refreshExpiry = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES_IN));

    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiry,
    });
    await User.setRefreshToken(user.id, refreshToken);
    await User.updateLastLogin(user.id);

    logger.info('User logged in', { userId: user.id, username: user.username });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: user.id, email: user.email, username: user.username, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(403).json({ success: false, error: 'Invalid refresh token' });
    }

    const stored = await RefreshToken.findValid(hashToken(refreshToken));
    if (!stored) {
      return res.status(403).json({ success: false, error: 'Refresh token revoked or expired' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.is_active) {
      return res.status(403).json({ success: false, error: 'User no longer active' });
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    const refreshExpiry = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES_IN));

    // Rotate refresh token: revoke old, issue new
    await RefreshToken.revoke(hashToken(refreshToken));
    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      expiresAt: refreshExpiry,
    });
    await User.setRefreshToken(user.id, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.revoke(hashToken(refreshToken));
    }
    if (req.user?.id) {
      await User.setRefreshToken(req.user.id, null);
      await RefreshToken.revokeAllForUser(req.user.id);
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.status(200).json({ success: true, data: { ...user, user } });
  } catch (error) {
    logger.error('Fetch profile failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, avatarUrl, notificationPreferences, aiSettings } = req.body;
    const updatedUser = await User.updateProfile(userId, {
      firstName,
      lastName,
      avatarUrl,
      notificationPreferences,
      aiSettings,
    });
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    logger.error('Update profile failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }

    const userWithHash = await queryOne('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!userWithHash) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, userWithHash.password_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await User.updatePassword(userId, newHash);

    logger.info('User changed password', { userId });
    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to change password' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await User.setPasswordResetToken(user.id, resetToken);

    sendPasswordResetEmail(
      email,
      resetToken,
      env.FRONTEND_URL || 'http://localhost:5173'
    ).catch((err) => logger.error('Password reset email send failed', { error: err.message }));

    logger.info('Password reset requested', { userId: user.id, email });

    return res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    });
  } catch (error) {
    logger.error('Forgot password failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to process request' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const user = await User.findByPasswordResetToken(token);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    await User.updatePassword(user.id, passwordHash);
    await User.clearPasswordResetToken(user.id);

    logger.info('Password reset completed', { userId: user.id, email: user.email });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    logger.error('Reset password failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }

    const user = await User.findByVerificationToken(token);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
    }

    await User.markEmailVerified(user.id);
    logger.info('Email verified', { userId: user.id, email: user.email });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: { emailVerified: true, user },
    });
  } catch (error) {
    logger.error('Email verification failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal whether the email exists
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a verification link has been sent.',
      });
    }

    if (user.email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified. You can sign in.',
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await User.setVerificationToken(user.id, verificationToken);

    sendVerificationEmail(
      email,
      verificationToken,
      env.FRONTEND_URL || 'http://localhost:5173'
    ).catch((err) => logger.error('Verification email send failed', { error: err.message }));

    logger.info('Verification email resent', { userId: user.id, email });

    return res.status(200).json({
      success: true,
      message: 'If that email is registered, a verification link has been sent.',
    });
  } catch (error) {
    logger.error('Resend verification failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to resend verification' });
  }
};

export const listUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    const users = await User.list(limit, offset);
    const total = await User.count();
    return res.status(200).json({
      success: true,
      data: users,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    logger.error('List users failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to list users' });
  }
};

const ALLOWED_ROLES = ['admin', 'maintainer', 'viewer', 'editor'];

export const createUser = async (req, res) => {
  try {
    const { email, username, firstName, lastName, password, role } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, username and password are required',
      });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
    }

    const assignedRole =
      role && ALLOWED_ROLES.includes(role) ? role : 'viewer';

    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ success: false, error: 'Username already taken' });
    }

    const user = await User.create({ email, username, firstName, lastName, password, role: assignedRole });

    logger.info('User created by admin', {
      adminId: req.user?.id,
      userId: user.id,
      username,
    });
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user },
    });
  } catch (error) {
    logger.error('Create user failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to create user' });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    logger.error('Fetch user failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { role, is_active } = req.body;
    if (role === undefined && is_active === undefined) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (
      req.user?.id === req.params.id &&
      is_active === false
    ) {
      return res
        .status(400)
        .json({ success: false, error: 'Cannot deactivate your own account' });
    }

    const updated = await User.update(req.params.id, { role, is_active });
    return res.status(200).json({ success: true, data: { user: updated } });
  } catch (error) {
    logger.error('Update user failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (req.user?.id === req.params.id) {
      return res
        .status(400)
        .json({ success: false, error: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await User.delete(req.params.id);
    logger.info('User deleted by admin', { adminId: req.user?.id, userId: req.params.id });
    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
};

function parseExpiry(value) {
  if (typeof value === 'number') return value * 1000;
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * unit;
}

export default {
  register,
  login,
  refresh,
  logout,
  me,
  listUsers,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
