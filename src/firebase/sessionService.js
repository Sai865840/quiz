import {
    doc, collection, addDoc, getDoc, getDocs, updateDoc, setDoc,
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
            const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

            let { streak = 0, lastSessionDate = null, todayStats = { date: '', answered: 0, correct: 0, sessions: 0 } } = data;

            if (todayStats.date !== todayStr) {
                todayStats = { date: todayStr, answered: 0, correct: 0, sessions: 0 };
            }

            todayStats.answered += sessionResult.answered || 0;
            todayStats.correct += sessionResult.correct || 0;
            todayStats.sessions += 1;

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
                        streak = 1;
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
    const inProgress = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.status === 'in_progress');

    if (inProgress.length === 0) return null;

    inProgress.sort((a, b) => {
        const aMs = a.startTime?.toDate ? a.startTime.toDate().getTime() : 0;
        const bMs = b.startTime?.toDate ? b.startTime.toDate().getTime() : 0;
        return bMs - aMs;
    });
    const session = inProgress[0];

    if (session.startTime) {
        const startMs = session.startTime.toDate ? session.startTime.toDate().getTime() : session.startTime;
        if (Date.now() - startMs > 24 * 60 * 60 * 1000) {
            await abandonSession(session.id);
            return null;
        }
    }
    return session;
}

// ─── Returns last `count` completed sessions — uses server-side filter+sort to minimise reads ───
export async function getRecentSessions(uid, count = 5) {
    const ref = collection(db, 'sessions');
    const q = query(
        ref,
        where('userId', '==', uid),
        where('status', '==', 'completed'),
        orderBy('endTime', 'desc'),
        limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getDashboardSessionsData(uid) {
    const ref = collection(db, 'sessions');
    const q = query(
        ref,
        where('userId', '==', uid),
        where('status', '==', 'completed'),
        orderBy('endTime', 'desc'),
        limit(150)
    );
    const snap = await getDocs(q);

    const completed = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const recentSessions = completed.slice(0, 5);

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

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 0; d < 60; d++) {
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
            break;
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

// ─── Performance — Summary Document approach ───
// Stores ALL question performance as a single Firestore document.
// 1 doc = 1 read, regardless of whether you have 100 or 10,000 questions.
// At ~300 bytes per entry, a 1MB doc can hold ~3,300 entries.
// If you exceed that, add sharding here (not needed until you have 3k+ questions).

import { computeSM2, qualityFromResult, computeMasteryLevel } from '../utils/spacedRepetition';

export { computeMasteryLevel };

const SUMMARY_DOC_PATH = (uid) => doc(db, 'users', uid, 'performanceSummary', 'data');

/**
 * Reads performance data only if it has changed since lastSyncedAt.
 * Returns { map, updatedAt } if changed, or null if unchanged.
 * Cost: 1 Firestore read in all cases (we must read the doc to check updatedAt).
 */
export async function getPerformanceMapIfChanged(uid, lastSyncedAt) {
    const summaryRef = SUMMARY_DOC_PATH(uid);
    const summarySnap = await getDoc(summaryRef);

    if (!summarySnap.exists()) return null;

    const data = summarySnap.data();
    const docUpdatedAt = data.updatedAt || null;

    // If we have a lastSyncedAt and the doc hasn't been updated since, skip
    if (lastSyncedAt && docUpdatedAt && new Date(docUpdatedAt).getTime() <= new Date(lastSyncedAt).getTime()) {
        console.log('[Sync] Performance data unchanged, skipping.');
        return null;
    }

    console.log('[Sync] Performance data changed, returning updated map.');
    return { map: data.questions || {}, updatedAt: docUpdatedAt };
}

/**
 * Reads performance data for all questions in a single Firestore document read.
 * Returns a map: { [questionId]: performanceData }
 * Falls back to reading the old subcollection and migrates to summary doc if not found.
 */
export async function getPerformanceMap(uid) {
    const summaryRef = SUMMARY_DOC_PATH(uid);
    const summarySnap = await getDoc(summaryRef);

    if (summarySnap.exists()) {
        return summarySnap.data().questions || {};
    }

    // ── First-time migration: read old subcollection and write summary doc ──
    console.log('[Performance] Summary doc not found. Migrating from subcollection...');
    const ref = collection(db, 'users', uid, 'performance');
    const snap = await getDocs(ref);
    const map = {};
    snap.docs.forEach((d) => { map[d.id] = d.data(); });

    if (Object.keys(map).length > 0) {
        // Write the summary doc so future reads are cheap
        await setDoc(summaryRef, {
            questions: map,
            updatedAt: new Date().toISOString(),
        });
        console.log(`[Performance] Migrated ${Object.keys(map).length} entries to summary doc.`);
    }

    return map;
}

/**
 * Updates performance for a batch of question results.
 * Reads the entire summary doc ONCE, computes updates in memory, writes back ONCE.
 * Cost: 1 read + 1 write — regardless of how many questions were answered.
 */
export async function batchUpdatePerformance(uid, questionResults) {
    // Filter unanswered questions up front
    const answeredResults = questionResults.filter(
        (r) => r.questionId && r.userAnswer !== null
    );
    if (answeredResults.length === 0) return;

    const summaryRef = SUMMARY_DOC_PATH(uid);

    // Single read of the entire performance map
    const summarySnap = await getDoc(summaryRef);
    const currentMap = summarySnap.exists() ? (summarySnap.data().questions || {}) : {};

    const updatedMap = { ...currentMap };

    for (const result of answeredResults) {
        const existing = currentMap[result.questionId] || {
            timesAsked: 0, timesCorrect: 0, timesWrong: 0,
            streak: 0, intervalDays: 1, masteryLevel: 0,
            easeFactor: 2.5, repetitions: 0,
            flagged: false, lastAsked: null, nextDue: null,
        };

        const timesAsked = (existing.timesAsked || 0) + 1;
        const timesCorrect = (existing.timesCorrect || 0) + (result.isCorrect ? 1 : 0);
        const timesWrong = (existing.timesWrong || 0) + (result.isCorrect ? 0 : 1);

        let streak = existing.streak || 0;
        if (result.isCorrect && result.confidence !== 'guessed') {
            streak += 1;
        } else if (!result.isCorrect) {
            streak = 0;
        }

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

        const accuracy = timesAsked > 0 ? timesCorrect / timesAsked : 0;
        const masteryLevel = computeMasteryLevel(accuracy, streak, timesAsked, result.confidence);

        const flagged = result.flagged !== undefined ? result.flagged : (existing.flagged || false);

        updatedMap[result.questionId] = {
            timesAsked, timesCorrect, timesWrong, streak,
            intervalDays: sm2.interval,
            easeFactor: sm2.ef,
            repetitions: sm2.repetitions,
            nextDue: nextDue.toISOString(),
            lastAsked: new Date().toISOString(),
            lastConfidence: result.confidence || null,
            masteryLevel, flagged,
        };
    }

    // Single write back — one Firestore write regardless of session size
    await setDoc(summaryRef, {
        questions: updatedMap,
        updatedAt: new Date().toISOString(),
    });

    return updatedMap; // Return updated map so caller can refresh store
}
