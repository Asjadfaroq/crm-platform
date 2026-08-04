import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import { getSocket, reconnectSocket, disconnectSocket } from '../api/socket';
import {
    socketLeadCreated,
    socketLeadUpdated,
    socketLeadDeleted,
    fetchLeadStats,
    fetchLeads,
} from '../store/slices/leadSlice';
import { fetchWorkspaces, setCurrentWorkspace, clearWorkspace } from '../store/slices/workspaceSlice';
import { logout } from '../store/slices/authSlice';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

// ── Human-readable field labels ──────────────────────────────────────────────
const FIELD_LABELS = {
    status: 'Status',
    priority: 'Priority',
    assignedTo: 'Assigned To',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    source: 'Source',
    notes: 'Notes',
    next_followup: 'Next Follow-up',
    dip_account: 'DIP Account',
};

// ── Detect what changed between old and new lead ──────────────────────────────
const getChangedFields = (oldLead, newLead) => {
    if (!oldLead) return [];
    const changed = [];
    const trackFields = Object.keys(FIELD_LABELS);
    for (const field of trackFields) {
        const oldVal = JSON.stringify(oldLead[field]);
        const newVal = JSON.stringify(newLead[field]);
        if (oldVal !== newVal) {
            changed.push({
                field,
                label: FIELD_LABELS[field],
                from: oldLead[field],
                to: newLead[field],
            });
        }
    }
    return changed;
};

const formatValue = (val, field) => {
    if (val === null || val === undefined || val === '') return '—';
    if (Array.isArray(val)) {
        if (field === 'notes') {
            if (val.length === 0) return 'No notes';
            const last = val[val.length - 1];
            const text = last?.text || '';
            return text.length > 50 ? text.slice(0, 50) + '…' : text || `${val.length} note${val.length !== 1 ? 's' : ''}`;
        }
        return `${val.length} item${val.length !== 1 ? 's' : ''}`;
    }
    if (typeof val === 'object' && val?.name) return val.name;
    return String(val);
};

