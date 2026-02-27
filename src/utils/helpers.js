/**
 * Merge class names, filtering out falsy values
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

/**
 * Generate a unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Format a date to a readable string
 */
export function formatDate(date, options = {}) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options,
    });
}

/**
 * Format time in seconds to mm:ss or hh:mm:ss
 */
export function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in minutes to a human-readable string
 */
export function formatDuration(minutes) {
    if (minutes < 1) return 'Less than a min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
}

/**
 * Truncate text to a max length
 */
export function truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '…';
}

/**
 * Calculate percentage
 */
export function percentage(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
}

/**
 * Get greeting based on time of day
 */
export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Burning the midnight oil';
}

/**
 * Get days until a target date
 */
export function daysUntil(targetDate) {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Debounce a function
 */
export function debounce(fn, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Check if a date is today
 */
export function isToday(date) {
    const d = date instanceof Date ? date : new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
}

/**
 * Check if a date is overdue (before today)
 */
export function isOverdue(date) {
    if (!date) return false;
    const d = date instanceof Date ? date : new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
}

/**
 * Get ordinal suffix for a number
 */
export function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
