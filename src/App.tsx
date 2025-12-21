import React, { useState, useMemo } from 'react';
import { GameArea } from './components/GameArea';
import { Lobby } from './components/Lobby';
import { BackgroundMusic } from './components/BackgroundMusic';

// Read custom deck from localStorage
const getCustomDeckIds = (): string[] | undefined => {
    try {
        const stored = localStorage.getItem('philosophy-ccg-deck');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.isCustom && Array.isArray(parsed.cardIds) && parsed.cardIds.length > 0) {
                return parsed.cardIds;
            }
        }
    } catch (e) {
        console.error('Failed to load custom deck:', e);
    }
    return undefined;
};

export const App: React.FC = () => {
    const [gameMode, setGameMode] = useState<'single' | 'multiplayer_host' | 'multiplayer_client' | null>(null);
    const [isDebugMode, setIsDebugMode] = useState(false);

    // Load custom deck IDs when game starts
    const customDeckIds = useMemo(() => {
        if (gameMode) {
            return getCustomDeckIds();
        }
        return undefined;
    }, [gameMode]);

    const handleStartGame = (mode: 'single' | 'multiplayer_host' | 'multiplayer_client') => {
        setGameMode(mode);
    };

    if (!gameMode) {
        return (
            <>
                <BackgroundMusic volume={0.5} />
                <Lobby
                    onStartGame={handleStartGame}
                    isDebugMode={isDebugMode}
                    setIsDebugMode={setIsDebugMode}
                />
            </>
        );
    }

    return (
        <>
            <BackgroundMusic volume={0.5} />
            <GameArea mode={gameMode} isDebugMode={isDebugMode} customDeckIds={customDeckIds} />
        </>
    );
};
