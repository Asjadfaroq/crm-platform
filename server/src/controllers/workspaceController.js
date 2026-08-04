const crypto = require('crypto');
const { prisma } = require('../config/db');
const { sendInvitationEmail, sendWorkspaceAddedEmail, sendOwnershipTransferOtpEmail } = require('../services/emailService');
const bcrypt = require('bcryptjs');
const logService = require('../services/logService');

// Slugify helper
const slugify = (name) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const generateUniqueSlug = async (name) => {
    const base = slugify(name);
    let slug = base;
    let counter = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
        slug = `${base}-${counter++}`;
    }
    return slug;
};

// Format workspace for response — flattens members with user info
const formatWorkspace = (ws) => ({
    ...ws,
    _id: ws.id,
    members: (ws.members || []).map((m) => ({
        ...m,
        _id: m.id,
        user: m.user ? { ...m.user, _id: m.user.id } : null,
    })),
});

// POST /api/workspaces
exports.createWorkspace = async (req, res, next) => {
    try {
        const { name, webhookUrl } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Workspace name is required' });
        }

        const slug = await generateUniqueSlug(name.trim());
        const apiKey = crypto.randomBytes(24).toString('hex');

        const workspace = await prisma.workspace.create({
            data: {
                name: name.trim(),
                slug,
                ownerId: req.user.id,
                apiKey,
                webhookUrl: webhookUrl || null,
                members: {
                    create: { userId: req.user.id, role: 'admin' },
                },
            },
            include: {
                members: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });

        res.status(201).json({ workspace: formatWorkspace(workspace) });
    } catch (error) {
        next(error);
    }
};

// GET /api/workspaces
exports.getMyWorkspaces = async (req, res, next) => {
    try {
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: req.user.id },
            include: {
                workspace: {
                    include: {
                        members: { include: { user: { select: { id: true, name: true, email: true } } } },
                    },
                },
            },
            orderBy: { workspace: { createdAt: 'desc' } },
        });

        const workspaces = memberships.map((m) => formatWorkspace(m.workspace));
        res.json({ workspaces });
    } catch (error) {
        next(error);
    }
};

// GET /api/workspaces/:id
exports.getWorkspace = async (req, res, next) => {
    try {
        const workspaceId = parseInt(req.params.id);
        if (isNaN(workspaceId)) return res.status(400).json({ message: 'Invalid workspace ID' });

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
                },
            },
        });

        if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

        const isMember = workspace.members.some((m) => m.userId === req.user.id);
        if (!isMember) return res.status(403).json({ message: 'Access denied' });

        res.json({ workspace: formatWorkspace(workspace) });
    } catch (error) {
        next(error);
    }
};

