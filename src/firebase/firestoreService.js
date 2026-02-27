import {
    doc, collection, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
    addDoc, query, orderBy, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './config';

// ─── User Profile ───

export async function createUserProfile(uid, data) {
    await setDoc(doc(db, 'users', uid), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function getUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
    await updateDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// ─── Subjects ───

export async function addSubject(uid, data) {
    const ref = collection(db, 'users', uid, 'subjects');
    const docRef = await addDoc(ref, {
        name: data.name,
        color: data.color || '#6C63FF',
        icon: data.icon || '📚',
        questionCount: 0,
        masteredCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getSubjects(uid) {
    const ref = collection(db, 'users', uid, 'subjects');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateSubject(uid, subjectId, data) {
    await updateDoc(doc(db, 'users', uid, 'subjects', subjectId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteSubject(uid, subjectId) {
    // Delete the subject document (subcollections remain orphaned but we handle that)
    await deleteDoc(doc(db, 'users', uid, 'subjects', subjectId));
}

// ─── Chapters ───

export async function addChapter(uid, subjectId, data) {
    const ref = collection(db, 'users', uid, 'subjects', subjectId, 'chapters');
    const docRef = await addDoc(ref, {
        name: data.name,
        questionCount: 0,
        masteredCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getChapters(uid, subjectId) {
    const ref = collection(db, 'users', uid, 'subjects', subjectId, 'chapters');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateChapter(uid, subjectId, chapterId, data) {
    await updateDoc(doc(db, 'users', uid, 'subjects', subjectId, 'chapters', chapterId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteChapter(uid, subjectId, chapterId) {
    await deleteDoc(doc(db, 'users', uid, 'subjects', subjectId, 'chapters', chapterId));
}

// ─── Questions ───

export async function addQuestions(uid, subjectId, chapterId, questions) {
    const batch = writeBatch(db);
    const ref = collection(db, 'users', uid, 'subjects', subjectId, 'chapters', chapterId, 'questions');

    questions.forEach((q) => {
        const docRef = doc(ref);
        batch.set(docRef, {
            text: q.text,
            options: q.options,           // [{ label: 'A', text: '...' }, ...]
            correctOption: q.correctOption, // e.g. 'A'
            explanation: q.explanation || '',
            important: q.important || false,
            masteryLevel: 0,
            flagged: false,
            timesAnswered: 0,
            timesCorrect: 0,
            nextReviewDate: null,
            createdAt: serverTimestamp(),
        });
    });

    await batch.commit();
}

export async function getQuestions(uid, subjectId, chapterId) {
    const ref = collection(db, 'users', uid, 'subjects', subjectId, 'chapters', chapterId, 'questions');
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateQuestion(uid, subjectId, chapterId, questionId, data) {
    await updateDoc(
        doc(db, 'users', uid, 'subjects', subjectId, 'chapters', chapterId, 'questions', questionId),
        { ...data }
    );
}

export async function deleteQuestion(uid, subjectId, chapterId, questionId) {
    await deleteDoc(
        doc(db, 'users', uid, 'subjects', subjectId, 'chapters', chapterId, 'questions', questionId)
    );
}

// ─── Session History ───

export async function addSessionHistory(uid, sessionData) {
    const ref = collection(db, 'users', uid, 'sessions');
    const docRef = await addDoc(ref, {
        ...sessionData,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getSessionHistory(uid) {
    const ref = collection(db, 'users', uid, 'sessions');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
