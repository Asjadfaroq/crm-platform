const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const validate = require('../middleware/validate');
const { publicLeadSchema, verifyMobileSchema } = require('../validators/leadValidator');
const { publicLimiter } = require('../middleware/rateLimiter');
const { prisma } = require('../config/db');

/**
 * Per-workspace API key authentication.
 *
 * Accepts workspace ID from (in priority order):
 *   1. x-workspace-id  header   ← recommended (matches integration guide)
 *   2. workspace       query param
 *   3. workspace       body field
 *
 * Accepts API key from:
 *   1. x-api-key  header
 *   2. Authorization: Bearer <key>
 *
 * Attaches req.workspace so the controller can use it directly.
 */
const apiKeyAuth = async (req, res, next) => {
    try {
        // ── 1. Extract workspace ID ──────────────────────────────────────────
        const workspaceId =
            req.headers['x-workspace-id'] ||
            req.query.workspace ||
            req.body?.workspace;

        if (!workspaceId) {
            return res.status(400).json({
                message: 'Missing workspace ID. Send it in the x-workspace-id header.',
            });
        }

        // ── 2. Extract API key ───────────────────────────────────────────────
        let apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            const authHeader = req.headers['authorization'] || '';
            if (authHeader.startsWith('Bearer ')) {
                apiKey = authHeader.slice(7).trim();
            }
        }

        if (!apiKey) {
            return res.status(401).json({
                message: 'Missing API key. Send it in the x-api-key header.',
            });
        }

        // ── 3. Load workspace and compare key ────────────────────────────────
        const workspaceIdInt = parseInt(workspaceId);
        if (isNaN(workspaceIdInt)) {
            return res.status(400).json({ message: 'Invalid workspace ID format.' });
        }

        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceIdInt } });
        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found.' });
        }

        if (workspace.apiKey !== apiKey) {
            return res.status(401).json({ message: 'Invalid API key.' });
        }

        req.workspace = { ...workspace, _id: workspace.id };
        next();
    } catch (err) {
        next(err);
    }
};

// POST /api/public/leads  — public lead submission from any website / backend
router.post(
    '/leads',
    publicLimiter,
    apiKeyAuth,
    validate(publicLeadSchema),
    leadController.publicCreateLead
);

// PATCH /api/public/leads/:id/verify-mobile  — mark mobile as verified after OTP confirmation
router.patch(
    '/leads/:id/verify-mobile',
    publicLimiter,
    apiKeyAuth,
    validate(verifyMobileSchema),
    leadController.verifyMobile
);

module.exports = router;
