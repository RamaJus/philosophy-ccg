import React, { useState } from 'react';
import { GameArea } from './components/GameArea';
import { Lobby } from './components/Lobby';
import { BackgroundMusic } from './components/BackgroundMusic';
import { SettingsProvider } from './hooks/useSettings';

// Read custom deck from localStorage
const getCustomDeckIds = (): string[] | undefined => {
    try {
        const stored = localStorage.getItem('philosophy-ccg-deck');
        console.log('[App] Reading deck from localStorage:', stored);
        if (stored) {
            const parsed = JSON.parse(stored);
            console.log('[App] Parsed deck:', parsed);
            if (parsed.isCustom && Array.isArray(parsed.cardIds) && parsed.cardIds.length > 0) {
                console.log('[App] Using custom deck with', parsed.cardIds.length, 'cards');
                return parsed.cardIds;
            }
        }
    } catch (e) {
        console.error('Failed to load custom deck:', e);
    }
    console.log('[App] Using default deck (all cards)');
    return undefined;
};

export const App: React.FC = () => {
    const [gameMode, setGameMode] = useState<'single' | 'multiplayer_host' | 'multiplayer_client' | null>(null);
    const [isDebugMode, setIsDebugMode] = useState(false);
    const [customDeckIds, setCustomDeckIds] = useState<string[] | undefined>(undefined);
    const [aiDeckIds, setAiDeckIds] = useState<string[] | undefined>(undefined);

    const handleStartGame = (mode: 'single' | 'multiplayer_host' | 'multiplayer_client', aiDeck?: string[]) => {
        // Read deck at the moment game starts
        const deckIds = getCustomDeckIds();
        setCustomDeckIds(deckIds);
        setAiDeckIds(aiDeck);
        setGameMode(mode);
    };

    if (!gameMode) {
        return (
            <SettingsProvider>
                <BackgroundMusic />
                <Lobby
                    onStartGame={handleStartGame}
                    isDebugMode={isDebugMode}
                    setIsDebugMode={setIsDebugMode}
                />
            </SettingsProvider>
        );
    }

    return (
        <SettingsProvider>
            <BackgroundMusic />
            <GameArea mode={gameMode} isDebugMode={isDebugMode} customDeckIds={customDeckIds} aiDeckIds={aiDeckIds} />
        </SettingsProvider>
    );
};

