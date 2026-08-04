const { z } = require('zod');

const createLeadSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    mobile: z.string().min(1, 'Mobile is required'),
    amount: z.string().optional().default(''),
    sourceLink: z.string().default(''),
    status: z.enum(['New', 'Contacted', 'In Progress', 'Closed', 'Rejected']).default('New'),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
    assignedTo: z.string().nullable().optional(),
    next_followup: z.string().optional().nullable(),
    dip_account: z.enum(['pending', 'created']).default('pending'),
});

const updateLeadSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    mobile: z.string().min(1).optional(),
    amount: z.any().optional(),
    sourceLink: z.string().optional(),
    status: z.enum(['New', 'Contacted', 'In Progress', 'Closed', 'Rejected']).optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
    next_followup: z.string().optional().nullable(),
    dip_account: z.enum(['pending', 'created']).optional(),
});

const publicLeadSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    mobile: z.string().min(1, 'Mobile is required'),
    amount: z.string().optional().default(''),
    sourceLink: z.string().default(''),
});

const assignLeadSchema = z.object({
    assignedTo: z.preprocess(
        (val) => (val === '' ? null : val),
        z.string().min(1, 'User ID is required').nullable()
    ),
});

const addNoteSchema = z.object({
    text: z.string().min(1, 'Note text is required'),
});

// Used for PATCH /api/public/leads/:id/verify-mobile — no body fields required
const verifyMobileSchema = z.object({});

module.exports = {
    createLeadSchema,
    updateLeadSchema,
    publicLeadSchema,
    assignLeadSchema,
    addNoteSchema,
    verifyMobileSchema,
};
