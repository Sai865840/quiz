import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { useSessionStore } from '../../store/sessionStore';
import * as sessionService from '../../firebase/sessionService';
import { shuffleArray, fetchQuestionsForScope } from '../../utils/questionAlgorithms';

export default function Flashcards() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const dataStore = useDataStore();
    const { subjects } = dataStore;
    const initSession = useSessionStore((s) => s.initSession);

    const [selectedSubject, setSelectedSubject] = useState('all');
    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        if (user?.uid && subjects.length === 0) dataStore.fetchSubjects(user.uid);
    }, [user?.uid]);

    const handleStart = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const scope = { subjectIds: [selectedSubject], chapterIds: ['all'] };
            const allQs = await fetchQuestionsForScope(user.uid, scope, dataStore);
            const selected = shuffleArray(allQs).slice(0, 20);
            if (selected.length === 0) { setLoading(false); return; }

            const sessionId = await sessionService.createSession(user.uid, {
                type: 'flashcard',
                scope: { subjectIds: [selectedSubject], chapterIds: ['all'], subjectNames: [selectedSubject === 'all' ? 'All' : subjects.find(s => s.id === selectedSubject)?.name] },
                config: { totalQuestions: selected.length, timerType: 'none', timerValue: 0, shuffled: true, optionsShuffled: false, showExplanation: false },
                questionIds: selected.map(q => q.id),
                totalQuestions: selected.length,
            });

            setCards(selected);
            setCurrentIndex(0);
            setFlipped(false);
            setResults([]);
            setStarted(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResponse = async (knew) => {
        const card = cards[currentIndex];
        const result = {
            questionId: card.id,
            questionText: card.text,
            userAnswer: knew ? 'knew_it' : null,
            correctAnswer: card.correctOption,
            isCorrect: knew,
            timeSpent: 0,
            confidence: null,
            flagged: false,
            attemptedAt: new Date().toISOString(),
            optionOrder: ['A', 'B', 'C', 'D'],
        };
        const newResults = [...results, result];
        setResults(newResults);

        if (currentIndex < cards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setFlipped(false);
        } else {
            // Finish
            const correct = newResults.filter(r => r.isCorrect).length;
            const score = Math.round((correct / newResults.length) * 100);
            if (user?.uid) {
                const sessions = await sessionService.getRecentSessions(user.uid, 1);
                // The latest in-progress session
                const inProgress = await sessionService.getInProgressSession(user.uid);
                if (inProgress) {
                    await sessionService.completeSession(inProgress.id, {
                        answered: newResults.length, correct, wrong: newResults.length - correct,
                        skipped: 0, score, questionResults: newResults,
                    });
                    await sessionService.batchUpdatePerformance(user.uid, newResults);
                    navigate(`/test/results?session=${inProgress.id}`);
                    return;
                }
            }
            setStarted(false);
        }
    };

    if (!started) {
        const currentCard = cards.length > 0 ? cards[currentIndex] : null;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                    <h2 className="np-section-title">Flashcards</h2>
                    <p className="np-section-subtitle">Review questions with flip cards</p>
                </div>
                <div className="np-config-section">
                    <h3 className="np-config-title">📚 Select Scope</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button className={`np-pill ${selectedSubject === 'all' ? 'np-pill-active' : ''}`} onClick={() => setSelectedSubject('all')}>All Subjects</button>
                        {subjects.map(s => (
                            <button key={s.id} className={`np-pill ${selectedSubject === s.id ? 'np-pill-active' : ''}`} onClick={() => setSelectedSubject(s.id)}>
                                {s.icon} {s.name}
                            </button>
                        ))}
                    </div>
                </div>
                <button className="np-btn np-btn-primary np-btn-lg" onClick={handleStart} disabled={loading} style={{ alignSelf: 'center', minWidth: 200 }}>
                    {loading ? 'Loading...' : 'Start Flashcards'}
                </button>
            </div>
        );
    }

    const card = cards[currentIndex];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Card {currentIndex + 1} of {cards.length}</span>
                <button className="np-btn np-btn-outline np-btn-sm" onClick={() => setStarted(false)}>Exit</button>
            </div>

            <div
                className="np-card-surface"
                style={{ padding: '48px 32px', textAlign: 'center', cursor: 'pointer', minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setFlipped(!flipped)}
            >
                {!flipped ? (
                    <>
                        <p style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.6, marginBottom: 16 }}>{card.text}</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Tap to reveal answer</span>
                    </>
                ) : (
                    <>
                        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>Answer: <strong style={{ color: '#00D9A3' }}>{card.correctOption}</strong></p>
                        <p style={{ fontSize: '1rem', fontWeight: 500, color: '#00D9A3' }}>
                            {card.options?.find(o => o.label === card.correctOption)?.text}
                        </p>
                        {card.explanation && <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 12, fontStyle: 'italic' }}>💡 {card.explanation}</p>}
                    </>
                )}
            </div>

            {flipped && (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button className="np-btn np-btn-danger np-btn-lg" style={{ flex: 1 }} onClick={() => handleResponse(false)}>
                        Didn't Know
                    </button>
                    <button className="np-btn np-btn-secondary np-btn-lg" style={{ flex: 1 }} onClick={() => handleResponse(true)}>
                        ✅ Knew It
                    </button>
                </div>
            )}
        </div>
    );
}
