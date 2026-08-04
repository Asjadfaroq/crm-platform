import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createWorkspace, clearWorkspaceError } from '../store/slices/workspaceSlice';
import toast from 'react-hot-toast';

export default function CreateWorkspacePage() {
    const [name, setName] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector((s) => s.workspace);

    useEffect(() => {
        if (error) toast.error(error);
        return () => dispatch(clearWorkspaceError());
    }, [error, dispatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            await dispatch(createWorkspace({ name: name.trim() })).unwrap();
            toast.success('Workspace created!');
            navigate('/', { replace: true });
        } catch {
            // error shown via the error useEffect
        }
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: 480 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #6366f1))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, fontWeight: 700, color: '#fff',
                        margin: '0 auto 16px',
                        boxShadow: '0 4px 18px rgba(99,102,241,0.35)',
                    }}>🏢</div>
                    <h1 style={{ fontSize: '1.6rem', marginBottom: 6 }}>Create your Workspace</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Your workspace is where you and your team manage leads and collaborate.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Workspace Name</label>
                        <input
                            id="workspace-name"
                            className="form-control"
                            type="text"
                            placeholder="e.g. Acme Corp, My Sales Team"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                        {name && (
                            <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                URL slug: <strong style={{ color: 'var(--accent-primary)' }}>
                                    {name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                                </strong>
                            </div>
                        )}
                    </div>

                    <button
                        id="create-workspace-submit"
                        className="btn btn-primary"
                        type="submit"
                        disabled={loading || !name.trim()}
                        style={{ width: '100%', marginTop: 12, padding: '12px 0', fontSize: '0.95rem' }}
                    >
                        {loading ? 'Creating...' : '✨ Create Workspace'}
                    </button>
                </form>

                <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-hover)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>You become the Admin</strong> of this workspace.
                    You can invite team members and assign roles after setup.
                </div>
            </div>
        </div>
    );
}
