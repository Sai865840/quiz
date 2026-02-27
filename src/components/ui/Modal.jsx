import { useEffect, useCallback } from 'react';

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showClose = true,
}) {
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') onClose?.();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="np-modal-backdrop">
            <div className="np-modal-overlay" onClick={onClose} />
            <div className={`np-modal np-modal-${size}`}>
                {(title || showClose) && (
                    <div className="np-modal-header">
                        {title && <h2 className="np-modal-title">{title}</h2>}
                        {showClose && (
                            <button onClick={onClose} className="np-modal-close">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className="np-modal-body">{children}</div>
            </div>
        </div>
    );
}
