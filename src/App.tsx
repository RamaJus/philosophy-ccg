import React, { useState } from 'react';
import { GameArea } from './components/GameArea';
import { Lobby } from './components/Lobby';
import { BackgroundMusic } from './components/BackgroundMusic';

export const App: React.FC = () => {
    const [gameMode, setGameMode] = useState<'single' | 'multiplayer_host' | 'multiplayer_client' | null>(null);
    const [isDebugMode, setIsDebugMode] = useState(false);

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
            <GameArea mode={gameMode} isDebugMode={isDebugMode} />
        </>
    );
};
