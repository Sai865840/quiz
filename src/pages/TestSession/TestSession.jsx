import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { useSessionStore } from '../../store/sessionStore';
import * as sessionService from '../../firebase/sessionService';
import {
    buildSmartSession, buildWrongQuestions, buildDueToday,
    buildUnseenFirst, buildFlaggedOnly, buildRandom,
    shuffleArray, shuffleOptions, fetchQuestionsForScope,
} from '../../utils/questionAlgorithms';

const MODES = [
    { key: 'smart', title: 'Smart Session', icon: '🧠', color: '#8B5CF6', desc: '70% important, 30% normal' },
    { key: 'wrong', title: 'Wrong Questions', icon: '❌', color: '#FF6B6B', desc: 'Focus on past mistakes' },
    { key: 'due_today', title: 'Due Today', icon: '📅', color: '#00D9A3', desc: 'Spaced repetition queue' },
    { key: 'unseen', title: 'Unseen First', icon: '👀', color: '#FFB347', desc: 'New questions first' },
    { key: 'flagged', title: 'Flagged Only', icon: '🚩', color: '#FF006E', desc: 'Bookmarked questions' },
    { key: 'random', title: 'Quick Mix', icon: '🎲', color: '#6C63FF', desc: 'Pure random selection' },
];

const COUNT_OPTIONS = [10, 25, 50, 100];

