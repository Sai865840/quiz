export default function Badge({ children, variant = 'default', size = 'md', dot = false, className = '' }) {
    const colors = {
        default: { bg: 'rgba(255,255,255,0.08)', color: 'var(--text)' },
        primary: { bg: 'rgba(108,99,255,0.15)', color: '#6C63FF' },
        secondary: { bg: 'rgba(0,217,163,0.15)', color: '#00D9A3' },
        success: { bg: 'rgba(0,217,163,0.15)', color: '#00D9A3' },
        error: { bg: 'rgba(255,107,107,0.15)', color: '#FF6B6B' },
        warning: { bg: 'rgba(255,179,71,0.15)', color: '#FFB347' },
    };

    const c = colors[variant] || colors.default;
    const paddings = { sm: '3px 8px', md: '4px 12px', lg: '6px 14px' };

    return (
        <span
            className={`np-badge ${className}`}
            style={{ background: c.bg, color: c.color, padding: paddings[size] || paddings.md }}
        >
            {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />}
            {children}
        </span>
    );
}
