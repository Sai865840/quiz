import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function OfflineBanner() {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[var(--warning)]/90 backdrop-blur-sm px-4 py-2 text-center animate-fade-in-down">
            <p className="text-sm font-medium text-[var(--bg)] flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
                    <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
                    <path d="M10.71 5.05A16 16 0 0122.56 9" />
                    <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
                    <path d="M8.53 16.11a6 6 0 016.95 0" />
                    <line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
                You're offline — changes will sync when you reconnect
            </p>
        </div>
    );
}
