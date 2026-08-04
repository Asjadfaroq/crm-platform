const { z } = require('zod');

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// Admin-only: can set any role
const registerSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
});

// Public self-registration: always creates an editor
const publicRegisterSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Admin changes a user's role
const changeRoleSchema = z.object({
    role: z.enum(['admin', 'editor', 'viewer'], { required_error: 'Role is required' }),
});

const verifyOtpSchema = z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
    purpose: z.enum(['login', 'signup']),
});

const resendOtpSchema = z.object({
    email: z.string().email('Invalid email address'),
    purpose: z.enum(['login', 'signup']).default('login'),
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

module.exports = {
    loginSchema, registerSchema, publicRegisterSchema, changeRoleSchema,
    verifyOtpSchema, resendOtpSchema, forgotPasswordSchema, resetPasswordSchema,
};
