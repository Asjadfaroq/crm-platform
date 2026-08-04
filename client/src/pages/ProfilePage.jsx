import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, changePassword } from '../store/slices/authSlice';
import { fetchWorkspaces } from '../store/slices/workspaceSlice';
import toast from 'react-hot-toast';
import {
    HiOutlineUser,
    HiOutlineMail,
    HiOutlineLockClosed,
    HiOutlineOfficeBuilding,
    HiOutlinePencil,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineShieldCheck,
    HiOutlineEye,
    HiOutlineEyeOff,
} from 'react-icons/hi';

const ROLE_COLORS = {
    admin:  { bg: 'rgba(108,99,255,0.15)', color: '#6c63ff', label: 'Admin' },
    editor: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24', label: 'Editor' },
    viewer: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', label: 'Viewer' },
};

function RoleBadge({ role }) {
    const s = ROLE_COLORS[role] || ROLE_COLORS.viewer;
    return (
        <span style={{
            fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px',
            borderRadius: 20, background: s.bg, color: s.color,
            textTransform: 'capitalize', letterSpacing: '0.03em',
        }}>
            {s.label}
        </span>
    );
}

function Section({ title, icon: Icon, children }) {
    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 26px',
            boxShadow: 'var(--shadow-sm)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border-color)' }}>
                <Icon style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{title}</span>
            </div>
            {children}
        </div>
    );
}

function Field({ label, value, muted }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '0.9rem', color: muted ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
        </div>
    );
}

function PasswordInput({ placeholder, value, onChange, autoComplete }) {
    const [show, setShow] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <input
                type={show ? 'text' : 'password'}
                className="form-control"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                style={{ paddingRight: 40 }}
            />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '1rem', padding: 0,
                }}
            >
                {show ? <HiOutlineEyeOff /> : <HiOutlineEye />}
            </button>
        </div>
    );
}

