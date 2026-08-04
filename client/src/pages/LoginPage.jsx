import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../store/slices/authSlice';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error, token, pendingEmail } = useSelector((state) => state.auth);
    const { currentWorkspace } = useSelector((state) => state.workspace);

    // Already logged in → go to app
    useEffect(() => {
        if (token && currentWorkspace) navigate('/', { replace: true });
        else if (token && !currentWorkspace) navigate('/workspace/create', { replace: true });
    }, [token, currentWorkspace, navigate]);

    // Credentials accepted → go to OTP verification
    useEffect(() => {
        if (pendingEmail) navigate('/verify-otp', { replace: true });
    }, [pendingEmail, navigate]);

    useEffect(() => {
        dispatch(clearError());
    }, [dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(login({ email, password }));
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
                    <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Welcome back</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        Sign in to your Mini CRM workspace
                    </p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            id="login-email"
                            className="form-control"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ margin: 0 }}>Password</label>
                            <Link
                                to="/forgot-password"
                                style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 500 }}
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            id="login-password"
                            className="form-control"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        id="login-submit"
                        className="btn btn-primary"
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', marginTop: 10, padding: '12px 0' }}
                    >
                        {loading ? 'Sending OTP...' : 'Continue →'}
                    </button>
                </form>

                <div style={{ marginTop: 22, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    New to Mini CRM?{' '}
                    <Link to="/signup" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                        Create an account
                    </Link>
                </div>
            </div>
        </div>
    );
}
