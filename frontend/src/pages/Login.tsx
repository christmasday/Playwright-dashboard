/**
 * Login Page — redesigned to match landing page theme
 */

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const needsVerification = useAuthStore((s) => s.needsVerification);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const unverifiedEmail = useAuthStore((s) => s.unverifiedEmail);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch {
      /* error surfaced via store */
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#08080a]">
      {/* Animated background matching landing page */}
      <div className="aurora animate-drift fixed inset-0 z-0" />
      <div className="grid-overlay fixed inset-0 z-0" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
              <i className="fas fa-chart-line text-xs"></i>
            </span>
            <span className="text-xl font-semibold text-[#f4f4f7]">Playwright Dashboard</span>
          </div>
        </div>

        {/* Glass card */}
        <div className="bg-[#0e0e13]/80 border border-[#20202a] rounded-2xl shadow-xl p-8" style={{ backdropFilter: 'blur(20px)' }}>
          <h1 className="text-2xl font-bold text-[#f4f4f7] mb-1">Sign in to your account</h1>
          <p className="text-sm text-[#9a9aa5] mb-6">Enter your credentials to continue</p>

          {needsVerification && (
            <div className="mb-4 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Your email has not been verified. Check your inbox for a verification link.
            </div>
          )}

          {error && !needsVerification && (
            <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {typeof error === 'string' ? error : String(error)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f4f4f7] mb-1">Email or username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-3 bg-[#14141b] border border-[#20202a] rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f4f4f7] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#14141b] border border-[#20202a] rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {needsVerification && unverifiedEmail && (
            <div className="mt-4 text-center">
              <button
                onClick={() => resendVerification(unverifiedEmail)}
                className="text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
              >
                Resend verification email
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              Forgot your password?
            </Link>
          </div>

          <p className="mt-6 text-sm text-[#9a9aa5] text-center">
            No account?{' '}
            <Link to="/signup" className="text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
