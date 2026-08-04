import { useEffect } from 'react';

export default function ThemeToggle() {

    useEffect(() => {
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const toggle = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    };

    return (
        <button className="btn btn-ghost btn-icon" onClick={toggle} title="Toggle theme">
            🌓
        </button>
    );
}
