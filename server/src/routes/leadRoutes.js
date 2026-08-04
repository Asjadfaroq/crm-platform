const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const auth = require('../middleware/auth');
const workspaceGuard = require('../middleware/workspaceGuard');
const validate = require('../middleware/validate');
const {
    createLeadSchema,
    updateLeadSchema,
    assignLeadSchema,
    addNoteSchema,
} = require('../validators/leadValidator');

// All routes require authentication + workspace membership
// workspaceGuard reads x-workspace-id header, verifies membership,
// attaches req.workspace and req.workspaceRole
router.use(auth, workspaceGuard);

// GET /api/leads — List leads (admin: all, editor/viewer: assigned only)
router.get('/', leadController.getLeads);

// GET /api/leads/stats — Dashboard KPI stats
router.get('/stats', leadController.getStats);

// GET /api/leads/analytics — Admin-only analytics aggregation
router.get(
    '/analytics',
    (req, res, next) => {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only workspace admins can view analytics' });
        }
        next();
    },
    leadController.getAnalytics
);

// GET /api/leads/deleted — List deleted leads (admin only)
router.get(
    '/deleted',
    (req, res, next) => {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only workspace admins can view deleted leads' });
        }
        next();
    },
    leadController.getDeletedLeads
);

// POST /api/leads/:id/restore — Restore a deleted lead (admin only)
router.post(
    '/:id/restore',
    (req, res, next) => {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only workspace admins can restore leads' });
        }
        next();
    },
    leadController.restoreLead
);

// GET /api/leads/:id — Single lead
router.get('/:id', leadController.getLead);

// POST /api/leads —  (workspace admin only)
router.post(
    '/',
    (req, res, next) => {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only workspace admins can create leads' });
        }
        next();
    },
    validate(createLeadSchema),
    leadController.createLead
);

// PUT /api/leads/:id — Update lead
router.put('/:id', validate(updateLeadSchema), leadController.updateLead);

// DELETE /api/leads/:id — Delete lead (workspace admin only)
router.delete(
    '/:id',
    (req, res, next) => {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only workspace admins can delete leads' });
        }
        next();
    },
    leadController.deleteLead
);

// PUT /api/leads/:id/assign — Assign lead (workspace admin only)
router.put(
    '/:id/assign',
    (req, res, next) => {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only workspace admins can assign leads' });
        }
        next();
    },
    validate(assignLeadSchema),
    leadController.assignLead
);

// POST /api/leads/:id/notes — Add note
router.post('/:id/notes', validate(addNoteSchema), leadController.addNote);

module.exports = router;
