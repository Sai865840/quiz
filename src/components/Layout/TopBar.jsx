import { useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';

const pageTitles = {
    '/': 'Dashboard',
    '/practice': 'Practice Hub',
    '/subjects': 'Subjects',
    '/wrong-questions': 'Wrong Questions',
    '/flashcards': 'Flashcards',
    '/analytics': 'Analytics',
    '/settings': 'Settings',
    '/test': 'Test Session',
    '/test/results': 'Results',
    '/rapid-fire': 'Rapid Fire',
};

export default function TopBar({ onMenuToggle }) {
    const location = useLocation();
    const { sidebarCollapsed } = useUIStore();
    const title = pageTitles[location.pathname] || 'NeuralPrep';

    return (
        <header
            className="np-topbar"
            style={{ marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Mobile hamburger */}
                <button className="np-mobile-menu-btn" onClick={onMenuToggle}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <h1 className="np-topbar-title">{title}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="np-streak-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                    </svg>
                    <span>0 day streak</span>
                </div>
            </div>
        </header>
    );
}
