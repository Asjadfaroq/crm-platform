import { HiOutlineUsers, HiOutlineSparkles, HiOutlineFire, HiOutlineCheckCircle } from 'react-icons/hi';

export default function KpiCards({ stats }) {
    const cards = [
        {
            label: 'Total Leads',
            value: stats.total,
            icon: <HiOutlineUsers />,
            color: 'blue',
        },
        {
            label: 'New Leads',
            value: stats.newLeads,
            icon: <HiOutlineSparkles />,
            color: 'purple',
        },
        {
            label: 'High Priority',
            value: stats.highPriority,
            icon: <HiOutlineFire />,
            color: 'orange',
        },
        {
            label: 'Closed',
            value: stats.closed,
            icon: <HiOutlineCheckCircle />,
            color: 'green',
        },
    ];

    return (
        <div className="kpi-grid">
            {cards.map((card) => (
                <div className="kpi-card" key={card.label}>
                    <div className={`kpi-icon ${card.color}`}>{card.icon}</div>
                    <div className="kpi-info">
                        <h3>{card.value}</h3>
                        <p>{card.label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
