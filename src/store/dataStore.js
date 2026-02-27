import { create } from 'zustand';
import * as firestoreService from '../firebase/firestoreService';
import * as sessionService from '../firebase/sessionService';

export const useDataStore = create((set, get) => ({
    subjects: [],
    subjectsLoading: false,
    chapters: {},       // { [subjectId]: Chapter[] }
    chaptersLoading: false,
    questions: {},      // { [chapterId]: Question[] }
    questionsLoading: false,
    performanceMap: {},  // { [questionId]: PerformanceData }
    performanceLoading: false,

    // ─── Subjects ───

    fetchSubjects: async (uid) => {
        set({ subjectsLoading: true });
        try {
            const subjects = await firestoreService.getSubjects(uid);
            set({ subjects, subjectsLoading: false });
        } catch (err) {
            console.error('Failed to fetch subjects:', err);
            set({ subjectsLoading: false });
        }
    },

    addSubject: async (uid, data) => {
        const id = await firestoreService.addSubject(uid, data);
        // Re-fetch to get server timestamp
        await get().fetchSubjects(uid);
        return id;
    },

    updateSubject: async (uid, subjectId, data) => {
        await firestoreService.updateSubject(uid, subjectId, data);
        await get().fetchSubjects(uid);
    },

    deleteSubject: async (uid, subjectId) => {
        await firestoreService.deleteSubject(uid, subjectId);
        set((state) => ({
            subjects: state.subjects.filter((s) => s.id !== subjectId),
        }));
    },

    // ─── Chapters ───

    fetchChapters: async (uid, subjectId) => {
        set({ chaptersLoading: true });
        try {
            const chapters = await firestoreService.getChapters(uid, subjectId);
            set((state) => ({
                chapters: { ...state.chapters, [subjectId]: chapters },
                chaptersLoading: false,
            }));
        } catch (err) {
            console.error('Failed to fetch chapters:', err);
            set({ chaptersLoading: false });
        }
    },

    addChapter: async (uid, subjectId, data) => {
        const id = await firestoreService.addChapter(uid, subjectId, data);
        await get().fetchChapters(uid, subjectId);
        return id;
    },

    deleteChapter: async (uid, subjectId, chapterId) => {
        await firestoreService.deleteChapter(uid, subjectId, chapterId);
        await get().fetchChapters(uid, subjectId);
    },

    // ─── Questions ───

    fetchQuestions: async (uid, subjectId, chapterId) => {
        set({ questionsLoading: true });
        try {
            const questions = await firestoreService.getQuestions(uid, subjectId, chapterId);
            set((state) => ({
                questions: { ...state.questions, [chapterId]: questions },
                questionsLoading: false,
            }));
        } catch (err) {
            console.error('Failed to fetch questions:', err);
            set({ questionsLoading: false });
        }
    },

    addQuestions: async (uid, subjectId, chapterId, questions) => {
        await firestoreService.addQuestions(uid, subjectId, chapterId, questions);
        await get().fetchQuestions(uid, subjectId, chapterId);
    },

    deleteQuestion: async (uid, subjectId, chapterId, questionId) => {
        await firestoreService.deleteQuestion(uid, subjectId, chapterId, questionId);
        set((state) => ({
            questions: {
                ...state.questions,
                [chapterId]: (state.questions[chapterId] || []).filter((q) => q.id !== questionId),
            },
        }));
    },

    // ─── Performance ───

    fetchPerformance: async (uid) => {
        set({ performanceLoading: true });
        try {
            const perf = await sessionService.getPerformanceMap(uid);
            set({ performanceMap: perf, performanceLoading: false });
            return perf;
        } catch (err) {
            console.error('Failed to fetch performance:', err);
            set({ performanceLoading: false });
            return {};
        }
    },

    // ─── Reset ───

    clearData: () => set({
        subjects: [],
        chapters: {},
        questions: {},
        performanceMap: {},
    }),
}));
