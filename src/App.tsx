import React, { useState } from 'react';
import { GameArea } from './components/GameArea';
import { Lobby } from './components/Lobby';

export const App: React.FC = () => {
    const [gameMode, setGameMode] = useState<'single' | 'multiplayer_host' | 'multiplayer_client' | null>(null);

    const handleStartGame = (mode: 'single' | 'multiplayer_host' | 'multiplayer_client') => {
        setGameMode(mode);
    };

    if (!gameMode) {
        return <Lobby onStartGame={handleStartGame} />;
    }

    return <GameArea mode={gameMode} />;
};
