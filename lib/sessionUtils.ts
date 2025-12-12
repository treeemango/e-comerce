/**
 * Session utilities for tracking user sessions
 * Used for personalized recommendations and analytics
 */

const SESSION_STORAGE_KEY = 'user_session_id';
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Generate a new UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get or create a session ID
 * Sessions expire after 30 minutes of inactivity
 */
export function getOrCreateSessionId(): string {
    try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);

        if (stored) {
            const { sessionId, timestamp } = JSON.parse(stored);
            const now = Date.now();

            // Check if session is still valid (within 30 minutes)
            if (now - timestamp < SESSION_DURATION) {
                // Update timestamp to extend session
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                    sessionId,
                    timestamp: now
                }));
                return sessionId;
            }
        }

        // Create new session
        const newSessionId = generateUUID();
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
            sessionId: newSessionId,
            timestamp: Date.now()
        }));

        return newSessionId;
    } catch (error) {
        // Fallback if localStorage is not available
        console.warn('localStorage not available, generating temporary session ID');
        return generateUUID();
    }
}

/**
 * Clear the current session
 */
export function clearSession(): void {
    try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to clear session:', error);
    }
}

/**
 * Get the current session ID without creating a new one
 */
export function getCurrentSessionId(): string | null {
    try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            const { sessionId } = JSON.parse(stored);
            return sessionId;
        }
    } catch (error) {
        console.warn('Failed to get session ID:', error);
    }
    return null;
}
