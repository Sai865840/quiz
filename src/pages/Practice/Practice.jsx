import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import * as sessionService from '../../firebase/sessionService';
import {
    buildWrongQuestions, buildDueToday, buildFlaggedOnly,
    buildStaleQuestions, fetchQuestionsForScope,
} from '../../utils/questionAlgorithms';

const MODES = [
    { key: 'smart', title: 'Smart Session', icon: '🧠', color: '#8B5CF6', desc: '70% important, 30% normal — optimized mix' },
    { key: 'wrong', title: 'Wrong Questions', icon: '❌', color: '#FF6B6B', desc: 'Focus on your past mistakes' },
    { key: 'due_today', title: 'Due Today', icon: '📅', color: '#00D9A3', desc: 'Spaced repetition reviews' },
    { key: 'unseen', title: 'Unseen First', icon: '👀', color: '#FFB347', desc: 'Tackle new questions first' },
    { key: 'flagged', title: 'Flagged Only', icon: '🚩', color: '#FF006E', desc: 'Your bookmarked questions' },
    { key: 'random', title: 'Quick Mix', icon: '🎲', color: '#6C63FF', desc: 'Pure random selection' },
];

export default function Practice() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const dataStore = useDataStore();
    const { subjects, fetchSubjects, performanceMap, fetchPerformance } = dataStore;
    const [lastSession, setLastSession] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [allQuestions, setAllQuestions] = useState([]);

    useEffect(() => {
        if (!user?.uid) return;
        if (subjects.length === 0) fetchSubjects(user.uid);
        fetchPerformance(user.uid);
        sessionService.getRecentSessions(user.uid, 1).then((sessions) => {
            if (sessions.length > 0) setLastSession(sessions[0]);
        });
        sessionService.getTemplates(user.uid).then(setTemplates);
    }, [user?.uid]);

    // Fetch all questions for counts
    useEffect(() => {
        if (!user?.uid || subjects.length === 0) return;
        (async () => {
            const qs = await fetchQuestionsForScope(user.uid, { subjectIds: ['all'] }, dataStore);
            setAllQuestions(qs);
        })();
    }, [user?.uid, subjects, dataStore.chapters, dataStore.questions]);

    // Compute counts for badges
    const modeCounts = useMemo(() => {
        if (allQuestions.length === 0 || !performanceMap) return {};
        return {
            wrong: buildWrongQuestions(allQuestions, performanceMap).length,
            due_today: buildDueToday(allQuestions, performanceMap).length,
            flagged: buildFlaggedOnly(allQuestions, performanceMap).length,
            stale: buildStaleQuestions(allQuestions, performanceMap).length,
        };
    }, [allQuestions, performanceMap]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
                <h2 className="np-section-title">Practice Hub</h2>
                <p className="np-section-subtitle">Choose your practice mode and start learning</p>
            </div>

            {/* Subject Pills */}
            {subjects.length > 0 && (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {subjects.map((s) => (
                        <button
                            key={s.id}
                            className="np-pill"
                            style={{ borderColor: s.color, color: s.color, flexShrink: 0 }}
                            onClick={() => navigate(`/test?subject=${s.id}`)}
                        >
                            {s.icon} {s.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Stale Alert */}
            {modeCounts.stale > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 20px', borderRadius: 12,
                    background: 'rgba(255,179,71,0.08)',
                    border: '1px solid rgba(255,179,71,0.2)',
                    fontSize: '0.85rem',
                }}>
                    <span style={{ fontSize: '1.3rem' }}>⏰</span>
                    <div>
                        <span style={{ fontWeight: 600, color: '#FFB347' }}>{modeCounts.stale} stale question{modeCounts.stale !== 1 ? 's' : ''}</span>
                        <span style={{ color: 'var(--muted)' }}> — not reviewed in 30+ days. Consider revisiting!</span>
                    </div>
                </div>
            )}

            {/* Mode Cards */}
            <div className="np-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {MODES.map((mode) => {
                    const count = modeCounts[mode.key];
                    return (
                        <div
                            key={mode.key}
                            className="np-mode-card"
                            style={{ '--accent-color': mode.color, cursor: 'pointer' }}
                            onClick={() => navigate(`/test?mode=${mode.key}`)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div className="np-mode-icon" style={{ background: `${mode.color}18` }}>
                                    {mode.icon}
                                </div>
                                {count > 0 && (
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 20,
                                        background: `${mode.color}15`, color: mode.color,
                                        fontSize: '0.72rem', fontWeight: 700,
                                    }}>
                                        {count}
                                    </span>
                                )}
                            </div>
                            <div className="np-mode-title">{mode.title}</div>
                            <div className="np-mode-desc">{mode.desc}</div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                marginTop: 16, color: mode.color, fontSize: '0.8rem', fontWeight: 600,
                            }}>
                                <span>Start session</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rapid Fire CTA */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px', borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,0,110,0.08))',
                border: '1px solid rgba(255,107,53,0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: '2rem' }}>⚡</span>
                    <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem' }}>Rapid Fire Mode</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>Speed drill with streak multipliers — test your reflexes</div>
                    </div>
                </div>
                <button className="np-btn np-btn-outline np-btn-sm" onClick={() => navigate('/rapid-fire')} style={{ borderColor: 'rgba(255,107,53,0.3)', color: '#FF6B35', flexShrink: 0 }}>
                    Try it →
                </button>
            </div>

            {/* Last Session */}
            {lastSession && (
                <div className="np-card-surface" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>
                                📊 Last Session
                            </h3>
                            <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                <span>{lastSession.scope?.subjectNames?.join(', ') || 'All Subjects'}</span>
                                <span>Score: <strong style={{ color: lastSession.score >= 70 ? '#00D9A3' : lastSession.score >= 40 ? '#FFB347' : '#FF6B6B' }}>{lastSession.score}%</strong></span>
                                <span>{lastSession.answered}/{lastSession.totalQuestions} answered</span>
                            </div>
                        </div>
                        <button className="np-btn np-btn-outline np-btn-sm" onClick={() => navigate(`/test?mode=${lastSession.type}`)}>
                            Retry →
                        </button>
                    </div>
                </div>
            )}

            {/* Templates */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>💾 Saved Templates</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{templates.length} / 5</span>
                </div>
                {templates.length === 0 ? (
                    <div className="np-card-surface">
                        <div className="np-empty" style={{ padding: '36px 16px' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.6 }}>📋</div>
                            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                No saved templates yet.<br />Configure a session and save it for quick access.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {templates.map((tpl) => (
                            <div key={tpl.id} className="np-card-surface" style={{ padding: '14px 20px', cursor: 'pointer' }} onClick={() => navigate(`/test?mode=${tpl.type}`)}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tpl.name || tpl.type}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{tpl.totalQuestions} Q · {tpl.type}</div>
                                    </div>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
