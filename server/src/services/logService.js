const { prisma } = require('../config/db');

const logService = {
    async createLog({ actionType, performedBy, leadId, leadRef, workspaceId, oldValue, newValue, ipAddress }) {
        return await prisma.activityLog.create({
            data: {
                actionType,
                performedBy: performedBy || null,
                leadId: leadId || null,
                leadRef: leadRef || null,
                workspaceId: workspaceId || null,
                oldValue: oldValue || '',
                newValue: newValue || '',
                ipAddress: ipAddress || '',
            },
        });
    },

    async getLogsByLead(leadId, workspaceId, page = 1, limit = 50) {
        const leadIdInt = parseInt(leadId);
        // Ensure the lead belongs to this workspace
        const lead = await prisma.lead.findFirst({
            where: { id: leadIdInt, workspaceId },
            select: { id: true },
        });
        if (!lead) return { logs: [], total: 0, page, totalPages: 0 };

        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: { leadId: lead.id },
                include: {
                    performer: { select: { id: true, name: true, email: true } },
                    lead: { select: { id: true, leadId: true, name: true, mobile: true } },
                },
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit,
            }),
            prisma.activityLog.count({ where: { leadId: lead.id } }),
        ]);

        return {
            logs: logs.map(formatLog),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    },

    async getAllLogs({ workspaceId, page = 1, limit = 50, leadId, leadNumber, userId, actionType, startDate, endDate }) {
        // Get all lead IDs belonging to this workspace
        const workspaceLeads = await prisma.lead.findMany({
            where: { workspaceId },
            select: { id: true },
        });
        const ids = workspaceLeads.map((l) => l.id);

        let where;

        if (leadNumber) {
            // Search by human-readable lead number (e.g. LD0001) — normalise to uppercase
            const normalised = leadNumber.trim().toUpperCase();
            const matchedLead = await prisma.lead.findFirst({
                where: { leadId: { equals: normalised }, workspaceId },
                select: { id: true },
            });

            if (matchedLead) {
                // Active lead: all logs still carry the numeric leadId FK
                where = { leadId: matchedLead.id };
            } else {
                // Deleted lead: leadId is null but leadRef was stamped with the display ID
                where = { leadRef: normalised, workspaceId };
            }
        } else if (leadId) {
            // If filtering by a specific leadId that doesn't exist, return empty
            if (!ids.includes(parseInt(leadId))) {
                return { logs: [], total: 0, page, totalPages: 0 };
            }
            where = { leadId: parseInt(leadId) };
        } else {
            // Include logs for active leads + logs scoped to this workspace (deleted leads or workspace-level events)
            where = { OR: [{ leadId: { in: ids } }, { leadId: null, workspaceId }] };
        }

        if (userId) where.performedBy = parseInt(userId);
        if (actionType) where.actionType = actionType;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where,
                include: {
                    performer: { select: { id: true, name: true, email: true } },
                    lead: { select: { id: true, leadId: true, name: true, mobile: true } },
                },
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit,
            }),
            prisma.activityLog.count({ where }),
        ]);

        return {
            logs: logs.map(formatLog),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    },
};

// Normalize log for response
const formatLog = (log) => ({
    ...log,
    _id: log.id,
    performedBy: log.performer ? { ...log.performer, _id: log.performer.id } : null,
    performer: undefined,
    leadId: log.lead ? { ...log.lead, _id: log.lead.id } : log.leadId,
    lead: undefined,
});

module.exports = logService;
