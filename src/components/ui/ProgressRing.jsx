import { useEffect, useState } from 'react';

export default function ProgressRing({
    progress = 0,
    size = 120,
    strokeWidth = 8,
    color = 'var(--primary)',
    trackColor = 'var(--border)',
    animated = true,
    children,
    className = '',
}) {
    const [currentProgress, setCurrentProgress] = useState(0);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (currentProgress / 100) * circumference;

    useEffect(() => {
        if (animated) {
            const timer = setTimeout(() => {
                setCurrentProgress(Math.min(100, Math.max(0, progress)));
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setCurrentProgress(progress);
        }
    }, [progress, animated]);

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg
                width={size}
                height={size}
                className="-rotate-90"
            >
                {/* Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        transition: animated ? 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                        filter: `drop-shadow(0 0 6px ${color})`,
                    }}
                />
            </svg>
            {children && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {children}
                </div>
            )}
        </div>
    );
}
