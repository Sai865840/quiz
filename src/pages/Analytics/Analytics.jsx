import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import * as sessionService from '../../firebase/sessionService';

const DATE_RANGES = [
    { key: 'week', label: 'This Week', days: 7 },
    { key: 'month', label: 'This Month', days: 30 },
    { key: 'all', label: 'All Time', days: 9999 },
];

export default function Analytics() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { subjects, fetchSubjects, performanceMap, fetchPerformance } = useDataStore();

    const [sessions, setSessions] = useState([]);
    const [range, setRange] = useState('month');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            setLoading(true);
            try {
                if (subjects.length === 0) await fetchSubjects(user.uid);
                await fetchPerformance(user.uid);
                const s = await sessionService.getRecentSessions(user.uid, 500, 500);
                setSessions(s);
            } catch (err) {
                console.error('Analytics load error:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.uid]);

    // Filter sessions by range
    const rangeDays = DATE_RANGES.find((r) => r.key === range)?.days || 9999;
    const cutoff = new Date(Date.now() - rangeDays * 86400000);

    const filteredSessions = useMemo(() =>
        sessions.filter((s) => {
            const d = s.endTime?.toDate ? s.endTime.toDate() : (s.endTime ? new Date(s.endTime) : null);
            return d && d >= cutoff;
        }), [sessions, range]);

    // ─── Summary Stats ───
    const summary = useMemo(() => {
        const totalAsked = filteredSessions.reduce((s, ss) => s + (ss.answered || 0), 0);
        const totalCorrect = filteredSessions.reduce((s, ss) => s + (ss.correct || 0), 0);
        const accuracy = totalAsked > 0 ? Math.round((totalCorrect / totalAsked) * 100) : 0;

        // Study time from filtered sessions
        const totalMinutes = filteredSessions.reduce((s, ss) => s + (ss.durationSeconds || 0), 0) / 60;
        const studyTime = totalMinutes >= 60
            ? `${Math.floor(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`
            : `${Math.round(totalMinutes)}m`;

        // Streak
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let d = 0; d < 90; d++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - d);
            const checkStr = checkDate.toISOString().split('T')[0];
            const has = sessions.some((s) => {
                const ed = s.endTime?.toDate ? s.endTime.toDate() : (s.endTime ? new Date(s.endTime) : null);
                return ed && ed.toISOString().split('T')[0] === checkStr;
            });
            if (has) streak++;
            else if (d > 0) break;
        }

        return { totalAsked, accuracy, studyTime, streak, totalSessions: filteredSessions.length };
    }, [filteredSessions, sessions]);

    // ─── Activity Heatmap Data (12 weeks) ───
    const heatmapData = useMemo(() => {
        const weeks = 12;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        // Start from Sunday of (today - 11 weeks)
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - dayOfWeek - (weeks - 1) * 7);

        const cells = [];
        const sessionMap = {};
        sessions.forEach((s) => {
            const d = s.endTime?.toDate ? s.endTime.toDate() : (s.endTime ? new Date(s.endTime) : null);
            if (!d) return;
            const key = d.toISOString().split('T')[0];
            sessionMap[key] = (sessionMap[key] || 0) + (s.answered || 1);
        });

        for (let i = 0; i < weeks * 7; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            if (d > today) break;
            const key = d.toISOString().split('T')[0];
            cells.push({ date: key, count: sessionMap[key] || 0, day: d.getDay(), week: Math.floor(i / 7) });
        }
        return cells;
    }, [sessions]);

    // ─── Accuracy Trend (by session) ───
    const accuracyTrend = useMemo(() => {
        return filteredSessions
            .slice()
            .reverse()
            .map((s, i) => ({
                index: i,
                score: s.score || 0,
                label: `S${i + 1}`,
            }));
    }, [filteredSessions]);

    // ─── Per-Subject Accuracy ───
    const subjectStats = useMemo(() => {
        if (subjects.length === 0) return [];
        // Build a map of questionId → subjectId from performance + subject data
        // Since we don't have question→subject mapping in performanceMap,
        // we use session data which stores scope info
        const subMap = {};
        subjects.forEach((s) => {
            subMap[s.id] = { name: s.name, icon: s.icon || '📚', color: s.color || '#6C63FF', correct: 0, asked: 0 };
        });

        // Use session-level subject data
        filteredSessions.forEach((s) => {
            const subIds = s.scope?.subjectIds || [];
            subIds.forEach((id) => {
                if (subMap[id]) {
                    subMap[id].correct += s.correct || 0;
                    subMap[id].asked += s.answered || 0;
                }
            });
        });

        return Object.values(subMap)
            .filter((s) => s.asked > 0)
            .map((s) => ({ ...s, accuracy: Math.round((s.correct / s.asked) * 100) }))
            .sort((a, b) => b.accuracy - a.accuracy);
    }, [subjects, filteredSessions]);

    // ─── Mastery Distribution ───
    const masteryDist = useMemo(() => {
        const entries = Object.values(performanceMap || {});
        const dist = [0, 0, 0, 0, 0]; // levels 0-4
        entries.forEach((p) => { dist[p.masteryLevel || 0]++; });
        return dist;
    }, [performanceMap]);

    const masteryLabels = ['Unseen', 'Struggling', 'Learning', 'Proficient', 'Mastered'];
    const masteryColors = ['#64748B', '#FF6B6B', '#FFB347', '#6C63FF', '#00D9A3'];
    const totalMastery = masteryDist.reduce((s, v) => s + v, 0);

    // ─── Insights Engine ───
    const insights = useMemo(() => {
        const items = [];
        const entries = Object.values(performanceMap || {});

        // Accuracy insight
        if (summary.accuracy > 0) {
            if (summary.accuracy >= 80) {
                items.push({ icon: '🌟', text: `Great accuracy of ${summary.accuracy}%! You're performing well.`, color: '#00D9A3' });
            } else if (summary.accuracy < 50) {
                items.push({ icon: '⚠️', text: `Your overall accuracy is ${summary.accuracy}%. Consider reviewing fundamentals.`, color: '#FF6B6B' });
            }
        }

        // Streak insight
        if (summary.streak >= 7) {
            items.push({ icon: '🔥', text: `${summary.streak}-day streak! Consistency is key to mastery.`, color: '#FFB347' });
        } else if (summary.streak === 0 && sessions.length > 0) {
            items.push({ icon: '💡', text: 'Start a session today to build your streak!', color: '#6C63FF' });
        }

        // Mastery insight
        const masteredPct = totalMastery > 0 ? Math.round((masteryDist[4] / totalMastery) * 100) : 0;
        if (masteredPct > 0) {
            items.push({ icon: '🏆', text: `${masteredPct}% of tracked questions are mastered. ${masteredPct >= 50 ? 'Excellent!' : 'Keep going!'}`, color: '#00D9A3' });
        }

        // Struggling insight
        if (masteryDist[1] > 5) {
            items.push({ icon: '📖', text: `${masteryDist[1]} questions are in "Struggling" — focus on wrong questions mode.`, color: '#FF6B6B' });
        }

        // Subject insight
        const weakSubject = subjectStats.find((s) => s.accuracy < 50 && s.asked >= 5);
        if (weakSubject) {
            items.push({ icon: weakSubject.icon, text: `${weakSubject.name} accuracy is only ${weakSubject.accuracy}%. Practice this subject more.`, color: weakSubject.color });
        }

        if (items.length === 0) {
            items.push({ icon: '📊', text: 'Complete more sessions to unlock personalized insights!', color: '#6C63FF' });
        }

        return items.slice(0, 5);
    }, [summary, masteryDist, subjectStats, sessions, totalMastery]);

    const statCards = [
        { label: 'TOTAL QUESTIONS', value: summary.totalAsked.toString(), color: '#6C63FF' },
        { label: 'OVERALL ACCURACY', value: summary.accuracy > 0 ? `${summary.accuracy}%` : '—', color: '#00D9A3' },
        { label: 'STUDY TIME', value: summary.studyTime, color: '#FFB347' },
        { label: 'CURRENT STREAK', value: `${summary.streak} day${summary.streak !== 1 ? 's' : ''}`, color: '#FF6B6B' },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="np-card-surface" style={{ padding: 60, textAlign: 'center' }}>
                    <div className="np-auth-spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto' }} />
                    <p style={{ color: 'var(--muted)', marginTop: 16 }}>Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div>
                <h2 className="np-section-title">Analytics</h2>
                <p className="np-section-subtitle">Track your progress and find patterns</p>
            </div>

            {/* Date Range */}
            <div style={{ display: 'flex', gap: 8 }}>
                {DATE_RANGES.map((r) => (
                    <button
                        key={r.key}
                        onClick={() => setRange(r.key)}
                        className={`np-btn ${range === r.key ? 'np-btn-primary' : 'np-btn-ghost'} np-btn-sm`}
                        style={range !== r.key ? { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' } : {}}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {statCards.map((stat) => (
                    <div key={stat.label} className="np-card" style={{ borderLeft: `3px solid ${stat.color}` }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>
                            {stat.label}
                        </p>
                        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.75rem', color: stat.color }}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Row 1: Heatmap + Mastery Donut */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <ActivityHeatmap data={heatmapData} />
                <MasteryDonut dist={masteryDist} labels={masteryLabels} colors={masteryColors} total={totalMastery} />
            </div>

            {/* Row 2: Accuracy Trend + Subject Bars */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <AccuracyTrend data={accuracyTrend} />
                <SubjectBars data={subjectStats} />
            </div>

            {/* Insights */}
            <div className="np-card-surface">
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 16 }}>
                    💡 Insights
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {insights.map((item, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', borderRadius: 10,
                            background: `${item.color}08`,
                            border: `1px solid ${item.color}20`,
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Session History */}
            <div className="np-card-surface">
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 16 }}>
                    📋 Session History
                </h3>
                {filteredSessions.length === 0 ? (
                    <div className="np-empty" style={{ padding: '40px 16px' }}>
                        <div style={{ fontSize: '2rem', marginBottom: 10, opacity: 0.5 }}>📋</div>
                        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No sessions in this period.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredSessions.map((s) => {
                            const scoreColor = s.score >= 70 ? '#00D9A3' : s.score >= 40 ? '#FFB347' : '#FF6B6B';
                            const endDate = s.endTime?.toDate ? s.endTime.toDate() : (s.endTime ? new Date(s.endTime) : null);
                            return (
                                <div
                                    key={s.id}
                                    onClick={() => navigate(`/test/results?session=${s.id}`)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 14px', borderRadius: 10,
                                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
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
                                                {s.answered || 0}/{s.totalQuestions || 0} answered · {s.type || 'practice'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', flexShrink: 0 }}>
                                        {endDate ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════
// SUB-COMPONENTS (Pure CSS/SVG Charts)
// ═══════════════════════════════════════

function ActivityHeatmap({ data }) {
    if (data.length === 0) return null;
    const maxCount = Math.max(1, ...data.map((d) => d.count));
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    const weeks = [...new Set(data.map((d) => d.week))];

    return (
        <div className="np-card-surface">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 16 }}>
                🟩 Activity
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
                {/* Day labels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 0 }}>
                    {dayLabels.map((l, i) => (
                        <div key={i} style={{ height: 14, fontSize: '0.58rem', color: 'var(--muted)', lineHeight: '14px', width: 24, textAlign: 'right' }}>
                            {l}
                        </div>
                    ))}
                </div>
                {/* Grid */}
                <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                    {weeks.map((w) => (
                        <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                            {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                                const cell = data.find((d) => d.week === w && d.day === dayIdx);
                                if (!cell) return <div key={dayIdx} style={{ height: 14, borderRadius: 3 }} />;
                                const intensity = cell.count / maxCount;
                                const bg = cell.count === 0
                                    ? 'rgba(255,255,255,0.04)'
                                    : `rgba(0, 217, 163, ${0.15 + intensity * 0.85})`;
                                return (
                                    <div
                                        key={dayIdx}
                                        title={`${cell.date}: ${cell.count} questions`}
                                        style={{
                                            height: 14, borderRadius: 3, background: bg,
                                            cursor: 'default', transition: 'background 0.2s',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Less</span>
                {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                    <div key={i} style={{
                        width: 12, height: 12, borderRadius: 3,
                        background: v === 0 ? 'rgba(255,255,255,0.04)' : `rgba(0,217,163,${0.15 + v * 0.85})`,
                    }} />
                ))}
                <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>More</span>
            </div>
        </div>
    );
}

function MasteryDonut({ dist, labels, colors, total }) {
    const size = 140;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulativeOffset = 0;
    const segments = dist.map((count, i) => {
        const pct = total > 0 ? count / total : 0;
        const dashLength = pct * circumference;
        const offset = cumulativeOffset;
        cumulativeOffset += dashLength;
        return { color: colors[i], dashLength, gapLength: circumference - dashLength, offset, count, label: labels[i], pct };
    }).filter((s) => s.count > 0);

    return (
        <div className="np-card-surface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 16, alignSelf: 'flex-start' }}>
                🎯 Mastery
            </h3>
            {total === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No data yet</p>
            ) : (
                <>
                    <div style={{ position: 'relative', width: size, height: size }}>
                        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
                            {segments.map((seg, i) => (
                                <circle
                                    key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
                                    stroke={seg.color} strokeWidth={strokeWidth}
                                    strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                                    strokeDashoffset={-seg.offset}
                                    strokeLinecap="butt"
                                />
                            ))}
                        </svg>
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)', textAlign: 'center',
                        }}>
                            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.3rem', color: '#00D9A3' }}>
                                {total > 0 ? Math.round((dist[4] / total) * 100) : 0}%
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>mastered</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, justifyContent: 'center' }}>
                        {dist.map((count, i) => {
                            if (count === 0) return null;
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i], display: 'inline-block' }} />
                                    <span style={{ color: 'var(--muted)' }}>{labels[i]}: {count}</span>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

function AccuracyTrend({ data }) {
    const chartH = 140;
    const chartW = 400;
    const padX = 30;
    const padY = 20;

    return (
        <div className="np-card-surface">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 16 }}>
                📈 Accuracy Trend
            </h3>
            {data.length < 2 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem', textAlign: 'center', padding: '30px 0' }}>
                    Need at least 2 sessions to show trend
                </p>
            ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <svg viewBox={`0 0 ${chartW} ${chartH + padY}`} style={{ width: '100%', maxHeight: 200 }}>
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map((v) => {
                            const y = chartH - (v / 100) * chartH;
                            return (
                                <g key={v}>
                                    <line x1={padX} y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                                    <text x={padX - 4} y={y + 4} fill="var(--muted)" fontSize="8" textAnchor="end">{v}%</text>
                                </g>
                            );
                        })}
                        {/* Line */}
                        <polyline
                            points={data.map((d) => {
                                const x = padX + (d.index / (data.length - 1)) * (chartW - padX - 10);
                                const y = chartH - (d.score / 100) * chartH;
                                return `${x},${y}`;
                            }).join(' ')}
                            fill="none" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        />
                        {/* Area fill */}
                        <polygon
                            points={[
                                ...data.map((d) => {
                                    const x = padX + (d.index / (data.length - 1)) * (chartW - padX - 10);
                                    const y = chartH - (d.score / 100) * chartH;
                                    return `${x},${y}`;
                                }),
                                `${padX + ((data.length - 1) / (data.length - 1)) * (chartW - padX - 10)},${chartH}`,
                                `${padX},${chartH}`,
                            ].join(' ')}
                            fill="url(#trendGrad)" opacity="0.3"
                        />
                        <defs>
                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6C63FF" />
                                <stop offset="100%" stopColor="#6C63FF" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* Dots */}
                        {data.map((d) => {
                            const x = padX + (d.index / (data.length - 1)) * (chartW - padX - 10);
                            const y = chartH - (d.score / 100) * chartH;
                            return (
                                <g key={d.index}>
                                    <circle cx={x} cy={y} r="4" fill="#6C63FF" />
                                    <circle cx={x} cy={y} r="2" fill="#fff" />
                                </g>
                            );
                        })}
                    </svg>
                </div>
            )}
        </div>
    );
}

function SubjectBars({ data }) {
    const maxAcc = 100;

    return (
        <div className="np-card-surface">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', marginBottom: 16 }}>
                📚 Subject Accuracy
            </h3>
            {data.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem', textAlign: 'center', padding: '30px 0' }}>
                    No subject data yet
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {data.map((s) => (
                        <div key={s.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                    {s.icon} {s.name}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: s.accuracy >= 60 ? '#00D9A3' : '#FF6B6B' }}>
                                    {s.accuracy}%
                                </span>
                            </div>
                            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 4,
                                    width: `${(s.accuracy / maxAcc) * 100}%`,
                                    background: `linear-gradient(90deg, ${s.color}, ${s.color}AA)`,
                                    transition: 'width 0.5s ease',
                                }} />
                            </div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: 3 }}>
                                {s.correct}/{s.asked} correct
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
