import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDataStore } from '../../store/dataStore';
import { Modal } from '../../components/ui';

const SUBJECT_COLORS = [
    '#6C63FF', '#00D9A3', '#FF6B6B', '#FFB347', '#00D4FF',
    '#FF006E', '#8B5CF6', '#FF6B35', '#7CFC00', '#FFD700',
];

const SUBJECT_ICONS = ['📚', '🔬', '🧮', '📐', '🌍', '💻', '🎨', '📖', '🧪', '🎵', '⚡', '🏛️'];

export default function Subjects() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { subjects, subjectsLoading, fetchSubjects, addSubject, updateSubject, deleteSubject } = useDataStore();

    const [showModal, setShowModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [subjectName, setSubjectName] = useState('');
    const [subjectColor, setSubjectColor] = useState(SUBJECT_COLORS[0]);
    const [subjectIcon, setSubjectIcon] = useState(SUBJECT_ICONS[0]);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        if (user?.uid) {
            fetchSubjects(user.uid);
        }
    }, [user?.uid, fetchSubjects]);

    const openAddModal = () => {
        setEditingSubject(null);
        setSubjectName('');
        setSubjectColor(SUBJECT_COLORS[0]);
        setSubjectIcon(SUBJECT_ICONS[0]);
        setShowModal(true);
    };

    const openEditModal = (subject) => {
        setEditingSubject(subject);
        setSubjectName(subject.name);
        setSubjectColor(subject.color || SUBJECT_COLORS[0]);
        setSubjectIcon(subject.icon || SUBJECT_ICONS[0]);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!subjectName.trim() || !user?.uid) return;
        setSaving(true);
        try {
            if (editingSubject) {
                await updateSubject(user.uid, editingSubject.id, {
                    name: subjectName.trim(),
                    color: subjectColor,
                    icon: subjectIcon,
                });
            } else {
                await addSubject(user.uid, {
                    name: subjectName.trim(),
                    color: subjectColor,
                    icon: subjectIcon,
                });
            }
            setShowModal(false);
        } catch (err) {
            console.error('Failed to save subject:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (subjectId) => {
        if (!user?.uid) return;
        try {
            await deleteSubject(user.uid, subjectId);
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Failed to delete subject:', err);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="np-section-header">
                <div>
                    <h2 className="np-section-title">Subjects</h2>
                    <p className="np-section-subtitle">Manage your study content</p>
                </div>
                <button className="np-btn np-btn-primary np-btn-md" onClick={openAddModal}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Subject
                </button>
            </div>

            {subjectsLoading ? (
                <div className="np-card-surface" style={{ padding: 60, textAlign: 'center' }}>
                    <div className="np-auth-spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto' }} />
                    <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: '0.9rem' }}>Loading subjects...</p>
                </div>
            ) : subjects.length === 0 ? (
                <div className="np-card-surface">
                    <div className="np-empty">
                        <div className="np-empty-icon">📚</div>
                        <div className="np-empty-title">No subjects yet</div>
                        <div className="np-empty-desc">
                            Create your first subject to start organizing your questions.
                            You can add chapters and questions within each subject.
                        </div>
                        <button className="np-btn np-btn-primary np-btn-md" onClick={openAddModal}>Create First Subject</button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {subjects.map((subject) => (
                        <div key={subject.id} className="np-subject-card" style={{ '--subject-color': subject.color || '#6C63FF', cursor: 'pointer' }} onClick={() => navigate(`/subjects/${subject.id}`)}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div className="np-subject-icon" style={{ background: `${subject.color || '#6C63FF'}18` }}>
                                        {subject.icon || '📚'}
                                    </div>
                                    <div>
                                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem' }}>{subject.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
                                            {subject.questionCount || 0} questions · {subject.masteredCount || 0} mastered
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                                    <button className="np-icon-btn" title="Edit" onClick={() => openEditModal(subject)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>
                                    <button className="np-icon-btn np-icon-btn-danger" title="Delete" onClick={() => setDeleteConfirm(subject.id)}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ marginTop: 16 }}>
                                <div style={{
                                    height: 4, borderRadius: 999,
                                    background: 'rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%', borderRadius: 999,
                                        background: subject.color || '#6C63FF',
                                        width: subject.questionCount ? `${Math.round((subject.masteredCount || 0) / subject.questionCount * 100)}%` : '0%',
                                        transition: 'width 0.4s ease',
                                    }} />
                                </div>
                            </div>

                            {/* Delete confirmation */}
                            {deleteConfirm === subject.id && (
                                <div className="np-delete-confirm">
                                    <span style={{ fontSize: '0.8rem', color: 'var(--error)' }}>Delete this subject?</span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="np-btn np-btn-danger np-btn-sm" onClick={() => handleDelete(subject.id)}>Delete</button>
                                        <button className="np-btn np-btn-outline np-btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSubject ? 'Edit Subject' : 'New Subject'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Subject Name</label>
                        <input
                            type="text" placeholder="e.g. Physics, Mathematics..."
                            value={subjectName} onChange={(e) => setSubjectName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Icon</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {SUBJECT_ICONS.map((icon) => (
                                <button
                                    key={icon}
                                    onClick={() => setSubjectIcon(icon)}
                                    style={{
                                        width: 42, height: 42, borderRadius: 10, fontSize: '1.3rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: subjectIcon === icon ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.04)',
                                        border: subjectIcon === icon ? '2px solid var(--primary)' : '1px solid var(--border)',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Color</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {SUBJECT_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setSubjectColor(color)}
                                    className={`np-color-swatch ${subjectColor === color ? 'active' : ''}`}
                                    style={{ background: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button className="np-btn np-btn-outline np-btn-md" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="np-btn np-btn-primary np-btn-md" onClick={handleSave} disabled={saving || !subjectName.trim()}>
                            {saving ? 'Saving...' : editingSubject ? 'Save Changes' : 'Create Subject'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
