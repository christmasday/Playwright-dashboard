/**
 * Project Controller
 * Handles project CRUD and member management.
 */
import { Project } from '../../models/user.js';
import { User } from '../../models/user.js';
import logger from '../../utils/logger.js';

const ALLOWED_ROLES = ['admin', 'maintainer', 'viewer', 'editor'];

export const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }

    const project = await Project.create({
      name,
      description,
      createdBy: req.user.id,
    });

    // Add creator as admin member
    await Project.addMember(project.id, req.user.id, 'admin');

    logger.info('Project created', { projectId: project.id, createdBy: req.user.id, name });
    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error) {
    logger.error('Create project failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to create project' });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Check membership
    const member = await Project.isMember(project.id, req.user.id);
    if (!member) {
      return res.status(403).json({ success: false, error: 'Not a project member' });
    }

    project.memberRole = member.role;
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    logger.error('Get project failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
};

export const listProjects = async (req, res) => {
  try {
    const { limit, offset, page, search } = req.query;

    if (limit !== undefined || page !== undefined) {
      const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 9));
      const parsedOffset = page
        ? (Math.max(1, parseInt(page, 10)) - 1) * parsedLimit
        : (parseInt(offset, 10) || 0);
      const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;

      const [projects, total] = await Promise.all([
        User.projects(req.user.id, { limit: parsedLimit, offset: parsedOffset, search }),
        User.countProjects(req.user.id, { search }),
      ]);

      const totalPages = Math.ceil(total / parsedLimit) || 1;

      return res.status(200).json({
        success: true,
        count: projects.length,
        total,
        page: currentPage,
        limit: parsedLimit,
        totalPages,
        data: projects,
        projects,
      });
    }

    const projects = await User.projects(req.user.id, { search });
    return res.status(200).json({
      success: true,
      count: projects.length,
      total: projects.length,
      data: projects,
      projects,
    });
  } catch (error) {
    logger.error('List projects failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to list projects' });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const member = await Project.isMember(project.id, req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const updated = await Project.update(project.id, { name, description, status });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error('Update project failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to update project' });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const member = await Project.isMember(project.id, req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    await Project.delete(project.id);
    logger.info('Project deleted', { projectId: project.id, deletedBy: req.user.id });
    return res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Delete project failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
};

export const getProjectBuilds = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const member = await Project.isMember(project.id, req.user.id);
    if (!member) {
      return res.status(403).json({ success: false, error: 'Not a project member' });
    }

    const { limit = 10, offset = 0, page, search, status } = req.query;
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const parsedOffset = page
      ? (Math.max(1, parseInt(page, 10)) - 1) * parsedLimit
      : (parseInt(offset, 10) || 0);
    const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;

    const [builds, total] = await Promise.all([
      Project.getBuilds(project.id, parsedLimit, parsedOffset, { search, status }),
      Project.countBuilds(project.id, { search, status }),
    ]);

    const totalPages = Math.ceil(total / parsedLimit) || 1;

    return res.status(200).json({
      success: true,
      count: builds.length,
      total,
      page: currentPage,
      limit: parsedLimit,
      totalPages,
      data: builds,
      builds,
      project,
    });
  } catch (error) {
    logger.error('Get project builds failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch builds' });
  }
};

export const addProjectMember = async (req, res) => {
  try {
    const { email, userId, username, role } = req.body;
    if (!email && !userId && !username) {
      return res.status(400).json({ success: false, error: 'Email, username, or userId is required' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const member = await Project.isMember(project.id, req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const assignedRole = role && ALLOWED_ROLES.includes(role) ? role : 'viewer';

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findByEmail(email);
    } else if (username) {
      user = await User.findByUsername(username);
    }

    if (!user) {
      if (email) {
        const inv = await Project.createInvitation(project.id, email, assignedRole, req.user.id);
        return res.status(200).json({
          success: true,
          invited: true,
          message: `Pending invitation created for ${email}`,
          data: inv,
        });
      }
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await Project.addMember(project.id, user.id, assignedRole);

    return res.status(200).json({
      success: true,
      message: 'Member added successfully',
    });
  } catch (error) {
    logger.error('Add member failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to add member' });
  }
};

export const updateProjectMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id: projectId, userId } = req.params;

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'Valid role is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const member = await Project.isMember(project.id, req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    await Project.updateMemberRole(projectId, userId, role);
    return res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
    });
  } catch (error) {
    logger.error('Update member role failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to update member role' });
  }
};

export const getProjectMembers = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const member = await Project.isMember(project.id, req.user.id);
    if (!member) {
      return res.status(403).json({ success: false, error: 'Not a project member' });
    }

    const members = await Project.getMembers(project.id);
    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    logger.error('Get members failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch members' });
  }
};

export const removeProjectMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const member = await Project.isMember(project.id, req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    await Project.removeMember(project.id, req.params.userId);
    return res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    logger.error('Remove member failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to remove member' });
  }
};

export const getProjectInvitations = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const member = await Project.isMember(project.id, req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const invitations = await Project.getInvitations(project.id);
    return res.status(200).json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    logger.error('Get invitations failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to fetch invitations' });
  }
};

export const cancelProjectInvitation = async (req, res) => {
  try {
    const { id: projectId, invitationId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const member = await Project.isMember(project.id, req.user.id);
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    await Project.deleteInvitation(projectId, invitationId);
    return res.status(200).json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  } catch (error) {
    logger.error('Cancel invitation failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to cancel invitation' });
  }
};

export default {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  getProjectBuilds,
  addProjectMember,
  updateProjectMemberRole,
  getProjectMembers,
  removeProjectMember,
  getProjectInvitations,
  cancelProjectInvitation,
};