export default function TestSession() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuthStore();
    const dataStore = useDataStore();
    const { subjects } = dataStore;
    const initSession = useSessionStore((s) => s.initSession);

    // Config state
    const [selectedMode, setSelectedMode] = useState(searchParams.get('mode') || 'smart');
    const [selectedSubjects, setSelectedSubjects] = useState(
        searchParams.get('subject') ? [searchParams.get('subject')] : ['all']
    );
    const [selectedChapters, setSelectedChapters] = useState(['all']);
    const [questionCount, setQuestionCount] = useState(25);
    const [customCount, setCustomCount] = useState('');
    const [timerType, setTimerType] = useState('none');
    const [timerValue, setTimerValue] = useState(60);
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [shuffleOpts, setShuffleOpts] = useState(true);
    const [showExplanation, setShowExplanation] = useState(false);

    // Data
    const [allQuestions, setAllQuestions] = useState([]);
    const [performance, setPerformance] = useState({});
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    // Load subjects + questions
    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            setLoading(true);
            try {
                if (subjects.length === 0) await dataStore.fetchSubjects(user.uid);
                const perf = await sessionService.getPerformanceMap(user.uid);
                setPerformance(perf);
            } catch (err) {
                console.error('Failed to load config data:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.uid]);

    // Fetch questions when scope changes
    useEffect(() => {
        if (!user?.uid || subjects.length === 0) return;
        (async () => {
            const scope = { subjectIds: selectedSubjects, chapterIds: selectedChapters };
            const qs = await fetchQuestionsForScope(user.uid, scope, dataStore);
            setAllQuestions(qs);
        })();
    }, [user?.uid, selectedSubjects, selectedChapters, subjects, dataStore.chapters, dataStore.questions]);

    // Available chapters for selected subject
    const availableChapters = useMemo(() => {
        if (selectedSubjects[0] === 'all') return [];
        const subId = selectedSubjects[0];
        return dataStore.chapters[subId] || [];
    }, [selectedSubjects, dataStore.chapters]);

    // Load chapters when subject is selected
    useEffect(() => {
        if (selectedSubjects[0] !== 'all' && user?.uid) {
            const subId = selectedSubjects[0];
            if (!dataStore.chapters[subId]) {
                dataStore.fetchChapters(user.uid, subId);
            }
        }
    }, [selectedSubjects, user?.uid]);

    const availableCount = allQuestions.length;
    const finalCount = customCount ? parseInt(customCount, 10) : questionCount;

    // Start test
    const handleStart = async () => {
        if (!user?.uid || availableCount === 0) return;
        setStarting(true);

        try {
            // Build question list based on mode
            let selected = [];
            const count = Math.min(finalCount, availableCount);

            switch (selectedMode) {
                case 'smart':
                    selected = buildSmartSession(allQuestions, performance, count);
                    break;
                case 'wrong':
                    selected = buildWrongQuestions(allQuestions, performance).slice(0, count);
                    break;
                case 'due_today':
                    selected = buildDueToday(allQuestions, performance).slice(0, count);
                    break;
                case 'unseen':
                    selected = buildUnseenFirst(allQuestions, performance).slice(0, count);
                    break;
                case 'flagged':
                    selected = buildFlaggedOnly(allQuestions, performance).slice(0, count);
                    break;
                case 'random':
                default:
                    selected = buildRandom(allQuestions, count);
                    break;
            }

            if (selected.length === 0) {
                setStarting(false);
                return;
            }

            // Shuffle if enabled
            if (shuffleQuestions) selected = shuffleArray(selected);

            // Build option orders
            const questionOrder = {};
            if (shuffleOpts) {
                selected.forEach((q) => {
                    const { optionOrder } = shuffleOptions(q.options);
                    questionOrder[q.id] = optionOrder;
                });
            }

            const scope = {
                subjectIds: selectedSubjects,
                chapterIds: selectedChapters,
                subjectNames: selectedSubjects[0] === 'all'
                    ? ['All Subjects']
                    : subjects.filter((s) => selectedSubjects.includes(s.id)).map((s) => s.name),
            };

            const config = {
                totalQuestions: selected.length,
                timerType,
                timerValue,
                shuffled: shuffleQuestions,
                optionsShuffled: shuffleOpts,
                showExplanation,
            };

            // Create session in Firestore
            const sessionId = await sessionService.createSession(user.uid, {
                type: selectedMode,
                scope,
                config,
                questionIds: selected.map((q) => q.id),
                totalQuestions: selected.length,
            });

            // Init Zustand store
            initSession({
                sessionId,
                type: selectedMode,
                scope,
                config,
                questions: selected,
                questionOrder,
            });

            navigate('/test/session');
        } catch (err) {
            console.error('Failed to start session:', err);
            setStarting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
                <div className="np-card-surface" style={{ padding: 60, textAlign: 'center' }}>
                    <div className="np-auth-spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto' }} />
                    <p style={{ color: 'var(--muted)', marginTop: 16 }}>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
            <div>
                <h2 className="np-section-title">Configure Practice Session</h2>
                <p className="np-section-subtitle">Set up your test parameters</p>
            </div>

            {/* Section 1: Scope */}
            <div className="np-config-section">
                <h3 className="np-config-title">📚 Scope</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                        className={`np-pill ${selectedSubjects[0] === 'all' ? 'np-pill-active' : ''}`}
                        onClick={() => { setSelectedSubjects(['all']); setSelectedChapters(['all']); }}
                    >All Subjects</button>
                    {subjects.map((s) => (
                        <button
                            key={s.id}
                            className={`np-pill ${selectedSubjects.includes(s.id) ? 'np-pill-active' : ''}`}
                            style={selectedSubjects.includes(s.id) ? { borderColor: s.color, background: `${s.color}18`, color: s.color } : {}}
                            onClick={() => { setSelectedSubjects([s.id]); setSelectedChapters(['all']); }}
                        >
                            {s.icon} {s.name}
                        </button>
                    ))}
                </div>
                {/* Chapter selection */}
                {selectedSubjects[0] !== 'all' && availableChapters.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8, display: 'block' }}>Chapters</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            <button
                                className={`np-pill np-pill-sm ${selectedChapters[0] === 'all' ? 'np-pill-active' : ''}`}
                                onClick={() => setSelectedChapters(['all'])}
                            >All</button>
                            {availableChapters.map((c) => (
                                <button
                                    key={c.id}
                                    className={`np-pill np-pill-sm ${selectedChapters.includes(c.id) ? 'np-pill-active' : ''}`}
                                    onClick={() => {
                                        setSelectedChapters((prev) => {
                                            if (prev[0] === 'all') return [c.id];
                                            if (prev.includes(c.id)) {
                                                const next = prev.filter((id) => id !== c.id);
                                                return next.length === 0 ? ['all'] : next;
                                            }
                                            return [...prev, c.id];
                                        });
                                    }}
                                >{c.name}</button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="np-config-count">
                    {availableCount} question{availableCount !== 1 ? 's' : ''} available
                </div>
            </div>

            {/* Section 2: Mode */}
            <div className="np-config-section">
                <h3 className="np-config-title">🎯 Practice Mode</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {MODES.map((mode) => (
                        <div
                            key={mode.key}
                            className={`np-mode-select-card ${selectedMode === mode.key ? 'np-mode-select-active' : ''}`}
                            style={selectedMode === mode.key ? { borderColor: mode.color, background: `${mode.color}10` } : {}}
                            onClick={() => setSelectedMode(mode.key)}
                        >
                            <span style={{ fontSize: '1.4rem' }}>{mode.icon}</span>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{mode.title}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{mode.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 3: Question Count */}
            <div className="np-config-section">
                <h3 className="np-config-title">🔢 Question Count</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {COUNT_OPTIONS.map((n) => (
                        <button
                            key={n}
                            className={`np-pill ${questionCount === n && !customCount ? 'np-pill-active' : ''}`}
                            onClick={() => { setQuestionCount(n); setCustomCount(''); }}
                            disabled={n > availableCount}
                        >{n}</button>
                    ))}
                    <input
                        type="number" min="1" max={availableCount}
                        placeholder="Custom"
                        value={customCount}
                        onChange={(e) => setCustomCount(e.target.value)}
                        style={{ width: 90, fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                        / {availableCount} available
                    </span>
                </div>
            </div>

            {/* Section 4: Timer */}
            <div className="np-config-section">
                <h3 className="np-config-title">⏱ Timer</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[
                        { key: 'none', label: 'Off' },
                        { key: 'per_question', label: 'Per Question' },
                        { key: 'full_session', label: 'Full Session' },
                    ].map((t) => (
                        <button
                            key={t.key}
                            className={`np-pill ${timerType === t.key ? 'np-pill-active' : ''}`}
                            onClick={() => setTimerType(t.key)}
                        >{t.label}</button>
                    ))}
                </div>
                {timerType === 'per_question' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                            type="range" min={30} max={180} step={15}
                            value={timerValue}
                            onChange={(e) => setTimerValue(Number(e.target.value))}
                            style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: 60 }}>
                            {timerValue}s/Q
                        </span>
                    </div>
                )}
                {timerType === 'full_session' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            type="number" min={1} max={180}
                            value={timerValue}
                            onChange={(e) => setTimerValue(Number(e.target.value))}
                            style={{ width: 80 }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>minutes</span>
                    </div>
                )}
            </div>

            {/* Section 5: Options */}
            <div className="np-config-section">
                <h3 className="np-config-title">⚙ Options</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                        { label: 'Shuffle Questions', value: shuffleQuestions, set: setShuffleQuestions },
                        { label: 'Shuffle Options', value: shuffleOpts, set: setShuffleOpts },
                        { label: 'Show Explanation After Wrong', value: showExplanation, set: setShowExplanation },
                    ].map((opt) => (
                        <label key={opt.label} className="np-toggle-row">
                            <span>{opt.label}</span>
                            <div
                                className={`np-toggle ${opt.value ? 'np-toggle-on' : ''}`}
                                onClick={() => opt.set(!opt.value)}
                            >
                                <div className="np-toggle-thumb" />
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Start */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 32 }}>
                <button className="np-btn np-btn-outline np-btn-md" onClick={() => navigate('/practice')}>
                    Cancel
                </button>
                <button
                    className="np-btn np-btn-primary np-btn-lg"
                    onClick={handleStart}
                    disabled={starting || availableCount === 0 || finalCount < 1}
                    style={{ minWidth: 200 }}
                >
                    {starting ? 'Starting...' : `Start Test · ${Math.min(finalCount, availableCount)} Q`}
                </button>
            </div>
        </div>
    );
}
