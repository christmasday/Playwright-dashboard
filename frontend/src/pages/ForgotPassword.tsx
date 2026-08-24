/**
 * Forgot Password Page
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ForgotPassword: React.FC = () => {
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch {
      /* error surfaced via store */
    }
  };

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
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#14141b] border border-[#20202a] flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-check-circle text-2xl text-green-400"></i>
              </div>
              <h1 className="text-2xl font-bold text-[#f4f4f7] mb-3">Check your email</h1>
              <p className="text-sm text-[#9a9aa5] mb-6">
                If an account with that email exists, we've sent a password reset link.
                The link will expire in 1 hour.
              </p>
              <Link to="/login" className="inline-block py-2 px-6 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-[#f4f4f7] mb-1">Forgot your password?</h1>
              <p className="text-sm text-[#9a9aa5] mb-6">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#f4f4f7] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 bg-[#14141b] border border-[#20202a] rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          {!submitted && (
            <p className="mt-6 text-sm text-[#9a9aa5] text-center">
              Remember your password?{' '}
              <Link to="/login" className="text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
