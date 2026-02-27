import { useState, useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const setOnlineStatus = useUIStore((state) => state.setIsOnline);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setOnlineStatus(true);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setOnlineStatus(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [setOnlineStatus]);

    return isOnline;
}
