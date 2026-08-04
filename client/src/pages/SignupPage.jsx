import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { signup, clearError } from '../store/slices/authSlice';

export default function SignupPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [localError, setLocalError] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error, token, pendingEmail } = useSelector((state) => state.auth);
    const { currentWorkspace } = useSelector((state) => state.workspace);

    // Already logged in → go to app
    useEffect(() => {
        if (token && currentWorkspace) navigate('/', { replace: true });
        else if (token) navigate('/workspace/create', { replace: true });
    }, [token, currentWorkspace, navigate]);

    // Account created → go to OTP verification
    useEffect(() => {
        if (pendingEmail) navigate('/verify-otp', { replace: true });
    }, [pendingEmail, navigate]);

    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLocalError('');
        if (form.password !== form.confirm) {
            setLocalError('Passwords do not match');
            return;
        }
        dispatch(signup({ name: form.name, email: form.email, password: form.password }));
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
                    <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Create your account</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        Get started with Mini CRM — free forever
                    </p>
                </div>

                {(error || localError) && (
                    <div className="login-error">{localError || error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            id="signup-name"
                            className="form-control"
                            type="text"
                            placeholder="Your full name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            id="signup-email"
                            className="form-control"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            id="signup-password"
                            className="form-control"
                            type="password"
                            placeholder="Min 6 characters"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            id="signup-confirm"
                            className="form-control"
                            type="password"
                            placeholder="Repeat password"
                            value={form.confirm}
                            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                            required
                        />
                    </div>
                    <button
                        id="signup-submit"
                        className="btn btn-primary"
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', marginTop: 10, padding: '12px 0' }}
                    >
                        {loading ? 'Sending OTP...' : 'Create Account →'}
                    </button>
                </form>

                <div style={{ marginTop: 22, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        Sign in
                    </Link>
                </div>

                {/* Steps indicator */}
                <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                    {['Register', 'Create Workspace', 'Invite Team'].map((step, i) => (
                        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontSize: '0.72rem', fontWeight: i === 0 ? 700 : 400,
                                color: i === 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                            }}>
                                <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: i === 0 ? 'var(--accent-primary)' : 'var(--bg-hover)',
                                    color: i === 0 ? '#fff' : 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.68rem', fontWeight: 700,
                                }}>{i + 1}</div>
                                {step}
                            </div>
                            {i < 2 && <span style={{ color: 'var(--border-color)', fontSize: '0.7rem' }}>›</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
