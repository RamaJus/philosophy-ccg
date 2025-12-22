import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

const STORAGE_KEY = 'philosophy-ccg-settings';

export interface GameSettings {
    attackAnimation: boolean;
    playCardAnimation: boolean;
    drawCardAnimation: boolean;
    cardPreviewAnimation: boolean;
    musicVolume: number;
    musicMuted: boolean;
    voicelineVolume: number;
    voicelineMuted: boolean;
    debugMode: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
    attackAnimation: true,
    playCardAnimation: true,
    drawCardAnimation: true,
    cardPreviewAnimation: true,
    musicVolume: 50,
    musicMuted: false,
    voicelineVolume: 70,
    voicelineMuted: false,
    debugMode: false,
};

interface SettingsContextType {
    settings: GameSettings;
    saveSettings: (newSettings: Partial<GameSettings>) => void;
    setAttackAnimation: (value: boolean) => void;
    setPlayCardAnimation: (value: boolean) => void;
    setDrawCardAnimation: (value: boolean) => void;
    setCardPreviewAnimation: (value: boolean) => void;
    setMusicVolume: (value: number) => void;
    setMusicMuted: (value: boolean) => void;
    setVoicelineVolume: (value: number) => void;
    setVoicelineMuted: (value: boolean) => void;
    setDebugMode: (value: boolean) => void;
    resetToDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<GameSettings>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        return DEFAULT_SETTINGS;
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }, [settings]);

    const saveSettings = useCallback((newSettings: Partial<GameSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    const setAttackAnimation = useCallback((v: boolean) => saveSettings({ attackAnimation: v }), [saveSettings]);
    const setPlayCardAnimation = useCallback((v: boolean) => saveSettings({ playCardAnimation: v }), [saveSettings]);
    const setDrawCardAnimation = useCallback((v: boolean) => saveSettings({ drawCardAnimation: v }), [saveSettings]);
    const setCardPreviewAnimation = useCallback((v: boolean) => saveSettings({ cardPreviewAnimation: v }), [saveSettings]);
    const setMusicVolume = useCallback((v: number) => saveSettings({ musicVolume: v }), [saveSettings]);
    const setMusicMuted = useCallback((v: boolean) => saveSettings({ musicMuted: v }), [saveSettings]);
    const setVoicelineVolume = useCallback((v: number) => saveSettings({ voicelineVolume: v }), [saveSettings]);
    const setVoicelineMuted = useCallback((v: boolean) => saveSettings({ voicelineMuted: v }), [saveSettings]);
    const setDebugMode = useCallback((v: boolean) => saveSettings({ debugMode: v }), [saveSettings]);

    const resetToDefaults = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const value: SettingsContextType = {
        settings,
        saveSettings,
        setAttackAnimation,
        setPlayCardAnimation,
        setDrawCardAnimation,
        setCardPreviewAnimation,
        setMusicVolume,
        setMusicMuted,
        setVoicelineVolume,
        setVoicelineMuted,
        setDebugMode,
        resetToDefaults,
    };

    return React.createElement(SettingsContext.Provider, { value }, children);
};

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
