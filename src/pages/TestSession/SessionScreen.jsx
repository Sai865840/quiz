import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import { useAuthStore } from '../../store/authStore';
import * as sessionService from '../../firebase/sessionService';

export default function SessionScreen() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const session = useSessionStore();
    const timerRef = useRef(null);
    const [ending, setEnding] = useState(false);
    const [showPause, setShowPause] = useState(false);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [visitedQuestions, setVisitedQuestions] = useState(new Set());
    const [autoNext, setAutoNext] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const currentQ = session.questions[session.currentIndex];
    const isLastQuestion = session.currentIndex >= session.questions.length - 1;

    // Redirect if no session
    useEffect(() => {
        if (!session.sessionId || session.questions.length === 0) {
            navigate('/test');
        }
    }, [session.sessionId]);

    // Mark current question as visited
    useEffect(() => {
        if (currentQ) {
            setVisitedQuestions((prev) => new Set(prev).add(currentQ.id));
            const existing = session.answers[currentQ.id];
            setSelectedOption(existing?.userAnswer || null);
        }
    }, [session.currentIndex, currentQ?.id]);

    // Timer
    useEffect(() => {
        if (session.paused || session.status !== 'in_progress') return;
        timerRef.current = setInterval(() => {
            if (session.config?.timerType !== 'none') {
                session.tickTimer();
            }
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [session.paused, session.status]);

    if (!currentQ) return null;

    const optionOrder = session.questionOrder[currentQ.id] || ['A', 'B', 'C', 'D'];
    const orderedOptions = optionOrder.map((label) => currentQ.options.find((o) => o.label === label)).filter(Boolean);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Question palette status: current > marked > answered > not-answered (visited) > not-visited
    const getQuestionStatus = (idx) => {
        const q = session.questions[idx];
        const ans = session.answers[q.id];
        const hasAnswer = ans?.userAnswer != null;
        const isMarked = markedForReview.has(q.id);
        const isVisited = visitedQuestions.has(q.id);
        if (idx === session.currentIndex) return 'current';
        if (isMarked && hasAnswer) return 'marked-answered';
        if (isMarked) return 'marked';
        if (hasAnswer) return 'answered';
        if (isVisited) return 'not-answered';
        return 'not-visited';
    };

    const answeredCount = session.questions.filter((q) => session.answers[q.id]?.userAnswer != null).length;
    const markedCount = markedForReview.size;
    const notAnsweredCount = session.questions.filter((q) => visitedQuestions.has(q.id) && (!session.answers[q.id] || session.answers[q.id].userAnswer == null)).length;
    const isFlagged = session.answers[currentQ.id]?.flagged || false;

    // Handle selecting an option
    const handleSelectOption = (label) => {
        setSelectedOption(label);
        // Save the selection immediately so going back/forth retains it
        session.answerQuestion(currentQ.id, label, currentQ.correctOption);

        if (autoNext) {
            // Auto next
            if (!isLastQuestion) {
                setTimeout(() => session.nextQuestion(), 150);
            }
        }
    };

    const handleSaveAndNext = () => {
        if (selectedOption && currentQ) {
            session.answerQuestion(currentQ.id, selectedOption, currentQ.correctOption);
        }
        if (!isLastQuestion) {
            session.nextQuestion();
        }
    };

    const handleMarkAndNext = () => {
        setMarkedForReview((prev) => new Set(prev).add(currentQ.id));
        if (selectedOption && currentQ) {
            session.answerQuestion(currentQ.id, selectedOption, currentQ.correctOption);
        }
        if (!isLastQuestion) {
            session.nextQuestion();
        }
    };

    const handleClearResponse = () => {
        setSelectedOption(null);
    };

    const handleGoToQuestion = (idx) => {
        if (selectedOption && currentQ && !session.answers[currentQ.id]?.userAnswer) {
            session.answerQuestion(currentQ.id, selectedOption, currentQ.correctOption);
        }
        session.goToQuestion(idx);
    };

    const handleToggleFlag = () => {
        session.flagQuestion(currentQ.id);
    };

    const handleFinish = async () => {
        setEnding(true);
        if (selectedOption && currentQ && !session.answers[currentQ.id]?.userAnswer) {
            session.answerQuestion(currentQ.id, selectedOption, currentQ.correctOption);
        }
        session.questions.forEach((q) => {
            if (!session.answers[q.id] || session.answers[q.id].userAnswer == null) {
                session.skipQuestion(q.id);
            }
        });
        try {
            const result = await session.endSession();
            if (user?.uid && result) {
                await sessionService.batchUpdatePerformance(user.uid, result.questionResults);
                await sessionService.updateUserAggregateStats(user.uid, result);
            }
            navigate(`/test/results?session=${result.sessionId}`);
        } catch (err) {
            console.error('Failed to end session:', err);
            setEnding(false);
        }
    };

    const handleQuit = async () => {
        if (session.sessionId) {
            await sessionService.abandonSession(session.sessionId);
        }
        session.resetSession();
        navigate('/practice');
    };

    const timerDisplay = session.config?.timerType !== 'none'
        ? formatTime(session.timeRemaining)
        : formatTime(elapsedSeconds);

    const timerLabel = session.config?.timerType === 'per_question'
        ? 'Per Question' : session.config?.timerType === 'full_session' ? 'Time Left' : 'Elapsed';

    return (
        <div className="np-exam-layout">
            {/* ═══ Left: Question Panel ═══ */}
            <div className="np-exam-main">
                {/* Top Bar */}
                <div className="np-exam-topbar">
                    <div className="np-exam-topbar-left">
                        <span className="np-exam-qnum">Q{session.currentIndex + 1}</span>
                        <span className="np-exam-qcount">of {session.totalQuestions}</span>
                        {currentQ.important && (
                            <span className="np-exam-important-badge">★ Important</span>
                        )}
                        <span className="np-exam-mobile-timer">⏱ {timerDisplay}</span>
                    </div>
                    <div className="np-exam-topbar-right">
                        <label className="np-exam-autonext">
                            <input
                                type="checkbox"
                                checked={autoNext}
                                onChange={(e) => setAutoNext(e.target.checked)}
                            />
                            <span>Auto Next</span>
                        </label>
                        <button
                            className={`np-exam-action-btn ${isFlagged ? 'np-exam-action-btn-active' : ''}`}
                            onClick={handleToggleFlag}
                            title="Flag this question"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFlagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
                            </svg>
                        </button>
                        <button
                            className="np-exam-action-btn"
                            onClick={() => { session.pauseSession(); setShowPause(true); }}
                            title="Pause"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Question Body */}
                <div className="np-exam-body">
                    <div className="np-exam-breadcrumb">
                        {currentQ.subjectName}{currentQ.chapterName ? ` › ${currentQ.chapterName}` : ''}
                    </div>

                    <div className="np-exam-question-text">{currentQ.text}</div>

                    <div className="np-exam-options">
                        {orderedOptions.map((opt) => {
                            const isSelected = selectedOption === opt.label;
                            return (
                                <div
                                    key={opt.label}
                                    className={`np-exam-option ${isSelected ? 'np-exam-option-selected' : ''}`}
                                    onClick={() => handleSelectOption(opt.label)}
                                >
                                    <div className={`np-exam-option-letter ${isSelected ? 'np-exam-option-letter-active' : ''}`}>
                                        {opt.label}
                                    </div>
                                    <div className="np-exam-option-text">{opt.text}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Controls */}
                <div className="np-exam-bottom">
                    <div className="np-exam-bottom-left">
                        <button className="np-exam-btn np-exam-btn-mark" onClick={handleMarkAndNext}>
                            ★ Mark for Review & Next
                        </button>
                        <button className="np-exam-btn np-exam-btn-clear" onClick={handleClearResponse}>
                            Clear Response
                        </button>
                    </div>
                    <button className="np-exam-btn np-exam-btn-save" onClick={handleSaveAndNext}>
                        {isLastQuestion ? 'Save' : 'Save & Next →'}
                    </button>
                    <button className="np-exam-mobile-submit" onClick={() => setShowSubmitConfirm(true)}>
                        Submit
                    </button>
                </div>
            </div>

            {/* ═══ Right: Sidebar ═══ */}
            <div className="np-exam-sidebar">
                {/* Timer */}
                <div className="np-exam-timer">
                    <div className="np-exam-timer-label">{timerLabel}</div>
                    <div className="np-exam-timer-value">{timerDisplay}</div>
                </div>

                {/* Palette Header */}
                <div className="np-exam-palette-header">
                    <div className="np-exam-palette-title">Question Palette</div>
                </div>

                {/* Legend */}
                <div className="np-exam-legend">
                    <div className="np-exam-legend-row">
                        <span className="np-exam-legend-dot np-dot-answered" /><span>Answered ({answeredCount})</span>
                    </div>
                    <div className="np-exam-legend-row">
                        <span className="np-exam-legend-dot np-dot-not-answered" /><span>Not Answered ({notAnsweredCount})</span>
                    </div>
                    <div className="np-exam-legend-row">
                        <span className="np-exam-legend-dot np-dot-marked" /><span>Marked ({markedCount})</span>
                    </div>
                    <div className="np-exam-legend-row">
                        <span className="np-exam-legend-dot np-dot-not-visited" /><span>Not Visited</span>
                    </div>
                </div>

                {/* Question Grid */}
                <div className="np-exam-palette-grid">
                    {session.questions.map((q, idx) => {
                        const status = getQuestionStatus(idx);
                        return (
                            <button
                                key={q.id}
                                className={`np-exam-palette-btn np-pq-${status}`}
                                onClick={() => handleGoToQuestion(idx)}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>

                {/* Submit */}
                <div className="np-exam-sidebar-footer">
                    <button className="np-exam-submit" onClick={() => setShowSubmitConfirm(true)}>
                        Submit Test
                    </button>
                </div>
            </div>

            {/* ═══ Pause Overlay ═══ */}
            {showPause && (
                <div className="np-exam-overlay">
                    <div className="np-exam-modal">
                        <div className="np-exam-modal-icon">⏸</div>
                        <h3 className="np-exam-modal-title">Session Paused</h3>
                        <div className="np-exam-modal-stats">
                            <div className="np-exam-modal-stat">
                                <span className="np-exam-modal-stat-num" style={{ color: '#10B981' }}>{answeredCount}</span>
                                <span className="np-exam-modal-stat-label">Answered</span>
                            </div>
                            <div className="np-exam-modal-stat">
                                <span className="np-exam-modal-stat-num" style={{ color: '#8B5CF6' }}>{markedCount}</span>
                                <span className="np-exam-modal-stat-label">Marked</span>
                            </div>
                            <div className="np-exam-modal-stat">
                                <span className="np-exam-modal-stat-num" style={{ color: '#94A3B8' }}>{session.totalQuestions - answeredCount}</span>
                                <span className="np-exam-modal-stat-label">Remaining</span>
                            </div>
                        </div>
                        <div className="np-exam-modal-actions">
                            <button className="np-exam-btn np-exam-btn-save" style={{ flex: 1 }} onClick={() => { session.resumeSession(); setShowPause(false); }}>
                                ▶ Resume
                            </button>
                            <button className="np-exam-btn np-exam-btn-clear" onClick={handleQuit}>Quit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Submit Confirm ═══ */}
            {showSubmitConfirm && (
                <div className="np-exam-overlay">
                    <div className="np-exam-modal">
                        <div className="np-exam-modal-icon">📝</div>
                        <h3 className="np-exam-modal-title">Submit Test?</h3>
                        <div className="np-exam-modal-summary">
                            <div className="np-exam-modal-summary-row">
                                <span>Answered</span>
                                <strong style={{ color: '#10B981' }}>{answeredCount}</strong>
                            </div>
                            <div className="np-exam-modal-summary-row">
                                <span>Unanswered</span>
                                <strong style={{ color: '#EF4444' }}>{session.totalQuestions - answeredCount}</strong>
                            </div>
                            <div className="np-exam-modal-summary-row">
                                <span>Marked for Review</span>
                                <strong style={{ color: '#8B5CF6' }}>{markedCount}</strong>
                            </div>
                            <div className="np-exam-modal-summary-row np-exam-modal-summary-row-total">
                                <span>Total</span>
                                <strong>{session.totalQuestions}</strong>
                            </div>
                        </div>
                        {(session.totalQuestions - answeredCount) > 0 && (
                            <p className="np-exam-modal-warning">
                                ⚠ You have {session.totalQuestions - answeredCount} unanswered question{session.totalQuestions - answeredCount > 1 ? 's' : ''}.
                            </p>
                        )}
                        <div className="np-exam-modal-actions">
                            <button className="np-exam-btn np-exam-btn-clear" style={{ flex: 1 }} onClick={() => setShowSubmitConfirm(false)}>
                                Go Back
                            </button>
                            <button className="np-exam-btn np-exam-btn-save" style={{ flex: 1 }} onClick={handleFinish} disabled={ending}>
                                {ending ? 'Submitting...' : 'Confirm Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
