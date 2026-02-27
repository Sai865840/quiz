import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import OfflineBanner from './OfflineBanner';
import { useUIStore } from '../../store/uiStore';

export default function AppLayout() {
    const { sidebarCollapsed } = useUIStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleMobileMenu = useCallback(() => {
        setMobileMenuOpen((prev) => !prev);
    }, []);

    const closeMobileMenu = useCallback(() => {
        setMobileMenuOpen(false);
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <OfflineBanner />
            <Sidebar mobileOpen={mobileMenuOpen} onClose={closeMobileMenu} />
            <TopBar onMenuToggle={toggleMobileMenu} />
            <main
                style={{
                    marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
                    transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
                    minHeight: 'calc(100vh - 64px)',
                    padding: '28px 32px',
                }}
            >
                <div className="np-page" style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
