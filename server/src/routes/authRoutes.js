const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const {
    loginSchema,
    registerSchema,
    publicRegisterSchema,
    verifyOtpSchema,
    resendOtpSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require('../validators/authValidator');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login — validates credentials, sends OTP
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// POST /api/auth/verify-otp — verifies OTP, issues access + refresh tokens
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// POST /api/auth/refresh — exchange refresh token for a new access token
router.post('/refresh', authController.refresh);

// POST /api/auth/resend-otp — resends OTP to email
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), authController.resendOtp);

// POST /api/auth/register (admin only — can set any role)
router.post(
    '/register',
    auth,
    roleGuard('admin'),
    validate(registerSchema),
    authController.register
);

// POST /api/auth/signup (public — always creates editor, sends OTP)
router.post('/signup', authLimiter, validate(publicRegisterSchema), authController.publicRegister);

// GET /api/auth/me
router.get('/me', auth, authController.getMe);

// POST /api/auth/forgot-password — send reset link
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

// POST /api/auth/reset-password — set new password
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// PATCH /api/auth/profile — update display name
router.patch('/profile', auth, authController.updateProfile);

// PATCH /api/auth/change-password — change password
router.patch('/change-password', auth, authController.changePassword);

// POST /api/auth/logout — clears active session token
router.post('/logout', auth, authController.logout);

module.exports = router;
