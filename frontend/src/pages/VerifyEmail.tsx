/**
 * Email Verification Page
 * Shown after signup — displays verification status and resend option.
 * If a token is provided in the URL, automatically verifies.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [status, setStatus] = useState<'checking' | 'verified' | 'error'>('checking');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      handleVerify(token);
    } else {
      const emailFromState = searchParams.get('email') || '';
      setEmail(emailFromState);
      setStatus('checking');
    }
  }, [searchParams]);

  const handleVerify = async (token: string) => {
    clearError();
    setStatus('checking');
    try {
      await verifyEmail(token);
      setStatus('verified');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch {
      setStatus('error');
    }
  };

  const handleResend = async () => {
    if (!email) return;
    clearError();
    try {
      await resendVerification(email);
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

        <div className="bg-[#0e0e13]/80 border border-[#20202a] rounded-2xl shadow-xl p-8" style={{ backdropFilter: 'blur(20px)' }}>
          {status === 'checking' && (
            <>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#14141b] border border-[#20202a] flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-envelope text-2xl text-[#3b82f6]"></i>
                </div>
                <h1 className="text-2xl font-bold text-[#f4f4f7] mb-3">Verify your email</h1>
                <p className="text-sm text-[#9a9aa5] mb-6">
                  {email ? `We sent a verification link to ${email}. Open your inbox to continue.` : 'Checking your verification link…'}
                </p>
              </div>
            </>
          )}

          {status === 'verified' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-check-circle text-2xl text-green-400"></i>
              </div>
              <h1 className="text-2xl font-bold text-[#f4f4f7] mb-3">Email verified!</h1>
              <p className="text-sm text-[#9a9aa5] mb-6">Your email has been verified successfully. Redirecting to sign in…</p>
              <Link to="/login" className="inline-block py-2 px-6 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity">
                Sign in now
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-exclamation-circle text-2xl text-red-400"></i>
              </div>
              <h1 className="text-2xl font-bold text-[#f4f4f7] mb-3">Verification failed</h1>
              <p className="text-sm text-[#9a9aa5] mb-6">
                {error || 'The verification link may be invalid or expired.'}
              </p>
              {email && (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="w-full py-2 rounded-xl font-medium text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Resending…' : 'Resend verification email'}
                </button>
              )}
              <Link to="/login" className="block text-center text-sm text-[#3b82f6] hover:text-[#60a5fa] mt-4 transition-colors">
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
