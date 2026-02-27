/**
 * SM-2 Spaced Repetition Algorithm + Mastery Computation
 * 
 * References the SuperMemo SM-2 algorithm:
 *   EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 *   where q = quality of response (0-5)
 */

import { STALE_DAYS_THRESHOLD } from '../constants';

// ─── SM-2 Core ───

/**
 * Compute SM-2 scheduling after a review.
 * @param {number} quality  – 0..5 response quality
 * @param {number} prevEF   – previous ease factor (≥ 1.3)
 * @param {number} prevInterval – previous interval in days
 * @param {number} repetitions  – successful repetition count
 * @returns {{ interval: number, ef: number, repetitions: number }}
 */
export function computeSM2(quality, prevEF = 2.5, prevInterval = 0, repetitions = 0) {
    // Clamp quality
    const q = Math.max(0, Math.min(5, quality));

    // New ease factor
    let ef = prevEF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    ef = Math.max(1.3, ef); // floor at 1.3

    let newInterval;
    let newReps;

    if (q < 3) {
        // Failed review — reset
        newInterval = 1;
        newReps = 0;
    } else {
        // Successful review
        newReps = repetitions + 1;
        if (newReps === 1) {
            newInterval = 1;
        } else if (newReps === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(prevInterval * ef);
        }
    }

    return {
        interval: Math.max(1, Math.min(365, newInterval)),
        ef: Math.round(ef * 100) / 100,
        repetitions: newReps,
    };
}

// ─── Quality Mapping ───

/**
 * Map answer result + confidence to SM-2 quality (0–5).
 * 
 *  Wrong              → 1
 *  Correct + guessed  → 2  (below threshold, resets reps)
 *  Correct + unsure   → 3
 *  Correct + sure     → 5
 *  Correct + null     → 4  (no confidence given, default decent)
 */
export function qualityFromResult(isCorrect, confidence) {
    if (!isCorrect) return 1;

    switch (confidence) {
        case 'guessed': return 2; // barely — won't advance reps
        case 'unsure': return 3;
        case 'sure': return 5;
        default: return 4; // no confidence selected
    }
}

// ─── Mastery Level (0–4) ───

/**
 * Compute mastery level based on accuracy, streak, attempts, and confidence.
 * 
 * Level 0 — Unseen    (never attempted)
 * Level 1 — Struggling (accuracy < 40%)
 * Level 2 — Learning   (accuracy < 70%)
 * Level 3 — Proficient (accuracy < 90%)
 * Level 4 — Mastered   (accuracy ≥ 90%, streak ≥ 3, last answer was NOT guessed)
 */
export function computeMasteryLevel(accuracy, streak, timesAsked, lastConfidence) {
    if (timesAsked === 0) return 0;
    if (accuracy < 0.4) return 1;
    if (accuracy < 0.7) return 2;
    if (accuracy < 0.9) return 3;
    // Level 4 requires: 90%+ accuracy, streak ≥ 3, and the last correct wasn't just a guess
    if (accuracy >= 0.9 && streak >= 3 && lastConfidence !== 'guessed') return 4;
    return 3;
}

// ─── Stale Detection ───

/**
 * Check if a question is stale (not reviewed in `thresholdDays`).
 * @param {string|Date|null} lastAsked
 * @param {number} thresholdDays
 * @returns {boolean}
 */
export function isStaleQuestion(lastAsked, thresholdDays = STALE_DAYS_THRESHOLD) {
    if (!lastAsked) return false; // never asked = not stale, just unseen
    const last = new Date(lastAsked);
    const now = new Date();
    const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= thresholdDays;
}

/**
 * Get number of days since last asked.
 * @param {string|Date|null} lastAsked
 * @returns {number|null}
 */
export function daysSinceLastAsked(lastAsked) {
    if (!lastAsked) return null;
    const last = new Date(lastAsked);
    const now = new Date();
    return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}
