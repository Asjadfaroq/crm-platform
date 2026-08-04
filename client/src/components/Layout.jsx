import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="app-layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Overlay — closes sidebar when tapped on mobile */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="main-content">
                <header className="header">
                    <div className="header-left">
                        <button
                            className="hamburger-btn"
                            onClick={() => setSidebarOpen((o) => !o)}
                            aria-label="Toggle navigation"
                        >
                            <HiOutlineMenuAlt2 />
                        </button>
                        <div className="header-title">Dashboard</div>
                    </div>
                    <div className="header-actions">
                        <ThemeToggle />
                    </div>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