// POST /api/workspaces/:id/invite
exports.inviteMember = async (req, res, next) => {
    try {
        const { email, role } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });
        if (!['admin', 'editor', 'viewer'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const workspace = req.workspace;
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can invite members' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        let invitedUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        const isNewUser = !invitedUser;

        if (isNewUser) {
            const tempPassword = await bcrypt.hash(crypto.randomBytes(12).toString('hex'), 10);
            invitedUser = await prisma.user.create({
                data: {
                    name: normalizedEmail.split('@')[0],
                    email: normalizedEmail,
                    password: tempPassword,
                    isActive: true,
                    isEmailVerified: false,
                },
            });
        }

        // Check already a member
        const already = workspace.members.some((m) => m.userId === invitedUser.id);
        if (already) {
            return res.status(409).json({ message: 'User is already a member' });
        }

        await prisma.workspaceMember.create({
            data: { workspaceId: workspace.id, userId: invitedUser.id, role },
        });

        await logService.createLog({
            actionType: 'Member Invited',
            performedBy: req.user.id,
            workspaceId: workspace.id,
            newValue: `${invitedUser.email} as ${role}`,
            ipAddress: req.ip,
        });

        const updatedWorkspace = await prisma.workspace.findUnique({
            where: { id: workspace.id },
            include: {
                members: { include: { user: { select: { id: true, name: true, email: true, isActive: true } } } },
            },
        });

        // Send email (best-effort)
        try {
            if (isNewUser) {
                const resetToken = crypto.randomBytes(32).toString('hex');
                await prisma.user.update({
                    where: { id: invitedUser.id },
                    data: {
                        resetToken,
                        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
                    },
                });
                const setPasswordLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
                await sendInvitationEmail(email, {
                    inviterName: req.user.name,
                    workspaceName: workspace.name,
                    role,
                    setPasswordLink,
                });
            } else {
                await sendWorkspaceAddedEmail(email, {
                    inviterName: req.user.name,
                    workspaceName: workspace.name,
                    role,
                    loginLink: `${process.env.CLIENT_URL}/login`,
                });
            }
        } catch (emailErr) {
            console.error('Invite email failed (non-fatal):', emailErr.message);
        }

        const io = req.app.locals.io;
        if (io) {
            io.emit('workspace:invited', {
                userId: invitedUser.id.toString(),
                inviterName: req.user.name,
                workspaceName: workspace.name,
                workspaceId: workspace.id.toString(),
                role,
            });
        }

        res.json({ message: `${email} invited as ${role}`, workspace: formatWorkspace(updatedWorkspace) });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/workspaces/:id/members/:userId/role
exports.updateMemberRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!['admin', 'editor', 'viewer'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can change roles' });
        }

        const workspace = req.workspace;
        const ownerId = workspace.ownerId;
        const requesterId = req.user.id;
        const targetId = parseInt(req.params.userId);

        if (targetId === requesterId) {
            return res.status(400).json({ message: 'Cannot change your own role' });
        }
        if (targetId === ownerId) {
            return res.status(403).json({ message: "Cannot change the workspace owner's role" });
        }

        const member = workspace.members.find((m) => m.userId === targetId);
        if (!member) return res.status(404).json({ message: 'Member not found' });

        if (member.role === 'admin' && requesterId !== ownerId) {
            return res.status(403).json({ message: "Only the workspace owner can change an admin's role" });
        }

        await prisma.workspaceMember.update({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId: targetId } },
            data: { role },
        });

        const targetUser = await prisma.user.findUnique({
            where: { id: targetId },
            select: { name: true, email: true },
        });

        await logService.createLog({
            actionType: 'Role Changed',
            performedBy: requesterId,
            workspaceId: workspace.id,
            oldValue: `${targetUser ? `${targetUser.name} <${targetUser.email}>` : `userId:${targetId}`} → ${member.role}`,
            newValue: `${targetUser ? `${targetUser.name} <${targetUser.email}>` : `userId:${targetId}`} → ${role}`,
            ipAddress: req.ip,
        });

        res.json({ message: `Role updated to ${role}` });
    } catch (error) {
        next(error);
    }
};

// GET /api/workspaces/:id/members/:userId/removal-preview
exports.getMemberRemovalPreview = async (req, res, next) => {
    try {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can remove members' });
        }

        const workspace = req.workspace;
        const targetId = parseInt(req.params.userId);

        if (isNaN(targetId)) return res.status(400).json({ message: 'Invalid userId' });
        if (targetId === workspace.ownerId) return res.status(403).json({ message: 'Cannot remove the workspace owner' });

        const isMember = workspace.members.some((m) => m.userId === targetId);
        if (!isMember) return res.status(404).json({ message: 'Member not found' });

        const assignedLeadCount = await prisma.lead.count({
            where: { workspaceId: workspace.id, assignedTo: targetId },
        });

        // workspaceGuard does not include the nested user object — fetch separately
        const membersWithUsers = await prisma.workspaceMember.findMany({
            where: { workspaceId: workspace.id, userId: { not: targetId } },
            include: { user: { select: { id: true, name: true, email: true } } },
        });

        const reassignCandidates = membersWithUsers.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
        }));

        res.json({ assignedLeadCount, reassignCandidates });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/workspaces/:id/members/:userId
