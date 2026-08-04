const { prisma } = require('../config/db');

// GET /api/users — workspace members only
exports.getUsers = async (req, res, next) => {
    try {
        const workspaceId = req.workspace.id;

        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
                },
            },
            orderBy: { user: { createdAt: 'desc' } },
        });

        const usersWithRole = members.map((m) => ({
            ...m.user,
            _id: m.user.id,
            role: m.role,
        }));

        res.json(usersWithRole);
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/:id/toggle — activate or deactivate (workspace admin only)
exports.toggleUserActive = async (req, res, next) => {
    try {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only workspace admins can manage users' });
        }

        const targetId = parseInt(req.params.id);
        const user = await prisma.user.findUnique({ where: { id: targetId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot deactivate your own account' });
        }

        const updated = await prisma.user.update({
            where: { id: targetId },
            data: { isActive: !user.isActive },
            select: { id: true, name: true, email: true, isActive: true },
        });

        res.json({
            message: `User ${updated.isActive ? 'activated' : 'deactivated'}`,
            user: { ...updated, _id: updated.id },
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/:id/role — change workspace member role (workspace admin only)
exports.changeUserRole = async (req, res, next) => {
    try {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only workspace admins can change roles' });
        }

        const { role } = req.validatedBody;
        const workspaceId = req.workspace.id;
        const targetId = parseInt(req.params.id);

        const member = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: targetId } },
        });
        if (!member) {
            return res.status(404).json({ message: 'User not found in workspace' });
        }
        if (targetId === req.user.id) {
            return res.status(400).json({ message: 'Cannot change your own role' });
        }

        const updated = await prisma.workspaceMember.update({
            where: { workspaceId_userId: { workspaceId, userId: targetId } },
            data: { role },
        });

        res.json({ message: `Role updated to ${role}`, member: updated });
    } catch (error) {
        next(error);
    }
};
