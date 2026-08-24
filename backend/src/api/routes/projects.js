/**
 * Project Routes
 */
import express from 'express';
import {
  authenticateToken,
} from '../middleware/auth.js';
import {
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
} from '../controllers/projectController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', listProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

// Project builds
router.get('/:id/builds', getProjectBuilds);

// Member management
router.get('/:id/members', getProjectMembers);
router.post('/:id/members', addProjectMember);
router.patch('/:id/members/:userId', updateProjectMemberRole);
router.delete('/:id/members/:userId', removeProjectMember);

// Invitations management
router.get('/:id/invitations', getProjectInvitations);
router.delete('/:id/invitations/:invitationId', cancelProjectInvitation);

export default router;
