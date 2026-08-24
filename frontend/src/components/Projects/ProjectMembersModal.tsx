/**
 * Project Members & Access Management Modal
 * Allows inviting members by email or username, assigning viewer/admin roles,
 * updating member roles, and cancelling pending invitations.
 */

import React, { useEffect, useState } from 'react';
import apiService from '../../services/api';

interface Member {
  userId: string;
  id?: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'viewer' | 'editor' | 'maintainer';
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
  created_at?: string;
  invitedBy?: string;
}

interface ProjectMembersModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  projectId,
  projectName,
  onClose,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteInput, setInviteInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'admin'>('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersResp, invResp] = await Promise.all([
        apiService.getProjectMembers(projectId),
        apiService.getProjectInvitations(projectId).catch(() => ({ data: { data: [] } })),
      ]);

      setMembers(membersResp?.data?.data || []);
      setInvitations(invResp?.data?.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const isEmail = inviteInput.includes('@');
    const payload = isEmail
      ? { email: inviteInput.trim(), role: selectedRole }
      : { username: inviteInput.trim(), role: selectedRole };

    try {
      const resp = await apiService.addProjectMember(projectId, payload);
      setSuccess(resp.data.message || 'Invitation/Member added successfully');
      setInviteInput('');
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to add member or invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      setError(null);
      await apiService.updateProjectMemberRole(projectId, userId, newRole);
      setSuccess(`Role updated to ${newRole}`);
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!window.confirm(`Remove member "${name}" from this project?`)) return;
    try {
      setError(null);
      await apiService.removeProjectMember(projectId, userId);
      setSuccess(`Removed ${name} from project`);
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    try {
      setError(null);
      await apiService.cancelProjectInvitation(projectId, invitationId);
      setSuccess(`Cancelled invitation for ${email}`);
      loadData();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to cancel invitation');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a22] border border-[#20202a] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#20202a] flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#f4f4f7]">Project Access & Members</h3>
            <p className="text-xs text-[#9a9aa5] mt-0.5 font-mono">Project: {projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0e0e13] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#20202a] flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Notifications */}
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium flex items-center gap-2">
              <i className="fas fa-exclamation-circle text-sm"></i>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-medium flex items-center gap-2">
              <i className="fas fa-check-circle text-sm"></i>
              <span>{success}</span>
            </div>
          )}

          {/* Invite Form */}
          <form onSubmit={handleInvite} className="bg-[#0e0e13] border border-[#20202a] rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-[#f4f4f7] uppercase tracking-wider">
              Invite Team Member to Project
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                required
                type="text"
                placeholder="Enter email address or username"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                className="flex-1 w-full px-4 py-2.5 bg-[#1a1a22] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] placeholder-[#5e5e68] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors"
              />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'viewer' | 'admin')}
                className="px-3 py-2.5 bg-[#1a1a22] border border-[#20202a] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] transition-colors font-medium"
              >
                <option value="viewer">Viewer (Read-only)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium text-xs text-white bg-[#3b82f6] hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <i className="fas fa-spinner animate-spin"></i> Inviting…
                  </>
                ) : (
                  <>
                    <i className="fas fa-[#3b82f6] fa-user-plus"></i> Send Invite
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider">
                Active Project Members ({members.length})
              </h4>
            </div>

            {loading ? (
              <div className="p-6 text-center text-xs text-[#9a9aa5]">Loading members…</div>
            ) : members.length > 0 ? (
              <div className="divide-y divide-[#20202a] border border-[#20202a] rounded-xl overflow-hidden bg-[#0e0e13]">
                {members.map((m) => {
                  const targetUserId = m.userId || m.id || '';
                  return (
                    <div key={targetUserId} className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#20202a] border border-[#2d2d3a] flex items-center justify-center text-xs text-[#3b82f6] font-bold">
                          {m.username ? m.username[0].toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#f4f4f7] truncate">
                            {m.username || m.email}
                          </p>
                          <p className="text-xs text-[#9a9aa5] truncate">{m.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(targetUserId, e.target.value)}
                          className="px-2.5 py-1 bg-[#1a1a22] border border-[#20202a] rounded-lg text-xs font-semibold text-[#3b82f6] focus:outline-none"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(targetUserId, m.username || m.email)}
                          className="text-xs text-red-400 hover:text-red-300 p-1.5 transition-colors"
                          title="Remove member"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[#9a9aa5] border border-[#20202a] rounded-xl">
                No active members.
              </div>
            )}
          </div>

          {/* Pending Invitations Section */}
          {invitations.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider">
                Pending Email Invitations ({invitations.length})
              </h4>
              <div className="divide-y divide-[#20202a] border border-[#20202a] rounded-xl overflow-hidden bg-[#0e0e13]">
                {invitations.map((inv) => (
                  <div key={inv.id} className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-xs text-yellow-400">
                        <i className="fas fa-envelope"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#f4f4f7] truncate">{inv.email}</p>
                        <p className="text-xs text-[#9a9aa5]">
                          Invited as <span className="text-yellow-400 capitalize">{inv.role}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelInvitation(inv.id, inv.email)}
                      className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Cancel Invite
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectMembersModal;
