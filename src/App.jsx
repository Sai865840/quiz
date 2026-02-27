import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from './components/ui';
import AuthProvider from './components/Auth/AuthProvider';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AppLayout from './components/Layout/AppLayout';

// Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Practice from './pages/Practice/Practice';
import Subjects from './pages/Subjects/Subjects';
import SubjectDetail from './pages/Subjects/SubjectDetail';
import Analytics from './pages/Analytics/Analytics';
import Flashcards from './pages/Flashcards/Flashcards';
import Settings from './pages/Settings/Settings';
import TestSession from './pages/TestSession/TestSession';
import SessionScreen from './pages/TestSession/SessionScreen';
import Results from './pages/Results/Results';
import Login from './pages/Login/Login';
import Onboarding from './pages/Onboarding/Onboarding';
import WrongQuestions from './pages/WrongQuestions/WrongQuestions';
import RapidFire from './pages/RapidFire/RapidFire';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastContainer />
        <Routes>
          {/* Auth routes (no layout, no protection) */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route path="/onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />

          {/* Fullscreen session routes (no sidebar, protected) */}
          <Route path="/test/session" element={
            <ProtectedRoute><SessionScreen /></ProtectedRoute>
          } />

          {/* App routes (with sidebar layout, protected) */}
          <Route element={
            <ProtectedRoute><AppLayout /></ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/subjects/:subjectId" element={<SubjectDetail />} />
            <Route path="/wrong-questions" element={<WrongQuestions />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/test" element={<TestSession />} />
            <Route path="/test/results" element={<Results />} />
            <Route path="/rapid-fire" element={<RapidFire />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
