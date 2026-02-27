import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { logoutUser } from '../../firebase/authService';
import { updateUserProfile } from '../../firebase/firestoreService';

export default function Settings() {
    const navigate = useNavigate();
    const { user, userProfile, setUserProfile, logout } = useAuthStore();
    const { accentColor, setAccentColor, fontSize, setFontSize, addToast } = useUIStore();

    const [examName, setExamName] = useState('');
    const [examDate, setExamDate] = useState('');
    const [dailyGoal, setDailyGoal] = useState(50);
    const [savingProfile, setSavingProfile] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    // Load profile data
    useEffect(() => {
        if (userProfile) {
            setExamName(userProfile.examName || '');
            setExamDate(userProfile.examDate || '');
            setDailyGoal(userProfile.dailyGoal || 50);
        }
    }, [userProfile]);

    const handleSaveProfile = async () => {
        if (!user?.uid) return;
        setSavingProfile(true);
        try {
            const data = { examName, examDate, dailyGoal };
            await updateUserProfile(user.uid, data);
            setUserProfile({ ...userProfile, ...data });
            addToast({ type: 'success', message: 'Settings saved!' });
        } catch (err) {
            console.error('Failed to save profile:', err);
            addToast({ type: 'error', message: 'Failed to save settings' });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSignOut = async () => {
        setLoggingOut(true);
        try {
            await logoutUser();
            logout();
            navigate('/login');
        } catch (err) {
            console.error('Failed to sign out:', err);
            setLoggingOut(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
            <div>
                <h2 className="np-section-title">Settings</h2>
                <p className="np-section-subtitle">Customize your experience</p>
            </div>

            {/* Account Info */}
            <div className="np-settings-section">
                <div className="np-settings-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    Account
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '1.1rem', color: 'white', flexShrink: 0,
                    }}>
                        {(userProfile?.displayName || user?.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{userProfile?.displayName || 'User'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{user?.email}</div>
                    </div>
                </div>
            </div>

            {/* Exam Info */}
            <div className="np-settings-section">
                <div className="np-settings-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Exam Information
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label>Exam Name</label>
                        <input type="text" placeholder="e.g. JEE Main 2026" value={examName} onChange={(e) => setExamName(e.target.value)} />
                    </div>
                    <div>
                        <label>Exam Date</label>
                        <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                    </div>
                    <div>
                        <label>Daily Question Goal</label>
                        <input type="number" placeholder="50" min="1" max="500" value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))} />
                    </div>
                    <button className="np-btn np-btn-primary np-btn-md" onClick={handleSaveProfile} disabled={savingProfile} style={{ alignSelf: 'flex-start' }}>
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Appearance */}
            <div className="np-settings-section">
                <div className="np-settings-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                    Appearance
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <label>Accent Color</label>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                            {[
                                { name: 'Violet', value: '#6C63FF' },
                                { name: 'Cyan', value: '#00D4FF' },
                                { name: 'Pink', value: '#FF006E' },
                                { name: 'Orange', value: '#FF6B35' },
                                { name: 'Lime', value: '#7CFC00' },
                                { name: 'Gold', value: '#FFD700' },
                            ].map((c) => (
                                <button
                                    key={c.value}
                                    className={`np-color-swatch ${c.value === accentColor ? 'active' : ''}`}
                                    style={{ background: c.value }}
                                    title={c.name}
                                    onClick={() => setAccentColor(c.value)}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label>Font Size</label>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            {[
                                { label: 'Small', value: 'small' },
                                { label: 'Medium', value: 'medium' },
                                { label: 'Large', value: 'large' },
                            ].map((size) => (
                                <button
                                    key={size.value}
                                    className={`np-btn np-btn-sm ${size.value === fontSize ? 'np-btn-primary' : 'np-btn-outline'}`}
                                    onClick={() => setFontSize(size.value)}
                                >
                                    {size.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Data */}
            <div className="np-settings-section">
                <div className="np-settings-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
                    Data Management
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <button className="np-btn np-btn-outline np-btn-sm">📥 Export Questions</button>
                    <button className="np-btn np-btn-outline np-btn-sm">📊 Export Sessions</button>
                    <button className="np-btn np-btn-outline np-btn-sm">📤 Import CSV</button>
                    <button className="np-btn np-btn-danger np-btn-sm">🗑️ Clear Performance Data</button>
                </div>
            </div>

            {/* Sign Out */}
            <div className="np-settings-section" style={{ borderColor: 'rgba(255,107,107,0.15)' }}>
                <div className="np-settings-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Account Actions
                </div>
                <button className="np-btn np-btn-danger np-btn-md" onClick={handleSignOut} disabled={loggingOut}>
                    {loggingOut ? 'Signing out...' : 'Sign Out'}
                </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted)', paddingBottom: 8 }}>
                NeuralPrep v1.0.0
            </p>
        </div>
    );
}
