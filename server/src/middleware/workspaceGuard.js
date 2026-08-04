const { prisma } = require('../config/db');

// Attaches req.workspace and req.workspaceRole
// Expects :id or :workspaceId param, or x-workspace-id header
const workspaceGuard = async (req, res, next) => {
    try {
        const rawId =
            req.params.id ||
            req.params.workspaceId ||
            req.headers['x-workspace-id'];

        if (!rawId) {
            return res.status(400).json({ message: 'Workspace ID is required' });
        }

        const workspaceId = parseInt(rawId);
        if (isNaN(workspaceId)) {
            return res.status(400).json({ message: 'Invalid workspace ID' });
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: true },
        });

        if (!workspace) {
            return res.status(404).json({ message: 'Workspace not found' });
        }

        const member = workspace.members.find((m) => m.userId === req.user.id);
        if (!member) {
            return res.status(403).json({ message: 'You are not a member of this workspace' });
        }

        // _id alias for backward compat with controllers
        req.workspace = { ...workspace, _id: workspace.id };
        req.workspaceRole = member.role;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = workspaceGuard;
