/**
 * Reset Password Page
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const passwordMatch = password === confirmPassword;
  const showPasswordError = confirmPassword && !passwordMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || showPasswordError) return;
    clearError();
    try {
      await resetPassword(token, password);
      setShowSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch {
      /* error surfaced via store */
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#08080a]">
        <div className="aurora animate-drift fixed inset-0 z-0" />
        <div className="grid-overlay fixed inset-0 z-0" />
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
                <i className="fas fa-chart-line text-xs"></i>
              </span>
              <span className="text-xl font-semibold text-[#f4f4f7]">Playwright Dashboard</span>
            </div>
          </div>
          <div className="bg-[#0e0e13]/80 border border-[#20202a] rounded-2xl shadow-xl p-8" style={{ backdropFilter: 'blur(20px)' }}>
            <h1 className="text-2xl font-bold text-[#f4f4f7] mb-3">Invalid reset link</h1>
            <p className="text-sm text-[#9a9aa5] mb-6">The password reset link you followed is invalid or has expired.</p>
            <Link to="/forgot-password" className="inline-block w-full py-3 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity">
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#08080a]">
      <div className="aurora animate-drift fixed inset-0 z-0" />
      <div className="grid-overlay fixed inset-0 z-0" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
              <i className="fas fa-chart-line text-xs"></i>
            </span>
            <span className="text-xl font-semibold text-[#f4f4f7]">Playwright Dashboard</span>
          </div>
        </div>

        <div className="bg-[#0e0e13]/80 border border-[#20202a] rounded-2xl shadow-xl p-8" style={{ backdropFilter: 'blur(20px)' }}>
          {showSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-check-circle text-2xl text-green-400"></i>
              </div>
              <h1 className="text-2xl font-bold text-[#f4f4f7] mb-3">Password reset!</h1>
              <p className="text-sm text-[#9a9aa5] mb-6">Your password has been updated. Redirecting to sign in…</p>
              <Link to="/login" className="inline-block py-3 px-8 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity">
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#f4f4f7] mb-1">Set a new password</h1>
              <p className="text-sm text-[#9a9aa5] mb-6">Enter a strong password for your account.</p>

              {error && (
                <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#f4f4f7] mb-1">New password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#14141b] border border-[#20202a] rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-colors"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#f4f4f7] mb-1">Confirm password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 bg-[#14141b] border rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                      showPasswordError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-[#20202a] focus:ring-[#3b82f6]'
                    }`}
                    placeholder="Confirm password"
                  />
                  {showPasswordError && (
                    <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || showPasswordError || !password}
                  className="w-full py-3 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-sm text-[#9a9aa5] text-center">
            <Link to="/login" className="text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
