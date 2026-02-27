/**
 * Question selection algorithms for all 6 practice modes
 */

/**
 * Fisher-Yates shuffle (in-place, returns new array)
 */
export function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Mode 1 — Smart Session: 70% important, 30% normal
 */
export function buildSmartSession(questions, performance, count) {
    const important = questions.filter((q) => q.important === true);
    const normal = questions.filter((q) => !q.important);

    const importantCount = Math.min(Math.ceil(count * 0.7), important.length);
    const normalCount = Math.min(count - importantCount, normal.length);

    // If important pool is smaller, fill remainder from normal
    const finalImportant = shuffleArray(important).slice(0, importantCount);
    let finalNormal = shuffleArray(normal).slice(0, normalCount);

    // If we still need more questions to reach count
    const remaining = count - finalImportant.length - finalNormal.length;
    if (remaining > 0) {
        const extraNormal = shuffleArray(normal.filter((q) => !finalNormal.includes(q))).slice(0, remaining);
        finalNormal = [...finalNormal, ...extraNormal];
    }

    // Interleave: don't put all important ones consecutively
    return interleave(finalImportant, finalNormal);
}

/**
 * Mode 2 — Wrong Questions: sorted by weakness score
 */
export function buildWrongQuestions(questions, performance) {
    const wrongQs = questions.filter((q) => {
        const perf = performance[q.id];
        return perf && perf.timesWrong > 0 && (perf.masteryLevel || 0) < 4;
    });

    return wrongQs.sort((a, b) => {
        const pa = performance[a.id] || {};
        const pb = performance[b.id] || {};
        const scoreA = ((pa.timesWrong || 0) * 3) - ((pa.timesCorrect || 0) * 1);
        const scoreB = ((pb.timesWrong || 0) * 3) - ((pb.timesCorrect || 0) * 1);
        return scoreB - scoreA; // highest weakness score first
    });
}

/**
 * Mode 3 — Due Today (Spaced Repetition)
 */
export function buildDueToday(questions, performance) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const todayMs = today.getTime();

    const dueQs = questions.filter((q) => {
        const perf = performance[q.id];
        if (!perf || !perf.nextDue) return false;
        const dueDate = new Date(perf.nextDue).getTime();
        return dueDate <= todayMs;
    });

    // Sort most overdue first
    return dueQs.sort((a, b) => {
        const dueA = new Date(performance[a.id].nextDue).getTime();
        const dueB = new Date(performance[b.id].nextDue).getTime();
        return dueA - dueB; // earlier due date = more overdue = comes first
    });
}

/**
 * Mode 4 — Unseen First: timesAsked === 0 first, then least asked
 */
export function buildUnseenFirst(questions, performance) {
    const unseen = questions.filter((q) => {
        const perf = performance[q.id];
        return !perf || (perf.timesAsked || 0) === 0;
    });

    const seen = questions.filter((q) => {
        const perf = performance[q.id];
        return perf && (perf.timesAsked || 0) > 0;
    });

    // Sort seen by least asked
    seen.sort((a, b) => {
        return (performance[a.id]?.timesAsked || 0) - (performance[b.id]?.timesAsked || 0);
    });

    return [...shuffleArray(unseen), ...seen];
}

/**
 * Mode 5 — Flagged Only
 */
export function buildFlaggedOnly(questions, performance) {
    return questions.filter((q) => {
        const perf = performance[q.id];
        return perf && perf.flagged === true;
    });
}

/**
 * Mode 6 — Quick Mix / Random
 */
export function buildRandom(questions, count) {
    return shuffleArray(questions).slice(0, count);
}

/**
 * Mode 7 — Stale Questions: not reviewed in 30+ days
 */
export function buildStaleQuestions(questions, performance, thresholdDays = 30) {
    const now = Date.now();
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

    const staleQs = questions.filter((q) => {
        const perf = performance[q.id];
        if (!perf || !perf.lastAsked) return false; // unseen, not stale
        const lastMs = new Date(perf.lastAsked).getTime();
        return (now - lastMs) >= thresholdMs;
    });

    // Sort most stale first
    return staleQs.sort((a, b) => {
        const lastA = new Date(performance[a.id].lastAsked).getTime();
        const lastB = new Date(performance[b.id].lastAsked).getTime();
        return lastA - lastB; // earlier lastAsked = more stale = first
    });
}

/**
 * Shuffle option order within a question (returns new options array + mapping)
 */
export function shuffleOptions(options) {
    const shuffled = shuffleArray(options);
    const orderMap = shuffled.map((o) => o.label);
    return { options: shuffled, optionOrder: orderMap };
}

/**
 * Interleave two arrays so items from arr1 are spread among arr2
 */
function interleave(arr1, arr2) {
    const result = [];
    const total = arr1.length + arr2.length;
    let i1 = 0, i2 = 0;

    for (let i = 0; i < total; i++) {
        // Ratio-based interleaving
        const ratio1 = arr1.length / total;
        if (i1 < arr1.length && (i2 >= arr2.length || Math.random() < ratio1)) {
            result.push(arr1[i1++]);
        } else if (i2 < arr2.length) {
            result.push(arr2[i2++]);
        } else {
            result.push(arr1[i1++]);
        }
    }

    return result;
}

/**
 * Get all questions from subjects/chapters in scope
 * Returns flat array of question objects with subjectId, chapterId, subjectName, chapterName attached
 */
export async function fetchQuestionsForScope(uid, scope, dataStore) {
    const { subjects, fetchChapters, fetchQuestions, chapters, questions } = dataStore;

    const targetSubjects = scope.subjectIds[0] === 'all'
        ? subjects
        : subjects.filter((s) => scope.subjectIds.includes(s.id));

    const allQuestions = [];

    for (const subject of targetSubjects) {
        // Ensure chapters are loaded
        if (!chapters[subject.id]) {
            await fetchChapters(uid, subject.id);
        }
        const subjectChapters = dataStore.chapters[subject.id] || [];

        const targetChapters = !scope.chapterIds || scope.chapterIds[0] === 'all'
            ? subjectChapters
            : subjectChapters.filter((c) => scope.chapterIds.includes(c.id));

        for (const chapter of targetChapters) {
            // Ensure questions are loaded
            if (!questions[chapter.id]) {
                await fetchQuestions(uid, subject.id, chapter.id);
            }
            const chapterQs = dataStore.questions[chapter.id] || [];

            for (const q of chapterQs) {
                allQuestions.push({
                    ...q,
                    subjectId: subject.id,
                    subjectName: subject.name,
                    subjectColor: subject.color,
                    chapterId: chapter.id,
                    chapterName: chapter.name,
                });
            }
        }
    }

    return allQuestions;
}
