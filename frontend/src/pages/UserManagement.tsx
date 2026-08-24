/**
 * User Management & Project Access Overview Page
 * Admins can manage all users in the system; non-admin users can inspect their team memberships & project access.
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import apiService from '../services/api';
import type { User, UserRole, Project } from '../types/api';

const ROLES: UserRole[] = ['admin', 'maintainer', 'viewer', 'editor'];

const UserManagement: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'viewer' as UserRole,
  });

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const resp = await apiService.listUsers(100, 0);
      setUsers(resp.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProjects = async () => {
    setLoading(true);
    try {
      const resp = await apiService.listProjects();
      setUserProjects(resp.data.data || resp.data.projects || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load project memberships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    } else {
      loadUserProjects();
    }
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiService.createUser({
        email: form.email,
        username: form.username,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
        role: form.role,
      });
      setShowCreate(false);
      setForm({
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        password: '',
        role: 'viewer',
      });
      loadAdminData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to create user');
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await apiService.updateUser(u.id, { is_active: !u.isActive });
      loadAdminData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Update failed');
    }
  };

  const remove = async (u: User) => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await apiService.deleteUser(u.id);
      loadAdminData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Delete failed');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f7]">My Project Memberships & Access</h1>
          <p className="text-xs text-[#9a9aa5]">Projects you have been invited to view or admin</p>
        </div>

        {loading ? (
          <p className="text-[#9a9aa5]">Loading project access…</p>
        ) : (
          <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0e0e13]/50 border-b border-[#20202a]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Project Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#f4f4f7]">Access</th>
                </tr>
              </thead>
              <tbody>
                {userProjects.map((p) => (
                  <tr key={p.id} className="border-t border-[#20202a]">
                    <td className="px-4 py-3 font-medium text-[#f4f4f7]">{p.name}</td>
                    <td className="px-4 py-3 text-[#9a9aa5] text-xs">{p.description || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs capitalize font-medium">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-3 py-1 bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#3b82f6] rounded-full text-xs font-semibold uppercase">
                        Member / {p.memberRole || 'Viewer'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f7]">User Management</h1>
          <p className="text-xs text-[#9a9aa5]">System administrator controls for organization users</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-4 py-2 rounded-xl font-medium text-xs text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity"
        >
          {showCreate ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-[#1a1a22] border border-[#20202a] rounded-xl p-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              required
              type="text"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="px-4 py-2.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors"
            />
            <input
              required
              type="text"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="px-4 py-2.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-4 py-2.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors"
            />
            <input
              required
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="px-4 py-2.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors"
            />
            <input
              required
              minLength={8}
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-4 py-2.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="px-4 py-2.5 bg-[#0e0e13] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors font-medium"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl font-medium text-xs text-[#08080a] bg-gradient-to-r from-[#93c5fd] to-[#3b82f6] hover:opacity-90 transition-opacity"
          >
            Create User
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-[#9a9aa5]">Loading…</p>
      ) : (
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0e0e13]/50 border-b border-[#20202a]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#f4f4f7]">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#f4f4f7]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#20202a]">
                  <td className="px-4 py-3 font-medium text-[#f4f4f7]">{u.username}</td>
                  <td className="px-4 py-3 text-[#9a9aa5] text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 bg-[#0e0e13] border border-[#20202a] rounded-full text-xs font-semibold capitalize text-[#3b82f6]">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.isActive ? (
                      <span className="text-emerald-400 font-medium">Active</span>
                    ) : (
                      <span className="text-red-400 font-medium">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#9a9aa5] text-xs">
                    {new Date(u.createdAt || u.created_at || Date.now()).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 text-xs">
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={u.id === user?.id}
                      className="text-[#3b82f6] hover:text-[#60a5fa] disabled:opacity-40 transition-colors font-medium"
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => remove(u)}
                      disabled={u.id === user?.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
