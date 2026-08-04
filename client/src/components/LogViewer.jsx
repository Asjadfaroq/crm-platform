import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLogs } from '../store/slices/logSlice';
import { HiOutlineFilter } from 'react-icons/hi';

export default function LogViewer() {
    const dispatch = useDispatch();
    const { items, total, page, totalPages, loading } = useSelector((state) => state.logs);
    const [filters, setFilters] = useState({ leadNumber: '', actionType: '', startDate: '', endDate: '' });

    const loadLogs = useCallback((pageNum = 1) => {
        const params = { page: pageNum, limit: 30 };
        if (filters.leadNumber) params.leadNumber = filters.leadNumber.trim().toUpperCase();
        if (filters.actionType) params.actionType = filters.actionType;
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        dispatch(fetchLogs(params));
    }, [dispatch, filters]);

    useEffect(() => {
        loadLogs(1);
    }, [loadLogs]);

    const handleFilter = () => loadLogs(1);

    const formatDate = (d) => new Date(d).toLocaleString();

    const ACTION_TYPES = [
        'Lead Created', 'Lead Assigned', 'Status Changed', 'Priority Changed',
        'Note Added', 'Lead Updated', 'Lead Deleted', 'DIP Account Changed',
        'Mobile Verified', 'Member Removed', 'Member Invited', 'Role Changed',
    ];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Activity Logs</h1>
            </div>

            <div className="card mb-24">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Lead Number</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. LD0001"
                            value={filters.leadNumber}
                            onChange={(e) => setFilters({ ...filters, leadNumber: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                            style={{ width: 130, textTransform: 'uppercase' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Action Type</label>
                        <select
                            className="form-control"
                            value={filters.actionType}
                            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
                            style={{ width: 'auto' }}
                        >
                            <option value="">All</option>
                            {ACTION_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>From</label>
                        <input
                            type="date"
                            className="form-control"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>To</label>
                        <input
                            type="date"
                            className="form-control"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleFilter}>
                        <HiOutlineFilter /> Filter
                    </button>
                    {(filters.leadNumber || filters.actionType || filters.startDate || filters.endDate) && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                setFilters({ leadNumber: '', actionType: '', startDate: '', endDate: '' });
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="table-container">
                <div className="table-wrapper">
                    {loading ? (
                        <div className="loading-container"><div className="spinner" /></div>
                    ) : items.length === 0 ? (
                        <div className="empty-state">
                            <div className="icon">📜</div>
                            <h3>No logs found</h3>
                            <p>Activity will appear here as actions are performed.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Action</th>
                                    <th>Performed By</th>
                                    <th>Lead</th>
                                    <th>Old Value</th>
                                    <th>New Value</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((log) => (
                                    <tr key={log._id}>
                                        <td>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {log.actionType}
                                            </span>
                                        </td>
                                        <td>{log.performedBy?.name || 'System'}</td>
                                        <td>
                                            {log.leadId ? (
                                                <span>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent-primary)', marginRight: 4 }}>
                                                        {log.leadId.leadId || ''}
                                                    </span>
                                                    {log.leadId.name}
                                                </span>
                                            ) : log.leadRef ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                                                        {log.leadRef}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.68rem', color: '#ef4444',
                                                        background: 'rgba(239,68,68,0.1)',
                                                        border: '1px solid rgba(239,68,68,0.25)',
                                                        borderRadius: 4, padding: '0px 5px',
                                                    }}>
                                                        deleted
                                                    </span>
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>{log.oldValue || '—'}</td>
                                        <td style={{ color: 'var(--accent-primary)' }}>{log.newValue || '—'}</td>
                                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {formatDate(log.timestamp)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="table-footer">
                        <span>Page {page} of {totalPages} ({total} total)</span>
                        <div className="pagination">
                            <button disabled={page <= 1} onClick={() => loadLogs(page - 1)}>Prev</button>
                            <button disabled={page >= totalPages} onClick={() => loadLogs(page + 1)}>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
