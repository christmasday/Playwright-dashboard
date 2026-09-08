import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export const NotificationPreferences: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const loading = useAuthStore((s) => s.loading);

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    flakyAlerts: true,
    buildFailures: true,
    weeklyDigest: false,
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
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

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setSaving(true);
    try {
      await updateProfile({
        notificationPreferences: notifications,
      });
      setSuccessMsg('Notification preferences updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/20">
              <i className="fas fa-bell text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f4f4f7] flex items-center gap-3">
                <span>Notification Preferences</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Alert Rules
                </span>
              </h1>
              <p className="text-sm text-[#9a9aa5] mt-1">
                Configure automated alert dispatching for test suite events and digest summaries.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main In-App Notification Preferences Card */}
      <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="border-b border-[#20202a] pb-4">
          <h2 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
            <i className="fas fa-bell text-[#3b82f6]"></i> In-App Notification Preferences
          </h2>
          <p className="text-xs text-[#9a9aa5] mt-1">Configure automated alert dispatching for test suite events.</p>
        </div>

        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
            <i className="fas fa-check-circle"></i> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <i className="fas fa-circle-exclamation"></i> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
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
              type="submit"
              disabled={saving || loading}
              className="px-5 py-2.5 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
              <span>{saving ? 'Saving Preferences...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationPreferences;
