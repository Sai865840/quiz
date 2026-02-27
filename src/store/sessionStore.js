import { create } from 'zustand';
import * as sessionService from '../firebase/sessionService';

export const useSessionStore = create((set, get) => ({
    // Session state
    sessionId: null,
    status: null,          // 'configuring' | 'in_progress' | 'paused' | 'completed'
    type: null,
    scope: null,
    config: null,

    // Questions
    questions: [],          // full question objects for this session
    currentIndex: 0,
    answers: {},            // { questionId: resultObject }
    questionOrder: {},      // { questionId: optionOrder[] } — shuffled option order

    // Counts
    totalQuestions: 0,
    answered: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,

    // Timer
    timerActive: false,
    timeRemaining: 0,       // seconds
    questionStartTime: null,

    // UI
    paused: false,
    showingAnswer: false,
    selectedOption: null,
    sessionStartTime: null,

    // ─── Actions ───

    initSession: (data) => set({
        sessionId: data.sessionId,
        status: 'in_progress',
        type: data.type,
        scope: data.scope,
        config: data.config,
        questions: data.questions,
        currentIndex: 0,
        answers: {},
        questionOrder: data.questionOrder || {},
        totalQuestions: data.questions.length,
        answered: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        timerActive: data.config.timerType !== 'none',
        timeRemaining: data.config.timerType === 'per_question'
            ? data.config.timerValue
            : data.config.timerType === 'full_session'
                ? data.config.timerValue * 60
                : 0,
        questionStartTime: Date.now(),
        paused: false,
        showingAnswer: false,
        selectedOption: null,
        sessionStartTime: Date.now(),
    }),

    answerQuestion: (questionId, userAnswer, correctAnswer) => {
        const state = get();
        const isCorrect = userAnswer === correctAnswer;
        const timeSpent = Math.round((Date.now() - (state.questionStartTime || Date.now())) / 1000);

        const result = {
            questionId,
            questionText: state.questions[state.currentIndex]?.text || '',
            userAnswer,
            correctAnswer,
            isCorrect,
            timeSpent,
            confidence: null,
            flagged: false,
            attemptedAt: new Date().toISOString(),
            optionOrder: state.questionOrder[questionId] || ['A', 'B', 'C', 'D'],
        };

        set((s) => ({
            answers: { ...s.answers, [questionId]: result },
            answered: s.answered + 1,
            correct: s.correct + (isCorrect ? 1 : 0),
            wrong: s.wrong + (isCorrect ? 0 : 1),
            showingAnswer: true,
            selectedOption: userAnswer,
        }));

        // Checkpoint every 10 questions
        const newAnswered = state.answered + 1;
        if (newAnswered % 10 === 0 && state.sessionId) {
            const updatedAnswers = { ...state.answers, [questionId]: result };
            sessionService.updateSession(state.sessionId, {
                answered: newAnswered,
                correct: state.correct + (isCorrect ? 1 : 0),
                wrong: state.wrong + (isCorrect ? 0 : 1),
                questionResults: Object.values(updatedAnswers),
            }).catch((err) => console.error('Checkpoint save failed:', err));
        }
    },

    setConfidence: (questionId, confidence) => {
        set((s) => ({
            answers: {
                ...s.answers,
                [questionId]: { ...s.answers[questionId], confidence },
            },
        }));
    },

    skipQuestion: (questionId) => {
        const state = get();
        const timeSpent = Math.round((Date.now() - (state.questionStartTime || Date.now())) / 1000);

        const result = {
            questionId,
            questionText: state.questions[state.currentIndex]?.text || '',
            userAnswer: null,
            correctAnswer: state.questions[state.currentIndex]?.correctOption || '',
            isCorrect: false,
            timeSpent,
            confidence: null,
            flagged: false,
            attemptedAt: new Date().toISOString(),
            optionOrder: state.questionOrder[questionId] || ['A', 'B', 'C', 'D'],
        };

        set((s) => ({
            answers: { ...s.answers, [questionId]: result },
            skipped: s.skipped + 1,
        }));
    },

    flagQuestion: (questionId) => {
        set((s) => {
            const existing = s.answers[questionId];
            if (existing) {
                return {
                    answers: {
                        ...s.answers,
                        [questionId]: { ...existing, flagged: !existing.flagged },
                    },
                };
            }
            // Create a placeholder so flag works on unanswered questions
            return {
                answers: {
                    ...s.answers,
                    [questionId]: {
                        questionId,
                        questionText: '',
                        userAnswer: null,
                        correctAnswer: '',
                        isCorrect: false,
                        timeSpent: 0,
                        confidence: null,
                        flagged: true,
                        attemptedAt: new Date().toISOString(),
                        optionOrder: s.questionOrder[questionId] || ['A', 'B', 'C', 'D'],
                    },
                },
            };
        });
    },

    nextQuestion: () => {
        const state = get();
        const nextIdx = state.currentIndex + 1;
        if (nextIdx < state.questions.length) {
            set({
                currentIndex: nextIdx,
                showingAnswer: false,
                selectedOption: null,
                questionStartTime: Date.now(),
                timeRemaining: state.config?.timerType === 'per_question'
                    ? state.config.timerValue
                    : state.timeRemaining,
            });
        }
    },

    goToQuestion: (index) => {
        set({
            currentIndex: index,
            showingAnswer: false,
            selectedOption: null,
            questionStartTime: Date.now(),
        });
    },

    tickTimer: () => {
        const state = get();
        if (!state.timerActive || state.paused) return;
        const newTime = state.timeRemaining - 1;
        if (newTime <= 0) {
            // Per-question timer: auto-skip
            if (state.config?.timerType === 'per_question') {
                const q = state.questions[state.currentIndex];
                if (q && !state.answers[q.id]) {
                    get().skipQuestion(q.id);
                }
                if (state.currentIndex < state.questions.length - 1) {
                    get().nextQuestion();
                }
            }
            set({ timeRemaining: Math.max(0, newTime) });
        } else {
            set({ timeRemaining: newTime });
        }
    },

    pauseSession: () => set({ paused: true }),
    resumeSession: () => set({ paused: false }),

    endSession: async () => {
        const state = get();
        if (!state.sessionId) return null;

        const score = state.answered > 0
            ? Math.round((state.correct / state.answered) * 100)
            : 0;

        const finalData = {
            answered: state.answered,
            correct: state.correct,
            wrong: state.wrong,
            skipped: state.skipped,
            score,
            questionResults: Object.values(state.answers),
        };

        await sessionService.completeSession(state.sessionId, finalData);
        set({ status: 'completed' });
        return { sessionId: state.sessionId, score, ...finalData };
    },

    resetSession: () => set({
        sessionId: null,
        status: null,
        type: null,
        scope: null,
        config: null,
        questions: [],
        currentIndex: 0,
        answers: {},
        questionOrder: {},
        totalQuestions: 0,
        answered: 0,
        correct: 0,
        wrong: 0,
        skipped: 0,
        timerActive: false,
        timeRemaining: 0,
        questionStartTime: null,
        paused: false,
        showingAnswer: false,
        selectedOption: null,
        sessionStartTime: null,
    }),
}));
