export default function Card({
    children,
    className = '',
    variant = 'default',
    hover = false,
    onClick,
    style,
    ...props
}) {
    const variantClass = {
        default: 'np-card',
        surface: 'np-card-surface',
        glass: 'np-card-glass',
    }[variant] || 'np-card';

    return (
        <div
            className={`${variantClass} ${hover ? 'np-card-hover' : ''} ${onClick ? 'np-card-hover' : ''} ${className}`}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : undefined, ...style }}
            {...props}
        >
            {children}
        </div>
    );
}
