import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import IntegrationSettings from './IntegrationSettings';
import StorageSettings from './StorageSettings';
import ApiKeys from './ApiKeys';
import AiByokSettings from '../components/Settings/AiByokSettings';
import NotificationPreferences from '../components/Settings/NotificationPreferences';

export type SettingsTab = 'integrations' | 'storage' | 'ai' | 'notifications' | 'api-keys';

interface UserSettingsProps {
  initialTab?: SettingsTab;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ initialTab }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const resolveTab = (): SettingsTab => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('/storage')) return 'storage';
    if (location.pathname.includes('/ai')) return 'ai';
    if (location.pathname.includes('/notifications')) return 'notifications';
    if (location.pathname.includes('/api-keys')) return 'api-keys';
    if (location.pathname.includes('/integrations')) return 'integrations';
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') as SettingsTab;
    if (tabParam && ['integrations', 'storage', 'ai', 'notifications', 'api-keys'].includes(tabParam)) {
      return tabParam;
    }
    return 'integrations';
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(resolveTab());

  useEffect(() => {
    setActiveTab(resolveTab());
  }, [location.pathname, location.search, initialTab]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (tab === 'storage') {
      navigate('/settings/storage');
    } else if (tab === 'ai') {
      navigate('/settings/ai');
    } else if (tab === 'notifications') {
      navigate('/settings/notifications');
    } else if (tab === 'api-keys') {
      navigate('/settings/api-keys');
    } else {
      navigate('/settings/integrations');
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f7]">
      {/* Settings Navigation Header & Tab Bar */}
      <div className="border-b border-[#20202a] bg-[#0c0c11]/90 backdrop-blur-md sticky top-0 z-30 px-6 pt-5 pb-0 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6] shadow-sm">
                <i className="fas fa-sliders text-sm"></i>
              </span>
              <div>
                <h1 className="text-xl font-bold text-[#f4f4f7]">User & System Settings</h1>
                <p className="text-xs text-[#9a9aa5] mt-0.5">
                  Manage issue tracker integrations, storage retention, AI BYOK diagnostics, alerts, and reporter API keys.
                </p>
              </div>
            </div>
          </div>

          {/* Unified Settings Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              id="tab-integrations"
              type="button"
              onClick={() => handleTabChange('integrations')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all select-none whitespace-nowrap ${
                activeTab === 'integrations'
                  ? 'bg-[#14141b] border-[#20202a] text-[#3b82f6] border-b-2 border-b-[#3b82f6] shadow-sm'
                  : 'text-[#9a9aa5] hover:text-[#f4f4f7] border-transparent hover:bg-[#14141b]/50'
              }`}
            >
              <i className="fas fa-ticket text-xs"></i>
              <span>GitHub & Jira Integrations</span>
            </button>

            <button
              id="tab-storage"
              type="button"
              onClick={() => handleTabChange('storage')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all select-none whitespace-nowrap ${
                activeTab === 'storage'
                  ? 'bg-[#14141b] border-[#20202a] text-emerald-400 border-b-2 border-b-emerald-400 shadow-sm'
                  : 'text-[#9a9aa5] hover:text-[#f4f4f7] border-transparent hover:bg-[#14141b]/50'
              }`}
            >
              <i className="fas fa-database text-xs"></i>
              <span>Storage & Data Retention</span>
            </button>

            <button
              id="tab-ai"
              type="button"
              onClick={() => handleTabChange('ai')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all select-none whitespace-nowrap ${
                activeTab === 'ai'
                  ? 'bg-[#14141b] border-[#20202a] text-cyan-400 border-b-2 border-b-cyan-400 shadow-sm'
                  : 'text-[#9a9aa5] hover:text-[#f4f4f7] border-transparent hover:bg-[#14141b]/50'
              }`}
            >
              <i className="fas fa-wand-magic-sparkles text-xs"></i>
              <span>AI & BYOK Provider</span>
            </button>

            <button
              id="tab-notifications"
              type="button"
              onClick={() => handleTabChange('notifications')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all select-none whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'bg-[#14141b] border-[#20202a] text-amber-400 border-b-2 border-b-amber-400 shadow-sm'
                  : 'text-[#9a9aa5] hover:text-[#f4f4f7] border-transparent hover:bg-[#14141b]/50'
              }`}
            >
              <i className="fas fa-bell text-xs"></i>
              <span>Notification Preferences</span>
            </button>

            <button
              id="tab-api-keys"
              type="button"
              onClick={() => handleTabChange('api-keys')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t border-x transition-all select-none whitespace-nowrap ${
                activeTab === 'api-keys'
                  ? 'bg-[#14141b] border-[#20202a] text-yellow-400 border-b-2 border-b-yellow-400 shadow-sm'
                  : 'text-[#9a9aa5] hover:text-[#f4f4f7] border-transparent hover:bg-[#14141b]/50'
              }`}
            >
              <i className="fas fa-key text-xs"></i>
              <span>API Keys</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab View Container */}
      <div className="py-2">
        {activeTab === 'integrations' && <IntegrationSettings />}
        {activeTab === 'storage' && <StorageSettings />}
        {activeTab === 'ai' && <AiByokSettings />}
        {activeTab === 'notifications' && <NotificationPreferences />}
        {activeTab === 'api-keys' && <ApiKeys />}
      </div>
    </div>
  );
};

export default UserSettings;
