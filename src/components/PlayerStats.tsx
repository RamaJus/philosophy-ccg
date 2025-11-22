import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../types';
import { Heart, Droplet, BookMarked } from 'lucide-react';

interface PlayerStatsProps {
    player: Player;
    isOpponent?: boolean;
}

export const PlayerStats: React.FC<PlayerStatsProps> = ({ player, isOpponent = false }) => {
    const [isDamaged, setIsDamaged] = useState(false);
    const prevHealth = useRef(player.health);

    useEffect(() => {
        if (player.health < prevHealth.current) {
            setIsDamaged(true);
            const timer = setTimeout(() => setIsDamaged(false), 500);
            return () => clearTimeout(timer);
        }
        prevHealth.current = player.health;
    }, [player.health]);

    return (
        <div className={`glass-panel p-4 transition-all duration-200 ${isOpponent ? 'bg-red-500/10' : 'bg-blue-500/10'} ${isDamaged ? 'animate-shake ring-2 ring-red-500 bg-red-500/20' : ''}`}>
            <h2 className="text-xl font-bold mb-3 text-center">{player.name}</h2>

            <div className="space-y-2">
                {/* Health */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Heart className={`${isDamaged ? 'text-red-500 scale-125' : 'text-red-400'} transition-all duration-200`} size={20} />
                        <span className="font-semibold">Glaubwürdigkeit</span>
                    </div>
                    <div className="text-lg font-bold">
                        <span className={`${player.health <= 10 ? 'text-red-400 animate-pulse' : 'text-green-400'} ${isDamaged ? 'text-red-500 scale-150 inline-block' : ''} transition-all duration-200`}>
                            {player.health}
                        </span>
                        <span className="text-gray-400">/{player.maxHealth}</span>
                    </div>
                </div>

                {/* Mana - Counter only */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Droplet className="text-blue-400" size={20} />
                        <span className="font-semibold">Dialektik</span>
                    </div>
                    <div className="text-lg font-bold text-blue-400">
                        {player.mana}/{player.maxMana}
                    </div>
                </div>

                {/* Deck Count */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookMarked className="text-purple-400" size={20} />
                        <span className="font-semibold">Deck</span>
                    </div>
                    <div className="text-lg font-bold text-purple-400">
                        {player.deck.length}
                    </div>
                </div>
            </div>
        </div>
    );
};
