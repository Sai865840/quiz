export function Spinner({ size = 'md', className = '' }) {
    const sizes = { sm: 16, md: 24, lg: 40 };
    const s = sizes[size] || 24;
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={className}>
            <div style={{
                width: s, height: s, borderRadius: '50%',
                border: `3px solid rgba(255,255,255,0.1)`,
                borderTopColor: 'var(--primary)',
                animation: 'spin 0.8s linear infinite',
            }} />
        </div>
    );
}

export function Skeleton({ className = '', width, height = 16 }) {
    return (
        <div className={`np-skeleton ${className}`} style={{ width: width || '100%', height, borderRadius: 8 }} />
    );
}

export function PageLoader() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ position: 'relative', width: 48, height: 48, margin: '0 auto 16px' }}>
                    <div style={{
                        position: 'absolute', inset: 0, borderRadius: '50%',
                        border: '3px solid rgba(255,255,255,0.08)',
                        borderTopColor: 'var(--primary)',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <div style={{
                        position: 'absolute', inset: 4, borderRadius: '50%',
                        border: '3px solid transparent',
                        borderBottomColor: 'var(--secondary)',
                        animation: 'spin 1.2s linear infinite reverse',
                    }} />
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Loading...</p>
            </div>
        </div>
    );
}
