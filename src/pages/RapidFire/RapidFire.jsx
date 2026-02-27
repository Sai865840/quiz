import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { useSessionStore } from '../../store/sessionStore';
import * as sessionService from '../../firebase/sessionService';
import { shuffleArray, fetchQuestionsForScope } from '../../utils/questionAlgorithms';

export default function RapidFire() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const dataStore = useDataStore();
    const initSession = useSessionStore((s) => s.initSession);
    const { subjects } = dataStore;

    const [selectedSubject, setSelectedSubject] = useState('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.uid && subjects.length === 0) dataStore.fetchSubjects(user.uid);
    }, [user?.uid]);

    const handleStart = async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            const scope = { subjectIds: [selectedSubject], chapterIds: ['all'] };
            const allQs = await fetchQuestionsForScope(user.uid, scope, dataStore);
            const selected = shuffleArray(allQs).slice(0, 30);
            if (selected.length === 0) { setLoading(false); return; }

            const scopeData = {
                subjectIds: [selectedSubject],
                chapterIds: ['all'],
                subjectNames: [selectedSubject === 'all' ? 'All Subjects' : subjects.find(s => s.id === selectedSubject)?.name || 'Rapid Fire'],
            };

            const config = {
                totalQuestions: selected.length,
                timerType: 'per_question',
                timerValue: 15,
                shuffled: true,
                optionsShuffled: false,
                showExplanation: false,
            };

            const sessionId = await sessionService.createSession(user.uid, {
                type: 'rapid_fire',
                scope: scopeData,
                config,
                questionIds: selected.map(q => q.id),
                totalQuestions: selected.length,
            });

            initSession({
                sessionId,
                type: 'rapid_fire',
                scope: scopeData,
                config,
                questions: selected,
                questionOrder: {},
            });

            navigate('/test/session');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
                <h2 className="np-section-title">⚡ Rapid Fire</h2>
                <p className="np-section-subtitle">Speed drill — 15 seconds per question, no going back</p>
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
            <div className="np-card-surface" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚡</div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: 8 }}>How it works</h3>
                <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8, listStyle: 'none', padding: 0 }}>
                    <li>15 seconds per question — auto-skips when time runs out</li>
                    <li>Uses the same exam interface for answering</li>
                    <li>Up to 30 questions per round</li>
                </ul>
            </div>
            <button className="np-btn np-btn-primary np-btn-lg" onClick={handleStart} disabled={loading} style={{ alignSelf: 'center', minWidth: 200 }}>
                {loading ? 'Loading...' : '⚡ Start Rapid Fire'}
            </button>
        </div>
    );
}
