import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { updateUserProfile } from '../../firebase/firestoreService';

const slides = [
    { icon: '📚', title: 'Organize Your Content', description: 'Create Subjects, add Chapters, and load your questions. A clean three-level hierarchy keeps everything organized.' },
    { icon: '📤', title: 'Upload Questions Easily', description: 'Bulk import questions via CSV — just format them, upload, and the wizard handles validation, matching, and import.' },
    { icon: '🧠', title: 'Practice Smarter', description: 'Smart modes prioritize what matters — wrong questions, spaced repetition, and data-driven insights help you master every topic.' },
];

export default function Onboarding() {
    const navigate = useNavigate();
    const { user, setUserProfile } = useAuthStore();
    const [activeSlide, setActiveSlide] = useState(0);
    const [examName, setExamName] = useState('');
    const [examDate, setExamDate] = useState('');
    const [dailyGoal, setDailyGoal] = useState(50);
    const [saving, setSaving] = useState(false);
    const showSetup = activeSlide >= slides.length;

    const handleComplete = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const profileData = {
                examName,
                examDate,
                dailyGoal,
                onboardingComplete: true,
            };
            await updateUserProfile(user.uid, profileData);
            setUserProfile((prev) => ({ ...prev, ...profileData }));
            navigate('/');
        } catch (err) {
            console.error('Failed to save onboarding:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="np-onboarding">
            <div style={{ width: '100%', maxWidth: 480 }}>
                {!showSetup ? (
                    <div className="np-onboarding-slide" key={activeSlide}>
                        <div className="np-onboarding-icon">{slides[activeSlide].icon}</div>
                        <h2 className="np-onboarding-title">{slides[activeSlide].title}</h2>
                        <p className="np-onboarding-desc">{slides[activeSlide].description}</p>

                        <div className="np-onboarding-dots">
                            {slides.map((_, i) => (
                                <div key={i} className={`np-onboarding-dot ${i === activeSlide ? 'np-onboarding-dot-active' : 'np-onboarding-dot-inactive'}`} />
                            ))}
                        </div>

                        <button
                            className="np-btn np-btn-primary np-btn-lg"
                            onClick={() => setActiveSlide((p) => p + 1)}
                        >
                            {activeSlide === slides.length - 1 ? "Let's Set Up" : 'Next'}
                        </button>
                    </div>
                ) : (
                    <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
                        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.75rem', textAlign: 'center', marginBottom: 28 }}>
                            Set Up Your Goal
                        </h2>
                        <div className="np-setup-form">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <label>Exam Name</label>
                                    <input type="text" placeholder="e.g. JEE Main 2026" value={examName} onChange={(e) => setExamName(e.target.value)} />
                                </div>
                                <div>
                                    <label>Exam Date</label>
                                    <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                                </div>
                                <div>
                                    <label>Daily Question Goal: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{dailyGoal}</span></label>
                                    <input type="range" min="10" max="200" value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
                                        <span>10</span><span>200</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 28 }}>
                            <button className="np-btn np-btn-primary np-btn-lg" onClick={handleComplete} disabled={saving}>
                                {saving ? 'Saving...' : 'Start Practicing 🚀'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
