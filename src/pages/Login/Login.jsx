import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerWithEmail, loginWithEmail, resetPassword } from '../../firebase/authService';
import { createUserProfile, getUserProfile } from '../../firebase/firestoreService';
import { useAuthStore } from '../../store/authStore';

export default function Login() {
    const navigate = useNavigate();
    const { setError, clearError, error } = useAuthStore();

    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const getFirebaseErrorMessage = (code) => {
        const messages = {
            'auth/email-already-in-use': 'An account with this email already exists',
            'auth/invalid-email': 'Please enter a valid email address',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/invalid-credential': 'Invalid email or password',
            'auth/too-many-requests': 'Too many attempts. Please try again later',
            'auth/network-request-failed': 'Network error. Check your connection',
        };
        return messages[code] || 'Something went wrong. Please try again.';
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        clearError();

        if (isSignUp && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (isSignUp && !displayName.trim()) {
            setError('Please enter your name');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const user = await registerWithEmail(email, password, displayName.trim());
                await createUserProfile(user.uid, {
                    displayName: displayName.trim(),
                    email: user.email,
                    onboardingComplete: false,
                    examName: '',
                    examDate: '',
                    dailyGoal: 50,
                });
                navigate('/onboarding');
            } else {
                const user = await loginWithEmail(email, password);
                const profile = await getUserProfile(user.uid);
                if (profile && profile.onboardingComplete) {
                    navigate('/');
                } else {
                    navigate('/onboarding');
                }
            }
        } catch (err) {
            setError(getFirebaseErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        clearError();

        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(email);
            setResetSent(true);
        } catch (err) {
            setError(getFirebaseErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    if (isForgotPassword) {
        return (
            <div className="np-login-container">
                <div className="np-login-card">
                    <div className="np-login-logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                    </div>

                    <h1 className="np-login-title">Reset Password</h1>
                    <p className="np-login-desc">We'll send you a link to reset your password</p>

                    {error && <div className="np-auth-error">{error}</div>}

                    {resetSent ? (
                        <div className="np-auth-success">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            <span>Reset link sent! Check your email inbox.</span>
                        </div>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="np-auth-form">
                            <div className="np-auth-field">
                                <label htmlFor="reset-email">Email Address</label>
                                <div className="np-auth-input-wrap">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    <input id="reset-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                            </div>
                            <button type="submit" className="np-login-btn" disabled={loading}>
                                {loading ? <span className="np-auth-spinner" /> : null}
                                Send Reset Link
                            </button>
                        </form>
                    )}

                    <button className="np-auth-link" onClick={() => { setIsForgotPassword(false); clearError(); setResetSent(false); }}>
                        ← Back to Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="np-login-container">
            <div className="np-login-card">
                <div className="np-login-logo">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                </div>

                <h1 className="np-login-title">NeuralPrep</h1>
                <p className="np-login-desc">
                    {isSignUp ? 'Create your account to get started' : 'Your personal MCQ practice companion'}
                </p>

                {error && <div className="np-auth-error">{error}</div>}

                <form onSubmit={handleAuth} className="np-auth-form">
                    {isSignUp && (
                        <div className="np-auth-field">
                            <label htmlFor="display-name">Full Name</label>
                            <div className="np-auth-input-wrap">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                                <input id="display-name" type="text" placeholder="John Doe" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                            </div>
                        </div>
                    )}

                    <div className="np-auth-field">
                        <label htmlFor="email">Email Address</label>
                        <div className="np-auth-input-wrap">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                            </svg>
                            <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                    </div>

                    <div className="np-auth-field">
                        <label htmlFor="password">Password</label>
                        <div className="np-auth-input-wrap">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                            <input id="password" type="password" placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                        </div>
                    </div>

                    {isSignUp && (
                        <div className="np-auth-field">
                            <label htmlFor="confirm-password">Confirm Password</label>
                            <div className="np-auth-input-wrap">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                                <input id="confirm-password" type="password" placeholder="Repeat password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                            </div>
                        </div>
                    )}

                    {!isSignUp && (
                        <div style={{ textAlign: 'right', marginTop: -4 }}>
                            <button type="button" className="np-auth-link np-auth-link-sm" onClick={() => { setIsForgotPassword(true); clearError(); }}>
                                Forgot password?
                            </button>
                        </div>
                    )}

                    <button type="submit" className="np-login-btn" disabled={loading}>
                        {loading ? <span className="np-auth-spinner" /> : null}
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="np-auth-switch">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button className="np-auth-link" onClick={() => { setIsSignUp(!isSignUp); clearError(); }}>
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>

                <p className="np-login-footer">
                    Your data is encrypted and stays private.
                </p>
            </div>
        </div>
    );
}
