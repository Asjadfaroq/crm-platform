import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { verifyOtp, resendOtp, clearOtpError } from '../store/slices/authSlice';

export default function OtpPage() {
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [resendTimer, setResendTimer] = useState(30);
    const inputRefs = useRef([]);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { pendingEmail, otpPurpose, token, otpLoading, otpError, resendLoading } = useSelector(
        (state) => state.auth
    );
    const { currentWorkspace } = useSelector((state) => state.workspace);

    // Guard: no pending email means user shouldn't be here
    useEffect(() => {
        if (!pendingEmail) navigate('/login', { replace: true });
    }, [pendingEmail, navigate]);

    // After OTP verified successfully → navigate based on purpose
    useEffect(() => {
        if (token) {
            if (currentWorkspace) navigate('/', { replace: true });
            else navigate('/workspace/create', { replace: true });
        }
    }, [token, currentWorkspace, navigate]);

    // Clear OTP error on mount
    useEffect(() => {
        dispatch(clearOtpError());
    }, [dispatch]);

    // Resend countdown
    useEffect(() => {
        if (resendTimer === 0) return;
        const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
        return () => clearTimeout(t);
    }, [resendTimer]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const next = [...digits];
        next[index] = value.slice(-1);
        setDigits(next);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (text.length === 6) {
            setDigits(text.split(''));
            inputRefs.current[5]?.focus();
            e.preventDefault();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const otp = digits.join('');
        if (otp.length !== 6) return;
        dispatch(verifyOtp({ email: pendingEmail, otp, purpose: otpPurpose }));
    };

    const handleResend = () => {
        if (resendTimer > 0 || resendLoading) return;
        dispatch(resendOtp({ email: pendingEmail, purpose: otpPurpose }))
            .unwrap()
            .then(() => {
                toast.success('New OTP sent to your email');
                setResendTimer(30);
                setDigits(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            })
            .catch((err) => toast.error(err || 'Failed to resend OTP'));
    };

    const otpComplete = digits.join('').length === 6;
    const maskedEmail = pendingEmail
        ? pendingEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length))
        : '';

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 auto 16px',
                        boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                    }}>C</div>
                    <h1 style={{ fontSize: '1.4rem', marginBottom: 6 }}>Check your email</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 4 }}>
                        We sent a 6-digit verification code to
                    </p>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                        {maskedEmail}
                    </span>
                </div>

                {otpError && (
                    <div className="login-error">{otpError}</div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* OTP digit inputs */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0 24px' }}>
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                ref={(el) => (inputRefs.current[i] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={d}
                                autoFocus={i === 0}
                                onChange={(e) => handleChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                onPaste={i === 0 ? handlePaste : undefined}
                                style={{
                                    width: 48, height: 56,
                                    textAlign: 'center',
                                    fontSize: '1.5rem', fontWeight: 700,
                                    border: `2px solid ${d ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 10,
                                    background: d ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    transition: 'border-color 0.15s, background 0.15s',
                                    caretColor: 'var(--accent-primary)',
                                }}
                            />
                        ))}
                    </div>

                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={otpLoading || !otpComplete}
                        style={{ width: '100%', padding: '12px 0' }}
                    >
                        {otpLoading ? 'Verifying...' : 'Verify & Continue →'}
                    </button>
                </form>

                {/* Resend section */}
                <div style={{ marginTop: 22, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Didn't receive the code?{' '}
                    <button
                        onClick={handleResend}
                        disabled={resendTimer > 0 || resendLoading}
                        style={{
                            background: 'none', border: 'none', padding: 0, cursor: resendTimer > 0 || resendLoading ? 'default' : 'pointer',
                            color: resendTimer > 0 || resendLoading ? 'var(--text-muted)' : 'var(--accent-primary)',
                            fontWeight: 600, fontSize: '0.85rem',
                        }}
                    >
                        {resendLoading
                            ? 'Sending...'
                            : resendTimer > 0
                                ? `Resend in ${resendTimer}s`
                                : 'Resend OTP'}
                    </button>
                </div>

                {/* Info note */}
                <div style={{
                    marginTop: 20, padding: '10px 14px',
                    background: 'var(--bg-hover)', borderRadius: 8,
                    fontSize: '0.78rem', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                    <span style={{ flexShrink: 0 }}>ℹ️</span>
                    <span>The code expires in 10 minutes. Check your spam folder if you don't see it.</span>
                </div>
            </div>
        </div>
    );
}
