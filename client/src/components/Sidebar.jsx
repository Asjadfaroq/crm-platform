import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { clearWorkspace } from '../store/slices/workspaceSlice';
import api from '../api/axios';
import {
    HiOutlineViewGrid,
    HiOutlineClipboardList,
    HiOutlineLogout,
    HiOutlineCog,
    HiOutlineCode,
    HiOutlineOfficeBuilding,
    HiOutlineX,
    HiOutlineChartBar,
} from 'react-icons/hi';

export default function Sidebar({ isOpen, onClose }) {
    const { user } = useSelector((state) => state.auth);
    const { currentWorkspace, workspaces } = useSelector((state) => state.workspace);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch { /* ignore — clears server-side session token */ }
        dispatch(logout());
        dispatch(clearWorkspace());
        navigate('/login');
    };

    // Derive workspace role for the current user
    const myId = user?.id || user?._id;
    const myMembership = currentWorkspace?.members?.find(
        (m) => (m.user?._id || m.user?.id || m.user)?.toString() === myId?.toString()
    );
    const workspaceRole = myMembership?.role;
    const isAdmin = workspaceRole === 'admin';
    const isOwner = !!currentWorkspace?.owner &&
        (currentWorkspace.owner?._id?.toString() || currentWorkspace.owner?.toString()) === myId?.toString();
    const displayRole = isOwner ? 'owner' : (workspaceRole || 'No workspace');

    return (
        <aside className={`sidebar${isOpen ? ' open' : ''}`}>
            {/* Workspace brand */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">M</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', flex: 1 }}>
                    <span className="sidebar-logo-text">Mini CRM</span>
                    {currentWorkspace && (
                        <span style={{
                            fontSize: '0.68rem', color: 'var(--text-muted)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: 130,
                        }}>
                            🏢 {currentWorkspace.name}
                        </span>
                    )}
                </div>
                {/* Close button — visible only on mobile */}
                <button
                    className="sidebar-close-btn"
                    onClick={onClose}
                    aria-label="Close navigation"
                >
                    <HiOutlineX />
                </button>
            </div>

            <nav className="sidebar-nav">
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                >
                    <HiOutlineViewGrid className="icon" />
                    Dashboard
                </NavLink>

                {/* Workspaces tab — always visible */}
                <NavLink
                    to="/workspaces"
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                >
                    <HiOutlineOfficeBuilding className="icon" />
                    <span style={{ flex: 1 }}>Workspaces</span>
                    {workspaces?.length > 0 && (
                        <span style={{
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            borderRadius: 999,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 7px',
                            minWidth: 20,
                            textAlign: 'center',
                        }}>
                            {workspaces.length}
                        </span>
                    )}
                </NavLink>

                {isAdmin && (
                    <>
                        <NavLink
                            to="/analytics"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <HiOutlineChartBar className="icon" />
                            Analytics
                        </NavLink>
                        <NavLink
                            to="/logs"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <HiOutlineClipboardList className="icon" />
                            Activity Logs
                        </NavLink>
                        <NavLink
                            to="/workspace/settings"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <HiOutlineCog className="icon" />
                            Workspace Settings
                        </NavLink>

                        {/* Admin-only section divider */}
                        <div style={{
                            margin: '8px 0 4px',
                            padding: '0 16px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                        }}>
                            Developer
                        </div>
                        <NavLink
                            to="/workspace/api-webhook"
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <HiOutlineCode className="icon" />
                            API &amp; Webhooks
                        </NavLink>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
                        onClick={() => { navigate('/profile'); onClose(); }}
                        title="View profile"
                    >
                        <div className="sidebar-user-avatar">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{user?.name}</div>
                            <div className="sidebar-user-role">{displayRole}</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout">
                        <HiOutlineLogout />
                    </button>
                </div>
            </div>
        </aside>
    );
}
