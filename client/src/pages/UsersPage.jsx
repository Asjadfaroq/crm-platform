import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, changeUserRole, toggleUserActive } from '../store/slices/userSlice';
import { inviteMember, fetchWorkspaces } from '../store/slices/workspaceSlice';
import { HiOutlinePlus, HiOutlineX, HiOutlineShieldCheck, HiOutlinePencil, HiOutlineEye, HiOutlineBan } from 'react-icons/hi';
import toast from 'react-hot-toast';

const ROLES = ['admin', 'editor', 'viewer'];

const roleBadgeClass = {
    admin: 'badge-urgent',
    editor: 'badge-contacted',
    viewer: 'badge-low',
};

const roleIcon = {
    admin: <HiOutlineShieldCheck />,
    editor: <HiOutlinePencil />,
    viewer: <HiOutlineEye />,
};

export default function UsersPage() {
    const dispatch = useDispatch();
    const { items, loading } = useSelector((state) => state.users);
    const { user: me } = useSelector((state) => state.auth);
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        dispatch(fetchUsers());
    }, [dispatch]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setInviting(true);
        try {
            await dispatch(inviteMember({
                workspaceId: currentWorkspace._id,
                email: inviteEmail.trim(),
                role: 'editor',
            })).unwrap();
            toast.success(`Invited ${inviteEmail}`);
            setInviteEmail('');
            setShowInvite(false);
            dispatch(fetchUsers());
            dispatch(fetchWorkspaces());
        } catch (err) {
            toast.error(err || 'Failed to invite');
        } finally {
            setInviting(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await dispatch(changeUserRole({ id: userId, role: newRole })).unwrap();
            toast.success(`Role changed to ${newRole}`);
        } catch (err) {
            toast.error(err);
        }
    };

    const handleToggleActive = async (userId) => {
        try {
            await dispatch(toggleUserActive(userId)).unwrap();
            toast.success('User status updated');
        } catch (err) {
            toast.error(err);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Team Members</h1>
                <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
                    <HiOutlinePlus /> Invite Member
                </button>
            </div>

            {/* Role Legend */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {ROLES.map((r) => (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {roleIcon[r]}
                        <span className={`badge ${roleBadgeClass[r]}`}>{r}</span>
                        <span>—{r === 'admin' ? ' Full access' : r === 'editor' ? ' Assigned leads, status & notes' : ' Read-only'}</span>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner" /></div>
            ) : (
                <div className="table-container">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((u) => (
                                    <tr key={u._id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="user-avatar-sm">
                                                    {u.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {u.name}
                                                    {u._id === me?.id && (
                                                        <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>(you)</span>
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            {u._id === me?.id ? (
                                                <span className={`badge ${roleBadgeClass[u.role] || 'badge-low'}`}>
                                                    {u.role}
                                                </span>
                                            ) : (
                                                <select
                                                    className="form-control"
                                                    style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '0.8rem' }}
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                                >
                                                    {ROLES.map((r) => (
                                                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${u.isActive ? 'badge-closed' : 'badge-rejected'}`}>
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(u.createdAt).toLocaleDateString()}
                                        </td>
                                        <td>
                                            {u._id !== me?.id && (
                                                <button
                                                    className="btn btn-ghost btn-sm btn-icon"
                                                    title={u.isActive ? 'Deactivate' : 'Activate'}
                                                    onClick={() => handleToggleActive(u._id)}
                                                    style={{ color: u.isActive ? 'var(--error)' : 'var(--success)' }}
                                                >
                                                    <HiOutlineBan />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showInvite && (
                <div className="modal-overlay" onClick={() => setShowInvite(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Invite Team Member</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowInvite(false)}>
                                <HiOutlineX />
                            </button>
                        </div>
                        <form onSubmit={handleInvite}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        className="form-control"
                                        type="email"
                                        placeholder="colleague@example.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                                    Invited members join as <strong>Editor</strong>. You can change their role after they join.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={inviting}>
                                    {inviting ? 'Inviting...' : 'Send Invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
