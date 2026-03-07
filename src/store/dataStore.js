import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as firestoreService from '../firebase/firestoreService';
import * as sessionService from '../firebase/sessionService';

// TTL constants
const PERF_TTL_MS = 60 * 60 * 1000;    // 1 hour — performance summary doc
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour — last session + templates
const PROFILE_TTL_MS = 60 * 60 * 1000; // 1 hour — user profile

export const useDataStore = create(persist((set, get) => ({
    subjects: [],
    subjectsLoading: false,
    chapters: {},
    chaptersLoading: false,
    questions: {},
    questionsLoading: false,
    performanceMap: {},
    performanceLoading: false,
    performanceFetchedAt: null,

    // Lightweight data cached per-visit
    lastSession: null,        // most recent completed session
    sessionFetchedAt: null,
    templates: [],
    templatesFetchedAt: null,
    userProfile: null,
    profileFetchedAt: null,

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

    updateQuestion: async (uid, subjectId, chapterId, questionId, data) => {
        await firestoreService.updateQuestion(uid, subjectId, chapterId, questionId, data);
        // Optimistically update the in-memory cache
        set((state) => ({
            questions: {
                ...state.questions,
                [chapterId]: (state.questions[chapterId] || []).map((q) =>
                    q.id === questionId ? { ...q, ...data } : q
                ),
            },
        }));
    },

    // ─── Performance ───
    //
    // Uses a summary document (1 Firestore read for ALL question performance data).
    // TTL guard prevents re-fetching if data was loaded within PERF_TTL_MS.
    // All pages should read from store.performanceMap instead of calling Firebase directly.

    fetchPerformance: async (uid, { force = false } = {}) => {
        const { performanceFetchedAt, performanceLoading } = get();

        // Skip if already loading
        if (performanceLoading) return get().performanceMap;

        // Skip if data is fresh (TTL not expired) and not forced
        const isFresh = performanceFetchedAt && (Date.now() - performanceFetchedAt < PERF_TTL_MS);
        if (!force && isFresh) {
            return get().performanceMap;
        }

        set({ performanceLoading: true });
        try {
            const perf = await sessionService.getPerformanceMap(uid);
            set({ performanceMap: perf, performanceLoading: false, performanceFetchedAt: Date.now() });
            return perf;
        } catch (err) {
            console.error('Failed to fetch performance:', err);
            set({ performanceLoading: false });
            return get().performanceMap;
        }
    },

    // Called after a session ends to update the in-memory map without a re-fetch
    updatePerformanceMap: (updatedMap) => {
        if (updatedMap && Object.keys(updatedMap).length > 0) {
            set({ performanceMap: updatedMap, performanceFetchedAt: Date.now() });
        }
    },

    // ─── Last Session + Templates (cached for Practice page) ───

    fetchLastSessionAndTemplates: async (uid, { force = false } = {}) => {
        const { sessionFetchedAt, templatesFetchedAt } = get();
        const sessionsFresh = sessionFetchedAt && (Date.now() - sessionFetchedAt < SESSION_TTL_MS);
        const templatesFresh = templatesFetchedAt && (Date.now() - templatesFetchedAt < SESSION_TTL_MS);

        const [sessionResult, templatesResult] = await Promise.all([
            (!force && sessionsFresh)
                ? Promise.resolve(null)  // use cached
                : sessionService.getRecentSessions(uid, 1).catch(() => []),
            (!force && templatesFresh)
                ? Promise.resolve(null)  // use cached
                : sessionService.getTemplates(uid).catch(() => []),
        ]);

        const updates = {};
        if (sessionResult !== null) {
            updates.lastSession = sessionResult.length > 0 ? sessionResult[0] : null;
            updates.sessionFetchedAt = Date.now();
        }
        if (templatesResult !== null) {
            updates.templates = templatesResult;
            updates.templatesFetchedAt = Date.now();
        }
        if (Object.keys(updates).length > 0) set(updates);
    },

    // Invalidate lastSession cache after a new session ends
    invalidateSessionCache: () => set({ sessionFetchedAt: null, templatesFetchedAt: null }),

    // ─── User Profile (cached for Dashboard) ───

    fetchUserProfile: async (uid, { force = false } = {}) => {
        const { profileFetchedAt } = get();
        const isFresh = profileFetchedAt && (Date.now() - profileFetchedAt < PROFILE_TTL_MS);
        if (!force && isFresh) return get().userProfile;

        try {
            const profile = await firestoreService.getUserProfile(uid);
            if (profile) {
                set({ userProfile: profile, profileFetchedAt: Date.now() });
                // Also keep authStore in sync
                const { useAuthStore } = await import('./authStore');
                useAuthStore.getState().setUserProfile(profile);
            }
            return profile;
        } catch (err) {
            console.error('Failed to fetch user profile:', err);
            return get().userProfile;
        }
    },

    // ─── Force Sync (manual refresh from Settings) ───

    forceRefreshAll: async (uid) => {
        if (!uid) return;
        set({
            performanceFetchedAt: null,
            sessionFetchedAt: null,
            templatesFetchedAt: null,
            profileFetchedAt: null,
        });
        try {
            // Re-fetch everything from Firebase
            const [subjects, perf, profile] = await Promise.all([
                firestoreService.getSubjects(uid),
                sessionService.getPerformanceMap(uid),
                firestoreService.getUserProfile(uid),
            ]);
            set({
                subjects,
                performanceMap: perf,
                performanceFetchedAt: Date.now(),
                profileFetchedAt: Date.now(),
            });
            if (profile) {
                set({ userProfile: profile });
                const { useAuthStore } = await import('./authStore');
                useAuthStore.getState().setUserProfile(profile);
            }

            // Re-fetch chapters & questions for all subjects
            for (const sub of subjects) {
                const chapters = await firestoreService.getChapters(uid, sub.id);
                set((state) => ({
                    chapters: { ...state.chapters, [sub.id]: chapters },
                }));
                for (const ch of chapters) {
                    const questions = await firestoreService.getQuestions(uid, sub.id, ch.id);
                    set((state) => ({
                        questions: { ...state.questions, [ch.id]: questions },
                    }));
                }
            }
        } catch (err) {
            console.error('Force refresh failed:', err);
            throw err; // let caller handle UI
        }
    },

    // ─── Reset ───

    clearData: () => set({
        subjects: [],
        chapters: {},
        questions: {},
        performanceMap: {},
        performanceFetchedAt: null,
        lastSession: null,
        sessionFetchedAt: null,
        templates: [],
        templatesFetchedAt: null,
        userProfile: null,
        profileFetchedAt: null,
    }),
}),
    {
        name: 'np-data-store',
        partialize: (state) => ({
            subjects: state.subjects,
            chapters: state.chapters,
            questions: state.questions,
            performanceMap: state.performanceMap,
            performanceFetchedAt: state.performanceFetchedAt,
            lastSession: state.lastSession,
            sessionFetchedAt: state.sessionFetchedAt,
            templates: state.templates,
            templatesFetchedAt: state.templatesFetchedAt,
            userProfile: state.userProfile,
            profileFetchedAt: state.profileFetchedAt,
        }),
    }
));
