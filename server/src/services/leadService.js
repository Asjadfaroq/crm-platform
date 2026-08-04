const { prisma } = require('../config/db');
const logService = require('./logService');

// Standard include for lead queries — populates assignedUser and notes
const leadInclude = {
    assignedUser: { select: { id: true, name: true, email: true } },
    notes: {
        include: { addedByUser: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
    },
};

// Normalize Prisma lead to match expected API shape (camelCase → snake_case aliases)
const formatLead = (lead) => {
    if (!lead) return null;
    return {
        ...lead,
        _id: lead.id,
        // snake_case aliases the frontend expects
        next_followup: lead.nextFollowup,
        dip_account: lead.dipAccount,
        verified_mobile: lead.verifiedMobile,
        // rename assignedUser → assignedTo for frontend compat
        assignedTo: lead.assignedUser ? { ...lead.assignedUser, _id: lead.assignedUser.id } : null,
        assignedUser: undefined,
        notes: (lead.notes || []).map((n) => ({
            ...n,
            _id: n.id,
            addedBy: n.addedByUser ? { ...n.addedByUser, _id: n.addedByUser.id } : null,
            addedByUser: undefined,
        })),
    };
};

// Generate a per-workspace sequential lead ID (e.g. LD0001)
// Checks both active leads AND deleted_leads so a restored/deleted ID is never reused.
const generateLeadId = async (workspaceId) => {
    const [lastActive, lastDeleted] = await Promise.all([
        prisma.lead.findFirst({
            where: { workspaceId, leadId: { startsWith: 'LD' } },
            orderBy: { leadId: 'desc' },
            select: { leadId: true },
        }),
        prisma.deletedLead.findFirst({
            where: { workspaceId, leadId: { startsWith: 'LD' } },
            orderBy: { leadId: 'desc' },
            select: { leadId: true },
        }),
    ]);
    const numA = lastActive  ? parseInt(lastActive.leadId.replace('LD', ''),  10) : 0;
    const numB = lastDeleted ? parseInt(lastDeleted.leadId.replace('LD', ''), 10) : 0;
    const next = Math.max(numA, numB) + 1;
    return `LD${String(next).padStart(4, '0')}`;
};

const leadService = {
    async createLead(data, userId, ip, workspaceId) {
        const leadId = await generateLeadId(workspaceId);
        const lead = await prisma.lead.create({
            data: {
                workspaceId,
                leadId,
                name: data.name,
                mobile: data.mobile,
                amount: data.amount,
                sourceLink: data.sourceLink || null,
                status: data.status || 'New',
                priority: data.priority || 'Medium',
                dipAccount: data.dip_account || 'pending',
                nextFollowup: data.next_followup ? new Date(data.next_followup) : null,
            },
            include: leadInclude,
        });

        await logService.createLog({
            actionType: 'Lead Created',
            performedBy: userId,
            leadId: lead.id,
            leadRef: lead.leadId,
            workspaceId,
            newValue: `${lead.leadId} — ${lead.name} (${lead.mobile})`,
            ipAddress: ip,
        });

        return formatLead(lead);
    },

    async getLeads({ page = 1, limit = 20, status, priority, assignedTo, search, workspaceId }) {
        const where = { workspaceId };
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assignedTo) where.assignedTo = parseInt(assignedTo);
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { mobile: { contains: search } },
                { leadId: { contains: search } },
            ];
        }

        const skip = (page - 1) * limit;
        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                include: leadInclude,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.lead.count({ where }),
        ]);

        return {
            leads: leads.map(formatLead),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    },

    async getLeadById(id, workspaceId) {
        const lead = await prisma.lead.findFirst({
            where: { id: parseInt(id), workspaceId },
            include: leadInclude,
        });
        return formatLead(lead);
    },

    async updateLead(id, data, userId, ip, workspaceId) {
        const existing = await prisma.lead.findFirst({ where: { id: parseInt(id), workspaceId } });
        if (!existing) return null;

        // Log field-level changes
        if (data.status && data.status !== existing.status) {
            await logService.createLog({
                actionType: 'Status Changed',
                performedBy: userId,
                leadId: existing.id,
                leadRef: existing.leadId,
                workspaceId,
                oldValue: existing.status,
                newValue: data.status,
                ipAddress: ip,
            });
        }
        if (data.priority && data.priority !== existing.priority) {
            await logService.createLog({
                actionType: 'Priority Changed',
                performedBy: userId,
                leadId: existing.id,
                leadRef: existing.leadId,
                workspaceId,
                oldValue: existing.priority,
                newValue: data.priority,
                ipAddress: ip,
            });
        }
        if (data.dip_account && data.dip_account !== existing.dipAccount) {
            await logService.createLog({
                actionType: 'DIP Account Changed',
                performedBy: userId,
                leadId: existing.id,
                leadRef: existing.leadId,
                workspaceId,
                oldValue: existing.dipAccount,
                newValue: data.dip_account,
                ipAddress: ip,
            });
        }

        const otherFields = Object.keys(data).filter(
            (k) => !['status', 'priority', 'dip_account', 'next_followup'].includes(k)
        );
        if (otherFields.length > 0) {
            await logService.createLog({
                actionType: 'Lead Updated',
                performedBy: userId,
                leadId: existing.id,
                leadRef: existing.leadId,
                workspaceId,
                oldValue: otherFields.map((f) => `${f}: ${existing[f]}`).join(', '),
                newValue: otherFields.map((f) => `${f}: ${data[f]}`).join(', '),
                ipAddress: ip,
            });
        }

        // Build Prisma update data — map snake_case fields to camelCase schema fields
        const updateData = {};
        if (data.status !== undefined) updateData.status = data.status;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.dip_account !== undefined) updateData.dipAccount = data.dip_account;
        if (data.next_followup !== undefined) {
            updateData.nextFollowup = data.next_followup ? new Date(data.next_followup) : null;
        }
        if (data.name !== undefined) updateData.name = data.name;
        if (data.mobile !== undefined) updateData.mobile = data.mobile;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.sourceLink !== undefined) updateData.sourceLink = data.sourceLink;

        await prisma.lead.update({ where: { id: existing.id }, data: updateData });
        return this.getLeadById(id, workspaceId);
    },

    async assignLead(id, assignedToId, userId, ip, workspaceId) {
        const existing = await prisma.lead.findFirst({
            where: { id: parseInt(id), workspaceId },
            include: { assignedUser: { select: { id: true, name: true } } },
        });
        if (!existing) return null;

        const oldAssigneeId = existing.assignedUser?.id?.toString() || null;
        const oldAssignee = existing.assignedUser?.name || 'Unassigned';

        await prisma.lead.update({
            where: { id: existing.id },
            data: { assignedTo: assignedToId ? parseInt(assignedToId) : null },
        });

        const updatedLead = await this.getLeadById(id, workspaceId);
        const newAssignee = updatedLead.assignedTo?.name || 'Unassigned';

        await logService.createLog({
            actionType: 'Lead Assigned',
            performedBy: userId,
            leadId: existing.id,
            leadRef: existing.leadId,
            workspaceId,
            oldValue: oldAssignee,
            newValue: newAssignee,
            ipAddress: ip,
        });

        return { lead: updatedLead, oldAssigneeId };
    },

    async addNote(id, text, userId, ip, workspaceId) {
        const existing = await prisma.lead.findFirst({ where: { id: parseInt(id), workspaceId } });
        if (!existing) return null;

        await prisma.leadNote.create({
            data: { leadId: existing.id, text, addedBy: userId || null },
        });

        await logService.createLog({
            actionType: 'Note Added',
            performedBy: userId,
            leadId: existing.id,
            leadRef: existing.leadId,
            workspaceId,
            newValue: text,
            ipAddress: ip,
        });

        return this.getLeadById(id, workspaceId);
    },

    async deleteLead(id, userId, ip, workspaceId) {
        const existing = await prisma.lead.findFirst({ where: { id: parseInt(id), workspaceId } });
        if (!existing) return null;

        // Snapshot notes for restore
        const notes = await prisma.leadNote.findMany({ where: { leadId: existing.id } });

        // Copy lead to deleted_leads (preserves identity + all fields for restore)
        await prisma.deletedLead.create({
            data: {
                workspaceId:       existing.workspaceId,
                leadId:            existing.leadId,
                name:              existing.name,
                mobile:            existing.mobile,
                amount:            existing.amount,
                sourceLink:        existing.sourceLink,
                status:            existing.status,
                priority:          existing.priority,
                assignedTo:        existing.assignedTo,
                nextFollowup:      existing.nextFollowup,
                dipAccount:        existing.dipAccount,
                verifiedMobile:    existing.verifiedMobile,
                notesJson:         JSON.stringify(notes),
                originalCreatedAt: existing.createdAt,
                deletedBy:         userId || null,
            },
        });

        // Nullify leadId on logs and stamp workspaceId + leadRef so they remain visible and searchable after deletion
        await prisma.activityLog.updateMany({
            where: { leadId: existing.id },
            data: { leadId: null, workspaceId: existing.workspaceId, leadRef: existing.leadId },
        });

        // Delete notes from lead_notes (their content is preserved in notesJson above)
        await prisma.leadNote.deleteMany({ where: { leadId: existing.id } });

        await prisma.lead.delete({ where: { id: existing.id } });

        // Compliance log
        await logService.createLog({
            actionType: 'Lead Deleted',
            performedBy: userId,
            leadId: null,
            leadRef: existing.leadId,
            workspaceId,
            oldValue: `${existing.leadId || existing.id} — ${existing.name} (${existing.mobile})`,
            ipAddress: ip,
        });

        return true;
    },

    async getDeletedLeads(workspaceId) {
        const leads = await prisma.deletedLead.findMany({
            where: { workspaceId },
            orderBy: { deletedAt: 'desc' },
        });
        return leads.map((l) => ({ ...l, _id: l.id }));
    },

    async restoreLead(deletedId, userId, ip, workspaceId) {
        const deleted = await prisma.deletedLead.findFirst({
            where: { id: parseInt(deletedId), workspaceId },
        });
        if (!deleted) return null;

        // Re-create the lead in the leads table (new auto-increment id, same leadId string)
        const restored = await prisma.lead.create({
            data: {
                workspaceId:   deleted.workspaceId,
                leadId:        deleted.leadId,
                name:          deleted.name,
                mobile:        deleted.mobile,
                amount:        deleted.amount,
                sourceLink:    deleted.sourceLink,
                status:        deleted.status,
                priority:      deleted.priority,
                assignedTo:    deleted.assignedTo,
                nextFollowup:  deleted.nextFollowup,
                dipAccount:    deleted.dipAccount,
                verifiedMobile: deleted.verifiedMobile,
                createdAt:     deleted.originalCreatedAt,
            },
            include: leadInclude,
        });

        // Restore notes from snapshot
        const notes = deleted.notesJson ? JSON.parse(deleted.notesJson) : [];
        if (notes.length > 0) {
            await prisma.leadNote.createMany({
                data: notes.map((n) => ({
                    leadId:    restored.id,
                    text:      n.text,
                    addedBy:   n.addedBy,
                    createdAt: n.createdAt,
                })),
            });
        }

        // Re-link activity logs: set leadId back to the new lead row
        await prisma.activityLog.updateMany({
            where: { leadRef: deleted.leadId, workspaceId, leadId: null },
            data: { leadId: restored.id },
        });

        // Remove from deleted_leads
        await prisma.deletedLead.delete({ where: { id: deleted.id } });

        // Compliance log
        await logService.createLog({
            actionType: 'Lead Restored',
            performedBy: userId,
            leadId: restored.id,
            leadRef: restored.leadId,
            workspaceId,
            newValue: `${restored.leadId} — ${restored.name} (${restored.mobile})`,
            ipAddress: ip,
        });

        return formatLead(restored);
    },

    async getStats(assignedTo, workspaceId) {
        const where = { workspaceId };
        if (assignedTo) where.assignedTo = parseInt(assignedTo);

        const [total, newLeads, highPriority, closed] = await Promise.all([
            prisma.lead.count({ where }),
            prisma.lead.count({ where: { ...where, status: 'New' } }),
            prisma.lead.count({ where: { ...where, priority: { in: ['High', 'Urgent'] } } }),
            prisma.lead.count({ where: { ...where, status: 'Closed' } }),
        ]);

        return { total, newLeads, highPriority, closed };
    },

    async getAnalytics(workspaceId) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const [statusData, priorityData, dipData, verifiedData] = await Promise.all([
            prisma.lead.groupBy({ by: ['status'], where: { workspaceId }, _count: { _all: true } }),
            prisma.lead.groupBy({ by: ['priority'], where: { workspaceId }, _count: { _all: true } }),
            prisma.lead.groupBy({ by: ['dipAccount'], where: { workspaceId }, _count: { _all: true } }),
            prisma.lead.groupBy({ by: ['verifiedMobile'], where: { workspaceId }, _count: { _all: true } }),
        ]);

        // Monthly counts — raw SQL for date truncation
        // Postgres folds unquoted identifiers to lowercase, so camelCase columns must be quoted.
        // ::int casts keep COUNT() from returning a BigInt (which JSON.stringify cannot serialize).
        const monthlyData = await prisma.$queryRaw`
            SELECT
                EXTRACT(YEAR FROM "createdAt")::int AS year,
                EXTRACT(MONTH FROM "createdAt")::int AS month,
                COUNT(*)::int AS count
            FROM leads
            WHERE "workspaceId" = ${workspaceId}
              AND "createdAt" >= ${sixMonthsAgo}
            GROUP BY EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
            ORDER BY year ASC, month ASC
        `;

        // Top RMs — raw SQL for join + aggregation
        const rmData = await prisma.$queryRaw`
            SELECT
                l."assignedTo",
                u.name,
                COUNT(*)::int AS total,
                SUM(CASE WHEN l.status = 'Closed' THEN 1 ELSE 0 END)::int AS closed
            FROM leads l
            INNER JOIN users u ON u.id = l."assignedTo"
            WHERE l."workspaceId" = ${workspaceId}
              AND l."assignedTo" IS NOT NULL
            GROUP BY l."assignedTo", u.name
            ORDER BY total DESC
            LIMIT 8
        `;

        return {
            status: statusData.map((r) => ({ _id: r.status, count: r._count._all })),
            priority: priorityData.map((r) => ({ _id: r.priority, count: r._count._all })),
            dip: dipData.map((r) => ({ _id: r.dipAccount, count: r._count._all })),
            verified: verifiedData.map((r) => ({ _id: r.verifiedMobile, count: r._count._all })),
            monthly: monthlyData.map((r) => ({
                _id: { year: Number(r.year), month: Number(r.month) },
                count: Number(r.count),
            })),
            topRMs: rmData.map((r) => ({
                name: r.name || 'Unknown',
                total: Number(r.total),
                closed: Number(r.closed),
            })),
        };
    },

    async verifyMobileLead(id, workspaceId, ip) {
        const existing = await prisma.lead.findFirst({ where: { id: parseInt(id), workspaceId } });
        if (!existing) return null;

        const lead = await prisma.lead.update({
            where: { id: existing.id },
            data: { verifiedMobile: true },
            include: leadInclude,
        });

        await logService.createLog({
            actionType: 'Mobile Verified',
            performedBy: null,
            leadId: existing.id,
            leadRef: existing.leadId,
            workspaceId,
            newValue: 'verified_mobile: true',
            ipAddress: ip,
        });

        return formatLead(lead);
    },
};

module.exports = leadService;
