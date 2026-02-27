import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyC_Y5AYNw-qfHRncEuzwOA9d1jReKztInY",
    authDomain: "neuralprep-e2d1b.firebaseapp.com",
    projectId: "neuralprep-e2d1b",
    storageBucket: "neuralprep-e2d1b.firebasestorage.app",
    messagingSenderId: "740904166312",
    appId: "1:740904166312:web:ac188708063855b5ec739d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Firestore with multi-tab offline persistence
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const storage = getStorage(app);

export default app;
