export { COLORS, ACCENT_OPTIONS, MASTERY_COLORS, DIFFICULTY_COLORS } from './colors';
export { FONTS, FONT_SIZES } from './fonts';

export const APP_NAME = 'NeuralPrep';
export const APP_VERSION = '1.0.0';

export const MASTERY_LEVELS = {
    0: 'Unseen',
    1: 'Struggling',
    2: 'Learning',
    3: 'Proficient',
    4: 'Mastered',
};

export const DIFFICULTY_LABELS = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
};

export const CONFIDENCE_RATINGS = {
    guessed: 'Guessed',
    unsure: 'Unsure',
    sure: 'Sure',
};

export const TEST_MODES = {
    smart: 'Smart Mode',
    wrong: 'Wrong Questions',
    unseen: 'Unseen First',
    random: 'Random',
    flagged: 'Flagged Only',
    dueToday: 'Due Today',
};

export const MAX_SESSION_TEMPLATES = 5;
export const STALE_DAYS_THRESHOLD = 30;
export const DEFAULT_DAILY_GOAL = 50;

export const SPACED_REPETITION_INTERVALS = [1, 3, 7, 14, 30];

export const MOTIVATIONAL_QUOTES = [
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "The mind is everything. What you think you become.", author: "Buddha" },
    { text: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
];
