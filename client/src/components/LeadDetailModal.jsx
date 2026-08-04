import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addNote, updateLead } from '../store/slices/leadSlice';
import { fetchLeadLogs } from '../store/slices/logSlice';
import { HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

export default function LeadDetailModal({ lead: initialLead, onClose }) {
    const [activeTab, setActiveTab] = useState('details');
    const [noteText, setNoteText] = useState('');
    const dispatch = useDispatch();
    const { leadLogs } = useSelector((state) => state.logs);
    const { user } = useSelector((state) => state.auth);
    const { currentWorkspace } = useSelector((state) => state.workspace);

    // Always read the LIVE lead from Redux store so notes/updates appear without reopening
    const liveLead = useSelector((state) =>
        state.leads.items.find((l) => l._id === initialLead?._id)
    ) || initialLead; // fallback to prop if not in list (e.g. editor's filtered view)

    // Derive workspace role
    const myMember = currentWorkspace?.members?.find(
        (m) => (m.user?._id || m.user?.id || m.user) === (user?.id || user?._id)
    );
    const wsRole = myMember?.role || 'viewer';
    const canEdit = wsRole === 'admin' || wsRole === 'editor';

    useEffect(() => {
        if (initialLead?._id) {
            dispatch(fetchLeadLogs(initialLead._id));
        }
    }, [initialLead?._id, dispatch]);

    if (!liveLead) return null;

    // Use liveLead everywhere below
    const lead = liveLead;

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        try {
            await dispatch(addNote({ id: lead._id, text: noteText })).unwrap();
            setNoteText('');
            toast.success('Note added');
        } catch (err) {
            toast.error(err);
        }
    };

    const handlePriorityChange = async (priority) => {
        try {
            await dispatch(updateLead({ id: lead._id, priority })).unwrap();
            toast.success('Priority updated');
        } catch (err) {
            toast.error(err);
        }
    };

    const handleFollowupChange = async (next_followup) => {
        try {
            await dispatch(updateLead({ id: lead._id, next_followup: next_followup || null })).unwrap();
            toast.success('Follow-up date updated');
        } catch (err) {
            toast.error(err);
        }
    };

    const toDateInputValue = (d) => {
        if (!d) return '';
        return new Date(d).toISOString().split('T')[0];
    };

    const formatDate = (d) => new Date(d).toLocaleString();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {lead.leadId && (
                            <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                background: 'var(--accent-primary)',
                                color: '#fff',
                                borderRadius: 4,
                                padding: '3px 8px',
                                letterSpacing: '0.04em',
                            }}>{lead.leadId}</span>
                        )}
                        <h2 style={{ margin: 0 }}>{lead.name}</h2>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <HiOutlineX />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                            onClick={() => setActiveTab('details')}
                        >
                            Details
                        </button>
                        <button
                            className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
                            onClick={() => setActiveTab('notes')}
                        >
                            Notes ({lead.notes?.length || 0})
                        </button>
                        <button
                            className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
                            onClick={() => setActiveTab('logs')}
                        >
                            Activity
                        </button>
                    </div>

                    {activeTab === 'details' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label>Mobile</label>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{lead.mobile}</div>
                                </div>
                                <div className="form-group">
                                    <label>Amount</label>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>SAR {lead.amount}</div>
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <span className={`badge badge-${lead.status?.toLowerCase().replace(' ', '')}`}>
                                        {lead.status}
                                    </span>
                                </div>
                                <div className="form-group">
                                    <label>Priority</label>
                                    {canEdit ? (
                                        <select
                                            className="form-control"
                                            style={{ width: 'auto', padding: '4px 28px 4px 10px', fontSize: '0.85rem' }}
                                            value={lead.priority}
                                            onChange={(e) => handlePriorityChange(e.target.value)}
                                        >
                                            {PRIORITY_OPTIONS.map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className={`badge badge-${lead.priority?.toLowerCase()}`}>
                                            {lead.priority}
                                        </span>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Assigned To</label>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                        {lead.assignedTo?.name || 'Unassigned'}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Source</label>
                                    <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                        {lead.sourceLink ? (
                                            <a href={lead.sourceLink} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--accent-primary)' }}>
                                                {lead.sourceLink}
                                            </a>
                                        ) : '—'}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Next Follow-up</label>
                                    {canEdit ? (
                                        <input
                                            type="date"
                                            className="form-control"
                                            style={{ fontSize: '0.85rem', padding: '4px 10px' }}
                                            value={toDateInputValue(lead.next_followup)}
                                            onChange={(e) => handleFollowupChange(e.target.value)}
                                        />
                                    ) : (
                                        <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                            {lead.next_followup ? new Date(lead.next_followup).toLocaleDateString() : '—'}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>DIP Account</label>
                                    <div style={{
                                        color: lead.dip_account === 'created' ? 'var(--success)' : 'var(--warning)',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        textTransform: 'capitalize',
                                    }}>
                                        {lead.dip_account || 'pending'}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Created</label>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {formatDate(lead.createdAt)}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Updated</label>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {formatDate(lead.updatedAt)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div>
                            <form onSubmit={handleAddNote} className="form-inline mb-16">
                                <input
                                    className="form-control"
                                    placeholder="Add a note..."
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-primary btn-sm" type="submit">Add</button>
                            </form>
                            <div className="notes-list">
                                {lead.notes?.length === 0 && (
                                    <div className="empty-state" style={{ padding: 30 }}>
                                        <p>No notes yet</p>
                                    </div>
                                )}
                                {[...(lead.notes || [])].reverse().map((note) => (
                                    <div className="note-item" key={note._id}>
                                        <div className="note-meta">
                                            <span className="note-author">{note.addedBy?.name || 'System'}</span>
                                            <span className="note-date">{formatDate(note.createdAt)}</span>
                                        </div>
                                        <div className="note-text">{note.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div>
                            {leadLogs?.length === 0 ? (
                                <div className="empty-state" style={{ padding: 30 }}>
                                    <p>No activity logged</p>
                                </div>
                            ) : (
                                leadLogs.map((log) => (
                                    <div className="log-entry" key={log._id}>
                                        <div className="log-dot" />
                                        <div className="log-content">
                                            <div className="log-action">{log.actionType}</div>
                                            <div className="log-detail">
                                                {log.performedBy?.name || 'System'}
                                                {log.oldValue && ` — from "${log.oldValue}"`}
                                                {log.newValue && ` to "${log.newValue}"`}
                                            </div>
                                        </div>
                                        <div className="log-time">{formatDate(log.timestamp)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
