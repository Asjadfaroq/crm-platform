import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAnalytics } from '../store/slices/leadSlice';
import {
    HiOutlineRefresh,
    HiOutlineChartBar,
    HiOutlineChartPie,
    HiOutlineUsers,
    HiOutlineTrendingUp,
    HiOutlinePhone,
    HiOutlineBriefcase,
} from 'react-icons/hi';

// ─── colour maps ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
    New: '#38bdf8',
    Contacted: '#a78bfa',
    'In Progress': '#fbbf24',
    Closed: '#34d399',
    Rejected: '#f87171',
};
const PRIORITY_COLORS = {
    Low: '#6b7280',
    Medium: '#3b82f6',
    High: '#f59e0b',
    Urgent: '#ef4444',
};
const STATUS_ORDER = ['New', 'Contacted', 'In Progress', 'Closed', 'Rejected'];
const PRIORITY_ORDER = ['Low', 'Medium', 'High', 'Urgent'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── helpers ────────────────────────────────────────────────────────────────
function toMap(arr, keyField = '_id') {
    return Object.fromEntries((arr || []).map((d) => [d[keyField], d.count ?? d.total ?? 0]));
}

// ─── SVG Donut Chart ────────────────────────────────────────────────────────
function DonutChart({ slices, size = 160, thickness = 30 }) {
    const r = (size - thickness) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circ = 2 * Math.PI * r;
    const total = slices.reduce((s, d) => s + d.value, 0) || 1;

    let offset = 0;
    const paths = slices
        .filter((d) => d.value > 0)
        .map((d) => {
            const pct = d.value / total;
            const dash = pct * circ;
            const gap = circ - dash;
            const el = (
                <circle
                    key={d.label}
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={d.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={-offset * circ}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
            );
            offset += pct;
            return el;
        });

    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
            {/* track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={thickness} />
            {paths}
        </svg>
    );
}

// ─── Horizontal Bar Row ──────────────────────────────────────────────────────
function HBar({ label, value, max, color, total }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    {label}
                </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {value}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4, fontSize: '0.75rem' }}>
                        ({total > 0 ? Math.round((value / total) * 100) : 0}%)
                    </span>
                </span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: color,
                    borderRadius: 99,
                    transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
                    boxShadow: `0 0 8px ${color}55`,
                }} />
            </div>
        </div>
    );
}

// ─── Split stat bar (two segments) ──────────────────────────────────────────
function SplitBar({ leftLabel, leftVal, rightLabel, rightVal, leftColor, rightColor }) {
    const total = leftVal + rightVal || 1;
    const leftPct = Math.round((leftVal / total) * 100);
    const rightPct = 100 - leftPct;
    return (
        <div>
            <div style={{ display: 'flex', height: 18, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                {leftVal > 0 && (
                    <div style={{ width: `${leftPct}%`, background: leftColor, transition: 'width 0.7s ease', boxShadow: `0 0 8px ${leftColor}44` }} />
                )}
                {rightVal > 0 && (
                    <div style={{ width: `${rightPct}%`, background: rightColor, transition: 'width 0.7s ease' }} />
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: leftColor, display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{leftLabel}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{leftVal}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>({leftPct}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.73rem' }}>({rightPct}%)</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rightVal}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{rightLabel}</span>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: rightColor, display: 'inline-block' }} />
                </div>
            </div>
        </div>
    );
}

// ─── SVG Line / Column chart for monthly trend ───────────────────────────────
function MonthlyChart({ data }) {
    const W = 600, H = 140, PAD = { t: 16, r: 16, b: 32, l: 36 };
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;

    if (!data || data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No data for the past 6 months
            </div>
        );
    }

    const maxVal = Math.max(...data.map((d) => d.count), 1);

    // Build all 6 months including zeros
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
    const dataMap = Object.fromEntries(data.map((d) => [`${d._id.year}-${d._id.month}`, d.count]));
    const points = months.map((m, i) => ({
        label: MONTH_NAMES[m.month - 1],
        count: dataMap[`${m.year}-${m.month}`] || 0,
        x: PAD.l + (i / (months.length - 1 || 1)) * innerW,
        y: PAD.t + innerH - (dataMap[`${m.year}-${m.month}`] || 0) / maxVal * innerH,
    }));

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
    const areaPath = `M ${points[0].x},${PAD.t + innerH} ` +
        points.map((p) => `L ${p.x},${p.y}`).join(' ') +
        ` L ${points[points.length - 1].x},${PAD.t + innerH} Z`;

    // Y-axis gridlines
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
        y: PAD.t + innerH - f * innerH,
        val: Math.round(f * maxVal),
    }));

    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
            <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c63ff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6c63ff" stopOpacity="0.01" />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {ticks.map((t) => (
                <g key={t.y}>
                    <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={PAD.l - 6} y={t.y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">{t.val}</text>
                </g>
            ))}

            {/* Area fill */}
            <path d={areaPath} fill="url(#areaGrad)" />

            {/* Line */}
            <polyline
                points={polyline}
                fill="none"
                stroke="#6c63ff"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />

            {/* Dots + labels */}
            {points.map((p) => (
                <g key={p.label}>
                    <circle cx={p.x} cy={p.y} r={4} fill="#6c63ff" stroke="var(--bg-card)" strokeWidth={2} />
                    {p.count > 0 && (
                        <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fill="var(--text-secondary)" fontWeight="600">
                            {p.count}
                        </text>
                    )}
                    <text x={p.x} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{p.label}</text>
                </g>
            ))}
        </svg>
    );
}

// ─── KPI summary card ────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon }) {
    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: 'var(--shadow-sm)',
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', color, flexShrink: 0,
            }}>
                <Icon />
            </div>
            <div>
                <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
                {sub !== undefined && (
                    <div style={{ fontSize: '0.72rem', color, marginTop: 2, fontWeight: 600 }}>{sub}</div>
                )}
            </div>
        </div>
    );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, children, style }) {
    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 22px',
            boxShadow: 'var(--shadow-sm)',
            ...style,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                {Icon && <Icon style={{ color: 'var(--accent-primary)', fontSize: '1rem' }} />}
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{title}</span>
            </div>
            {children}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
    const dispatch = useDispatch();
    const { analytics, analyticsLoading } = useSelector((s) => s.leads);

    useEffect(() => { dispatch(fetchAnalytics()); }, [dispatch]);

    const refresh = () => dispatch(fetchAnalytics());

    // ── derived data ────────────────────────────────────────────────────────
    const statusMap = toMap(analytics?.status);
    const priorityMap = toMap(analytics?.priority);
    const dipMap = toMap(analytics?.dip);
    const verMap = toMap(analytics?.verified);

    const totalLeads = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const totalVerified = verMap[true] || verMap['true'] || 0;
    const totalUnverified = verMap[false] || verMap['false'] || (totalLeads - totalVerified);
    const dipCreated = dipMap['created'] || 0;
    const dipPending = dipMap['pending'] || totalLeads - dipCreated;
    const totalClosed = statusMap['Closed'] || 0;

    const statusSlices = STATUS_ORDER.map((s) => ({ label: s, value: statusMap[s] || 0, color: STATUS_COLORS[s] }));
    const maxPriority = Math.max(...PRIORITY_ORDER.map((p) => priorityMap[p] || 0), 1);

    return (
        <div style={{ padding: '28px 28px 48px', maxWidth: 1100, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Analytics
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Workspace-wide lead insights — admin view
                    </p>
                </div>
                <button
                    onClick={refresh}
                    disabled={analyticsLoading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer',
                        opacity: analyticsLoading ? 0.6 : 1,
                    }}
                >
                    <HiOutlineRefresh style={{ fontSize: '1rem', animation: analyticsLoading ? 'spin 1s linear infinite' : 'none' }} />
                    Refresh
                </button>
            </div>

            {/* Loading skeleton */}
            {analyticsLoading && !analytics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{ height: 80, borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    ))}
                </div>
            )}

            {analytics && (<>

                {/* ── KPI row ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                    <KpiCard label="Total Leads" value={totalLeads} color="#6c63ff" icon={HiOutlineChartBar} />
                    <KpiCard label="Closed" value={totalClosed} sub={`${totalLeads ? Math.round((totalClosed / totalLeads) * 100) : 0}% close rate`} color="#34d399" icon={HiOutlineTrendingUp} />
                    <KpiCard label="Mobile Verified" value={totalVerified} sub={`of ${totalLeads} total`} color="#38bdf8" icon={HiOutlinePhone} />
                    <KpiCard label="DIP Created" value={dipCreated} sub={`${totalLeads ? Math.round((dipCreated / totalLeads) * 100) : 0}% of leads`} color="#a78bfa" icon={HiOutlineBriefcase} />
                    <KpiCard label="Team Members" value={analytics.topRMs?.length || 0} sub="with assigned leads" color="#fbbf24" icon={HiOutlineUsers} />
                </div>

                {/* ── Charts row 1: Donut + Priority bars ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                    {/* Status donut */}
                    <Card title="Lead Status Breakdown" icon={HiOutlineChartPie}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <DonutChart slices={statusSlices} size={150} thickness={28} />
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    pointerEvents: 'none',
                                }}>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{totalLeads}</span>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>total</span>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                {statusSlices.map((s) => (
                                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: 'inline-block', flexShrink: 0 }} />
                                            <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                                        </div>
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {s.value}
                                            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4, fontSize: '0.72rem' }}>
                                                ({totalLeads ? Math.round((s.value / totalLeads) * 100) : 0}%)
                                            </span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Priority bars */}
                    <Card title="Priority Distribution" icon={HiOutlineChartBar}>
                        <div style={{ paddingTop: 4 }}>
                            {PRIORITY_ORDER.map((p) => (
                                <HBar
                                    key={p}
                                    label={p}
                                    value={priorityMap[p] || 0}
                                    max={maxPriority}
                                    color={PRIORITY_COLORS[p]}
                                    total={totalLeads}
                                />
                            ))}
                        </div>
                    </Card>
                </div>

                {/* ── Charts row 2: Mobile verified + DIP ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                    <Card title="Mobile Verification" icon={HiOutlinePhone}>
                        <SplitBar
                            leftLabel="Verified"
                            leftVal={totalVerified}
                            rightLabel="Unverified"
                            rightVal={totalUnverified}
                            leftColor="#34d399"
                            rightColor="#374151"
                        />
                    </Card>

                    <Card title="DIP Account Status" icon={HiOutlineBriefcase}>
                        <SplitBar
                            leftLabel="Created"
                            leftVal={dipCreated}
                            rightLabel="Pending"
                            rightVal={dipPending}
                            leftColor="#a78bfa"
                            rightColor="#374151"
                        />
                    </Card>
                </div>

                {/* ── Monthly trend ── */}
                <Card title="Monthly Lead Trend (last 6 months)" icon={HiOutlineTrendingUp} style={{ marginBottom: 16 }}>
                    <MonthlyChart data={analytics.monthly} />
                </Card>

                {/* ── Top team members ── */}
                {analytics.topRMs?.length > 0 && (
                    <Card title="Top Team Members by Leads" icon={HiOutlineUsers}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {analytics.topRMs.map((rm, i) => {
                                const maxTotal = analytics.topRMs[0]?.total || 1;
                                const closePct = rm.total > 0 ? Math.round((rm.closed / rm.total) * 100) : 0;
                                return (
                                    <div key={rm.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {/* Rank */}
                                        <div style={{
                                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                            background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'var(--bg-secondary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.72rem', fontWeight: 700,
                                            color: i < 3 ? '#000' : 'var(--text-muted)',
                                        }}>
                                            {i + 1}
                                        </div>
                                        {/* Avatar */}
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                            background: 'var(--accent-primary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                                        }}>
                                            {rm.name.charAt(0).toUpperCase()}
                                        </div>
                                        {/* Bar */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rm.name}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    <span style={{ color: '#34d399', fontWeight: 700 }}>{rm.closed}</span>
                                                    <span style={{ margin: '0 3px' }}>/</span>
                                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rm.total}</span>
                                                    <span style={{ marginLeft: 4, fontSize: '0.72rem' }}>closed ({closePct}%)</span>
                                                </span>
                                            </div>
                                            <div style={{ height: 7, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${(rm.total / maxTotal) * 100}%`,
                                                    background: 'var(--accent-gradient)',
                                                    borderRadius: 99,
                                                    transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}
            </>)}

            {/* Spinner keyframe (inline style tag) */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.9} }
            `}</style>
        </div>
    );
}
