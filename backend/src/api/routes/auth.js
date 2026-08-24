/**
 * Authentication Routes
 */
import express from 'express';
import {
  authenticateToken,
  requireAdmin,
} from '../middleware/auth.js';
import {
  register,
  login,
  refresh,
  logout,
  me,
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
} from '../controllers/authController.js';

const router = express.Router();

// Public
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, me);
router.patch('/profile', authenticateToken, updateProfile);
router.post('/change-password', authenticateToken, changePassword);

// Admin only
router.get('/users', authenticateToken, requireAdmin, listUsers);
router.post('/users', authenticateToken, requireAdmin, createUser);
router.get('/users/:id', authenticateToken, requireAdmin, getUser);
router.patch('/users/:id', authenticateToken, requireAdmin, updateUser);
router.delete('/users/:id', authenticateToken, requireAdmin, deleteUser);

export default router;
