const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const auth = require('../middleware/auth');
const workspaceGuard = require('../middleware/workspaceGuard');

// All workspace routes require authentication
router.use(auth);

// POST /api/workspaces — create a new workspace
router.post('/', workspaceController.createWorkspace);

// GET /api/workspaces — list my workspaces
router.get('/', workspaceController.getMyWorkspaces);

// GET /api/workspaces/:id — get a single workspace (member access)
router.get('/:id', workspaceController.getWorkspace);

// Routes below require workspace membership (workspaceGuard)
// POST /api/workspaces/:id/invite
router.post('/:id/invite', workspaceGuard, workspaceController.inviteMember);

// PATCH /api/workspaces/:id/members/:userId/role
router.patch('/:id/members/:userId/role', workspaceGuard, workspaceController.updateMemberRole);

// GET /api/workspaces/:id/members/:userId/removal-preview
router.get('/:id/members/:userId/removal-preview', workspaceGuard, workspaceController.getMemberRemovalPreview);

// DELETE /api/workspaces/:id/members/:userId
router.delete('/:id/members/:userId', workspaceGuard, workspaceController.removeMember);

// PATCH /api/workspaces/:id/settings
router.patch('/:id/settings', workspaceGuard, workspaceController.updateApiWebhook);

// POST /api/workspaces/:id/transfer-ownership/request  — owner sends OTP to themselves
router.post('/:id/transfer-ownership/request', workspaceGuard, workspaceController.requestOwnershipTransfer);

// POST /api/workspaces/:id/transfer-ownership/confirm  — owner confirms with OTP
router.post('/:id/transfer-ownership/confirm', workspaceGuard, workspaceController.confirmOwnershipTransfer);

module.exports = router;
