import React, { useState } from 'react';
import { GameArea } from './components/GameArea';
import { Lobby } from './components/Lobby';
import { BackgroundMusic } from './components/BackgroundMusic';
import { SettingsProvider } from './hooks/useSettings';

// Read custom deck from localStorage
const getCustomDeckIds = (): string[] | undefined => {
    try {
        // Try new v2 format first (multi-deck storage)
        const storedV2 = localStorage.getItem('philosophy-ccg-decks-v2');
        console.log('[App] Reading deck from localStorage (v2):', storedV2 ? 'found' : 'not found');
        if (storedV2) {
            const parsed = JSON.parse(storedV2);
            console.log('[App] Parsed v2 deck storage:', { version: parsed.version, activeDeckId: parsed.activeDeckId, deckCount: parsed.decks?.length });
            if (parsed.version === 2 && parsed.activeDeckId) {
                // Find the active deck
                const activeDeck = parsed.decks?.find((d: any) => d.id === parsed.activeDeckId);
                if (activeDeck && Array.isArray(activeDeck.cardIds) && activeDeck.cardIds.length > 0) {
                    console.log('[App] Using custom deck v2:', activeDeck.name, 'with', activeDeck.cardIds.length, 'cards');
                    return activeDeck.cardIds;
                }
            }
        }

        // Fallback to old v1 format for backwards compatibility
        const storedV1 = localStorage.getItem('philosophy-ccg-deck');
        if (storedV1) {
            const parsed = JSON.parse(storedV1);
            console.log('[App] Parsed v1 deck:', parsed);
            if (parsed.isCustom && Array.isArray(parsed.cardIds) && parsed.cardIds.length > 0) {
                console.log('[App] Using custom deck v1 with', parsed.cardIds.length, 'cards');
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

