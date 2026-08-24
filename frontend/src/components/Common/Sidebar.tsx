/**
 * Sidebar Navigation Component with User Profile Dropdown
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Analytics', path: '/analytics', icon: '📈' },
    { label: 'Projects', path: '/projects', icon: '📁' },
    { label: 'Builds', path: '/builds', icon: '🏗️' },
    { label: 'Flaky Tests', path: '/flaky-tests', icon: '⚠️' },
    { label: 'API Keys', path: '/settings/api-keys', icon: '🔑' },
    { label: 'Documentation', path: '/docs', icon: '📚' },
    ...(user?.role === 'admin'
      ? [{ label: 'Users', path: '/users', icon: '👥' } as NavItem]
      : []),
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const handleNavigateToSettings = () => {
    setDropdownOpen(false);
    navigate('/settings/profile');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName =
    user?.firstName || user?.first_name
      ? `${user.firstName || user.first_name} ${user.lastName || user.last_name || ''}`.trim()
      : user?.username;

  const avatarUrl = user?.avatarUrl || user?.avatar_url;

  return (
    <aside className="w-64 bg-[#0e0e13]/80 border-r border-[#20202a] flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-6">
        <Link to="/dashboard" aria-label="Playwright Brand" className="flex items-center space-x-2.5">
          <span className="w-8 h-8 rounded-lg bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
            <i className="fas fa-chart-line text-xs"></i>
          </span>
          <div>
            <h1 className="text-xl font-bold text-[#f4f4f7]">Playwright</h1>
            <p className="text-xs text-[#9a9aa5] -mt-0.5">Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Main Nav Items */}
      <nav className="mt-4 space-y-1 px-4 flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-2.5 rounded-xl transition-all ${
              isActive(item.path)
                ? 'bg-[#3b82f6]/10 text-[#3b82f6] font-semibold border border-[#3b82f6]/30'
                : 'text-[#9a9aa5] hover:bg-[#14141b] hover:text-[#f4f4f7]'
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom User Profile Section with Interactive Settings Dropdown */}
      <div className="p-4 border-t border-[#20202a] relative" ref={dropdownRef}>
        {user && (
          <div>
            {/* Interactive User Display Card */}
            <div
              aria-label="User Profile"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${
                dropdownOpen
                  ? 'bg-[#14141b] border-[#3b82f6]/40 text-[#f4f4f7]'
                  : 'bg-[#08080a] border-[#20202a] hover:bg-[#14141b] hover:border-[#30303f] text-[#9a9aa5]'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#14141b] border border-[#20202a] overflow-hidden flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName || 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-user-circle text-[#3b82f6] text-base"></i>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#f4f4f7] truncate">{displayName}</div>
                <div className="text-[10px] text-[#9a9aa5] truncate">@{user.username}</div>
              </div>

              <i
                className={`fas fa-chevron-up text-xs text-[#9a9aa5] transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180 text-[#3b82f6]' : ''
                }`}
              />
            </div>

            {/* Profile Settings Floating Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#101017] border border-[#20202a] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {/* User Info Header */}
                <div className="p-3.5 bg-[#08080a] border-b border-[#20202a] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#14141b] border border-[#20202a] overflow-hidden flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-user-circle text-[#3b82f6] text-lg"></i>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#f4f4f7] truncate">{displayName}</div>
                    <div className="text-[10px] text-[#9a9aa5] truncate">{user.email}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30">
                      {user.role}
                    </span>
                  </div>
                </div>

                {/* Dropdown Action Menu */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={handleNavigateToSettings}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-[#f4f4f7] hover:bg-[#1c1c26] rounded-xl transition-colors font-medium text-left"
                  >
                    <span className="w-7 h-7 rounded-lg bg-[#14141b] border border-[#20202a] flex items-center justify-center text-[#3b82f6]">
                      <i className="fas fa-cog text-xs"></i>
                    </span>
                    <div>
                      <div className="font-semibold">Profile Settings</div>
                      <div className="text-[10px] text-[#9a9aa5]">Name, password, avatar & alerts</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-[#20202a]" />

                  <button
                    aria-label="Logout"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-medium text-left"
                  >
                    <span className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                      <i className="fas fa-sign-out-alt text-xs"></i>
                    </span>
                    <div className="font-semibold">Sign Out</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-[10px] text-[#5e5e68] pt-2 text-center">
          <p>&copy; 2026 Playwright Dashboard v1.0.0</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
