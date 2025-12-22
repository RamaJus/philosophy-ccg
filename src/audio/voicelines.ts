// Voiceline System for Legendary Philosophers
// Plays audio when legendary effects trigger

export const VOICELINES: Record<string, string> = {
    kant: '/voicelines/Kant_Brian.mp3',
    nietzsche: '/voicelines/Nietzsche_Roger.mp3',
    diogenes: '/voicelines/Diogenes_Harry_short.mp3',
    wittgenstein: '/voicelines/Wittgenstein_Charlie.mp3',
    marx: '/voicelines/Marx_Callum.mp3',
    foucault: '/voicelines/Foucault.mp3', // Placeholder - file not yet available
    sartre: '/voicelines/Sartre.mp3', // Placeholder - file not yet available
    schopenhauer: '/voicelines/Schopenhauer_Adam.mp3',
    van_inwagen: '/voicelines/Inwagen_James.mp3',
    camus: '/voicelines/Camus_Bill.mp3',
    diotima: '/voicelines/Diotima_River.mp3',
};

// Global audio instance to prevent overlapping
let currentVoiceline: HTMLAudioElement | null = null;

const SETTINGS_KEY = 'philosophy-ccg-settings';

/**
 * Get voiceline settings from localStorage
 */
function getVoicelineSettings(): { muted: boolean; volume: number } {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            const settings = JSON.parse(stored);
            return {
                muted: settings.voicelineMuted ?? false,
                volume: (settings.voicelineVolume ?? 70) / 100, // Convert 0-100 to 0-1
            };
        }
    } catch (e) {
        console.warn('Failed to read voiceline settings:', e);
    }
    return { muted: false, volume: 0.7 };
}

/**
 * Play a voiceline for a legendary philosopher
 * @param philosopherId - The card id (e.g. 'kant', 'nietzsche')
 */
export function playVoiceline(philosopherId: string): void {
    // Skip in non-browser environments (Node.js tests)
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
        return;
    }

    // Check settings
    const { muted, volume } = getVoicelineSettings();
    if (muted || volume === 0) {
        return;
    }

    const voicelinePath = VOICELINES[philosopherId.toLowerCase()];

    if (!voicelinePath) {
        console.warn(`No voiceline found for philosopher: ${philosopherId}`);
        return;
    }

    // Stop any currently playing voiceline
    if (currentVoiceline) {
        currentVoiceline.pause();
        currentVoiceline.currentTime = 0;
    }

    try {
        currentVoiceline = new Audio(voicelinePath);
        currentVoiceline.volume = volume;
        currentVoiceline.play().catch(err => {
            console.warn(`Failed to play voiceline for ${philosopherId}:`, err);
        });
    } catch (error) {
        console.warn(`Error creating audio for ${philosopherId}:`, error);
    }
}

/**
 * Stop the currently playing voiceline
 */
export function stopVoiceline(): void {
    if (currentVoiceline) {
        currentVoiceline.pause();
        currentVoiceline.currentTime = 0;
        currentVoiceline = null;
    }
}
