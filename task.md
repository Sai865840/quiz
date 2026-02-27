# NeuralPrep - MCQ Practice Web App

## Phase 1: Project Foundation
- [x] Initialize Vite + React project with Tailwind CSS
- [x] Set up folder structure (firebase, store, hooks, services, pages, components, styles, utils, constants)
- [x] Configure design tokens (CSS variables), fonts (Plus Jakarta Sans, Inter), dark theme
- [x] Set up React Router v6 with route structure
- [x] Set up Firebase config (Auth, Firestore, Storage)
- [x] Enable Firestore offline persistence
- [x] Set up Zustand stores (auth, ui)

## Phase 2: Authentication & Onboarding
- [ ] Google Sign-In via Firebase Auth
- [ ] Auth state persistence and protected routes
- [ ] User profile document creation on first sign-in
- [ ] Onboarding carousel (3 screens)
- [ ] Exam name, exam date, daily goal setup

## Phase 3: Core Data Layer & Content Management
- [ ] Firestore services for Subjects CRUD
- [ ] Firestore services for Chapters CRUD
- [ ] Firestore services for Questions CRUD
- [ ] Subject management page
- [ ] Chapter management page
- [ ] Question management page (add/edit/delete, with all properties)
- [ ] Bulk CSV upload wizard (parse, validate, preview, import)
- [ ] CSV template download
- [ ] CSV export (questions + sessions)

## Phase 4: Practice Hub & Test Engine
- [ ] Practice Hub page with mode cards
- [ ] Test configuration screen (scope, mode, count, timer, shuffles)
- [ ] Question selection algorithms (Smart, Wrong, Unseen, Random, Flagged, Due Today)
- [ ] Test session UI (question counter, timer, flag, option cards)
- [ ] Answer feedback (correct/wrong visual rewards)
- [ ] Skip & revisit logic
- [ ] Confidence rating (Guessed/Unsure/Sure)
- [ ] Session templates (save/load/delete, max 5)
- [ ] Results screen (animated score, progress ring, stats, per-chapter breakdown)
- [ ] Session review (filter by all/wrong/correct/flagged, time per question)

## Phase 5: Performance Tracking & Spaced Repetition
- [x] Per-question performance tracking (attempts, correct, wrong, streak, last asked, next due)
- [x] Mastery level computation (0–4)
- [x] SM-2 spaced repetition scheduling
- [x] Confidence-aware mastery (guessed correct doesn't count)
- [x] Wrong Questions system (grouped by subject, graduation at mastery 4)
- [x] Stale question detection (30+ days)

## Phase 6: Dashboard
- [x] Time-based greeting
- [x] Exam countdown
- [x] Streak badge & daily goal ring
- [x] Quick stats (today's accuracy, mastered, wrong remaining)
- [x] Focus recommendations (due questions, weakest chapter, gaps)
- [x] Recent sessions
- [x] Subject quick access
- [x] Rotating motivational quote

## Phase 7: Analytics
- [x] Date range picker (This Week / This Month / All Time)
- [x] Summary stats (total questions, accuracy, study time, streak)
- [x] GitHub-style activity heatmap (12 weeks)
- [x] Accuracy trend line chart
- [x] Per-subject accuracy bar chart
- [x] Chapter heatmap (red-to-green)
- [x] Mastery donut chart
- [x] Session history list (clickable to review)
- [x] Rule-based insights engine

## Phase 8: Flashcard & Rapid Fire Modes
- [ ] Flashcard mode UI (3D CSS flip, Got it / Need more practice)
- [ ] Rapid Fire mode (speed drill, streak multiplier, instant next)

## Phase 9: Settings & Notifications
- [ ] Settings page (exam info, daily goal, timer prefs, SR toggle, mastery threshold, shuffle defaults)
- [ ] Accent color picker (6 options, CSS variable swap)
- [ ] Font size settings (small/medium/large)
- [ ] Data management (export/import/clear)
- [ ] Offline banner

## Phase 10: Polish & Verification
- [ ] Responsive design pass
- [ ] Animation polish (micro-interactions, transitions)
- [ ] Error handling & loading states
- [ ] End-to-end browser testing
