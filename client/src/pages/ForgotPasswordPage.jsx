import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { forgotPassword, clearForgot } from '../store/slices/authSlice';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const dispatch = useDispatch();
    const { forgotLoading, forgotError, forgotSuccess } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(clearForgot());
    }, [dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(forgotPassword({ email }));
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
                    <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Forgot password?</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        Enter your email and we'll send you a reset link
                    </p>
                </div>

                {forgotError && <div className="login-error">{forgotError}</div>}

                {forgotSuccess ? (
                    <div style={{
                        padding: '20px 18px',
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 10,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: 10 }}>📧</div>
                        <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>
                            Check your inbox
                        </p>
                        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                            If <strong>{email}</strong> is registered, a password reset link has been sent. Check your spam folder too.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email address</label>
                            <input
                                className="form-control"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            type="submit"
                            disabled={forgotLoading}
                            style={{ width: '100%', marginTop: 10, padding: '12px 0' }}
                        >
                            {forgotLoading ? 'Sending...' : 'Send Reset Link →'}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: 22, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        ← Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
