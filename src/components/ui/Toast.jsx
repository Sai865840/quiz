import { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';

function ToastItem({ toast, onRemove }) {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
        return () => clearTimeout(timer);
    }, [toast, onRemove]);

    const typeClass = `np-toast-${toast.type || 'info'}`;

    const icons = {
        success: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D9A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
        error: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
        warning: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFB347" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
        info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
    };

    return (
        <div className={`np-toast ${typeClass}`}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>{icons[toast.type] || icons.info}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && <p className="np-toast-title">{toast.title}</p>}
                <p className="np-toast-message">{toast.message}</p>
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                style={{ flexShrink: 0, padding: 4, borderRadius: 6, color: 'var(--muted)', transition: 'color 0.15s' }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
        </div>
    );
}

export default function ToastContainer() {
    const { toasts, removeToast } = useUIStore();
    if (toasts.length === 0) return null;
    return (
        <div className="np-toast-container">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
}
