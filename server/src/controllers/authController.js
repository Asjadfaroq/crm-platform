const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');
const { sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');

// Access token — short-lived (1h)
const generateAccessToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });

// Refresh token — longer-lived (1d), stored in DB for single-session enforcement
const generateRefreshToken = (id) =>
    jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '1d' });

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Helper: format a user + workspaces for login/me responses
const getUserWorkspaces = async (userId) => {
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        include: { workspace: { select: { id: true, name: true, slug: true } } },
    });
    return memberships.map((m) => ({
        id: m.workspace.id,
        _id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
    }));
};

// POST /api/auth/login — validate credentials → send OTP
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.validatedBody;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        const otp = generateOtp();
        await prisma.user.update({
            where: { id: user.id },
            data: { otp, otpExpiry: new Date(Date.now() + 10 * 60 * 1000) },
        });

        await sendOtpEmail(email, otp, 'login');
        res.json({ otpSent: true, email });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/verify-otp — verify OTP → issue JWT
exports.verifyOtp = async (req, res, next) => {
    try {
        const { email, otp, purpose } = req.validatedBody;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.otp || !user.otpExpiry) {
            return res.status(400).json({ message: 'No OTP was requested. Please login again.' });
        }

        if (new Date() > user.otpExpiry) {
            await prisma.user.update({
                where: { id: user.id },
                data: { otp: null, otpExpiry: null },
            });
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
        }

        // Evict existing session via WebSocket
        if (user.activeSessionToken) {
            const io = req.app.locals.io;
            if (io) {
                io.emit('session:force-logout', { userId: user.id.toString() });
            }
        }

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: null,
                otpExpiry: null,
                isEmailVerified: true,
                activeSessionToken: refreshToken,
            },
        });

        const workspaces = await getUserWorkspaces(user.id);

        res.json({
            accessToken,
            refreshToken,
            user: { id: user.id, _id: user.id, name: user.name, email: user.email },
            workspaces,
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/refresh — issue new access token using valid refresh token
exports.refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token required' });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({ message: 'Refresh token expired. Please login again.', code: 'REFRESH_EXPIRED' });
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'User not found or deactivated' });
        }
        if (user.activeSessionToken !== refreshToken) {
            return res.status(401).json({ message: 'Session expired. Please login again.', code: 'SESSION_EXPIRED' });
        }

        const accessToken = generateAccessToken(user.id);
        res.json({ accessToken });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/resend-otp
exports.resendOtp = async (req, res, next) => {
    try {
        const { email, purpose } = req.validatedBody;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = generateOtp();
        await prisma.user.update({
            where: { id: user.id },
            data: { otp, otpExpiry: new Date(Date.now() + 10 * 60 * 1000) },
        });

        await sendOtpEmail(email, otp, purpose || 'login');
        res.json({ message: 'OTP resent successfully' });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/logout — clear active session token
exports.logout = async (req, res, next) => {
    try {
        await prisma.user.update({
            where: { id: req.user.id },
            data: { activeSessionToken: null },
        });
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/register — admin creates a user
exports.register = async (req, res, next) => {
    try {
        const { name, email, password } = req.validatedBody;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashed, isEmailVerified: true },
        });

        res.status(201).json({
            user: { id: user.id, _id: user.id, name: user.name, email: user.email },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/signup — public self-registration, step 1: create → send OTP
exports.publicRegister = async (req, res, next) => {
    try {
        const { name, email, password } = req.validatedBody;

        const hashed = await bcrypt.hash(password, 10);
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        const existing = await prisma.user.findUnique({ where: { email } });

        if (existing) {
            if (existing.isEmailVerified) {
                return res.status(409).json({ message: 'Email already registered' });
            }
            // Unverified — allow re-registration
            await prisma.user.update({
                where: { id: existing.id },
                data: { name, password: hashed, otp, otpExpiry },
            });
        } else {
            await prisma.user.create({
                data: { name, email, password: hashed, isEmailVerified: false, otp, otpExpiry },
            });
        }

        await sendOtpEmail(email, otp, 'signup');
        res.status(201).json({ otpSent: true, email });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.validatedBody;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.isActive) {
            return res.json({ message: 'If that email is registered, a reset link has been sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: token,
                resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
            },
        });

        const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
        await sendPasswordResetEmail(email, resetLink);

        res.json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.validatedBody;

        const user = await prisma.user.findFirst({ where: { resetToken: token } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset link.' });
        }

        if (new Date() > user.resetTokenExpiry) {
            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken: null, resetTokenExpiry: null },
            });
            return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
        }

        const hashed = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashed,
                resetToken: null,
                resetTokenExpiry: null,
                activeSessionToken: null,
            },
        });

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/auth/profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Name is required' });
        }
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { name: name.trim() },
        });
        res.json({ user: { id: user.id, _id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/auth/change-password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both currentPassword and newPassword are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
    const workspaces = await getUserWorkspaces(req.user.id);
    res.json({
        user: { id: req.user.id, _id: req.user.id, name: req.user.name, email: req.user.email },
        workspaces,
    });
};
