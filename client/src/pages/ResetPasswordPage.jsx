import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword, clearReset } from '../store/slices/authSlice';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [localError, setLocalError] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const { resetLoading, resetError, resetSuccess } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(clearReset());
    }, [dispatch]);

    // No token in URL → redirect to forgot password
    useEffect(() => {
        if (!token) navigate('/forgot-password', { replace: true });
    }, [token, navigate]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLocalError('');
        if (password !== confirm) {
            setLocalError('Passwords do not match');
            return;
        }
        dispatch(resetPassword({ token, password }));
    };

    return (
        <div className="login-page">
            <div className="login-card">
                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 auto 14px',
                        boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                    }}>C</div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Set new password</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        Choose a strong password for your account
                    </p>
                </div>

                {(resetError || localError) && (
                    <div className="login-error">{localError || resetError}</div>
                )}

                {resetSuccess ? (
                    <div style={{
                        padding: '20px 18px',
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 10,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: 10 }}>✅</div>
                        <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>
                            Password updated!
                        </p>
                        <p style={{ margin: '8px 0 20px', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                            Your password has been reset successfully. You can now sign in with your new password.
                        </p>
                        <Link
                            to="/login"
                            className="btn btn-primary"
                            style={{ display: 'inline-block', padding: '10px 28px', textDecoration: 'none' }}
                        >
                            Go to Sign In →
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                className="form-control"
                                type="password"
                                placeholder="Min 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                className="form-control"
                                type="password"
                                placeholder="Repeat password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={resetLoading}
                            style={{ width: '100%', marginTop: 10, padding: '12px 0' }}
                        >
                            {resetLoading ? 'Resetting...' : 'Reset Password →'}
                        </button>
                    </form>
                )}

                {!resetSuccess && (
                    <div style={{ marginTop: 22, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                            ← Back to Sign In
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