exports.removeMember = async (req, res, next) => {
    try {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can remove members' });
        }

        const workspace = req.workspace;
        const ownerId = workspace.ownerId;
        const requesterId = req.user.id;
        const targetId = parseInt(req.params.userId);

        if (isNaN(targetId)) return res.status(400).json({ message: 'Invalid userId' });
        if (targetId === requesterId) return res.status(400).json({ message: 'Cannot remove yourself' });
        if (targetId === ownerId) return res.status(403).json({ message: 'Cannot remove the workspace owner' });

        const targetMember = workspace.members.find((m) => m.userId === targetId);
        if (!targetMember) return res.status(404).json({ message: 'Member not found' });
        if (targetMember.role === 'admin' && requesterId !== ownerId) {
            return res.status(403).json({ message: 'Only the workspace owner can remove an admin' });
        }

        // Validate optional reassignTo
        const reassignTo = req.body?.reassignTo != null ? parseInt(req.body.reassignTo) : null;
        if (reassignTo !== null) {
            if (isNaN(reassignTo)) return res.status(400).json({ message: 'Invalid reassignTo userId' });
            const isActiveMember = workspace.members.some(
                (m) => m.userId === reassignTo && m.userId !== targetId
            );
            if (!isActiveMember) {
                return res.status(400).json({ message: 'reassignTo user is not an active workspace member' });
            }
        }

        const [targetUser, affectedLeadCount] = await Promise.all([
            prisma.user.findUnique({ where: { id: targetId }, select: { email: true, name: true } }),
            prisma.lead.count({ where: { workspaceId: workspace.id, assignedTo: targetId } }),
        ]);

        let reassignToUser = null;
        if (reassignTo !== null) {
            reassignToUser = await prisma.user.findUnique({
                where: { id: reassignTo },
                select: { email: true, name: true },
            });
        }

        // Atomic: reassign/unassign leads + delete WorkspaceMember record
        await prisma.$transaction(async (tx) => {
            await tx.lead.updateMany({
                where: { workspaceId: workspace.id, assignedTo: targetId },
                data: { assignedTo: reassignTo }, // null = unassign
            });
            await tx.workspaceMember.delete({
                where: { workspaceId_userId: { workspaceId: workspace.id, userId: targetId } },
            });
        });

        // Compliance log — ActivityLog and LeadNote rows are NEVER touched
        const removedLabel = targetUser
            ? `${targetUser.name} <${targetUser.email}> (${targetMember.role})`
            : `userId:${targetId} (${targetMember.role})`;

        let leadOutcome;
        if (affectedLeadCount === 0) {
            leadOutcome = 'no leads assigned';
        } else if (reassignTo !== null && reassignToUser) {
            leadOutcome = `${affectedLeadCount} lead(s) reassigned to ${reassignToUser.name} <${reassignToUser.email}>`;
        } else if (reassignTo !== null) {
            leadOutcome = `${affectedLeadCount} lead(s) reassigned to userId:${reassignTo}`;
        } else {
            leadOutcome = `${affectedLeadCount} lead(s) unassigned`;
        }

        await logService.createLog({
            actionType: 'Member Removed',
            performedBy: requesterId,
            workspaceId: workspace.id,
            oldValue: removedLabel,
            newValue: leadOutcome,
            ipAddress: req.ip,
        });

        res.json({ message: 'Member removed' });
    } catch (error) {
        next(error);
    }
};

