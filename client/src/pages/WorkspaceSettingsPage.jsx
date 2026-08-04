import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchWorkspaces,
    inviteMember,
    updateMemberRole,
    removeMember,
    requestOwnershipTransfer,
    confirmOwnershipTransfer,
} from '../store/slices/workspaceSlice';
import { fetchDeletedLeads, restoreDeletedLead } from '../store/slices/deletedLeadSlice';
import toast from 'react-hot-toast';
import api from '../api/axios';

const ROLE_COLORS = { admin: '#6366f1', editor: '#10b981', viewer: '#f59e0b' };
const ROLES = ['admin', 'editor', 'viewer'];

export default function WorkspaceSettingsPage() {
    const dispatch = useDispatch();
    const { currentWorkspace } = useSelector((s) => s.workspace);
    const { user } = useSelector((s) => s.auth);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    // Remove member compliance modal state
    const [removeModal, setRemoveModal]                   = useState(null);   // { userId, name, email, role }
    const [removePreview, setRemovePreview]               = useState(null);   // { assignedLeadCount, reassignCandidates }
    const [removePreviewLoading, setRemovePreviewLoading] = useState(false);
    const [removeReassignTo, setRemoveReassignTo]         = useState('');
    const [removeConfirmLoading, setRemoveConfirmLoading] = useState(false);

    // Deleted leads
    const { items: deletedLeads, loading: deletedLoading } = useSelector((s) => s.deletedLeads);
    const [restoringId, setRestoringId] = useState(null);
    const [deletedSearch, setDeletedSearch] = useState('');
    const [deletedPage, setDeletedPage] = useState(1);
    const DELETED_PAGE_SIZE = 5;

    // Transfer ownership modal state
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferTargetId, setTransferTargetId] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);

    const myId = (user?.id || user?._id)?.toString();
    // ownerId is stored as integer on the workspace — use it directly
    const ownerId = currentWorkspace?.ownerId?.toString();
    const isOwner = !!ownerId && ownerId === myId;

    const myMembership = currentWorkspace?.members?.find(
        (m) => (m.user?._id || m.user?.id)?.toString() === myId
    );
    const myRole = myMembership?.role;
    const isAdmin = myRole === 'admin';

    useEffect(() => {
        dispatch(fetchWorkspaces());
    }, [dispatch]);

    useEffect(() => {
        if (isAdmin && currentWorkspace) dispatch(fetchDeletedLeads());
    }, [isAdmin, currentWorkspace, dispatch]);

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
            dispatch(fetchWorkspaces());
        } catch (err) {
            toast.error(err || 'Failed to invite');
        } finally {
            setInviting(false);
        }
    };

    const handleRoleChange = async (userId, role) => {
        try {
            await dispatch(updateMemberRole({ workspaceId: currentWorkspace._id, userId, role })).unwrap();
            toast.success('Role updated');
            dispatch(fetchWorkspaces());
        } catch (err) {
            toast.error(err || 'Failed to update role');
        }
    };

    const handleRestore = async (deletedId, leadIdLabel) => {
        setRestoringId(deletedId);
        try {
            await dispatch(restoreDeletedLead(deletedId)).unwrap();
            toast.success(`${leadIdLabel} restored successfully`);
            dispatch(fetchDeletedLeads());
        } catch (err) {
            toast.error(err || 'Failed to restore lead');
        } finally {
            setRestoringId(null);
        }
    };

    const handleRemove = async (userId, name, email, role) => {
        setRemoveModal({ userId, name, email, role });
        setRemovePreview(null);
        setRemoveReassignTo('');
        setRemovePreviewLoading(true);
        try {
            const { data } = await api.get(
                `/workspaces/${currentWorkspace._id}/members/${userId}/removal-preview`
            );
            setRemovePreview(data);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to load member info');
            setRemoveModal(null);
        } finally {
            setRemovePreviewLoading(false);
        }
    };

    const closeRemoveModal = () => {
        setRemoveModal(null);
        setRemovePreview(null);
        setRemoveReassignTo('');
    };

    const handleConfirmRemove = async () => {
        if (!removeModal) return;
        setRemoveConfirmLoading(true);
        try {
            await dispatch(removeMember({
                workspaceId: currentWorkspace._id,
                userId: removeModal.userId,
                reassignTo: removeReassignTo ? parseInt(removeReassignTo) : null,
            })).unwrap();
            toast.success(`${removeModal.name} removed`);
            closeRemoveModal();
            dispatch(fetchWorkspaces());
        } catch (err) {
            toast.error(err || 'Failed to remove member');
        } finally {
            setRemoveConfirmLoading(false);
        }
    };

    // Transfer ownership handlers
    const handleRequestTransfer = async () => {
        if (!transferTargetId) return toast.error('Select a member to transfer to');
        setTransferLoading(true);
        try {
            const msg = await dispatch(requestOwnershipTransfer({
                workspaceId: currentWorkspace._id,
                targetUserId: transferTargetId,
            })).unwrap();
            toast.success(msg || 'OTP sent to your email');
            setOtpSent(true);
        } catch (err) {
            toast.error(err || 'Failed to send OTP');
        } finally {
            setTransferLoading(false);
        }
    };

    const handleConfirmTransfer = async () => {
        if (!otpValue.trim()) return toast.error('Enter the OTP from your email');
        setTransferLoading(true);
        try {
            await dispatch(confirmOwnershipTransfer({
                workspaceId: currentWorkspace._id,
                otp: otpValue.trim(),
            })).unwrap();
            toast.success('Ownership transferred successfully');
            setShowTransferModal(false);
            setOtpSent(false);
            setOtpValue('');
            setTransferTargetId('');
            dispatch(fetchWorkspaces());
        } catch (err) {
            toast.error(err || 'Failed to confirm transfer');
        } finally {
            setTransferLoading(false);
        }
    };

    const closeTransferModal = () => {
        setShowTransferModal(false);
        setOtpSent(false);
        setOtpValue('');
        setTransferTargetId('');
    };

    if (!currentWorkspace) {
        return <div className="page-content"><p style={{ color: 'var(--text-muted)' }}>No workspace selected.</p></div>;
    }

    const members = currentWorkspace.members || [];

    // Non-owner members available to transfer ownership to
    const transferCandidates = members.filter(
        (m) => (m.user?._id || m.user?.id)?.toString() !== myId
    );

    return (
        <div className="page-content">
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ flex: 1, minWidth: 0, maxWidth: 700 }}>
                {/* Header */}
                <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                            🏢 {currentWorkspace.name}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.88rem' }}>
                            Workspace Settings · Team Members
                        </p>
                    </div>
                    {isOwner && (
                        <button
                            className="btn btn-ghost"
                            onClick={() => setShowTransferModal(true)}
                            style={{
                                fontSize: '0.82rem', border: '1px solid var(--border-color)',
                                color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            🔁 Transfer Ownership
                        </button>
                    )}
                </div>

                {/* Invite Form (admin only) */}
                {isAdmin && (
                    <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 14 }}>
                            ✉️ Invite a Team Member
                        </h3>
                        <form onSubmit={handleInvite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <input
                                id="invite-email"
                                className="form-control"
                                type="email"
                                placeholder="colleague@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                required
                                style={{ flex: 1, minWidth: 220 }}
                            />
                            <button
                                id="invite-submit"
                                className="btn btn-primary"
                                type="submit"
                                disabled={inviting}
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                {inviting ? 'Inviting...' : '+ Invite'}
                            </button>
                        </form>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10 }}>
                            Invited members join as <strong>Editor</strong>. You can change their role below.
                        </p>
                    </div>
                )}

                {/* Members List */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                            👥 Members ({members.length})
                        </h3>
                    </div>

                    {members.length === 0 && (
                        <p style={{ padding: 20, color: 'var(--text-muted)' }}>No members yet.</p>
                    )}

                    {members.map((m, i) => {
                        const memberId = (m.user?._id || m.user?.id)?.toString();
                        const memberName = m.user?.name || memberId;
                        const memberEmail = m.user?.email || '';
                        const isSelf = memberId === myId;
                        const isTargetOwner = memberId === ownerId;

                        // Permission rules:
                        // - Owner can change roles of admin, editor, viewer (except self, which is also owner)
                        // - Admin (non-owner) can only change editor and viewer, NOT other admins
                        // - Nobody can change the owner's role
                        const canEditRole =
                            !isSelf &&
                            !isTargetOwner &&
                            (isOwner || (isAdmin && m.role !== 'admin'));

                        const canRemove =
                            !isSelf &&
                            !isTargetOwner &&
                            (isOwner || (isAdmin && m.role !== 'admin'));

                        // Admin looking at another admin — blocked
                        const adminBlockedByOwnerRule =
                            !isSelf && !isTargetOwner && isAdmin && !isOwner && m.role === 'admin';

                        const avatarColor = isTargetOwner
                            ? '#f59e0b'
                            : ROLE_COLORS[m.role] || '#6b7280';

                        return (
                            <div
                                key={memberId}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '14px 20px',
                                    borderBottom: i < members.length - 1 ? '1px solid var(--border-color)' : 'none',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%',
                                    background: `${avatarColor}22`,
                                    color: avatarColor,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: '0.95rem', flexShrink: 0,
                                }}>
                                    {memberName.charAt(0).toUpperCase()}
                                </div>

                                {/* Name + email */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        {memberName}
                                        {isSelf && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(you)</span>}
                                        {isTargetOwner && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                padding: '1px 8px', borderRadius: 999,
                                                background: 'rgba(245,158,11,0.15)',
                                                border: '1px solid rgba(245,158,11,0.4)',
                                                color: '#f59e0b',
                                                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
                                            }}>
                                                👑 Owner
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{memberEmail}</div>
                                </div>

                                {/* Role + actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {isTargetOwner ? null : canEditRole ? (
                                        <select
                                            className="form-control"
                                            value={m.role}
                                            onChange={(e) => handleRoleChange(memberId, e.target.value)}
                                            style={{
                                                padding: '4px 8px', fontSize: '0.8rem',
                                                border: `1px solid ${ROLE_COLORS[m.role]}55`,
                                                color: ROLE_COLORS[m.role], fontWeight: 600,
                                                borderRadius: 6, background: `${ROLE_COLORS[m.role]}11`,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {ROLES.map((r) => (
                                                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        !isTargetOwner && (
                                            <span
                                                title={adminBlockedByOwnerRule ? "Only the workspace owner can change an admin's role" : undefined}
                                                style={{
                                                    padding: '3px 10px', borderRadius: 20,
                                                    background: `${ROLE_COLORS[m.role] || '#6b7280'}22`,
                                                    color: ROLE_COLORS[m.role] || '#6b7280',
                                                    fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.02em',
                                                    cursor: adminBlockedByOwnerRule ? 'not-allowed' : 'default',
                                                    opacity: adminBlockedByOwnerRule ? 0.7 : 1,
                                                }}
                                            >
                                                {m.role}
                                                {adminBlockedByOwnerRule && ' 🔒'}
                                            </span>
                                        )
                                    )}

                                    {canRemove && (
                                        <button
                                            className="btn btn-ghost btn-icon"
                                            onClick={() => handleRemove(memberId, memberName, memberEmail, m.role)}
                                            title="Remove member"
                                            style={{ color: 'var(--danger, #ef4444)', fontSize: '1rem' }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* ── END LEFT COLUMN ── */}

            {/* ── RIGHT COLUMN — Deleted Leads (admin only) ── */}
            {isAdmin && (() => {
                const q = deletedSearch.trim().toUpperCase();
                const filtered = q
                    ? deletedLeads.filter(
                        (l) =>
                            (l.leadId || '').toUpperCase().includes(q) ||
                            (l.name  || '').toUpperCase().includes(q) ||
                            (l.mobile|| '').includes(q)
                      )
                    : deletedLeads;

                return (
                    <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column' }}>
                        <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 1 }}>

                            {/* Header */}
                            <div style={{
                                padding: '14px 18px',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                                {/* Title */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>🗑️</span>
                                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                        Deleted Leads
                                    </span>
                                    {deletedLeads.length > 0 && (
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 999,
                                            background: 'rgba(239,68,68,0.1)',
                                            color: '#ef4444', fontSize: '0.72rem', fontWeight: 700,
                                            border: '1px solid rgba(239,68,68,0.22)',
                                        }}>
                                            {deletedLeads.length}
                                        </span>
                                    )}
                                </div>

                                {/* Search — compact, right side */}
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    width: 170, flexShrink: 0,
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 7, background: 'var(--bg-secondary)',
                                    transition: 'border-color 0.15s',
                                }}
                                    onFocusCapture={(e) => e.currentTarget.style.borderColor = '#6366f1'}
                                    onBlurCapture={(e)  => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                >
                                    <input
                                        type="text"
                                        placeholder="Search…"
                                        value={deletedSearch}
                                        onChange={(e) => { setDeletedSearch(e.target.value); setDeletedPage(1); }}
                                        style={{
                                            flex: 1, border: 'none', outline: 'none',
                                            background: 'transparent', minWidth: 0,
                                            fontSize: '0.8rem', color: 'var(--text-primary)',
                                            padding: '6px 6px 6px 10px',
                                        }}
                                    />
                                    {deletedSearch ? (
                                        <button
                                            onClick={() => { setDeletedSearch(''); setDeletedPage(1); }}
                                            style={{
                                                border: 'none', background: 'none', cursor: 'pointer',
                                                padding: '0 8px', color: 'var(--text-muted)',
                                                fontSize: '0.7rem', lineHeight: 1,
                                            }}
                                        >✕</button>
                                    ) : (
                                        <span style={{ padding: '0 8px', color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1 }}>🔍</span>
                                    )}
                                </div>
                            </div>

                            {/* Table body */}
                            {deletedLoading ? (
                                <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                                    <div className="spinner" style={{ margin: '0 auto 10px' }} />
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Loading...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>{q ? '🔍' : '✅'}</div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: 0, fontWeight: 500 }}>
                                        {q ? `No results for "${deletedSearch}"` : 'No deleted leads'}
                                    </p>
                                    {q && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '4px 0 0' }}>
                                            Try searching by lead number, name or mobile
                                        </p>
                                    )}
                                </div>
                            ) : (() => {
                                const totalPages = Math.ceil(filtered.length / DELETED_PAGE_SIZE);
                                const safePage   = Math.min(deletedPage, totalPages);
                                const pageItems  = filtered.slice((safePage - 1) * DELETED_PAGE_SIZE, safePage * DELETED_PAGE_SIZE);

                                const PRIORITY_STYLE = {
                                    Urgent: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)'  },
                                    High:   { bg: 'rgba(249,115,22,0.12)',  color: '#f97316', border: 'rgba(249,115,22,0.3)' },
                                    Medium: { bg: 'rgba(234,179,8,0.12)',   color: '#ca8a04', border: 'rgba(234,179,8,0.3)'  },
                                    Low:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', border: 'rgba(16,185,129,0.3)' },
                                };

                                return (
                                    <>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                                <thead>
                                                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                                                        <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Lead #</th>
                                                        <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Name</th>
                                                        <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</th>
                                                        <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Deleted</th>
                                                        <th style={{ padding: '9px 14px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pageItems.map((l) => {
                                                        const ps = PRIORITY_STYLE[l.priority] || PRIORITY_STYLE.Medium;
                                                        return (
                                                            <tr
                                                                key={l._id}
                                                                style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.12s' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                {/* Lead # */}
                                                                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                                                    <span style={{
                                                                        fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700,
                                                                        color: 'var(--accent-primary)',
                                                                        background: 'rgba(99,102,241,0.1)',
                                                                        border: '1px solid rgba(99,102,241,0.22)',
                                                                        borderRadius: 5, padding: '2px 7px',
                                                                    }}>
                                                                        {l.leadId}
                                                                    </span>
                                                                </td>

                                                                {/* Name + mobile */}
                                                                <td style={{ padding: '11px 14px', maxWidth: 120 }}>
                                                                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {l.name}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{l.mobile}</div>
                                                                </td>

                                                                {/* Status + priority */}
                                                                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                                                    <div style={{ marginBottom: 3 }}>
                                                                        <span style={{
                                                                            padding: '2px 7px', borderRadius: 999,
                                                                            background: 'var(--bg-secondary)',
                                                                            color: 'var(--text-muted)',
                                                                            fontSize: '0.68rem', fontWeight: 600,
                                                                            border: '1px solid var(--border-color)',
                                                                        }}>
                                                                            {l.status}
                                                                        </span>
                                                                    </div>
                                                                    <span style={{
                                                                        padding: '2px 7px', borderRadius: 999,
                                                                        background: ps.bg, color: ps.color,
                                                                        fontSize: '0.65rem', fontWeight: 600,
                                                                        border: `1px solid ${ps.border}`,
                                                                    }}>
                                                                        {l.priority}
                                                                    </span>
                                                                </td>

                                                                {/* Deleted date */}
                                                                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                        {new Date(l.deletedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                                    </div>
                                                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>
                                                                        {new Date(l.deletedAt).getFullYear()}
                                                                    </div>
                                                                </td>

                                                                {/* Restore */}
                                                                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                                                                    <button
                                                                        onClick={() => handleRestore(l._id, l.leadId)}
                                                                        disabled={restoringId === l._id}
                                                                        style={{
                                                                            padding: '5px 11px', borderRadius: 6,
                                                                            border: '1px solid rgba(99,102,241,0.4)',
                                                                            background: restoringId === l._id ? 'var(--bg-secondary)' : 'rgba(99,102,241,0.08)',
                                                                            color: 'var(--accent-primary)',
                                                                            fontSize: '0.75rem', fontWeight: 600,
                                                                            cursor: restoringId === l._id ? 'not-allowed' : 'pointer',
                                                                            whiteSpace: 'nowrap', transition: 'background 0.15s',
                                                                        }}
                                                                        onMouseEnter={(e) => { if (restoringId !== l._id) e.currentTarget.style.background = 'rgba(99,102,241,0.18)'; }}
                                                                        onMouseLeave={(e) => { if (restoringId !== l._id) e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                                                                    >
                                                                        {restoringId === l._id ? '…' : '↩ Restore'}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination footer */}
                                        <div style={{
                                            padding: '10px 16px',
                                            borderTop: '1px solid var(--border-color)',
                                            background: 'var(--bg-secondary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        }}>
                                            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                                {q
                                                    ? `${filtered.length} of ${deletedLeads.length} · page ${safePage}/${totalPages}`
                                                    : `${deletedLeads.length} deleted · page ${safePage}/${totalPages}`}
                                            </span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    onClick={() => setDeletedPage((p) => Math.max(1, p - 1))}
                                                    disabled={safePage <= 1}
                                                    style={{
                                                        padding: '4px 10px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 600,
                                                        border: '1px solid var(--border-color)',
                                                        background: safePage <= 1 ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                                        color: safePage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                                        cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    ← Prev
                                                </button>
                                                <button
                                                    onClick={() => setDeletedPage((p) => Math.min(totalPages, p + 1))}
                                                    disabled={safePage >= totalPages}
                                                    style={{
                                                        padding: '4px 10px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 600,
                                                        border: '1px solid var(--border-color)',
                                                        background: safePage >= totalPages ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                                        color: safePage >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                                                        cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    Next →
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}

                        </div>
                    </div>
                );
            })()}
            {/* ── END RIGHT COLUMN ── */}

            </div>{/* end flex row */}

            {/* Remove Member Compliance Modal */}
            {removeModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: 16,
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: 460, padding: 28 }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>
                            Remove Member
                        </h3>
                        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            You are about to remove <strong>{removeModal.name}</strong>
                            {removeModal.email ? ` (${removeModal.email})` : ''} from this workspace.
                        </p>

                        {removePreviewLoading && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                                Loading member info...
                            </p>
                        )}

                        {removePreview && !removePreviewLoading && (
                            <>
                                {removePreview.assignedLeadCount > 0 ? (
                                    <>
                                        <div style={{
                                            background: 'rgba(239,68,68,0.08)',
                                            border: '1px solid rgba(239,68,68,0.25)',
                                            borderRadius: 8, padding: '10px 14px',
                                            marginBottom: 16, fontSize: '0.83rem', color: 'var(--text-muted)',
                                        }}>
                                            This member has <strong>{removePreview.assignedLeadCount} assigned lead(s)</strong>.
                                            Select a member to reassign them, or leave blank to unassign.
                                        </div>
                                        <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                            Reassign leads to (optional)
                                        </label>
                                        <select
                                            className="form-control"
                                            value={removeReassignTo}
                                            onChange={(e) => setRemoveReassignTo(e.target.value)}
                                            style={{ marginBottom: 16, width: '100%' }}
                                        >
                                            <option value="">— Leave unassigned —</option>
                                            {removePreview.reassignCandidates.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}{c.email ? ` (${c.email})` : ''} — {c.role}
                                                </option>
                                            ))}
                                        </select>
                                    </>
                                ) : (
                                    <div style={{
                                        background: 'rgba(16,185,129,0.08)',
                                        border: '1px solid rgba(16,185,129,0.25)',
                                        borderRadius: 8, padding: '10px 14px',
                                        marginBottom: 16, fontSize: '0.83rem', color: 'var(--text-muted)',
                                    }}>
                                        This member has no assigned leads.
                                    </div>
                                )}

                                <div style={{
                                    background: 'rgba(99,102,241,0.07)',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    borderRadius: 8, padding: '10px 14px',
                                    marginBottom: 20, fontSize: '0.78rem', color: 'var(--text-muted)',
                                }}>
                                    All activity logs and lead notes created by this member are preserved for compliance and will not be modified.
                                </div>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={closeRemoveModal}
                                        disabled={removeConfirmLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleConfirmRemove}
                                        disabled={removeConfirmLoading}
                                        style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                    >
                                        {removeConfirmLoading ? 'Removing...' : 'Confirm Remove'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Transfer Ownership Modal */}
            {showTransferModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: 16,
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
                        <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>
                            🔁 Transfer Workspace Ownership
                        </h3>
                        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            The selected member will become the new owner. You will remain as an Admin.
                            This action requires OTP verification sent to your email.
                        </p>

                        {!otpSent ? (
                            <>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    Select new owner
                                </label>
                                <select
                                    className="form-control"
                                    value={transferTargetId}
                                    onChange={(e) => setTransferTargetId(e.target.value)}
                                    style={{ marginBottom: 20, width: '100%' }}
                                >
                                    <option value="">— Choose a member —</option>
                                    {transferCandidates.map((m) => {
                                        const uid = (m.user?._id || m.user?.id)?.toString();
                                        const uname = m.user?.name || uid;
                                        const uemail = m.user?.email || '';
                                        return (
                                            <option key={uid} value={uid}>
                                                {uname}{uemail ? ` (${uemail})` : ''} — {m.role}
                                            </option>
                                        );
                                    })}
                                </select>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button className="btn btn-ghost" onClick={closeTransferModal} disabled={transferLoading}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleRequestTransfer}
                                        disabled={transferLoading || !transferTargetId}
                                    >
                                        {transferLoading ? 'Sending OTP...' : 'Send OTP to my email'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{
                                    background: 'rgba(99,102,241,0.08)', borderRadius: 8,
                                    padding: '10px 14px', marginBottom: 16, fontSize: '0.83rem', color: 'var(--text-muted)',
                                }}>
                                    ✉️ An OTP has been sent to <strong>{user?.email}</strong>. Enter it below to confirm.
                                </div>

                                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                    Enter OTP
                                </label>
                                <input
                                    className="form-control"
                                    type="text"
                                    placeholder="6-digit code"
                                    maxLength={6}
                                    value={otpValue}
                                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                                    style={{ marginBottom: 8, width: '100%', letterSpacing: 6, fontSize: '1.2rem', textAlign: 'center' }}
                                    autoFocus
                                />
                                <p
                                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20, cursor: 'pointer', textDecoration: 'underline' }}
                                    onClick={() => { setOtpSent(false); setOtpValue(''); }}
                                >
                                    Change member / resend OTP
                                </p>

                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button className="btn btn-ghost" onClick={closeTransferModal} disabled={transferLoading}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleConfirmTransfer}
                                        disabled={transferLoading || otpValue.length < 6}
                                        style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                    >
                                        {transferLoading ? 'Transferring...' : 'Confirm Transfer'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
