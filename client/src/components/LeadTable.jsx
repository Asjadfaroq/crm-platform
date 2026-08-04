import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { updateLead, deleteLead, assignLead, fetchLeadStats, addNote } from '../store/slices/leadSlice';
import { HiOutlineSearch, HiOutlineTrash, HiOutlineEye, HiOutlineChatAlt2, HiOutlineX, HiOutlinePaperAirplane } from 'react-icons/hi';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['New', 'Contacted', 'In Progress', 'Closed', 'Rejected'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];
const DIP_OPTIONS = ['pending', 'created'];

const statusClass = (s) => `badge badge-${s?.toLowerCase().replace(' ', '')}`;
const priorityClass = (p) => `badge badge-${p?.toLowerCase()}`;

// Portal-based notes panel — rendered in document.body to escape table overflow clipping
function NotesPopover({ lead, anchorRect, onClose }) {
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const dispatch = useDispatch();
    const panelRef = useRef(null);
    const inputRef = useRef(null);

    const { user } = useSelector((s) => s.auth);
    const { currentWorkspace } = useSelector((s) => s.workspace);
    // Read live lead from store so newly added notes appear immediately
    const liveLead = useSelector((s) => s.leads.items.find((l) => l._id === lead._id)) || lead;

    const myMember = currentWorkspace?.members?.find(
        (m) => (m.user?._id || m.user?.id || m.user) === (user?.id || user?._id)
    );
    const wsRole = myMember?.role || 'viewer';
    const canAddNote = wsRole === 'admin' || wsRole === 'editor';

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Focus input on open
    useEffect(() => {
        if (canAddNote) inputRef.current?.focus();
    }, [canAddNote]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Position panel centered below the notes button, clamped to viewport
    const PANEL_W = 320;
    const PANEL_MAX_H = 420;
    const GAP = 10; // gap between button and panel top

    // Center the panel horizontally on the button
    let left = anchorRect.left + anchorRect.width / 2 - PANEL_W / 2;
    let top = anchorRect.bottom + GAP;
    let flipUp = false;

    // Clamp left so panel stays within viewport
    if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8;
    if (left < 8) left = 8;

    // Flip upward if panel would overflow bottom of viewport
    if (top + PANEL_MAX_H > window.innerHeight - 8) {
        top = anchorRect.top - PANEL_MAX_H - GAP;
        flipUp = true;
        if (top < 8) top = 8;
    }

    // Arrow horizontal offset so it always points at the button center
    const btnCenterX = anchorRect.left + anchorRect.width / 2;
    const arrowLeft = Math.min(Math.max(btnCenterX - left - 8, 12), PANEL_W - 28);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!text.trim() || submitting) return;
        setSubmitting(true);
        try {
            await dispatch(addNote({ id: liveLead._id, text })).unwrap();
            setText('');
            toast.success('Note added');
        } catch (err) {
            toast.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const notes = [...(liveLead.notes || [])].reverse();

    return createPortal(
        <div
            ref={panelRef}
            className={`notes-panel${flipUp ? ' flip-up' : ''}`}
            style={{ top, left, width: PANEL_W }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Arrow pointer toward the button */}
            <span className="notes-panel-arrow" style={{ left: arrowLeft }} />
            {/* Inner wrapper — clips content, rounded corners, border */}
            <div className="notes-panel-inner">
                {/* Header */}
                <div className="notes-panel-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineChatAlt2 style={{ fontSize: '1rem', color: 'var(--accent-primary)' }} />
                        <span className="notes-panel-title">{liveLead.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {notes.length > 0 && (
                            <span className="notes-panel-count">{notes.length}</span>
                        )}
                        <button className="notes-panel-close" onClick={onClose} aria-label="Close">
                            <HiOutlineX />
                        </button>
                    </div>
                </div>

                {/* Notes list */}
                <div className="notes-panel-list">
                    {notes.length === 0 ? (
                        <div className="notes-panel-empty">
                            <HiOutlineChatAlt2 style={{ fontSize: '2rem', opacity: 0.3, marginBottom: 6 }} />
                            <p>No notes yet</p>
                            {canAddNote && <p style={{ fontSize: '0.75rem' }}>Add the first note below</p>}
                        </div>
                    ) : (
                        notes.map((note) => (
                            <div key={note._id} className="notes-panel-item">
                                <div className="notes-panel-item-avatar">
                                    {(note.addedBy?.name || 'S').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="notes-panel-item-meta">
                                        <span className="notes-panel-item-author">
                                            {note.addedBy?.name || 'System'}
                                        </span>
                                        <span className="notes-panel-item-date">
                                            {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="notes-panel-item-text">{note.text}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add note form */}
                {canAddNote && (
                    <form onSubmit={handleAdd} className="notes-panel-form">
                        <input
                            ref={inputRef}
                            className="notes-panel-input"
                            placeholder="Write a note…"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <button
                            className="notes-panel-submit"
                            type="submit"
                            disabled={!text.trim() || submitting}
                            title="Add note"
                        >
                            <HiOutlinePaperAirplane style={{ transform: 'rotate(90deg)' }} />
                        </button>
                    </form>
                )}
            </div>{/* end notes-panel-inner */}
        </div>,
        document.body
    );
}

// Build the list of page numbers to show (always first + last, elide middle)
function buildPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current]);
    if (current > 1) pages.add(current - 1);
    if (current < total) pages.add(current + 1);
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    let prev = 0;
    for (const p of sorted) {
        if (p - prev > 1) result.push('…');
        result.push(p);
        prev = p;
    }
    return result;
}

export default function LeadTable({ onViewLead, filters, onFilterChange, onPageChange, onLimitChange }) {
    const dispatch = useDispatch();
    const { items, total, page, totalPages, limit, loading } = useSelector((state) => state.leads);
    const { user } = useSelector((state) => state.auth);
    const { currentWorkspace } = useSelector((state) => state.workspace);
    const users = useSelector((state) => state.users.items);

    // Use workspace-scoped roles
    const myMember = currentWorkspace?.members?.find(
        (m) => (m.user?._id || m.user?.id || m.user) === (user?.id || user?._id)
    );
    const wsRole = myMember?.role || 'viewer';
    const isAdmin = wsRole === 'admin';
    const isEditor = wsRole === 'editor';
    const canEdit = isAdmin || isEditor;

    // { leadId, rect } — rect is the button's bounding box for portal positioning
    const [activeNotes, setActiveNotes] = useState(null);

    const handleStatusChange = async (id, status) => {
        try {
            await dispatch(updateLead({ id, status })).unwrap();
            dispatch(fetchLeadStats());
            toast.success('Status updated');
        } catch (err) {
            toast.error(err);
        }
    };

    const handlePriorityChange = async (id, priority) => {
        try {
            await dispatch(updateLead({ id, priority })).unwrap();
            dispatch(fetchLeadStats());
            toast.success('Priority updated');
        } catch (err) {
            toast.error(err);
        }
    };

    const handleAssign = async (id, assignedTo) => {
        try {
            await dispatch(assignLead({ id, assignedTo })).unwrap();
            toast.success('Lead assigned');
        } catch (err) {
            toast.error(err);
        }
    };

    const handleDipChange = async (id, dip_account) => {
        try {
            await dispatch(updateLead({ id, dip_account })).unwrap();
            toast.success('DIP Account updated');
        } catch (err) {
            toast.error(err);
        }
    };

    const handleFollowupChange = async (id, next_followup) => {
        try {
            await dispatch(updateLead({ id, next_followup: next_followup || null })).unwrap();
            toast.success('Follow-up date updated');
        } catch (err) {
            toast.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this lead?')) return;
        try {
            await dispatch(deleteLead(id)).unwrap();
            dispatch(fetchLeadStats());
            toast.success('Lead deleted');
        } catch (err) {
            toast.error(err);
        }
    };

    const formatFollowupDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString();
    };

    const toDateInputValue = (d) => {
        if (!d) return '';
        return new Date(d).toISOString().split('T')[0];
    };

    const handleNotesToggle = (e, lead) => {
        e.stopPropagation();
        if (activeNotes?.leadId === lead._id) {
            setActiveNotes(null);
        } else {
            setActiveNotes({ leadId: lead._id, lead, rect: e.currentTarget.getBoundingClientRect() });
        }
    };

    const activeNotesLead = activeNotes ? items.find((l) => l._id === activeNotes.leadId) || activeNotes.lead : null;

    return (
        <div className="table-container" onClick={() => setActiveNotes(null)}>
            <div className="table-header">
                <h2>Leads ({total})</h2>
                <div className="table-filters">
                    <div className="search-wrapper">
                        <HiOutlineSearch className="search-icon" />
                        <input
                            className="search-input"
                            placeholder="Search ID, name or mobile..."
                            value={filters.search || ''}
                            onChange={(e) => onFilterChange({ search: e.target.value })}
                        />
                    </div>
                    <select
                        className="form-control"
                        style={{ width: 'auto', padding: '8px 32px 8px 12px' }}
                        value={filters.status || ''}
                        onChange={(e) => onFilterChange({ status: e.target.value })}
                    >
                        <option value="">All Status</option>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        className="form-control"
                        style={{ width: 'auto', padding: '8px 32px 8px 12px' }}
                        value={filters.priority || ''}
                        onChange={(e) => onFilterChange({ priority: e.target.value })}
                    >
                        <option value="">All Priority</option>
                        {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {isAdmin && users.length > 0 && (
                        <select
                            className="form-control"
                            style={{ width: 'auto', padding: '8px 32px 8px 12px' }}
                            value={filters.assignedTo || ''}
                            onChange={(e) => onFilterChange({ assignedTo: e.target.value })}
                        >
                            <option value="">All RMs</option>
                            {users.map((u) => (
                                <option key={u._id} value={u._id}>{u.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div className="table-wrapper">
                {loading ? (
                    <div className="loading-container"><div className="spinner" /></div>
                ) : items.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">📋</div>
                        <h3>No leads found</h3>
                        <p>Try adjusting your filters or create a new lead.</p>
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ whiteSpace: 'nowrap' }}>Lead ID</th>
                                <th>Name</th>
                                <th>Mobile</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th style={{ whiteSpace: 'nowrap' }}>DIP Account</th>
                                <th style={{ whiteSpace: 'nowrap' }}>Next Follow-up</th>
                                <th>Notes</th>
                                <th style={{ whiteSpace: 'nowrap' }}>Mobile ✓</th>
                                {isAdmin && <th>Assigned To</th>}
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((lead) => (
                                <tr key={lead._id}>
                                    {/* Lead ID */}
                                    <td>
                                        <span style={{
                                            fontFamily: 'monospace',
                                            fontWeight: 700,
                                            fontSize: '0.78rem',
                                            background: 'var(--accent-primary)',
                                            color: '#fff',
                                            borderRadius: 4,
                                            padding: '2px 7px',
                                            letterSpacing: '0.04em',
                                        }}>
                                            {lead.leadId || '—'}
                                        </span>
                                    </td>

                                    {/* Name */}
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.name}</td>

                                    {/* Mobile */}
                                    <td>{lead.mobile}</td>

                                    {/* Amount */}
                                    <td>SAR {lead.amount}</td>

                                    {/* Status */}
                                    <td>
                                        <select
                                            className="form-control"
                                            style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '0.8rem' }}
                                            value={lead.status}
                                            onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                                        >
                                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>

                                    {/* Priority */}
                                    <td>
                                        {canEdit ? (
                                            <select
                                                className="form-control"
                                                style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '0.8rem' }}
                                                value={lead.priority}
                                                onChange={(e) => handlePriorityChange(lead._id, e.target.value)}
                                            >
                                                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        ) : (
                                            <span className={priorityClass(lead.priority)}>{lead.priority}</span>
                                        )}
                                    </td>

                                    {/* DIP Account */}
                                    <td>
                                        {canEdit ? (
                                            <select
                                                className="form-control"
                                                style={{
                                                    width: 'auto',
                                                    padding: '4px 28px 4px 10px',
                                                    fontSize: '0.8rem',
                                                    color: lead.dip_account === 'created' ? 'var(--success)' : 'var(--warning)',
                                                }}
                                                value={lead.dip_account || 'pending'}
                                                onChange={(e) => handleDipChange(lead._id, e.target.value)}
                                            >
                                                {DIP_OPTIONS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                                            </select>
                                        ) : (
                                            <span style={{ color: lead.dip_account === 'created' ? 'var(--success)' : 'var(--warning)', fontWeight: 500, fontSize: '0.82rem' }}>
                                                {lead.dip_account === 'created' ? 'Created' : 'Pending'}
                                            </span>
                                        )}
                                    </td>

                                    {/* Next Follow-up */}
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        {canEdit ? (
                                            <input
                                                type="date"
                                                className="form-control"
                                                style={{ width: 'auto', fontSize: '0.8rem', padding: '3px 8px' }}
                                                value={toDateInputValue(lead.next_followup)}
                                                onChange={(e) => handleFollowupChange(lead._id, e.target.value)}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                {formatFollowupDate(lead.next_followup)}
                                            </span>
                                        )}
                                    </td>

                                    {/* Notes */}
                                    <td>
                                        <button
                                            className={`notes-trigger-btn${activeNotes?.leadId === lead._id ? ' active' : ''}`}
                                            onClick={(e) => handleNotesToggle(e, lead)}
                                            title="View / add notes"
                                        >
                                            <HiOutlineChatAlt2 />
                                            {lead.notes?.length > 0 && (
                                                <span className="notes-trigger-count">{lead.notes.length}</span>
                                            )}
                                        </button>
                                    </td>

                                    {/* Verified Mobile */}
                                    <td style={{ textAlign: 'center' }}>
                                        {lead.verified_mobile ? (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: 'var(--success)',
                                                background: 'rgba(34,197,94,0.12)',
                                                borderRadius: 20,
                                                padding: '2px 10px',
                                            }}>
                                                ✓ Verified
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                                        )}
                                    </td>

                                    {/* Assigned To (admin only) */}
                                    {isAdmin && (
                                        <td>
                                            <select
                                                className="form-control"
                                                style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '0.8rem' }}
                                                value={lead.assignedTo?._id || ''}
                                                onChange={(e) => handleAssign(lead._id, e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {users.map((u) => (
                                                    <option key={u._id} value={u._id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                    )}

                                    {/* Created */}
                                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </td>

                                    {/* Actions */}
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                className="btn btn-ghost btn-icon"
                                                onClick={() => onViewLead(lead)}
                                                title="View details"
                                            >
                                                <HiOutlineEye />
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => handleDelete(lead._id)}
                                                    title="Delete"
                                                    style={{ color: 'var(--error)' }}
                                                >
                                                    <HiOutlineTrash />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Portal notes panel — renders outside table overflow */}
            {activeNotes && activeNotesLead && (
                <NotesPopover
                    lead={activeNotesLead}
                    anchorRect={activeNotes.rect}
                    onClose={() => setActiveNotes(null)}
                />
            )}

            {/* Pagination footer */}
            {total > 0 && (
                <div className="table-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <span>
                            {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of <strong style={{ color: 'var(--text-primary)' }}>{total}</strong>
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            Per page:
                            <select
                                className="form-control"
                                style={{ width: 'auto', padding: '2px 24px 2px 8px', fontSize: '0.8rem' }}
                                value={limit}
                                onChange={(e) => onLimitChange?.(Number(e.target.value))}
                            >
                                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </label>
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                                disabled={page <= 1}
                                onClick={() => onPageChange(page - 1)}
                                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                            >
                                ‹ Prev
                            </button>

                            {buildPageNumbers(page, totalPages).map((p, i) =>
                                p === '…' ? (
                                    <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p)}
                                        disabled={p === page}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '0.82rem',
                                            fontWeight: p === page ? 700 : 400,
                                            background: p === page ? 'var(--accent-primary)' : undefined,
                                            color: p === page ? '#fff' : undefined,
                                            borderColor: p === page ? 'var(--accent-primary)' : undefined,
                                            borderRadius: 6,
                                        }}
                                    >
                                        {p}
                                    </button>
                                )
                            )}

                            <button
                                disabled={page >= totalPages}
                                onClick={() => onPageChange(page + 1)}
                                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                            >
                                Next ›
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