// POST /api/workspaces/:id/transfer-ownership/request
// Owner initiates transfer — sends OTP to their own email
exports.requestOwnershipTransfer = async (req, res, next) => {
    try {
        const workspace = req.workspace;
        const requesterId = req.user.id;

        if (requesterId !== workspace.ownerId) {
            return res.status(403).json({ message: 'Only the workspace owner can transfer ownership' });
        }

        const { targetUserId } = req.body;
        if (!targetUserId) {
            return res.status(400).json({ message: 'targetUserId is required' });
        }

        const targetId = parseInt(targetUserId);
        if (targetId === requesterId) {
            return res.status(400).json({ message: 'Cannot transfer ownership to yourself' });
        }

        const targetMember = workspace.members.find((m) => m.userId === targetId);
        if (!targetMember) {
            return res.status(404).json({ message: 'Target user is not a member of this workspace' });
        }

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.workspace.update({
            where: { id: workspace.id },
            data: { transferOtp: otp, transferOtpExpiry: otpExpiry, transferToUserId: targetId },
        });

        // Fetch the target user's name for the email
        const targetUser = await prisma.user.findUnique({
            where: { id: targetId },
            select: { name: true },
        });

        try {
            await sendOwnershipTransferOtpEmail(req.user.email, {
                workspaceName: workspace.name,
                newOwnerName: targetUser?.name || `User #${targetId}`,
                otp,
            });
        } catch (emailErr) {
            console.error('Transfer OTP email failed (non-fatal):', emailErr.message);
        }

        res.json({ message: 'OTP sent to your email. Enter it to confirm ownership transfer.' });
    } catch (error) {
        next(error);
    }
};

// POST /api/workspaces/:id/transfer-ownership/confirm
// Owner confirms with OTP — updates ownerId
exports.confirmOwnershipTransfer = async (req, res, next) => {
    try {
        const workspace = req.workspace;
        const requesterId = req.user.id;

        if (requesterId !== workspace.ownerId) {
            return res.status(403).json({ message: 'Only the workspace owner can confirm a transfer' });
        }

        const { otp } = req.body;
        if (!otp) return res.status(400).json({ message: 'OTP is required' });

        // Re-fetch workspace to get OTP fields (workspaceGuard may not include them)
        const ws = await prisma.workspace.findUnique({ where: { id: workspace.id } });

        if (!ws.transferOtp || ws.transferOtp !== otp.toString()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        if (!ws.transferOtpExpiry || new Date() > ws.transferOtpExpiry) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        const newOwnerId = ws.transferToUserId;

        // Transfer: update ownerId, clear OTP fields
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                ownerId: newOwnerId,
                transferOtp: null,
                transferOtpExpiry: null,
                transferToUserId: null,
            },
        });

        // Ensure the new owner has admin role in members
        await prisma.workspaceMember.update({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId: newOwnerId } },
            data: { role: 'admin' },
        });

        // Fetch updated workspace to return
        const updatedWorkspace = await prisma.workspace.findUnique({
            where: { id: workspace.id },
            include: {
                members: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
        });

        // Notify all workspace members so their UI refreshes with the new ownerId
        const io = req.app.locals.io;
        if (io) {
            io.to(`workspace:${workspace.id}`).emit('workspace:ownership-transferred', {
                workspaceId: workspace.id.toString(),
                newOwnerId: newOwnerId.toString(),
            });
        }

        res.json({ message: 'Ownership transferred successfully', workspace: formatWorkspace(updatedWorkspace) });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/workspaces/:id/settings
exports.updateApiWebhook = async (req, res, next) => {
    try {
        if (req.workspaceRole !== 'admin') {
            return res.status(403).json({ message: 'Only admins can update settings' });
        }

        const { webhookUrl, regenerateApiKey } = req.body;
        const data = {};

        if (webhookUrl !== undefined) data.webhookUrl = webhookUrl;
        if (regenerateApiKey) data.apiKey = crypto.randomBytes(24).toString('hex');

        const workspace = await prisma.workspace.update({
            where: { id: req.workspace.id },
            data,
        });

        res.json({
            message: 'Settings updated',
            apiKey: workspace.apiKey,
            webhookUrl: workspace.webhookUrl,
        });
    } catch (error) {
        next(error);
    }
};
