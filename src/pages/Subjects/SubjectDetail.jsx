import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { Modal } from '../../components/ui';
import { parseCSV, getSampleCSV } from '../../utils/csvParser';

export default function SubjectDetail() {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const {
        subjects, fetchSubjects,
        chapters, chaptersLoading, fetchChapters, addChapter, deleteChapter,
        questions, questionsLoading, fetchQuestions, addQuestions, deleteQuestion,
    } = useDataStore();

    const [expandedChapter, setExpandedChapter] = useState(null);
    const [showChapterModal, setShowChapterModal] = useState(false);
    const [chapterName, setChapterName] = useState('');
    const [savingChapter, setSavingChapter] = useState(false);
    const [deleteChapterConfirm, setDeleteChapterConfirm] = useState(null);
    const [deleteQuestionConfirm, setDeleteQuestionConfirm] = useState(null);

    // Question form
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [questionChapterId, setQuestionChapterId] = useState(null);
    const [qText, setQText] = useState('');
    const [qOptA, setQOptA] = useState('');
    const [qOptB, setQOptB] = useState('');
    const [qOptC, setQOptC] = useState('');
    const [qOptD, setQOptD] = useState('');
    const [qCorrect, setQCorrect] = useState('A');
    const [qExplanation, setQExplanation] = useState('');
    const [qImportant, setQImportant] = useState(false);
    const [savingQuestion, setSavingQuestion] = useState(false);

    // CSV import
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [csvChapterId, setCsvChapterId] = useState(null);
    const [csvText, setCsvText] = useState('');
    const [csvResult, setCsvResult] = useState(null);
    const [importingCSV, setImportingCSV] = useState(false);
    const fileInputRef = useRef(null);

    const subject = subjects.find((s) => s.id === subjectId);
    const subjectChapters = chapters[subjectId] || [];

    useEffect(() => {
        if (user?.uid && subjectId) {
            if (subjects.length === 0) fetchSubjects(user.uid);
            fetchChapters(user.uid, subjectId);
        }
    }, [user?.uid, subjectId]);

    const handleExpandChapter = (chapterId) => {
        if (expandedChapter === chapterId) {
            setExpandedChapter(null);
            return;
        }
        setExpandedChapter(chapterId);
        if (user?.uid && !questions[chapterId]) {
            fetchQuestions(user.uid, subjectId, chapterId);
        }
    };

    // ─── Chapter CRUD ───

    const handleAddChapter = async () => {
        if (!chapterName.trim() || !user?.uid) return;
        setSavingChapter(true);
        try {
            await addChapter(user.uid, subjectId, { name: chapterName.trim() });
            setShowChapterModal(false);
            setChapterName('');
        } catch (err) {
            console.error('Failed to add chapter:', err);
        } finally {
            setSavingChapter(false);
        }
    };

    const handleDeleteChapter = async (chapterId) => {
        if (!user?.uid) return;
        try {
            await deleteChapter(user.uid, subjectId, chapterId);
            setDeleteChapterConfirm(null);
            if (expandedChapter === chapterId) setExpandedChapter(null);
        } catch (err) {
            console.error('Failed to delete chapter:', err);
        }
    };

    // ─── Manual Question Add ───

    const openQuestionModal = (chapterId) => {
        setQuestionChapterId(chapterId);
        setQText(''); setQOptA(''); setQOptB(''); setQOptC(''); setQOptD('');
        setQCorrect('A'); setQExplanation(''); setQImportant(false);
        setShowQuestionModal(true);
    };

    const handleAddQuestion = async () => {
        if (!qText.trim() || !qOptA.trim() || !qOptB.trim() || !qOptC.trim() || !qOptD.trim()) return;
        if (!user?.uid || !questionChapterId) return;
        setSavingQuestion(true);
        try {
            await addQuestions(user.uid, subjectId, questionChapterId, [{
                text: qText.trim(),
                options: [
                    { label: 'A', text: qOptA.trim() },
                    { label: 'B', text: qOptB.trim() },
                    { label: 'C', text: qOptC.trim() },
                    { label: 'D', text: qOptD.trim() },
                ],
                correctOption: qCorrect,
                explanation: qExplanation.trim(),
                important: qImportant,
            }]);
            setShowQuestionModal(false);
        } catch (err) {
            console.error('Failed to add question:', err);
        } finally {
            setSavingQuestion(false);
        }
    };

    // ─── CSV Import ───

    const openCSVModal = (chapterId) => {
        setCsvChapterId(chapterId);
        setCsvText('');
        setCsvResult(null);
        setShowCSVModal(true);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result;
            setCsvText(text);
            setCsvResult(parseCSV(text));
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleParseCSV = () => {
        if (!csvText.trim()) return;
        setCsvResult(parseCSV(csvText));
    };

    const handleImportCSV = async () => {
        if (!csvResult?.valid?.length || !user?.uid || !csvChapterId) return;
        setImportingCSV(true);
        try {
            await addQuestions(user.uid, subjectId, csvChapterId, csvResult.valid);
            setShowCSVModal(false);
        } catch (err) {
            console.error('Failed to import CSV:', err);
        } finally {
            setImportingCSV(false);
        }
    };

    const loadSampleCSV = () => {
        const sample = getSampleCSV();
        setCsvText(sample);
        setCsvResult(parseCSV(sample));
    };

    if (!subject && !chaptersLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="np-card-surface">
                    <div className="np-empty">
                        <div className="np-empty-icon">🔍</div>
                        <div className="np-empty-title">Subject not found</div>
                        <div className="np-empty-desc">This subject may have been deleted.</div>
                        <button className="np-btn np-btn-primary np-btn-md" onClick={() => navigate('/subjects')}>
                            Back to Subjects
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button className="np-icon-btn" onClick={() => navigate('/subjects')} title="Back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                {subject && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                        <div className="np-subject-icon" style={{ background: `${subject.color || '#6C63FF'}18` }}>
                            {subject.icon || '📚'}
                        </div>
                        <div>
                            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem' }}>
                                {subject.name}
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                                {subjectChapters.length} chapter{subjectChapters.length !== 1 ? 's' : ''} · {subject.questionCount || 0} questions
                            </p>
                        </div>
                    </div>
                )}
                <button className="np-btn np-btn-primary np-btn-md" onClick={() => { setChapterName(''); setShowChapterModal(true); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Chapter
                </button>
            </div>

            {/* Chapters */}
            {chaptersLoading ? (
                <div className="np-card-surface" style={{ padding: 60, textAlign: 'center' }}>
                    <div className="np-auth-spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto' }} />
                    <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: '0.9rem' }}>Loading chapters...</p>
                </div>
            ) : subjectChapters.length === 0 ? (
                <div className="np-card-surface">
                    <div className="np-empty">
                        <div className="np-empty-icon">📂</div>
                        <div className="np-empty-title">No chapters yet</div>
                        <div className="np-empty-desc">
                            Create chapters to organize questions within this subject.
                        </div>
                        <button className="np-btn np-btn-primary np-btn-md" onClick={() => { setChapterName(''); setShowChapterModal(true); }}>
                            Create First Chapter
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {subjectChapters.map((chapter) => {
                        const isExpanded = expandedChapter === chapter.id;
                        const chapterQuestions = questions[chapter.id] || [];
                        const isLoadingQ = questionsLoading && isExpanded && !questions[chapter.id];

                        return (
                            <div key={chapter.id} className="np-chapter-card">
                                {/* Chapter header */}
                                <div
                                    className="np-chapter-header"
                                    onClick={() => handleExpandChapter(chapter.id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                        <svg
                                            width="16" height="16" viewBox="0 0 24 24" fill="none"
                                            stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                            style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none', flexShrink: 0 }}
                                        >
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{chapter.name}</span>
                                        <span className="np-badge" style={{
                                            background: `${subject?.color || '#6C63FF'}18`,
                                            color: subject?.color || '#6C63FF',
                                        }}>
                                            {chapter.questionCount || chapterQuestions.length || 0} Q
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                                        <button className="np-icon-btn" title="Add Question" onClick={() => openQuestionModal(chapter.id)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                            </svg>
                                        </button>
                                        <button className="np-icon-btn" title="Import CSV" onClick={() => openCSVModal(chapter.id)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                        </button>
                                        <button
                                            className="np-icon-btn np-icon-btn-danger"
                                            title="Delete Chapter"
                                            onClick={() => setDeleteChapterConfirm(chapter.id)}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Delete confirmation */}
                                {deleteChapterConfirm === chapter.id && (
                                    <div className="np-delete-confirm" style={{ margin: '0 16px 12px' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--error)' }}>Delete this chapter and all its questions?</span>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="np-btn np-btn-danger np-btn-sm" onClick={() => handleDeleteChapter(chapter.id)}>Delete</button>
                                            <button className="np-btn np-btn-outline np-btn-sm" onClick={() => setDeleteChapterConfirm(null)}>Cancel</button>
                                        </div>
                                    </div>
                                )}

                                {/* Expanded questions */}
                                {isExpanded && (
                                    <div className="np-chapter-questions">
                                        {isLoadingQ ? (
                                            <div style={{ padding: 24, textAlign: 'center' }}>
                                                <div className="np-auth-spinner" style={{ width: 24, height: 24, borderWidth: 2, margin: '0 auto' }} />
                                            </div>
                                        ) : chapterQuestions.length === 0 ? (
                                            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                                                No questions in this chapter yet.
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                                                    <button className="np-btn np-btn-outline np-btn-sm" onClick={() => openQuestionModal(chapter.id)}>
                                                        Add Manually
                                                    </button>
                                                    <button className="np-btn np-btn-outline np-btn-sm" onClick={() => openCSVModal(chapter.id)}>
                                                        📤 Import CSV
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
                                                {chapterQuestions.map((q, idx) => (
                                                    <div key={q.id} className="np-question-item">
                                                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                                            <span className="np-q-num">{idx + 1}</span>
                                                            <div style={{ flex: 1 }}>
                                                                <p style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: 8, lineHeight: 1.5 }}>{q.text}</p>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                                                    {q.options?.map((opt) => (
                                                                        <div
                                                                            key={opt.label}
                                                                            className={`np-q-option ${opt.label === q.correctOption ? 'np-q-option-correct' : ''}`}
                                                                        >
                                                                            <span className="np-q-option-label">{opt.label}</span>
                                                                            <span>{opt.text}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {q.explanation && (
                                                                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>
                                                                        💡 {q.explanation}
                                                                    </p>
                                                                )}
                                                                {deleteQuestionConfirm === q.id && (
                                                                    <div className="np-delete-confirm" style={{ marginTop: 8, paddingTop: 8 }}>
                                                                        <span style={{ fontSize: '0.78rem', color: 'var(--error)' }}>Delete this question?</span>
                                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                                            <button className="np-btn np-btn-danger np-btn-sm" onClick={() => { deleteQuestion(user.uid, subjectId, chapter.id, q.id); setDeleteQuestionConfirm(null); }}>Delete</button>
                                                                            <button className="np-btn np-btn-outline np-btn-sm" onClick={() => setDeleteQuestionConfirm(null)}>Cancel</button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                                {q.important && (
                                                                    <span className="np-badge" style={{
                                                                        background: 'rgba(255,179,71,0.12)',
                                                                        color: '#FFB347',
                                                                        fontSize: '0.7rem',
                                                                    }}>
                                                                        ⭐ Important
                                                                    </span>
                                                                )}
                                                                <button className="np-icon-btn np-icon-btn-danger" title="Delete Question" onClick={() => setDeleteQuestionConfirm(q.id)}>
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Add Chapter Modal ─── */}
            <Modal isOpen={showChapterModal} onClose={() => setShowChapterModal(false)} title="New Chapter">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Chapter Name</label>
                        <input type="text" placeholder="e.g. Newton's Laws, Trigonometry..." value={chapterName} onChange={(e) => setChapterName(e.target.value)} autoFocus />
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button className="np-btn np-btn-outline np-btn-md" onClick={() => setShowChapterModal(false)}>Cancel</button>
                        <button className="np-btn np-btn-primary np-btn-md" onClick={handleAddChapter} disabled={savingChapter || !chapterName.trim()}>
                            {savingChapter ? 'Creating...' : 'Create Chapter'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ─── Add Question Modal ─── */}
            <Modal isOpen={showQuestionModal} onClose={() => setShowQuestionModal(false)} title="Add Question" size="lg">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>Question</label>
                        <textarea
                            rows={3} placeholder="Enter question text..."
                            value={qText} onChange={(e) => setQText(e.target.value)}
                            style={{ resize: 'vertical', minHeight: 80 }}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                            { label: 'A', value: qOptA, set: setQOptA },
                            { label: 'B', value: qOptB, set: setQOptB },
                            { label: 'C', value: qOptC, set: setQOptC },
                            { label: 'D', value: qOptD, set: setQOptD },
                        ].map((opt) => (
                            <div key={opt.label}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>
                                    <span style={{
                                        width: 20, height: 20, borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: qCorrect === opt.label ? 'rgba(0,217,163,0.2)' : 'rgba(255,255,255,0.06)',
                                        color: qCorrect === opt.label ? '#00D9A3' : 'var(--muted)',
                                    }}>{opt.label}</span>
                                    Option {opt.label}
                                </label>
                                <input type="text" placeholder={`Option ${opt.label}`} value={opt.value} onChange={(e) => opt.set(e.target.value)} />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>Correct Answer</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['A', 'B', 'C', 'D'].map((opt) => (
                                    <button
                                        key={opt}
                                        className={`np-btn np-btn-sm ${qCorrect === opt ? 'np-btn-secondary' : 'np-btn-outline'}`}
                                        onClick={() => setQCorrect(opt)}
                                        style={{ minWidth: 42 }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>Mark as Important</label>
                            <button
                                className={`np-btn np-btn-sm ${qImportant ? 'np-btn-primary' : 'np-btn-outline'}`}
                                onClick={() => setQImportant(!qImportant)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                {qImportant ? '⭐ Important' : '☆ Not Important'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6, fontWeight: 500 }}>Explanation (optional)</label>
                        <textarea rows={2} placeholder="Why is this the correct answer?" value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} style={{ resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button className="np-btn np-btn-outline np-btn-md" onClick={() => setShowQuestionModal(false)}>Cancel</button>
                        <button className="np-btn np-btn-primary np-btn-md" onClick={handleAddQuestion} disabled={savingQuestion || !qText.trim() || !qOptA.trim() || !qOptB.trim() || !qOptC.trim() || !qOptD.trim()}>
                            {savingQuestion ? 'Adding...' : 'Add Question'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ─── CSV Import Modal ─── */}
            <Modal isOpen={showCSVModal} onClose={() => setShowCSVModal(false)} title="Import Questions from CSV" size="lg">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Upload a CSV file or paste CSV content below. Required columns:
                        <code style={{ display: 'block', marginTop: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', fontSize: '0.78rem', color: 'var(--primary)' }}>
                            question, optionA, optionB, optionC, optionD, correctOption, explanation, important
                        </code>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="np-btn np-btn-outline np-btn-sm" onClick={() => fileInputRef.current?.click()}>
                            📁 Choose File
                        </button>
                        <button className="np-btn np-btn-outline np-btn-sm" onClick={loadSampleCSV}>
                            📋 Load Sample
                        </button>
                        <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </div>

                    <textarea
                        rows={8}
                        placeholder="Paste CSV content here..."
                        value={csvText}
                        onChange={(e) => { setCsvText(e.target.value); setCsvResult(null); }}
                        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />

                    {!csvResult && csvText.trim() && (
                        <button className="np-btn np-btn-outline np-btn-md" onClick={handleParseCSV}>
                            🔍 Preview Import
                        </button>
                    )}

                    {csvResult && (
                        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: 16, marginBottom: csvResult.errors.length ? 12 : 0 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#00D9A3' }}>
                                    ✓ {csvResult.valid.length} valid question{csvResult.valid.length !== 1 ? 's' : ''}
                                </span>
                                {csvResult.errors.length > 0 && (
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--error)' }}>
                                        ✗ {csvResult.errors.length} error{csvResult.errors.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            {csvResult.errors.length > 0 && (
                                <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: '0.78rem', color: 'var(--error)', lineHeight: 1.6 }}>
                                    {csvResult.errors.map((err, i) => (
                                        <div key={i}>• {err}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button className="np-btn np-btn-outline np-btn-md" onClick={() => setShowCSVModal(false)}>Cancel</button>
                        <button
                            className="np-btn np-btn-primary np-btn-md"
                            onClick={handleImportCSV}
                            disabled={importingCSV || !csvResult?.valid?.length}
                        >
                            {importingCSV ? 'Importing...' : `Import ${csvResult?.valid?.length || 0} Questions`}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
