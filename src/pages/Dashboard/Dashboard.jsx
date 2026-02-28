import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { getGreeting } from '../../utils/helpers';
import { MOTIVATIONAL_QUOTES } from '../../constants';
import * as sessionService from '../../firebase/sessionService';
import * as firestoreService from '../../firebase/firestoreService';
import ProgressRing from '../../components/ui/ProgressRing';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, userProfile } = useAuthStore();
    const { subjects, fetchSubjects, performanceMap, fetchPerformance } = useDataStore();

    const [recentSessions, setRecentSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Rotating quote
    const [quote] = useState(() => {
        const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
        return MOTIVATIONAL_QUOTES[idx];
    });

    // Load data (lightweight — only subjects, perf map, and recent sessions)
    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            setLoading(true);
            try {
                if (subjects.length === 0) await fetchSubjects(user.uid);
                await fetchPerformance(user.uid);

                // Fetch fresh user profile for accurate streak / today stats
                const profile = await firestoreService.getUserProfile(user.uid);
                if (profile) {
                    useAuthStore.getState().setUserProfile(profile);
                }

                const sessions = await sessionService.getRecentSessions(user.uid, 5);
                setRecentSessions(sessions);
            } catch (err) {
                console.error('Dashboard load error:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.uid]);

    // Computed stats
    const displayName = userProfile?.displayName || user?.displayName || 'Student';
    const dailyGoal = userProfile?.dailyGoal || 50;

    // Exam countdown
    const daysLeft = useMemo(() => {
        if (!userProfile?.examDate) return null;
        const diff = Math.ceil((new Date(userProfile.examDate) - new Date()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    }, [userProfile?.examDate]);

    // Today's stats from user profile
    const todayStats = useMemo(() => {
        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        let answered = 0;
        let correct = 0;
        let sessions = 0;

        if (userProfile?.todayStats?.date === todayStr) {
            answered = userProfile.todayStats.answered || 0;
            correct = userProfile.todayStats.correct || 0;
            sessions = userProfile.todayStats.sessions || 0;
        }

        const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
        return { sessions, answered, correct, accuracy };
    }, [userProfile]);

    // Performance-based stats (lightweight — from performanceMap only, no questions fetch)
    const perfStats = useMemo(() => {
        const entries = Object.values(performanceMap || {});
        const mastered = entries.filter((p) => (p.masteryLevel || 0) >= 4).length;
        const wrongRemaining = entries.filter((p) => (p.timesWrong || 0) > 0 && (p.masteryLevel || 0) < 4).length;
        const totalTracked = entries.length;
        const totalCorrect = entries.reduce((s, p) => s + (p.timesCorrect || 0), 0);
        const totalAsked = entries.reduce((s, p) => s + (p.timesAsked || 0), 0);
        const overallAccuracy = totalAsked > 0 ? Math.round((totalCorrect / totalAsked) * 100) : 0;

        // Due today count
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const dueToday = entries.filter((p) => {
            if (!p.nextDue) return false;
            return new Date(p.nextDue) <= now;
        }).length;

        // Stale count (30+ days)
        const stale = entries.filter((p) => {
            if (!p.lastAsked) return false;
            const daysSince = (Date.now() - new Date(p.lastAsked).getTime()) / (1000 * 60 * 60 * 24);
            return daysSince >= 30;
        }).length;

        return { mastered, wrongRemaining, totalTracked, overallAccuracy, dueToday, stale };
    }, [performanceMap]);

    // Focus recommendations (lightweight — from perfStats, no allQuestions needed)
    const focusItems = useMemo(() => {
        const items = [];

        if (perfStats.dueToday > 0) {
            items.push({
                icon: '📅', color: '#00D9A3',
                title: `${perfStats.dueToday} question${perfStats.dueToday !== 1 ? 's' : ''} due today`,
                desc: 'Spaced repetition reviews waiting',
                action: () => navigate('/test?mode=due_today'),
            });
        }

        if (perfStats.wrongRemaining > 0) {
            items.push({
                icon: '❌', color: '#FF6B6B',
                title: `${perfStats.wrongRemaining} wrong question${perfStats.wrongRemaining !== 1 ? 's' : ''} to fix`,
                desc: 'Focus on your mistakes',
                action: () => navigate('/wrong-questions'),
            });
        }

        if (perfStats.stale > 0) {
            items.push({
                icon: '⏰', color: '#FFB347',
                title: `${perfStats.stale} stale question${perfStats.stale !== 1 ? 's' : ''}`,
                desc: 'Not reviewed in 30+ days',
                action: () => navigate('/test?mode=unseen'),
            });
        }

        if (items.length === 0) {
            items.push({
                icon: '🎯', color: '#6C63FF',
                title: 'All caught up!',
                desc: 'Start a practice session to keep learning',
                action: () => navigate('/practice'),
            });
        }

        return items.slice(0, 4);
    }, [perfStats]);

    // Daily goal progress
    const goalProgress = Math.min(100, Math.round((todayStats.answered / dailyGoal) * 100));

    // Streak from user profile
    const streak = useMemo(() => {
        if (!userProfile?.streak || !userProfile?.lastSessionDate) return 0;

        const now = new Date();
        const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        // If they missed a day, streak is 0 visually (until they complete a session today)
        const lastDate = new Date(userProfile.lastSessionDate);
        lastDate.setHours(0, 0, 0, 0);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            return 0; // Streak officially broken, waiting for user to do a session to start new streak
        }

        return userProfile.streak;
    }, [userProfile]);

    const totalQuestions = subjects.reduce((sum, s) => sum + (s.questionCount || 0), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* ═══ Greeting Row ═══ */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 className="np-page-greeting">{getGreeting()}, {displayName} 👋</h2>
                    <p className="np-page-greeting-sub">
                        {daysLeft !== null && daysLeft > 0
                            ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} until ${userProfile?.examName || 'your exam'}. Keep going!`
                            : 'Ready to crush some questions today?'}
                    </p>
                </div>
                {/* Streak Badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px', borderRadius: 16,
                    background: streak > 0 ? 'rgba(255,179,71,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${streak > 0 ? 'rgba(255,179,71,0.2)' : 'var(--border)'}`,
                }}>
                    <span style={{ fontSize: '1.5rem' }}>{streak > 0 ? '🔥' : '☆'}</span>
                    <div>
                        <div style={{
                            fontFamily: 'var(--font-heading)', fontWeight: 800,
                            fontSize: '1.3rem', color: streak > 0 ? '#FFB347' : 'var(--muted)',
                        }}>
                            {streak}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>day streak</div>
                    </div>
                </div>
            </div>

            {/* ═══ Top Row: Daily Goal + Quick Stats ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                {/* Daily Goal Ring */}
                <div className="np-card-surface" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '28px 20px',
                }}>
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ProgressRing
                            progress={goalProgress}
                            size={130}
                            strokeWidth={10}
                            color={goalProgress >= 100 ? '#00D9A3' : '#6C63FF'}
                        >
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)', textAlign: 'center',
                            }}>
                                <div style={{
                                    fontFamily: 'var(--font-heading)', fontWeight: 800,
                                    fontSize: '1.5rem',
                                    color: goalProgress >= 100 ? '#00D9A3' : '#6C63FF',
                                }}>
                                    {todayStats.answered}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>/ {dailyGoal}</div>
                            </div>
                        </ProgressRing>
                    </div>
                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Daily Goal</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                            {goalProgress >= 100 ? '🎉 Goal reached!' : `${dailyGoal - todayStats.answered} more to go`}
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <QuickStatCard
                        icon="🎯" label="Today's Accuracy"
                        value={`${todayStats.accuracy}%`}
                        color="#6C63FF"
                        sub={`${todayStats.correct}/${todayStats.answered} correct`}
                    />
                    <QuickStatCard
                        icon="🏆" label="Mastered"
                        value={perfStats.mastered.toString()}
                        color="#00D9A3"
                        sub={`of ${totalQuestions} questions`}
                    />
                    <QuickStatCard
                        icon="❌" label="Wrong Remaining"
                        value={perfStats.wrongRemaining.toString()}
                        color="#FF6B6B"
                        sub="need more practice"
                    />
                    <QuickStatCard
                        icon="📅" label="Days Left"
                        value={daysLeft !== null && daysLeft > 0 ? daysLeft.toString() : '—'}
                        color="#FFB347"
                        sub={userProfile?.examName || 'No exam set'}
                    />
                </div>
            </div>

            {/* ═══ Focus Recommendations ═══ */}
            <div className="np-card-surface">
                <h3 style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 700,
                    fontSize: '1.05rem', marginBottom: 16,
                }}>
                    💡 Focus Recommendations
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {focusItems.map((item, i) => (
                        <div
                            key={i}
                            onClick={item.action}
                            className="np-dash-focus-item"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '14px 16px', borderRadius: 12,
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border)',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = `${item.color}08`;
                                e.currentTarget.style.borderColor = `${item.color}30`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                        >
                            <span style={{
                                fontSize: '1.3rem', width: 42, height: 42, borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `${item.color}15`, flexShrink: 0,
                            }}>{item.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{item.title}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.desc}</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ Middle Row: Recent Sessions + Subject Quick Access ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
                {/* Recent Sessions */}
                <div className="np-card-surface">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem' }}>
                            📊 Recent Sessions
                        </h3>
                        <button
                            className="np-btn np-btn-ghost np-btn-sm"
                            onClick={() => navigate('/analytics')}
                            style={{ fontSize: '0.75rem' }}
                        >
                            View all →
                        </button>
                    </div>
                    {recentSessions.length === 0 ? (
                        <div className="np-empty" style={{ padding: '40px 16px' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 10, opacity: 0.5 }}>📋</div>
                            <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                                No sessions yet. Start practicing!
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {recentSessions.map((s) => {
                                const scoreColor = s.score >= 70 ? '#00D9A3' : s.score >= 40 ? '#FFB347' : '#FF6B6B';
                                const endDate = s.endTime?.toDate ? s.endTime.toDate() : (s.endTime ? new Date(s.endTime) : null);
                                const timeAgo = endDate ? getTimeAgo(endDate) : '';

                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => navigate(`/test/results?session=${s.id}`)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 14px', borderRadius: 10,
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                            e.currentTarget.style.borderColor = 'var(--border-hover)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 38, height: 38, borderRadius: 10,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: `${scoreColor}12`, fontSize: '0.82rem', fontWeight: 800,
                                                color: scoreColor, fontFamily: 'var(--font-heading)',
                                            }}>
                                                {s.score}%
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                                                    {s.scope?.subjectNames?.join(', ') || 'All Subjects'}
                                                </div>
                                                <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                                                    {s.answered}/{s.totalQuestions} answered · {getModeLabel(s.type)}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>
                                            {timeAgo}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Subject Quick Access */}
                <div className="np-card-surface">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem' }}>
                            📚 Subjects
                        </h3>
                        <button
                            className="np-btn np-btn-ghost np-btn-sm"
                            onClick={() => navigate('/subjects')}
                            style={{ fontSize: '0.75rem' }}
                        >
                            Manage →
                        </button>
                    </div>
                    {subjects.length === 0 ? (
                        <div className="np-empty" style={{ padding: '40px 16px' }}>
                            <div style={{ fontSize: '2rem', marginBottom: 10, opacity: 0.5 }}>📝</div>
                            <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                                No subjects yet.
                            </p>
                            <button
                                className="np-btn np-btn-primary np-btn-sm"
                                onClick={() => navigate('/subjects')}
                                style={{ marginTop: 12 }}
                            >
                                Add Subject
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {subjects.map((s) => {
                                const masteredPct = s.questionCount ? Math.round((s.masteredCount || 0) / s.questionCount * 100) : 0;
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => navigate(`/subjects/${s.id}`)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 14px', borderRadius: 10,
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.color || 'var(--border-hover)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                                    >
                                        <span style={{
                                            fontSize: '1.2rem', width: 38, height: 38, borderRadius: 10,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: `${s.color || '#6C63FF'}15`,
                                        }}>{s.icon || '📚'}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '0.85rem', fontWeight: 600,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>{s.name}</div>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                                                {s.questionCount || 0} Q · {masteredPct}% mastered
                                            </div>
                                        </div>
                                        {/* Mini progress bar */}
                                        <div style={{
                                            width: 50, height: 4, borderRadius: 999,
                                            background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0,
                                        }}>
                                            <div style={{
                                                height: '100%', borderRadius: 999,
                                                width: `${masteredPct}%`,
                                                background: s.color || '#6C63FF',
                                                transition: 'width 0.3s ease',
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Motivational Quote ═══ */}
            <div style={{
                textAlign: 'center', padding: '24px 28px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(0,217,163,0.04))',
                border: '1px solid rgba(108,99,255,0.12)',
            }}>
                <p style={{
                    fontStyle: 'italic', color: 'var(--text-secondary)',
                    fontSize: '0.95rem', lineHeight: 1.6,
                }}>
                    "{quote.text}"
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 8 }}>
                    — {quote.author}
                </p>
            </div>
        </div>
    );
}

// ─── Sub-Components ───

function QuickStatCard({ icon, label, value, color, sub }) {
    return (
        <div className="np-card-surface" style={{
            padding: '18px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${color}12`, fontSize: '1.3rem', flexShrink: 0,
            }}>
                {icon}
            </div>
            <div>
                <div style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 800,
                    fontSize: '1.3rem', color, lineHeight: 1,
                }}>
                    {value}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{label}</div>
                {sub && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.7 }}>{sub}</div>
                )}
            </div>
        </div>
    );
}

// ─── Helpers ───

function getModeLabel(type) {
    const labels = {
        smart: 'Smart', wrong: 'Wrong Qs', due_today: 'Due Today',
        unseen: 'Unseen', flagged: 'Flagged', random: 'Quick Mix',
    };
    return labels[type] || type;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
