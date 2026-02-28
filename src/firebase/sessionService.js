import {
    doc, collection, addDoc, getDoc, getDocs, updateDoc,
    query, where, orderBy, limit, serverTimestamp, writeBatch, runTransaction
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

export async function updateUserAggregateStats(uid, sessionResult) {
    const userRef = doc(db, 'users', uid);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) return;
            const data = userDoc.data();

            const now = new Date();
            // Local timezone date string
            const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

            let { streak = 0, lastSessionDate = null, todayStats = { date: '', answered: 0, correct: 0, sessions: 0 } } = data;

            // Reset todayStats if it's a new day
            if (todayStats.date !== todayStr) {
                todayStats = { date: todayStr, answered: 0, correct: 0, sessions: 0 };
            }

            // Update todayStats
            todayStats.answered += sessionResult.answered || 0;
            todayStats.correct += sessionResult.correct || 0;
            todayStats.sessions += 1;

            // Update streak
            if (lastSessionDate !== todayStr) {
                if (lastSessionDate) {
                    const lastDate = new Date(lastSessionDate);
                    lastDate.setHours(0, 0, 0, 0);
                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        streak += 1;
                    } else if (diffDays > 1) {
                        streak = 1; // reset streak if missed a day
                    }
                } else {
                    streak = 1;
                }
                lastSessionDate = todayStr;
            }

            transaction.update(userRef, {
                streak,
                lastSessionDate,
                todayStats,
                updatedAt: serverTimestamp()
            });
        });
    } catch (error) {
        console.error("Failed to update aggregate stats:", error);
    }
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

export async function getRecentSessions(uid, count = 5, queryLimit = 50) {
    const ref = collection(db, 'sessions');
    const q = query(
        ref,
        where('userId', '==', uid),
        limit(queryLimit)
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

export async function getDashboardSessionsData(uid) {
    const ref = collection(db, 'sessions');
    const q = query(
        ref,
        where('userId', '==', uid),
        limit(150) // High enough limit to comfortably envelope a day's or recent weeks worth of sessions
    );
    const snap = await getDocs(q);

    const completed = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.status === 'completed');

    completed.sort((a, b) => {
        const aMs = a.endTime?.toDate ? a.endTime.toDate().getTime() : 0;
        const bMs = b.endTime?.toDate ? b.endTime.toDate().getTime() : 0;
        return bMs - aMs;
    });

    const recentSessions = completed.slice(0, 5);

    // Compute Today's Stats
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    const todaySessions = completed.filter(s => {
        if (!s.endTime) return false;
        const endDate = s.endTime.toDate ? s.endTime.toDate() : new Date(s.endTime);
        const sDateStr = endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0');
        return sDateStr === todayStr;
    });

    const answered = todaySessions.reduce((s, ss) => s + (ss.answered || 0), 0);
    const correct = todaySessions.reduce((s, ss) => s + (ss.correct || 0), 0);
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    // Compute Streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 0; d < 60; d++) { // Check up to 60 days of history retrieved in the 150 items
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - d);
        const checkStr = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkDate.getDate()).padStart(2, '0');

        const hasSession = completed.some((s) => {
            if (!s.endTime) return false;
            const endDate = s.endTime?.toDate ? s.endTime.toDate() : new Date(s.endTime);
            const sDateStr = endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0');
            return sDateStr === checkStr;
        });

        if (hasSession) {
            streak++;
        } else if (d > 0) {
            break; // Streak is contiguous
        }
    }

    return {
        recentSessions,
        todayStats: { sessions: todaySessions.length, answered, correct, accuracy },
        streak
    };
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
