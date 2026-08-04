import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeads, fetchLeadStats, setFilters, createLead } from '../store/slices/leadSlice';
import { fetchUsers } from '../store/slices/userSlice';
import KpiCards from '../components/KpiCards';
import LeadTable from '../components/LeadTable';
import LeadDetailModal from '../components/LeadDetailModal';
import { HiOutlinePlus, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function DashboardPage() {
    const dispatch = useDispatch();
    const { stats, filters, limit } = useSelector((state) => state.leads);
    const { user } = useSelector((state) => state.auth);
    const { currentWorkspace } = useSelector((state) => state.workspace);

    // Derive role from the current workspace membership (workspace-scoped)
    // Backend returns user.id (not user._id)
    const myMember = currentWorkspace?.members?.find(
        (m) => (m.user?._id || m.user?.id || m.user) === (user?.id || user?._id)
    );
    const workspaceRole = myMember?.role || 'viewer';
    const isAdmin = workspaceRole === 'admin';
    const [selectedLead, setSelectedLead] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newLead, setNewLead] = useState({ name: '', mobile: '', amount: '', sourceLink: '', next_followup: '', dip_account: 'pending' });
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback((page = 1, pageLimit = limit) => {
        const params = { page, limit: pageLimit };
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.search) params.search = filters.search;
        if (filters.assignedTo) params.assignedTo = filters.assignedTo;
        dispatch(fetchLeads(params));
    }, [dispatch, filters, limit]);

    useEffect(() => {
        dispatch(fetchLeadStats());
        dispatch(fetchUsers());
    }, [dispatch]);

    useEffect(() => {
        const timer = setTimeout(() => loadData(), 300);
        return () => clearTimeout(timer);
    }, [loadData]);

    const handleFilterChange = (update) => {
        dispatch(setFilters(update));
    };

    const handleCreateLead = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            await dispatch(createLead({ ...newLead, amount: newLead.amount })).unwrap();
            dispatch(fetchLeadStats());
            setShowCreate(false);
            setNewLead({ name: '', mobile: '', amount: '', sourceLink: '', next_followup: '', dip_account: 'pending' });
            toast.success('Lead created');
        } catch (err) {
            toast.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                        {isAdmin ? 'Admin Dashboard' : 'My Leads'}
                    </h1>
                    {currentWorkspace && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {currentWorkspace.name} &nbsp;·&nbsp;
                            <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                {workspaceRole}
                            </span>
                        </p>
                    )}
                </div>
                {isAdmin && (
                    <button
                        id="add-lead-btn"
                        className="btn btn-primary"
                        onClick={() => setShowCreate(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.92rem' }}
                    >
                        <HiOutlinePlus style={{ fontSize: '1.1rem' }} /> Add Lead
                    </button>
                )}
            </div>

            <KpiCards stats={stats} />

            <LeadTable
                onViewLead={setSelectedLead}
                filters={filters}
                onFilterChange={handleFilterChange}
                onPageChange={(p) => loadData(p)}
                onLimitChange={(newLimit) => loadData(1, newLimit)}
            />

            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    onClose={() => {
                        setSelectedLead(null);
                        loadData();
                    }}
                />
            )}

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Lead</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>
                                <HiOutlineX />
                            </button>
                        </div>
                        <form onSubmit={handleCreateLead}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Name *</label>
                                    <input
                                        className="form-control"
                                        value={newLead.name}
                                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Mobile *</label>
                                    <input
                                        className="form-control"
                                        value={newLead.mobile}
                                        onChange={(e) => setNewLead({ ...newLead, mobile: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Amount (SAR) *</label>
                                    <input
                                        className="form-control"
                                        type="text"
                                        placeholder="e.g. 5000 or 1000-10000 or more than 500000"
                                        value={newLead.amount}
                                        onChange={(e) => setNewLead({ ...newLead, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Source Link</label>
                                    <input
                                        className="form-control"
                                        value={newLead.sourceLink}
                                        onChange={(e) => setNewLead({ ...newLead, sourceLink: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label>Next Follow-up</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={newLead.next_followup}
                                            onChange={(e) => setNewLead({ ...newLead, next_followup: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>DIP Account</label>
                                        <select
                                            className="form-control"
                                            value={newLead.dip_account}
                                            onChange={(e) => setNewLead({ ...newLead, dip_account: e.target.value })}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="created">Created</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Creating…' : 'Create Lead'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
