import { NavLink, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';

const navItems = [
    { path: '/', label: 'Dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
    { path: '/practice', label: 'Practice', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
    { path: '/subjects', label: 'Subjects', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg> },
    { path: '/wrong-questions', label: 'Wrong Questions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg> },
    { path: '/analytics', label: 'Analytics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
    { path: '/settings', label: 'Settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg> },
];

export default function Sidebar({ mobileOpen, onClose }) {
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const location = useLocation();

    const handleNavClick = () => {
        // Close mobile sidebar on navigation
        if (window.innerWidth <= 768 && onClose) {
            onClose();
        }
    };

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`np-sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
                onClick={onClose}
            />

            <aside className={`np-sidebar ${sidebarCollapsed ? 'np-sidebar-collapsed' : 'np-sidebar-expanded'} ${mobileOpen ? 'mobile-open' : ''}`}>
                {/* Logo */}
                <div className="np-sidebar-header">
                    <div className="np-sidebar-logo">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                    </div>
                    <span className="np-sidebar-brand">NeuralPrep</span>
                    {/* Mobile close button */}
                    {mobileOpen && (
                        <button
                            onClick={onClose}
                            style={{
                                marginLeft: 'auto', width: 32, height: 32, borderRadius: 8,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--muted)', transition: 'color 0.15s',
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className="np-nav">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`np-nav-item ${isActive ? 'active' : ''}`}
                                onClick={handleNavClick}
                            >
                                <span className="np-nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Collapse button (hidden on mobile via CSS) */}
                <div className="np-sidebar-collapse" style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={toggleSidebar}
                        className="np-nav-item"
                        style={{ width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                    >
                        <svg
                            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: 'transform 0.3s', transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }}
                        >
                            <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
                        </svg>
                        <span>Collapse</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