// ── Custom toast UI components ────────────────────────────────────────────────
const NotifyCreated = ({ leadId, name }) => (
    <div style={styles.toast}>
        <div style={{ ...styles.badge, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80' }}>NEW</div>
        <div>
            <div style={styles.toastTitle}>Lead Created · <span style={styles.leadId}>{leadId}</span></div>
            <div style={styles.toastSub}>{name || 'Unknown'} has been added to leads</div>
        </div>
    </div>
);

const NotifyUpdated = ({ leadId, changes }) => (
    <div style={styles.updatedToast}>
        {/* Header */}
        <div style={styles.updatedHeader}>
            <div style={styles.updatedIconWrap}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </div>
            <div style={{ flex: 1 }}>
                <div style={styles.updatedLabel}>Lead Updated</div>
                <div style={styles.updatedLeadId}>{leadId}</div>
            </div>
        </div>

        {/* Changes */}
        {changes.length > 0 && (
            <div style={styles.updatedBody}>
                {changes.slice(0, 3).map((c) => (
                    <div key={c.field} style={styles.updatedChangeRow}>
                        <div style={styles.updatedFieldLabel}>{c.label}</div>
                        <div style={styles.updatedValues}>
                            <span style={styles.updatedFrom}>{formatValue(c.from, c.field)}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                            </svg>
                            <span style={styles.updatedTo}>{formatValue(c.to, c.field)}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const NotifyDeleted = ({ leadId }) => (
    <div style={styles.toast}>
        <div style={{ ...styles.badge, background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }}>DEL</div>
        <div>
            <div style={styles.toastTitle}>Lead Deleted · <span style={styles.leadId}>{leadId}</span></div>
            <div style={styles.toastSub}>This lead has been removed</div>
        </div>
    </div>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
    toast: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        minWidth: '280px',
        maxWidth: '380px',
    },
    badge: {
        borderRadius: '6px',
        padding: '2px 7px',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        flexShrink: 0,
        marginTop: '2px',
    },
    toastTitle: {
        fontWeight: 600,
        fontSize: '13px',
        color: '#f1f5f9',
        marginBottom: '3px',
    },
    leadId: {
        color: '#a78bfa',
        fontFamily: 'monospace',
    },
    toastSub: {
        fontSize: '12px',
        color: '#94a3b8',
    },
    changeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        color: '#94a3b8',
        marginTop: '2px',
        flexWrap: 'wrap',
    },
    fieldName: {
        color: '#cbd5e1',
        fontWeight: 600,
        marginRight: '2px',
    },
    fromVal: {
        color: '#f87171',
        maxWidth: '80px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    arrow: {
        color: '#64748b',
    },
    // ── NotifyUpdated redesign ────────────────────────────────────────────────
    updatedToast: {
        minWidth: '260px',
        maxWidth: '340px',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#0f172a',
        border: '1px solid rgba(96,165,250,0.2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    },
    updatedHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        background: 'rgba(96,165,250,0.07)',
        borderBottom: '1px solid rgba(96,165,250,0.12)',
    },
    updatedIconWrap: {
        width: '28px',
        height: '28px',
        borderRadius: '7px',
        background: 'rgba(96,165,250,0.15)',
        border: '1px solid rgba(96,165,250,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    updatedLabel: {
        fontSize: '11px',
        color: '#60a5fa',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1,
        marginBottom: '2px',
    },
    updatedLeadId: {
        fontSize: '13px',
        fontWeight: 700,
        color: '#e2e8f0',
        fontFamily: 'monospace',
        lineHeight: 1,
    },
    updatedBody: {
        padding: '8px 12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    updatedChangeRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    updatedFieldLabel: {
        fontSize: '10px',
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    updatedValues: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    updatedFrom: {
        fontSize: '12px',
        color: '#f87171',
        background: 'rgba(248,113,113,0.1)',
        border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: '4px',
        padding: '1px 6px',
        maxWidth: '100px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    updatedTo: {
        fontSize: '12px',
        color: '#4ade80',
        background: 'rgba(74,222,128,0.1)',
        border: '1px solid rgba(74,222,128,0.2)',
        borderRadius: '4px',
        padding: '1px 6px',
        maxWidth: '100px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    // ─────────────────────────────────────────────────────────────────────────
    toVal: {
        color: '#4ade80',
        maxWidth: '80px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
};

// ── Toast helper ──────────────────────────────────────────────────────────────
const toastStyle = {
    background: '#0f172a',
    border: '1px solid rgba(148,163,184,0.15)',
    borderRadius: '12px',
    color: '#f1f5f9',
    padding: '10px 14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

// ── Provider ──────────────────────────────────────────────────────────────────
export const SocketProvider = ({ children }) => {
    const dispatch = useDispatch();
    const { token, user } = useSelector((state) => state.auth);
    const { currentWorkspace } = useSelector((state) => state.workspace);
    // Keep a ref to current leads for diff comparison
    const leadsRef = useRef([]);
    const storeLeads = useSelector((state) => state.leads.items);
    useEffect(() => { leadsRef.current = storeLeads; }, [storeLeads]);

    // Refs for current filters/page so onLeadUpdated can refetch without stale closure
    const leadsFilters = useSelector((state) => state.leads.filters);
    const leadsPage = useSelector((state) => state.leads.page);
    const filtersRef = useRef(leadsFilters);
    const pageRef = useRef(leadsPage);
    useEffect(() => { filtersRef.current = leadsFilters; }, [leadsFilters]);
    useEffect(() => { pageRef.current = leadsPage; }, [leadsPage]);

    // Ref so onConnect can always read the latest workspace ID without
    // needing to be re-registered every time the workspace changes
    const workspaceIdRef = useRef(currentWorkspace?._id);
    useEffect(() => { workspaceIdRef.current = currentWorkspace?._id; }, [currentWorkspace?._id]);

    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const [inviteNotifications, setInviteNotifications] = useState([]);

    useEffect(() => {
        if (!token) {
            disconnectSocket();
            setConnected(false);
            return;
        }

        reconnectSocket();
        const socket = getSocket();
        socketRef.current = socket;

        const joinWorkspaceRoom = () => {
            const wsId = workspaceIdRef.current;
            if (wsId) socket.emit('join:workspace', wsId);
        };

        // Rejoin the workspace room on EVERY connect event (initial + reconnects)
        const onConnect = () => {
            setConnected(true);
            joinWorkspaceRoom();
        };
        const onDisconnect = () => { setConnected(false); };
        const onConnectError = () => { setConnected(false); };

        // ── Lead events with notifications ────────────────────────────────
        const onLeadCreated = (lead) => {
            dispatch(socketLeadCreated(lead));
            dispatch(fetchLeadStats());
            toast.custom(
                () => <NotifyCreated leadId={lead.leadId || lead._id} name={lead.name} />,
                { duration: 5000, style: toastStyle }
            );
        };

        const onLeadUpdated = (lead) => {
            const oldLead = leadsRef.current.find((l) => l._id === lead._id);
            const changes = getChangedFields(oldLead, lead);
            dispatch(socketLeadUpdated(lead));
            // Refetch when:
            // 1. Lead wasn't in current view (e.g. just assigned to this user)
            // 2. Assignee changed — lead may need to be removed from this user's filtered view
            const assigneeChanged = oldLead &&
                (oldLead.assignedTo?._id || oldLead.assignedTo)?.toString() !==
                (lead.assignedTo?._id || lead.assignedTo)?.toString();
            if (!oldLead || assigneeChanged) {
                dispatch(fetchLeads({ ...filtersRef.current, page: pageRef.current }));
                dispatch(fetchLeadStats());
            }
            toast.custom(
                () => <NotifyUpdated leadId={lead.leadId || lead._id} changes={changes} />,
                { duration: 6000, style: toastStyle }
            );
        };

        const onLeadDeleted = (payload) => {
            const lead = leadsRef.current.find((l) => l._id === payload.id);
            dispatch(socketLeadDeleted(payload));
            dispatch(fetchLeadStats());
            toast.custom(
                () => <NotifyDeleted leadId={lead?.leadId || payload.id} />,
                { duration: 5000, style: toastStyle }
            );
        };

        // ── Workspace invite notifications ─────────────────────────────────
        const onWorkspaceInvited = (payload) => {
            const myId = user?.id || user?._id;
            if (payload.userId !== myId?.toString()) return;
            dispatch(fetchWorkspaces());
            setInviteNotifications((prev) => [...prev, { id: Date.now(), ...payload }]);
        };

        // ── Ownership transfer — refresh workspace for all members ──────────
        const onOwnershipTransferred = () => {
            dispatch(fetchWorkspaces());
        };

        // ── Session force-logout (signed in on another device) ─────────────
        const onForceLogout = (payload) => {
            const myId = user?.id || user?._id;
            if (payload.userId !== myId?.toString()) return;
            // Clear all local state and redirect to login
            dispatch(logout());
            dispatch(clearWorkspace());
            disconnectSocket();
            toast.error('You were signed out because your account signed in on another device.', {
                duration: 8000,
                style: { background: '#1e1b4b', border: '1px solid rgba(248,113,113,0.4)', color: '#f1f5f9' },
            });
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('lead:created', onLeadCreated);
        socket.on('lead:updated', onLeadUpdated);
        socket.on('lead:deleted', onLeadDeleted);
        socket.on('workspace:invited', onWorkspaceInvited);
        socket.on('workspace:ownership-transferred', onOwnershipTransferred);
        socket.on('session:force-logout', onForceLogout);

        if (!socket.connected) socket.connect();

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('lead:created', onLeadCreated);
            socket.off('lead:updated', onLeadUpdated);
            socket.off('lead:deleted', onLeadDeleted);
            socket.off('workspace:invited', onWorkspaceInvited);
            socket.off('workspace:ownership-transferred', onOwnershipTransferred);
            socket.off('session:force-logout', onForceLogout);
        };
    }, [token, dispatch]);

    // ── Join/switch workspace room when the active workspace changes ───────
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !currentWorkspace?._id) return;
        // Only emit if already connected; onConnect handles the reconnect case
        if (socket.connected) socket.emit('join:workspace', currentWorkspace._id);
    }, [currentWorkspace?._id]);

    const dismissInvite = (id) => setInviteNotifications((prev) => prev.filter((n) => n.id !== id));

    const acceptInvite = (notif) => {
        // Switch to the invited workspace
        dispatch(fetchWorkspaces());
        dismissInvite(notif.id);
        toast.success(`Switched to workspace "${notif.workspaceName}"`);
    };

    return (
        <SocketContext.Provider value={{ connected, socket: socketRef.current }}>
            {children}

            {/* Workspace invite popups */}
            {inviteNotifications.map((notif) => (
                <InvitePopup
                    key={notif.id}
                    notif={notif}
                    onDismiss={() => dismissInvite(notif.id)}
                    onAccept={() => acceptInvite(notif)}
                />
            ))}

            {/* Toast notification container */}
            <Toaster
                position="top-right"
                toastOptions={{ style: toastStyle }}
                containerStyle={{ top: 16, right: 16 }}
            />

            {/* Live connection badge */}
            <LiveBadge connected={connected} />
        </SocketContext.Provider>
    );
};

// ── Workspace Invite Popup ────────────────────────────────────────────────────
const InvitePopup = ({ notif, onDismiss, onAccept }) => {
    const roleColors = {
        admin: '#a78bfa',
        editor: '#60a5fa',
        viewer: '#94a3b8',
    };
    return (
        <div style={{
            position: 'fixed',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1px solid rgba(139,92,246,0.5)',
            borderRadius: 16,
            boxShadow: '0 0 40px rgba(139,92,246,0.25), 0 20px 60px rgba(0,0,0,0.6)',
            padding: '20px 24px',
            maxWidth: 380,
            width: '90vw',
            animation: 'invite-slide-in 0.4s cubic-bezier(0.16,1,0.3,1)',
        }}>
            <style>{`
                @keyframes invite-slide-in {
                    from { opacity: 0; transform: translateX(-50%) translateY(-24px) scale(0.94); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);    }
                }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {/* Workspace avatar */}
                <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', fontWeight: 800, color: '#fff',
                    boxShadow: '0 0 16px rgba(124,58,237,0.5)',
                }}>
                    {notif.workspaceName?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                        🎉 Workspace Invitation
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {notif.workspaceName}
                    </div>
                </div>
                <button
                    onClick={onDismiss}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem', padding: 4, borderRadius: 6, lineHeight: 1 }}
                >
                    ×
                </button>
            </div>

            {/* Message */}
            <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: 16, lineHeight: 1.5 }}>
                <strong style={{ color: '#e2e8f0' }}>{notif.inviterName}</strong> has invited you to join{' '}
                <strong style={{ color: '#a78bfa' }}>{notif.workspaceName}</strong> as{' '}
                <span style={{
                    display: 'inline-block',
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: roleColors[notif.role] || '#a78bfa',
                    borderRadius: 999,
                    padding: '1px 9px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                }}>
                    {notif.role}
                </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
                <button
                    onClick={onAccept}
                    style={{
                        flex: 1,
                        padding: '9px 16px',
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                        transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.85'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                    View Workspaces
                </button>
                <button
                    onClick={onDismiss}
                    style={{
                        padding: '9px 16px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#94a3b8',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
};

// ── Live badge ────────────────────────────────────────────────────────────────

const LiveBadge = ({ connected }) => (
    <div
        title={connected ? 'Live updates active' : 'Connecting…'}
        style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            background: 'rgba(10,12,24,0.88)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${connected ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
            borderRadius: '999px',
            padding: '5px 14px 5px 9px',
            fontSize: '12px',
            fontWeight: 700,
            color: connected ? '#4ade80' : '#fbbf24',
            boxShadow: connected ? '0 0 16px rgba(74,222,128,0.2)' : '0 0 16px rgba(251,191,36,0.15)',
            zIndex: 9999,
            userSelect: 'none',
            transition: 'all 0.4s ease',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
        }}
    >
        <span
            style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: connected ? '#4ade80' : '#fbbf24',
                boxShadow: connected ? '0 0 8px #4ade80' : '0 0 8px #fbbf24',
                animation: connected ? 'ws-pulse 2s ease-in-out infinite' : 'none',
                flexShrink: 0,
            }}
        />
        {connected ? 'Live' : 'Connecting'}
        <style>{`
            @keyframes ws-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(1.4); }
            }
        `}</style>
    </div>
);

export default SocketProvider;
