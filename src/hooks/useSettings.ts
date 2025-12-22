import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'philosophy-ccg-settings';

export interface GameSettings {
    // Animations
    attackAnimation: boolean;
    playCardAnimation: boolean;
    drawCardAnimation: boolean;
    cardPreviewAnimation: boolean;

    // Audio
    musicVolume: number; // 0-100
    musicMuted: boolean;

    // Debug
    debugMode: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
    attackAnimation: true,
    playCardAnimation: true,
    drawCardAnimation: true,
    cardPreviewAnimation: true,
    musicVolume: 50,
    musicMuted: false,
    debugMode: false,
};

export const useSettings = () => {
    const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }, []);

    // Save to localStorage
    const saveSettings = useCallback((newSettings: Partial<GameSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error('Failed to save settings:', e);
            }
            return updated;
        });
    }, []);

    // Individual setters for convenience
    const setAttackAnimation = useCallback((value: boolean) => saveSettings({ attackAnimation: value }), [saveSettings]);
    const setPlayCardAnimation = useCallback((value: boolean) => saveSettings({ playCardAnimation: value }), [saveSettings]);
    const setDrawCardAnimation = useCallback((value: boolean) => saveSettings({ drawCardAnimation: value }), [saveSettings]);
    const setCardPreviewAnimation = useCallback((value: boolean) => saveSettings({ cardPreviewAnimation: value }), [saveSettings]);
    const setMusicVolume = useCallback((value: number) => saveSettings({ musicVolume: value }), [saveSettings]);
    const setMusicMuted = useCallback((value: boolean) => saveSettings({ musicMuted: value }), [saveSettings]);
    const setDebugMode = useCallback((value: boolean) => saveSettings({ debugMode: value }), [saveSettings]);

    const resetToDefaults = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Failed to reset settings:', e);
        }
    }, []);

    return {
        settings,
        saveSettings,
        setAttackAnimation,
        setPlayCardAnimation,
        setDrawCardAnimation,
        setCardPreviewAnimation,
        setMusicVolume,
        setMusicMuted,
        setDebugMode,
        resetToDefaults,
    };
};
