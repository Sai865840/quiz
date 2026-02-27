import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { MASTERY_LEVELS, MASTERY_COLORS, STALE_DAYS_THRESHOLD } from '../../constants';
import { isStaleQuestion, daysSinceLastAsked } from '../../utils/spacedRepetition';
import { fetchQuestionsForScope } from '../../utils/questionAlgorithms';

const TABS = [
    { key: 'active', label: 'Active', icon: '❌' },
    { key: 'graduated', label: 'Graduated', icon: '🎓' },
];

export default function WrongQuestions() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const dataStore = useDataStore();
    const { subjects, fetchSubjects, fetchPerformance, performanceMap } = dataStore;

    const [allQuestions, setAllQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active');
    const [expandedSubject, setExpandedSubject] = useState(null);

    // Load data
    useEffect(() => {
        if (!user?.uid) return;
        (async () => {
            setLoading(true);
            try {
                if (subjects.length === 0) await fetchSubjects(user.uid);
                await fetchPerformance(user.uid);
            } catch (err) {
                console.error('Failed to load wrong questions:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [user?.uid]);

    // Load all questions once subjects are ready
    useEffect(() => {
        if (!user?.uid || subjects.length === 0) return;
        (async () => {
            const scope = { subjectIds: ['all'] };
            const qs = await fetchQuestionsForScope(user.uid, scope, dataStore);
            setAllQuestions(qs);
        })();
    }, [user?.uid, subjects, dataStore.chapters, dataStore.questions]);

    // Build wrong questions grouped by subject
    const { subjectGroups, totalWrong, totalGraduated, overallStats } = useMemo(() => {
        const groups = {};
        let totalWrong = 0;
        let totalGraduated = 0;
        let totalCorrectSum = 0;
        let totalAskedSum = 0;

        allQuestions.forEach((q) => {
            const perf = performanceMap[q.id];
            if (!perf || perf.timesWrong === 0) return;

            const isGraduated = (perf.masteryLevel || 0) >= 4;
            if (isGraduated) totalGraduated++;
            else totalWrong++;

            totalCorrectSum += perf.timesCorrect || 0;
            totalAskedSum += perf.timesAsked || 0;

            const subId = q.subjectId;
            if (!groups[subId]) {
                groups[subId] = {
                    subjectId: subId,
                    subjectName: q.subjectName,
                    subjectColor: q.subjectColor,
                    subjectIcon: subjects.find(s => s.id === subId)?.icon || '📚',
                    questions: [],
                    chapters: {},
                };
            }

            groups[subId].questions.push({ ...q, perf, isGraduated });

            // Group by chapter
            const chId = q.chapterId;
            if (!groups[subId].chapters[chId]) {
                groups[subId].chapters[chId] = {
                    chapterId: chId,
                    chapterName: q.chapterName,
                    questions: [],
                };
            }
            groups[subId].chapters[chId].questions.push({ ...q, perf, isGraduated });
        });

        // Compute per-subject stats
        Object.values(groups).forEach((group) => {
            const activeQs = group.questions.filter(q => !q.isGraduated);
            const graduatedQs = group.questions.filter(q => q.isGraduated);
            const totalCorrect = group.questions.reduce((s, q) => s + (q.perf.timesCorrect || 0), 0);
            const totalAsked = group.questions.reduce((s, q) => s + (q.perf.timesAsked || 0), 0);

            group.stats = {
                activeCount: activeQs.length,
                graduatedCount: graduatedQs.length,
                totalCount: group.questions.length,
                accuracy: totalAsked > 0 ? Math.round((totalCorrect / totalAsked) * 100) : 0,
                staleCount: activeQs.filter(q => isStaleQuestion(q.perf.lastAsked)).length,
                masteryDistribution: [0, 1, 2, 3, 4].map(level =>
                    group.questions.filter(q => (q.perf.masteryLevel || 0) === level).length
                ),
            };
        });

        const overallStats = {
            accuracy: totalAskedSum > 0 ? Math.round((totalCorrectSum / totalAskedSum) * 100) : 0,
        };

        return {
            subjectGroups: Object.values(groups).sort((a, b) => b.stats.activeCount - a.stats.activeCount),
            totalWrong,
            totalGraduated,
            overallStats,
        };
    }, [allQuestions, performanceMap, subjects]);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="np-card-surface" style={{ padding: 60, textAlign: 'center' }}>
                    <div className="np-auth-spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto' }} />
                    <p style={{ color: 'var(--muted)', marginTop: 16 }}>Loading wrong questions...</p>
                </div>
            </div>
        );
    }

    const filteredGroups = subjectGroups.map((group) => ({
        ...group,
        filteredQuestions: group.questions.filter(q =>
            activeTab === 'graduated' ? q.isGraduated : !q.isGraduated
        ),
        filteredChapters: Object.values(group.chapters).map(ch => ({
            ...ch,
            filteredQuestions: ch.questions.filter(q =>
                activeTab === 'graduated' ? q.isGraduated : !q.isGraduated
            ),
        })).filter(ch => ch.filteredQuestions.length > 0),
    })).filter(g => g.filteredQuestions.length > 0);

    const totalShown = activeTab === 'active' ? totalWrong : totalGraduated;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div>
                <h2 className="np-section-title">Wrong Questions</h2>
                <p className="np-section-subtitle">Focus on your mistakes to improve faster</p>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <StatCard label="Active Wrong" value={totalWrong} color="#FF6B6B" icon="❌" />
                <StatCard label="Graduated" value={totalGraduated} color="#00D9A3" icon="🎓" />
                <StatCard label="Subjects" value={subjectGroups.length} color="#6C63FF" icon="📚" />
                <StatCard label="Accuracy" value={`${overallStats.accuracy}%`} color="#FFB347" icon="🎯" />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 12, padding: 4 }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none',
                            background: activeTab === tab.key ? 'var(--surface)' : 'transparent',
                            color: activeTab === tab.key ? 'var(--text)' : 'var(--muted)',
                            fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                        }}
                    >
                        {tab.icon} {tab.label} ({tab.key === 'active' ? totalWrong : totalGraduated})
                    </button>
                ))}
            </div>

            {/* Empty State */}
            {totalShown === 0 ? (
                <div className="np-card-surface">
                    <div className="np-empty">
                        <div className="np-empty-icon">{activeTab === 'active' ? '🎯' : '📭'}</div>
                        <div className="np-empty-title">
                            {activeTab === 'active' ? 'No wrong questions!' : 'No graduated questions yet'}
                        </div>
                        <div className="np-empty-desc">
                            {activeTab === 'active'
                                ? 'Great job! Complete practice sessions to track your mistakes here.'
                                : 'Questions graduate when they reach Mastery Level 4. Keep practicing!'}
                        </div>
                    </div>
                </div>
            ) : (
                /* Subject Groups */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filteredGroups.map((group) => (
                        <SubjectGroup
                            key={group.subjectId}
                            group={group}
                            activeTab={activeTab}
                            expanded={expandedSubject === group.subjectId}
                            onToggle={() => setExpandedSubject(
                                expandedSubject === group.subjectId ? null : group.subjectId
                            )}
                            onPractice={() => navigate(`/test?mode=wrong&subject=${group.subjectId}`)}
                            masteryColors={MASTERY_COLORS}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Sub-Components ───

function StatCard({ label, value, color, icon }) {
    return (
        <div className="np-card-surface" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{icon}</div>
            <div style={{
                fontSize: '1.5rem', fontWeight: 800, color,
                fontFamily: 'var(--font-heading)',
            }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{label}</div>
        </div>
    );
}

function SubjectGroup({ group, activeTab, expanded, onToggle, onPractice, masteryColors }) {
    const questions = group.filteredQuestions;

    return (
        <div className="np-card-surface" style={{ overflow: 'hidden' }}>
            {/* Subject Header */}
            <div
                onClick={onToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', cursor: 'pointer',
                    borderBottom: expanded ? '1px solid var(--border)' : 'none',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 12, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                        background: `${group.subjectColor}15`,
                    }}>
                        {group.subjectIcon}
                    </div>
                    <div>
                        <div style={{
                            fontFamily: 'var(--font-heading)', fontWeight: 700,
                            fontSize: '0.95rem', marginBottom: 4,
                        }}>
                            {group.subjectName}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--muted)' }}>
                            <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                            <span>Accuracy: <strong style={{ color: group.stats.accuracy >= 60 ? '#00D9A3' : '#FF6B6B' }}>{group.stats.accuracy}%</strong></span>
                            {group.stats.staleCount > 0 && activeTab === 'active' && (
                                <span style={{ color: '#FFB347' }}>⏰ {group.stats.staleCount} stale</span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {activeTab === 'active' && (
                        <button
                            className="np-btn np-btn-primary np-btn-sm"
                            onClick={(e) => { e.stopPropagation(); onPractice(); }}
                            style={{ fontSize: '0.75rem' }}
                        >
                            Practice ({questions.length})
                        </button>
                    )}
                    <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>

            {/* Mastery Progress Bar */}
            {expanded && (
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6 }}>Mastery Distribution</div>
                    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--surface-2)' }}>
                        {group.stats.masteryDistribution.map((count, level) => {
                            const pct = group.stats.totalCount > 0 ? (count / group.stats.totalCount) * 100 : 0;
                            if (pct === 0) return null;
                            return (
                                <div
                                    key={level}
                                    style={{
                                        width: `${pct}%`,
                                        background: masteryColors?.[level] || ['#64748B', '#FF6B6B', '#FFB347', '#6C63FF', '#00D9A3'][level],
                                        transition: 'width 0.3s ease',
                                    }}
                                    title={`Level ${level}: ${count}`}
                                />
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        {group.stats.masteryDistribution.map((count, level) => {
                            if (count === 0) return null;
                            const color = masteryColors?.[level] || ['#64748B', '#FF6B6B', '#FFB347', '#6C63FF', '#00D9A3'][level];
                            return (
                                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem' }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
                                    <span style={{ color: 'var(--muted)' }}>L{level}: {count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Chapter / Questions List */}
            {expanded && (
                <div style={{ padding: '0 0 8px' }}>
                    {group.filteredChapters.map((ch) => (
                        <div key={ch.chapterId}>
                            <div style={{
                                padding: '10px 20px', fontSize: '0.78rem', fontWeight: 600,
                                color: 'var(--text-secondary)', background: 'var(--surface-2)',
                                borderBottom: '1px solid var(--border)',
                            }}>
                                {ch.chapterName} ({ch.filteredQuestions.length})
                            </div>
                            {ch.filteredQuestions.map((q) => (
                                <QuestionRow key={q.id} question={q} masteryColors={masteryColors} />
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function QuestionRow({ question, masteryColors }) {
    const { perf, isGraduated } = question;
    const accuracy = perf.timesAsked > 0 ? Math.round((perf.timesCorrect / perf.timesAsked) * 100) : 0;
    const stale = isStaleQuestion(perf.lastAsked);
    const daysSince = daysSinceLastAsked(perf.lastAsked);
    const masteryLevel = perf.masteryLevel || 0;
    const masteryColor = masteryColors?.[masteryLevel] || ['#64748B', '#FF6B6B', '#FFB347', '#6C63FF', '#00D9A3'][masteryLevel];

    return (
        <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, opacity: isGraduated ? 0.7 : 1,
        }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    fontSize: '0.82rem', lineHeight: 1.4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {question.text}
                </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, fontSize: '0.72rem' }}>
                {stale && (
                    <span style={{
                        padding: '2px 6px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600,
                        background: 'rgba(255,179,71,0.12)', color: '#FFB347',
                    }}>
                        ⏰ {daysSince}d
                    </span>
                )}
                <span style={{ color: 'var(--muted)' }}>
                    W:<strong style={{ color: '#FF6B6B' }}>{perf.timesWrong}</strong>
                </span>
                <span style={{ color: 'var(--muted)' }}>
                    C:<strong style={{ color: '#00D9A3' }}>{perf.timesCorrect}</strong>
                </span>
                <span style={{ color: 'var(--muted)' }}>
                    {accuracy}%
                </span>
                <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600,
                    background: `${masteryColor}18`, color: masteryColor,
                }}>
                    {isGraduated ? '🎓' : ''} L{masteryLevel}
                </span>
            </div>
        </div>
    );
}
