const leadService = require('../services/leadService');

const getClientIp = (req) =>
    req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';

// Emit to workspace admins only, and optionally to the assigned member.
// Unassigned (new) leads go to admins only; once a lead is assigned the
// member also receives real-time events for that lead.
const emit = (req, event, payload, assignedUserId = null) => {
    const io = req.app.locals.io;
    const workspaceId = req.workspace?._id?.toString();
    if (!io || !workspaceId) return;
    io.to(`workspace:${workspaceId}:admin`).emit(event, payload);
    if (assignedUserId) {
        io.to(`workspace:${workspaceId}:user:${assignedUserId}`).emit(event, payload);
    }
};

exports.getLeads = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status, priority, search } = req.query;
        const workspaceId = req.workspace._id;

        // Editors and viewers can only see their assigned leads
        const assignedTo = ['editor', 'viewer'].includes(req.workspaceRole)
            ? req.user._id
            : req.query.assignedTo;

        const result = await leadService.getLeads({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            priority,
            assignedTo,
            search,
            workspaceId,
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

exports.getLead = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const lead = await leadService.getLeadById(req.params.id, workspaceId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Editors and viewers can only access their assigned leads
        if (
            ['editor', 'viewer'].includes(req.workspaceRole) &&
            (!lead.assignedTo || lead.assignedTo._id.toString() !== req.user._id.toString())
        ) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(lead);
    } catch (error) {
        next(error);
    }
};

exports.createLead = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const lead = await leadService.createLead(
            req.validatedBody,
            req.user._id,
            getClientIp(req),
            workspaceId
        );
        emit(req, 'lead:created', lead);
        res.status(201).json(lead);
    } catch (error) {
        next(error);
    }
};

exports.updateLead = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const lead = await leadService.getLeadById(req.params.id, workspaceId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Viewers are read-only
        if (req.workspaceRole === 'viewer') {
            return res.status(403).json({ message: 'Viewers cannot edit leads' });
        }

        // Editors can only update their assigned leads, and only status/followup/dip
        if (req.workspaceRole === 'editor') {
            if (!lead.assignedTo || lead.assignedTo._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Access denied' });
            }
            const allowed = {
                status: req.validatedBody.status,
                priority: req.validatedBody.priority,
                next_followup: req.validatedBody.next_followup,
                dip_account: req.validatedBody.dip_account,
            };
            const updated = await leadService.updateLead(
                req.params.id,
                allowed,
                req.user._id,
                getClientIp(req),
                workspaceId
            );
            emit(req, 'lead:updated', updated, updated.assignedTo?._id?.toString());
            return res.json(updated);
        }

        const updated = await leadService.updateLead(
            req.params.id,
            req.validatedBody,
            req.user._id,
            getClientIp(req),
            workspaceId
        );
        emit(req, 'lead:updated', updated, updated.assignedTo?._id?.toString());
        res.json(updated);
    } catch (error) {
        next(error);
    }
};

exports.deleteLead = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const result = await leadService.deleteLead(
            req.params.id,
            req.user._id,
            getClientIp(req),
            workspaceId
        );
        if (!result) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        emit(req, 'lead:deleted', { id: req.params.id });
        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        next(error);
    }
};

exports.assignLead = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const { assignedTo } = req.validatedBody;
        const result = await leadService.assignLead(
            req.params.id,
            assignedTo,
            req.user._id,
            getClientIp(req),
            workspaceId
        );
        if (!result) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        const { lead, oldAssigneeId } = result;
        const newAssigneeId = lead.assignedTo?._id?.toString();
        // Emit to admins + new assignee
        emit(req, 'lead:updated', lead, newAssigneeId);
        // Also notify the previous assignee so they can remove it from their view
        if (oldAssigneeId && oldAssigneeId !== newAssigneeId) {
            const io = req.app.locals.io;
            const wsId = workspaceId.toString();
            if (io) io.to(`workspace:${wsId}:user:${oldAssigneeId}`).emit('lead:updated', lead);
        }
        res.json(lead);
    } catch (error) {
        next(error);
    }
};

exports.addNote = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const lead = await leadService.getLeadById(req.params.id, workspaceId);
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Viewers cannot add notes at all
        if (req.workspaceRole === 'viewer') {
            return res.status(403).json({ message: 'Viewers cannot add notes' });
        }

        // Editors can only add notes to their assigned leads
        if (
            req.workspaceRole === 'editor' &&
            (!lead.assignedTo || lead.assignedTo._id.toString() !== req.user._id.toString())
        ) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { text } = req.validatedBody;
        const updated = await leadService.addNote(
            req.params.id,
            text,
            req.user._id,
            getClientIp(req),
            workspaceId
        );
        emit(req, 'lead:updated', updated, updated.assignedTo?._id?.toString());
        res.json(updated);
    } catch (error) {
        next(error);
    }
};

exports.getDeletedLeads = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const leads = await leadService.getDeletedLeads(workspaceId);
        res.json(leads);
    } catch (error) {
        next(error);
    }
};

exports.restoreLead = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const lead = await leadService.restoreLead(
            req.params.id,
            req.user._id,
            getClientIp(req),
            workspaceId
        );
        if (!lead) {
            return res.status(404).json({ message: 'Deleted lead not found' });
        }
        emit(req, 'lead:created', lead);
        res.json(lead);
    } catch (error) {
        next(error);
    }
};

exports.getStats = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const assignedTo = req.workspaceRole === 'editor' ? req.user._id : null;
        const stats = await leadService.getStats(assignedTo, workspaceId);
        res.json(stats);
    } catch (error) {
        next(error);
    }
};

exports.getAnalytics = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const data = await leadService.getAnalytics(workspaceId);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

// Public lead submission (from external website / backend)
// req.workspace is already attached by apiKeyAuth middleware in publicRoutes.js
exports.publicCreateLead = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const lead = await leadService.createLead(
            req.validatedBody,
            null,
            getClientIp(req),
            workspaceId
        );

        // Emit real-time event to workspace admins only — new leads are unassigned
        const io = req.app.locals.io;
        if (io) {
            io.to(`workspace:${workspaceId.toString()}:admin`).emit('lead:created', lead);
        }

        res.status(201).json({
            message: 'Lead submitted successfully',
            lead: {
                _id: lead._id,
                leadId: lead.leadId,
                name: lead.name,
                mobile: lead.mobile,
                status: lead.status,
                verified_mobile: lead.verified_mobile,
                createdAt: lead.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Called by external site after successful OTP verification
// PATCH /api/public/leads/:id/verify-mobile
exports.verifyMobile = async (req, res, next) => {
    try {
        const workspaceId = req.workspace._id;
        const lead = await leadService.verifyMobileLead(
            req.params.id,
            workspaceId,
            getClientIp(req)
        );
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        // Broadcast update to workspace admins in real time
        const io = req.app.locals.io;
        if (io) {
            io.to(`workspace:${workspaceId.toString()}:admin`).emit('lead:updated', lead);
        }

        res.json({
            message: 'Mobile verified successfully',
            lead: {
                _id: lead._id,
                verified_mobile: lead.verified_mobile,
            },
        });
    } catch (error) {
        next(error);
    }
};
