import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProgressRing from '../../components/ui/ProgressRing';
import * as sessionService from '../../firebase/sessionService';
import { useSessionStore } from '../../store/sessionStore';

export default function Results() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session');
    const resetSession = useSessionStore((s) => s.resetSession);

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedQ, setExpandedQ] = useState(null);

    useEffect(() => {
        if (!sessionId) { navigate('/practice'); return; }
        (async () => {
            const data = await sessionService.getSessionById(sessionId);
            setSession(data);
            setLoading(false);
        })();
        resetSession();
    }, [sessionId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760, margin: '0 auto' }}>
                <div className="np-card-surface" style={{ padding: 60, textAlign: 'center' }}>
                    <div className="np-auth-spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto' }} />
                    <p style={{ color: 'var(--muted)', marginTop: 16 }}>Loading results...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760, margin: '0 auto' }}>
                <div className="np-card-surface">
                    <div className="np-empty">
                        <div className="np-empty-icon">🔍</div>
                        <div className="np-empty-title">Session not found</div>
                        <button className="np-btn np-btn-primary np-btn-md" onClick={() => navigate('/practice')}>Back to Practice</button>
                    </div>
                </div>
            </div>
        );
    }

    const scoreColor = session.score >= 70 ? '#00D9A3' : session.score >= 40 ? '#FFB347' : '#FF6B6B';
    const results = session.questionResults || [];
    const totalTime = results.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
    const avgTime = results.length > 0 ? Math.round(totalTime / results.length) : 0;
    const accuracy = session.answered > 0 ? Math.round((session.correct / session.answered) * 100) : 0;

    const stats = [
        { label: 'Correct', value: session.correct, color: '#00D9A3', bg: 'rgba(0,217,163,0.08)', border: 'rgba(0,217,163,0.15)' },
        { label: 'Wrong', value: session.wrong, color: '#FF6B6B', bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.15)' },
        { label: 'Skipped', value: session.skipped, color: '#FFB347', bg: 'rgba(255,179,71,0.08)', border: 'rgba(255,179,71,0.15)' },
        { label: 'Avg Time', value: `${avgTime}s`, color: '#6C63FF', bg: 'rgba(108,99,255,0.08)', border: 'rgba(108,99,255,0.15)' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 760, margin: '0 auto', paddingBottom: 32 }}>
            {/* Header Card */}
            <div className="np-card-surface" style={{ overflow: 'hidden' }}>
                {/* Score Banner */}
                <div style={{
                    background: `linear-gradient(135deg, ${scoreColor}10, ${scoreColor}05)`,
                    borderBottom: `1px solid ${scoreColor}20`,
                    padding: '36px 24px', textAlign: 'center',
                }}>
                    <ProgressRing progress={session.score} size={140} strokeWidth={10}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '2.2rem', color: scoreColor }}>{session.score}%</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Score</p>
                        </div>
                    </ProgressRing>
                    <p style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {session.scope?.subjectNames?.join(', ') || 'All Subjects'} · {session.totalQuestions} Questions · {formatTime(totalTime)}
                    </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
                    {stats.map((stat) => (
                        <div key={stat.label} style={{
                            textAlign: 'center', padding: '20px 8px',
                            borderRight: '1px solid var(--border)',
                        }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.color, fontFamily: 'var(--font-heading)' }}>{stat.value}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Question Review */}
            <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 16 }}>
                    📋 Question Review ({results.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {results.map((r, idx) => {
                        const isExpanded = expandedQ === idx;
                        return (
                            <div
                                key={r.questionId || idx}
                                className="np-result-item"
                                onClick={() => setExpandedQ(isExpanded ? null : idx)}
                                style={{ padding: isExpanded ? '16px 20px' : '14px 16px' }}
                            >
                                {/* Row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{
                                        width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                                        background: r.isCorrect ? 'rgba(0,217,163,0.15)' : r.userAnswer === null ? 'rgba(255,179,71,0.15)' : 'rgba(255,107,107,0.15)',
                                        color: r.isCorrect ? '#00D9A3' : r.userAnswer === null ? '#FFB347' : '#FF6B6B',
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            fontSize: '0.85rem', lineHeight: 1.4,
                                            overflow: isExpanded ? 'visible' : 'hidden',
                                            textOverflow: isExpanded ? 'unset' : 'ellipsis',
                                            whiteSpace: isExpanded ? 'normal' : 'nowrap',
                                        }}>
                                            {r.questionText}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                                            background: r.isCorrect ? 'rgba(0,217,163,0.1)' : r.userAnswer === null ? 'rgba(255,179,71,0.1)' : 'rgba(255,107,107,0.1)',
                                            color: r.isCorrect ? '#00D9A3' : r.userAnswer === null ? '#FFB347' : '#FF6B6B',
                                        }}>
                                            {r.isCorrect ? 'Correct' : r.userAnswer === null ? 'Skipped' : 'Wrong'}
                                        </span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                            style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', gap: 24, fontSize: '0.82rem', marginBottom: 12 }}>
                                            <div>
                                                <span style={{ color: 'var(--muted)' }}>Your answer: </span>
                                                <strong style={{
                                                    color: r.isCorrect ? '#00D9A3' : r.userAnswer === null ? '#FFB347' : '#FF6B6B',
                                                }}>
                                                    {r.userAnswer || 'Skipped'} {r.userAnswerText && r.userAnswer !== null ? `- ${r.userAnswerText}` : ''}
                                                </strong>
                                            </div>
                                            {!r.isCorrect && r.userAnswer !== null && (
                                                <div>
                                                    <span style={{ color: 'var(--muted)' }}>Correct: </span>
                                                    <strong style={{ color: '#00D9A3' }}>
                                                        {r.correctAnswer} {r.correctAnswerText ? `- ${r.correctAnswerText}` : ''}
                                                    </strong>
                                                </div>
                                            )}
                                            <div>
                                                <span style={{ color: 'var(--muted)' }}>Time: </span>
                                                <strong>{r.timeSpent}s</strong>
                                            </div>
                                        </div>
                                        {r.confidence && (
                                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>
                                                Confidence: {r.confidence === 'guessed' ? '🎲 Guessed' : r.confidence === 'unsure' ? '🤔 Unsure' : '✅ Sure'}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingTop: 8 }}>
                <button className="np-btn np-btn-outline np-btn-md" onClick={() => navigate('/practice')}>
                    ← Back to Practice
                </button>
                <button className="np-btn np-btn-primary np-btn-md" onClick={() => navigate(`/test?mode=${session.type}`)}>
                    Retry this Mode
                </button>
            </div>
        </div>
    );
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}
