/**
 * User Profile & Account Settings Page
 * Manage name, avatar, password, and in-app notification preferences.
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
];

const ProfileSettings: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);
  const loading = useAuthStore((s) => s.loading);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    flakyAlerts: true,
    buildFailures: true,
    weeklyDigest: false,
  });

  // UI status banners
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || user.first_name || '');
      setLastName(user.lastName || user.last_name || '');
      setAvatarUrl(user.avatarUrl || user.avatar_url || '');

      let prefs = user.notificationPreferences || user.notification_preferences;
      if (typeof prefs === 'string') {
        try {
          prefs = JSON.parse(prefs);
        } catch {
          prefs = undefined;
        }
      }
      if (prefs && typeof prefs === 'object') {
        setNotifications({
          emailAlerts: prefs.emailAlerts ?? true,
          flakyAlerts: prefs.flakyAlerts ?? true,
          buildFailures: prefs.buildFailures ?? true,
          weeklyDigest: prefs.weeklyDigest ?? false,
        });
      }
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    try {
      await updateProfile({
        firstName,
        lastName,
        avatarUrl,
        notificationPreferences: notifications,
      });
      setProfileSuccess('Profile details and preferences updated successfully!');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err?.response?.data?.error || err.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err?.response?.data?.error || err.message || 'Failed to change password');
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-[#08080a] min-h-screen text-[#f4f4f7]">
      {/* Header Banner */}
      <div className="border-b border-[#20202a] pb-6">
        <div className="flex items-center space-x-3 mb-2">
          <span className="w-9 h-9 rounded-xl bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
            <i className="fas fa-[#3b82f6] fa-user-cog text-base"></i>
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">Account & Profile Settings</h1>
        </div>
        <p className="text-xs text-[#9a9aa5]">
          Manage your personal display name, profile avatar, security password, and in-app notification preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Profile Info Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Details Card */}
          <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#20202a] pb-4">
              <h2 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
                <i className="fas fa-id-card text-[#3b82f6]"></i> Personal Details & Avatar
              </h2>
            </div>

            {profileSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <i className="fas fa-check-circle"></i> {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <i className="fas fa-exclamation-circle"></i> {profileError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Avatar Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#9a9aa5]">Profile Image Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#08080a] border-2 border-[#3b82f6] overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-user text-2xl text-[#3b82f6]"></i>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="Paste Image URL (https://...)"
                      className="w-full px-3.5 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6]"
                    />
                    <div className="flex items-center gap-2 overflow-x-auto pt-1">
                      <span className="text-[10px] text-[#9a9aa5] whitespace-nowrap">Or pick preset:</span>
                      {PRESET_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatarUrl(url)}
                          className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-transform hover:scale-110 ${
                            avatarUrl === url ? 'border-[#3b82f6]' : 'border-transparent'
                          }`}
                        >
                          <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9a9aa5] mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-4 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9a9aa5] mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-4 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9a9aa5] mb-1.5">Username</label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="w-full px-4 py-2.5 bg-[#08080a]/50 border border-[#20202a] rounded-xl text-xs text-[#9a9aa5] cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#9a9aa5] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 bg-[#08080a]/50 border border-[#20202a] rounded-xl text-xs text-[#9a9aa5] cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>

          {/* In-App Notification Preferences Card */}
          <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="border-b border-[#20202a] pb-4">
              <h2 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
                <i className="fas fa-bell text-[#3b82f6]"></i> In-App Notification Preferences
              </h2>
              <p className="text-xs text-[#9a9aa5] mt-1">Configure automated alert dispatching for test suite events.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#08080a] border border-[#20202a] rounded-xl">
                <div>
                  <div className="text-xs font-bold text-[#f4f4f7]">Email Notifications</div>
                  <div className="text-[11px] text-[#9a9aa5]">Receive build run summaries and status notifications via email.</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('emailAlerts')}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    notifications.emailAlerts ? 'bg-[#3b82f6]' : 'bg-[#20202a]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white block transition-transform ${
                      notifications.emailAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#08080a] border border-[#20202a] rounded-xl">
                <div>
                  <div className="text-xs font-bold text-[#f4f4f7]">Flaky Test Alerts</div>
                  <div className="text-[11px] text-[#9a9aa5]">Instant notification when test flakiness score crosses risk thresholds.</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('flakyAlerts')}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    notifications.flakyAlerts ? 'bg-[#3b82f6]' : 'bg-[#20202a]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white block transition-transform ${
                      notifications.flakyAlerts ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#08080a] border border-[#20202a] rounded-xl">
                <div>
                  <div className="text-xs font-bold text-[#f4f4f7]">Build Failure Alerts</div>
                  <div className="text-[11px] text-[#9a9aa5]">High priority alerts for failed test runs in active projects.</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('buildFailures')}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    notifications.buildFailures ? 'bg-[#3b82f6]' : 'bg-[#20202a]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white block transition-transform ${
                      notifications.buildFailures ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#08080a] border border-[#20202a] rounded-xl">
                <div>
                  <div className="text-xs font-bold text-[#f4f4f7]">Weekly Summary Digest</div>
                  <div className="text-[11px] text-[#9a9aa5]">Weekly analytical summary of project test suite health.</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification('weeklyDigest')}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    notifications.weeklyDigest ? 'bg-[#3b82f6]' : 'bg-[#20202a]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white block transition-transform ${
                      notifications.weeklyDigest ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleUpdateProfile}
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Security & Password Change Section */}
        <div className="space-y-8">
          <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="border-b border-[#20202a] pb-4">
              <h2 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
                <i className="fas fa-lock text-[#3b82f6]"></i> Security & Password
              </h2>
              <p className="text-xs text-[#9a9aa5] mt-1">Change your account password.</p>
            </div>

            {passwordSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <i className="fas fa-check-circle"></i> {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <i className="fas fa-exclamation-circle"></i> {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9a9aa5] mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9a9aa5] mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9a9aa5] mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#20202a] border border-[#30303f] hover:bg-[#252535] text-xs font-bold text-[#f4f4f7] rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
