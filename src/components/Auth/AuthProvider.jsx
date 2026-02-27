import { useEffect } from 'react';
import { onAuthChange } from '../../firebase/authService';
import { getUserProfile } from '../../firebase/firestoreService';
import { useAuthStore } from '../../store/authStore';

export default function AuthProvider({ children }) {
    const { setUser, setUserProfile, setLoading } = useAuthStore();

    useEffect(() => {
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    const profile = await getUserProfile(firebaseUser.uid);
                    setUserProfile(profile);
                } catch (err) {
                    console.error('Failed to fetch user profile:', err);
                }
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [setUser, setUserProfile, setLoading]);

    return children;
}
