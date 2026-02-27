import {
    doc, collection, addDoc, getDoc, getDocs, updateDoc,
    query, where, orderBy, limit, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from './config';

// ─── Session CRUD ───

export async function createSession(uid, sessionData) {
    const ref = collection(db, 'sessions');
    const docRef = await addDoc(ref, {
        userId: uid,
        status: 'in_progress',
        type: sessionData.type,
        scope: sessionData.scope,
        config: sessionData.config,
        questionIds: sessionData.questionIds,
        startTime: serverTimestamp(),
        endTime: null,
        totalQuestions: sessionData.totalQuestions,
        answered: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        score: 0,
        questionResults: [],
        templateId: sessionData.templateId || null,
    });
    return docRef.id;
}

export async function updateSession(sessionId, data) {
    await updateDoc(doc(db, 'sessions', sessionId), data);
}

export async function completeSession(sessionId, finalData) {
    await updateDoc(doc(db, 'sessions', sessionId), {
        ...finalData,
        status: 'completed',
        endTime: serverTimestamp(),
    });
}

export async function abandonSession(sessionId) {
    await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'abandoned',
        endTime: serverTimestamp(),
    });
}

export async function getSessionById(sessionId) {
    const snap = await getDoc(doc(db, 'sessions', sessionId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getInProgressSession(uid) {
    const ref = collection(db, 'sessions');
    const q = query(
        ref,
        where('userId', '==', uid),
        limit(10)
    );
    const snap = await getDocs(q);
    // Filter client-side to avoid composite index
    const inProgress = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.status === 'in_progress');

    if (inProgress.length === 0) return null;

    // Sort by startTime desc, pick most recent
    inProgress.sort((a, b) => {
        const aMs = a.startTime?.toDate ? a.startTime.toDate().getTime() : 0;
        const bMs = b.startTime?.toDate ? b.startTime.toDate().getTime() : 0;
        return bMs - aMs;
    });
    const session = inProgress[0];

    // Only return sessions from the last 24 hours
    if (session.startTime) {
        const startMs = session.startTime.toDate ? session.startTime.toDate().getTime() : session.startTime;
        if (Date.now() - startMs > 24 * 60 * 60 * 1000) {
            await abandonSession(session.id);
            return null;
        }
    }
    return session;
}

export async function getRecentSessions(uid, count = 5) {
    const ref = collection(db, 'sessions');
    const q = query(
        ref,
        where('userId', '==', uid),
        limit(50)
    );
    const snap = await getDocs(q);
    // Filter and sort client-side to avoid composite index requirement
    const completed = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.status === 'completed');

    completed.sort((a, b) => {
        const aMs = a.endTime?.toDate ? a.endTime.toDate().getTime() : 0;
        const bMs = b.endTime?.toDate ? b.endTime.toDate().getTime() : 0;
        return bMs - aMs;
    });

    return completed.slice(0, count);
}

// ─── Templates ───

export async function saveTemplate(uid, config) {
    const ref = collection(db, 'users', uid, 'templates');
    const docRef = await addDoc(ref, {
        ...config,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function getTemplates(uid) {
    const ref = collection(db, 'users', uid, 'templates');
    const q = query(ref, orderBy('createdAt', 'desc'), limit(5));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteTemplate(uid, templateId) {
    await (await import('firebase/firestore')).deleteDoc(doc(db, 'users', uid, 'templates', templateId));
}

// ─── Performance ───

import { computeSM2, qualityFromResult, computeMasteryLevel } from '../utils/spacedRepetition';

export { computeMasteryLevel };

export async function getPerformanceMap(uid) {
    const ref = collection(db, 'users', uid, 'performance');
    const snap = await getDocs(ref);
    const map = {};
    snap.docs.forEach((d) => { map[d.id] = d.data(); });
    return map;
}

export async function batchUpdatePerformance(uid, questionResults) {
    const batch = writeBatch(db);

    for (const result of questionResults) {
        if (!result.questionId || result.userAnswer === null) continue; // skip unanswered

        const perfRef = doc(db, 'users', uid, 'performance', result.questionId);
        const perfSnap = await getDoc(perfRef);
        const existing = perfSnap.exists() ? perfSnap.data() : {
            timesAsked: 0, timesCorrect: 0, timesWrong: 0,
            streak: 0, intervalDays: 1, masteryLevel: 0,
            easeFactor: 2.5, repetitions: 0,
            flagged: false, lastAsked: null, nextDue: null,
        };

        const timesAsked = (existing.timesAsked || 0) + 1;
        const timesCorrect = (existing.timesCorrect || 0) + (result.isCorrect ? 1 : 0);
        const timesWrong = (existing.timesWrong || 0) + (result.isCorrect ? 0 : 1);

        // Streak — guessed correct does NOT increment streak
        let streak = existing.streak || 0;
        if (result.isCorrect && result.confidence !== 'guessed') {
            streak += 1;
        } else if (!result.isCorrect) {
            streak = 0;
        }
        // guessed correct: streak stays the same

        // SM-2 Spaced Repetition
        const quality = qualityFromResult(result.isCorrect, result.confidence);
        const sm2 = computeSM2(
            quality,
            existing.easeFactor || 2.5,
            existing.intervalDays || 0,
            existing.repetitions || 0,
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextDue = new Date(today.getTime() + sm2.interval * 24 * 60 * 60 * 1000);

        // Mastery
        const accuracy = timesAsked > 0 ? timesCorrect / timesAsked : 0;
        const masteryLevel = computeMasteryLevel(accuracy, streak, timesAsked, result.confidence);

        // Flagged
        const flagged = result.flagged !== undefined ? result.flagged : (existing.flagged || false);

        const updateData = {
            timesAsked, timesCorrect, timesWrong, streak,
            intervalDays: sm2.interval,
            easeFactor: sm2.ef,
            repetitions: sm2.repetitions,
            nextDue: nextDue.toISOString(),
            lastAsked: new Date().toISOString(),
            lastConfidence: result.confidence || null,
            masteryLevel, flagged,
        };

        if (perfSnap.exists()) {
            batch.update(perfRef, updateData);
        } else {
            batch.set(perfRef, updateData);
        }
    }

    await batch.commit();
}
