/**
 * Signup / Register Page — redesigned to match landing page theme
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [form, setForm] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (form.password !== form.confirmPassword) {
      return;
    }

    try {
      await register({
        email: form.email,
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
      });
      navigate('/verify-email', { state: { email: form.email } });
    } catch {
      /* error surfaced via store */
    }
  };

  const passwordsMatch = form.password === form.confirmPassword;
  const showPasswordError = !!form.confirmPassword && !passwordsMatch;

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
          <h1 className="text-2xl font-bold text-[#f4f4f7] mb-1">Create your account</h1>
          <p className="text-sm text-[#9a9aa5] mb-6">Join the teams running calmer, faster test pipelines</p>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#f4f4f7] mb-1">First name</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-4 py-3 bg-[#14141b] border border-[#20202a] rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-colors"
                  placeholder="Ada"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#f4f4f7] mb-1">Last name</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-4 py-3 bg-[#14141b] border border-[#20202a] rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-colors"
                  placeholder="Lovelace"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f4f4f7] mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 bg-[#14141b] border border-[#20202a] rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f4f4f7] mb-1">Username</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-4 py-3 bg-[#14141b] border border-[#20202a] rounded-xl text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition-colors"
                placeholder="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f4f4f7] mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
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
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
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
              disabled={loading || showPasswordError}
              className="w-full py-3 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Sign up'}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#9a9aa5] text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
