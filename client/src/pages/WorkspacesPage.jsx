import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkspaces, setCurrentWorkspace } from '../store/slices/workspaceSlice';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineCheckCircle,
    HiOutlineArrowRight,
    HiOutlinePlus,
    HiOutlineUserGroup,
} from 'react-icons/hi';

const roleColors = {
    admin:  { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)',  color: '#a78bfa' },
    editor: { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)',  color: '#60a5fa' },
    viewer: { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.4)', color: '#94a3b8' },
};

export default function WorkspacesPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { workspaces, currentWorkspace, loading } = useSelector((s) => s.workspace);
    const { user } = useSelector((s) => s.auth);

    useEffect(() => {
        dispatch(fetchWorkspaces());
    }, [dispatch]);

    const handleSwitch = (ws) => {
        dispatch(setCurrentWorkspace(ws));
        navigate('/');
    };

    const getMyRole = (ws) => {
        const me = ws.members?.find(
            (m) => (m.user?._id || m.user?.id || m.user) === (user?.id || user?._id)
        );
        return me?.role || 'viewer';
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Workspaces</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                        All workspaces you're a member of
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/workspace/create')}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
                >
                    <HiOutlinePlus /> New Workspace
                </button>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : workspaces.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">🏢</div>
                    <h3>No workspaces yet</h3>
                    <p>Create your first workspace to get started.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/workspace/create')} style={{ marginTop: 16 }}>
                        Create Workspace
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {workspaces.map((ws) => {
                        const role      = getMyRole(ws);
                        const roleStyle = roleColors[role] || roleColors.viewer;
                        const isActive  = currentWorkspace?._id === ws._id;

                        return (
                            <div
                                key={ws._id}
                                className="card"
                                onClick={() => handleSwitch(ws)}
                                style={{
                                    padding: 0,
                                    position: 'relative',
                                    border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    transition: 'transform 0.18s, box-shadow 0.18s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '';
                                }}
                            >
                                {/* Top accent line */}
                                <div style={{
                                    height: 4,
                                    background: isActive
                                        ? 'var(--accent-primary)'
                                        : 'var(--border-color)',
                                }} />

                                <div style={{ padding: '20px 22px 22px' }}>

                                    {/* Avatar + active badge row */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12,
                                            background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.4rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                                        }}>
                                            {ws.name.charAt(0).toUpperCase()}
                                        </div>

                                        {isActive && (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                background: 'rgba(139,92,246,0.15)',
                                                border: '1px solid rgba(139,92,246,0.3)',
                                                borderRadius: 999, padding: '3px 10px',
                                                fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa',
                                                letterSpacing: '0.06em',
                                            }}>
                                                <HiOutlineCheckCircle /> ACTIVE
                                            </div>
                                        )}
                                    </div>

                                    {/* Name + slug */}
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                                            {ws.name}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            /{ws.slug}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div style={{ height: 1, background: 'var(--border-color)', marginBottom: 14 }} />

                                    {/* Footer: members + role + button */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                <HiOutlineUserGroup />
                                                {ws.members?.length || 0} member{ws.members?.length !== 1 ? 's' : ''}
                                            </div>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center',
                                                background: roleStyle.bg,
                                                border: `1px solid ${roleStyle.border}`,
                                                color: roleStyle.color,
                                                borderRadius: 999, padding: '3px 10px',
                                                fontSize: '0.72rem', fontWeight: 700,
                                                textTransform: 'capitalize', letterSpacing: '0.05em',
                                            }}>
                                                {role}
                                            </span>
                                        </div>

                                        {!isActive ? (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                                                onClick={(e) => { e.stopPropagation(); handleSwitch(ws); }}
                                            >
                                                Switch <HiOutlineArrowRight />
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                                                onClick={(e) => { e.stopPropagation(); navigate('/'); }}
                                            >
                                                Open <HiOutlineArrowRight />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