export default function ProfilePage() {
    const dispatch = useDispatch();
    const { user } = useSelector((s) => s.auth);
    const { currentWorkspace, workspaces } = useSelector((s) => s.workspace);

    useEffect(() => {
        if (!workspaces || workspaces.length === 0) {
            dispatch(fetchWorkspaces());
        }
    }, [dispatch]);

    // ── Name edit ──────────────────────────────────────────────────────────
    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState(user?.name || '');
    const [nameLoading, setNameLoading] = useState(false);

    const handleSaveName = async () => {
        if (!nameVal.trim() || nameVal.trim() === user?.name) { setEditingName(false); return; }
        setNameLoading(true);
        try {
            await dispatch(updateProfile({ name: nameVal.trim() })).unwrap();
            toast.success('Name updated');
            setEditingName(false);
        } catch (err) {
            toast.error(err);
        } finally {
            setNameLoading(false);
        }
    };

    const handleCancelName = () => {
        setNameVal(user?.name || '');
        setEditingName(false);
    };

    // ── Password change ────────────────────────────────────────────────────
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (pwForm.next !== pwForm.confirm) {
            toast.error('New passwords do not match');
            return;
        }
        if (pwForm.next.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }
        setPwLoading(true);
        try {
            await dispatch(changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next })).unwrap();
            toast.success('Password changed successfully');
            setPwForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            toast.error(err);
        } finally {
            setPwLoading(false);
        }
    };

    // ── Workspace list ──────────────────────────────────────────────────────
    const myWorkspaces = (workspaces || []).map((ws) => {
        const full = currentWorkspace?._id === (ws.id || ws._id) ? currentWorkspace : ws;
        const member = full?.members?.find(
            (m) => (m.user?._id || m.user?.id || m.user) === (user?.id || user?._id)
        );
        return {
            id: ws.id || ws._id,
            name: ws.name,
            role: member?.role || ws.role || 'viewer',
            isCurrent: currentWorkspace?._id === (ws.id || ws._id),
        };
    });

    const initials = (user?.name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div style={{ padding: '28px 28px 60px', maxWidth: 780, margin: '0 auto' }}>

            {/* Page header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>My Profile</h1>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Manage your account information and security settings
                </p>
            </div>

            {/* ── Profile hero card ── */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '28px 26px',
                marginBottom: 16,
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
            }}>
                {/* Avatar */}
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent-gradient)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', fontWeight: 800, color: '#fff',
                    boxShadow: '0 0 0 4px var(--bg-secondary), 0 0 0 6px var(--accent-primary)',
                }}>
                    {initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {user?.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                        {user?.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: '0.75rem', fontWeight: 600,
                            color: 'var(--success)',
                            background: 'rgba(52,211,153,0.12)',
                            borderRadius: 20, padding: '3px 10px',
                        }}>
                            <HiOutlineShieldCheck /> Email Verified
                        </span>
                        <span style={{
                            fontSize: '0.75rem', color: 'var(--text-muted)',
                            background: 'var(--bg-secondary)', borderRadius: 20, padding: '3px 10px',
                        }}>
                            {myWorkspaces.length} workspace{myWorkspaces.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Two-column grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                {/* Update name */}
                <Section title="Display Name" icon={HiOutlineUser}>
                    {!editingName ? (
                        <div>
                            <div style={{
                                fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)',
                                marginBottom: 16, padding: '10px 14px',
                                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                            }}>
                                {user?.name}
                            </div>
                            <button
                                className="btn btn-secondary"
                                onClick={() => { setNameVal(user?.name || ''); setEditingName(true); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', width: '100%', justifyContent: 'center' }}
                            >
                                <HiOutlinePencil /> Edit Name
                            </button>
                        </div>
                    ) : (
                        <div>
                            <input
                                className="form-control"
                                value={nameVal}
                                onChange={(e) => setNameVal(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelName(); }}
                                autoFocus
                                style={{ marginBottom: 10 }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveName}
                                    disabled={nameLoading || !nameVal.trim()}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.82rem' }}
                                >
                                    <HiOutlineCheck /> {nameLoading ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleCancelName}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.82rem' }}
                                >
                                    <HiOutlineX /> Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </Section>

                {/* Account info */}
                <Section title="Account Info" icon={HiOutlineMail}>
                    <Field label="Email" value={user?.email} />
                    <Field label="Account ID" value={user?.id || user?._id} muted />
                </Section>
            </div>

            {/* ── Change password ── */}
            <div style={{ marginBottom: 16 }}>
                <Section title="Change Password" icon={HiOutlineLockClosed}>
                    <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Current Password
                            </label>
                            <PasswordInput
                                placeholder="••••••••"
                                value={pwForm.current}
                                onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                                autoComplete="current-password"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                New Password
                            </label>
                            <PasswordInput
                                placeholder="Min 6 characters"
                                value={pwForm.next}
                                onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                                autoComplete="new-password"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Confirm New Password
                            </label>
                            <PasswordInput
                                placeholder="Repeat new password"
                                value={pwForm.confirm}
                                onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                                autoComplete="new-password"
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                            {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
                                <span style={{ color: 'var(--error)', fontSize: '0.78rem', marginRight: 'auto', alignSelf: 'center' }}>
                                    Passwords do not match
                                </span>
                            )}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={pwLoading || !pwForm.current || !pwForm.next || !pwForm.confirm}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '8px 22px' }}
                            >
                                <HiOutlineLockClosed />
                                {pwLoading ? 'Updating…' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </Section>
            </div>

            {/* ── Workspace memberships ── */}
            {myWorkspaces.length > 0 && (
                <Section title="Workspace Memberships" icon={HiOutlineOfficeBuilding}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {myWorkspaces.map((ws) => (
                            <div key={ws.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px',
                                background: ws.isCurrent ? 'rgba(108,99,255,0.07)' : 'var(--bg-secondary)',
                                border: ws.isCurrent ? '1px solid rgba(108,99,255,0.3)' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                        background: ws.isCurrent ? 'var(--accent-primary)' : 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.85rem', fontWeight: 700,
                                        color: ws.isCurrent ? '#fff' : 'var(--text-muted)',
                                    }}>
                                        {ws.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                            {ws.name}
                                            {ws.isCurrent && (
                                                <span style={{ marginLeft: 8, fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                                                    ACTIVE
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <RoleBadge role={ws.role} />
                            </div>
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
}
