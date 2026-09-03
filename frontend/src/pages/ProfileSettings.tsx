/**
 * User Profile & Account Settings Page
 * Manage name, avatar, password, and in-app notification preferences.
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiService from '../services/api';

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

  // AI Provider & BYOK State
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [preferredProvider, setPreferredProvider] = useState('gemini');
  const [aiApiKey, setAiApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [customModelId, setCustomModelId] = useState('');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<any[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; latencyMs?: number; error?: string } | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [savingAi, setSavingAi] = useState(false);

  // Fetch supported providers on mount
  useEffect(() => {
    apiService.getAiProviders()
      .then((resp) => {
        if (resp.data?.providers) {
          setAvailableProviders(resp.data.providers);
        }
      })
      .catch((err) => console.error('Failed to load AI providers:', err));
  }, []);

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

      let ai = user.aiSettings || user.ai_settings;
      if (typeof ai === 'string') {
        try {
          ai = JSON.parse(ai);
        } catch {
          ai = undefined;
        }
      }
      if (ai && typeof ai === 'object') {
        if (ai.preferredProvider) setPreferredProvider(ai.preferredProvider);
        if (ai.apiKey) setAiApiKey(ai.apiKey);
        if (ai.model) {
          setSelectedModel(ai.model);
          setCustomModelId(ai.model);
        }
        if (ai.customEndpoint) setCustomEndpoint(ai.customEndpoint);
      }
    }
  }, [user]);

  const handleSelectProvider = (provId: string) => {
    setPreferredProvider(provId);
    setTestResult(null);
    setFetchedModels([]);
    setIsCustomModel(false);

    const prov = availableProviders.find((p) => p.id === provId);
    if (prov) {
      setSelectedModel(prov.defaultModel || (prov.presetModels?.[0]?.id ?? ''));
      setCustomModelId(prov.defaultModel || (prov.presetModels?.[0]?.id ?? ''));
      if (prov.hasCustomEndpoint && !customEndpoint) {
        setCustomEndpoint(prov.defaultEndpoint || 'http://localhost:11434/v1');
      }
    }
  };

  const handleTestAndFetchModels = async () => {
    setTestingConnection(true);
    setTestResult(null);
    setAiError(null);

    const modelToTest = isCustomModel ? customModelId : selectedModel;
    try {
      const testResp = await apiService.testAiConnection({
        provider: preferredProvider,
        apiKey: aiApiKey,
        customEndpoint: preferredProvider === 'ollama' ? customEndpoint : undefined,
        model: modelToTest,
      });

      setTestResult(testResp.data);

      if (preferredProvider !== 'heuristics') {
        setFetchingModels(true);
        const modelsResp = await apiService.fetchAiModels({
          provider: preferredProvider,
          apiKey: aiApiKey,
          customEndpoint: preferredProvider === 'ollama' ? customEndpoint : undefined,
        });

        if (modelsResp.data?.models && modelsResp.data.models.length > 0) {
          setFetchedModels(modelsResp.data.models);
        }
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err.message || 'Connection test failed';
      setTestResult({ success: false, error: errMsg });
    } finally {
      setTestingConnection(false);
      setFetchingModels(false);
    }
  };

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiSuccess(null);
    setAiError(null);
    setSavingAi(true);
    try {
      const modelToSave = isCustomModel ? customModelId : selectedModel;
      await updateProfile({
        aiSettings: {
          preferredProvider,
          apiKey: aiApiKey,
          model: modelToSave,
          customEndpoint: preferredProvider === 'ollama' ? customEndpoint : undefined,
        },
      });
      setAiSuccess('AI Provider & BYOK settings saved successfully!');
      setTimeout(() => setAiSuccess(null), 4000);
    } catch (err: any) {
      setAiError(err?.response?.data?.error || err.message || 'Failed to save AI settings');
    } finally {
      setSavingAi(false);
    }
  };

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

          {/* AI Root Cause & BYOK Provider Settings Card */}
          <div className="bg-[#14141b] border border-[#20202a] rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="border-b border-[#20202a] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                    <i className="fas fa-wand-magic-sparkles"></i>
                  </span>
                  AI Root Cause & BYOK Provider Configuration
                </h2>
                <p className="text-xs text-[#9a9aa5] mt-1">
                  Bring Your Own Key (BYOK) for LLM-powered Playwright failure diagnostics and fix suggestions.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full self-start sm:self-center">
                <i className="fas fa-check-circle mr-1"></i> Live Model Discovery Active
              </span>
            </div>

            {aiSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <i className="fas fa-check-circle"></i>
                <span>{aiSuccess}</span>
              </div>
            )}
            {aiError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <i className="fas fa-circle-exclamation"></i>
                <span>{aiError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAiSettings} className="space-y-6">
              {/* Provider Selection Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#f4f4f7]">
                  Select Preferred AI Provider
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(availableProviders.length > 0
                    ? availableProviders
                    : [
                        { id: 'gemini', name: 'Google Gemini', description: 'Ultra-fast multimodal reasoning', icon: 'fa-wand-magic-sparkles' },
                        { id: 'openai', name: 'OpenAI', description: 'Flagship GPT-4o & reasoning models', icon: 'fa-robot' },
                        { id: 'anthropic', name: 'Anthropic Claude', description: 'Claude 3.7 Sonnet & thinking models', icon: 'fa-brain' },
                        { id: 'groq', name: 'Groq Cloud', description: 'Ultra fast LPU (500+ tok/s)', icon: 'fa-bolt' },
                        { id: 'deepseek', name: 'DeepSeek API', description: 'DeepSeek-V3 & R1 reasoning', icon: 'fa-microchip' },
                        { id: 'mistral', name: 'Mistral AI', description: 'Codestral specialized code model', icon: 'fa-wind' },
                        { id: 'openrouter', name: 'OpenRouter', description: 'Universal multi-provider gateway', icon: 'fa-network-wired' },
                        { id: 'ollama', name: 'Local Ollama / Custom', description: '100% on-premise local LLMs', icon: 'fa-server' },
                        { id: 'heuristics', name: 'Built-in Heuristics', description: 'Deterministic rules (No key needed)', icon: 'fa-code' },
                      ]
                  ).map((prov) => {
                    const isSelected = preferredProvider === prov.id;
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => handleSelectProvider(prov.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10'
                            : 'bg-[#08080a] border-[#20202a] hover:border-[#353545]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                              isSelected ? 'bg-blue-500 text-white' : 'bg-[#14141b] text-[#9a9aa5]'
                            }`}>
                              <i className={`fas ${prov.icon || 'fa-microchip'}`}></i>
                            </span>
                            <span className="text-xs font-bold text-[#f4f4f7]">{prov.name}</span>
                          </div>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px]">
                              <i className="fas fa-check"></i>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#9a9aa5] mt-2 line-clamp-2">
                          {prov.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* API Key & Endpoint Inputs */}
              {preferredProvider !== 'heuristics' && (
                <div className="space-y-4 pt-2 border-t border-[#20202a]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* API Key Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-[#f4f4f7]">
                          {preferredProvider.toUpperCase()} API Key
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <i className={`fas ${showApiKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          <span>{showApiKey ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        placeholder={`Paste your ${preferredProvider} API key...`}
                        className="w-full px-4 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <p className="text-[10px] text-[#9a9aa5]">
                        Your key is stored securely in your user account profile and used exclusively for your test diagnoses.
                      </p>
                    </div>

                    {/* Model Selector & Live Discovery */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-[#f4f4f7]">
                          Active Model
                        </label>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {fetchedModels.length > 0
                            ? `✓ ${fetchedModels.length} models fetched live`
                            : 'Presets ready'}
                        </span>
                      </div>

                      {!isCustomModel ? (
                        <div className="flex gap-2">
                          <select
                            value={selectedModel}
                            onChange={(e) => {
                              if (e.target.value === '__custom__') {
                                setIsCustomModel(true);
                              } else {
                                setSelectedModel(e.target.value);
                              }
                            }}
                            className="w-full px-3.5 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-blue-500"
                          >
                            {/* If dynamic models were fetched live, show them */}
                            {fetchedModels.length > 0 ? (
                              <optgroup label="Live Discovered Models (Active from Provider)">
                                {fetchedModels.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name || m.id}
                                  </option>
                                ))}
                              </optgroup>
                            ) : (
                              /* Otherwise show current provider presets */
                              <optgroup label="Verified Active Presets">
                                {(
                                  availableProviders.find((p) => p.id === preferredProvider)?.presetModels || [
                                    { id: selectedModel, name: selectedModel },
                                  ]
                                ).map((m: any) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name || m.id}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <option value="__custom__">✍️ Custom Model ID Override...</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customModelId}
                            onChange={(e) => setCustomModelId(e.target.value)}
                            placeholder="e.g. gemini-2.5-pro, gpt-4o, codestral-latest"
                            className="w-full px-3.5 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setIsCustomModel(false)}
                            className="px-3 py-2 bg-[#1c1c26] text-[#9a9aa5] hover:text-[#f4f4f7] rounded-xl text-xs"
                            title="Back to dropdown"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-[#9a9aa5]">
                        {isCustomModel
                          ? 'Enter any specific model identifier supported by your provider account.'
                          : 'Click "Test Connection & Fetch Models" to refresh active models live.'}
                      </p>
                    </div>
                  </div>

                  {/* Custom Endpoint (for Ollama or custom local server) */}
                  {preferredProvider === 'ollama' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#f4f4f7]">
                        Ollama / Local OpenAI Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={customEndpoint}
                        onChange={(e) => setCustomEndpoint(e.target.value)}
                        placeholder="http://localhost:11434/v1"
                        className="w-full px-4 py-2.5 bg-[#08080a] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] font-mono focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-[10px] text-[#9a9aa5]">
                        Compatible with Ollama, LM Studio, vLLM, or LocalAI OpenAI-compatible endpoints.
                      </p>
                    </div>
                  )}

                  {/* Test Connection Action & Feedback */}
                  <div className="bg-[#08080a] border border-[#20202a] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-[#f4f4f7] flex items-center gap-2">
                        <span>Live Connection & Model Discovery</span>
                        {testResult?.success && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {testResult.latencyMs}ms Latency
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9a9aa5] mt-0.5">
                        {testResult?.message ||
                          testResult?.error ||
                          'Test your key against the provider API and automatically load the latest active models.'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestAndFetchModels}
                      disabled={testingConnection || fetchingModels}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 self-start sm:self-center shrink-0 disabled:opacity-50"
                    >
                      <i className={`fas ${testingConnection || fetchingModels ? 'fa-spinner fa-spin' : 'fa-network-wired'}`}></i>
                      <span>
                        {testingConnection
                          ? 'Pinging Provider...'
                          : fetchingModels
                          ? 'Fetching Models...'
                          : 'Test & Discover Models'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Heuristics Banner */}
              {preferredProvider === 'heuristics' && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-sm shrink-0">
                    <i className="fas fa-shield-check"></i>
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#f4f4f7]">Zero-Setup Playwright Diagnostic Engine</h4>
                    <p className="text-[11px] text-[#9a9aa5] mt-1 leading-relaxed">
                      Uses built-in deterministic heuristic analysis for common Playwright errors (strict mode locator violations, hydration race conditions, assertion diffs, 500 network errors, and action timeouts). Requires 0 API keys and executes in under 5ms with zero data sent externally.
                    </p>
                  </div>
                </div>
              )}

              {/* Save AI Settings Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingAi}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  <i className={`fas ${savingAi ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                  <span>{savingAi ? 'Saving AI Settings...' : 'Save AI Settings'}</span>
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
