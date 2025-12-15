import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types';
import { Heart, Droplet, BookMarked, Lock } from 'lucide-react';

interface PlayerStatsProps {
    player: Player;
    isOpponent?: boolean;
    isActive?: boolean;
}

export const PlayerStats: React.FC<PlayerStatsProps> = ({ player, isOpponent = false, isActive = true }) => {
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
        <div className={`glass-panel p-3 transition-all duration-200 ${isOpponent ? 'bg-red-500/10' : 'bg-blue-500/10'} ${isDamaged ? 'animate-shake ring-2 ring-red-500 bg-red-500/20' : ''}`}>
            <h2 className="text-lg font-bold mb-2 text-center truncate">{player.name}</h2>

            <div className="space-y-3">
                {/* Health */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Heart className={`${isDamaged ? 'text-red-500 scale-125' : 'text-red-400'} transition-all duration-200`} size={16} />
                        <span className="font-semibold text-sm">Glaubwürdigkeit</span>
                    </div>
                    <div className="flex items-baseline justify-end gap-0.5 min-w-[4.5rem]">
                        <div className="relative w-full h-6">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={player.health}
                                    initial={{ y: -10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 10, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`absolute right-0 top-0 block w-full text-right ${player.health <= 10 ? 'text-red-400 animate-pulse' : 'text-green-400'} ${isDamaged ? 'text-red-500' : ''}`}
                                >
                                    {player.health}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Mana - Visual Crystals */}
                <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg px-2 py-1 flex-1 relative group">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg border-2 border-blue-300 relative z-10">
                            <span className="font-bold text-white text-sm">{player.mana}</span>
                        </div>
                        <div className="bg-slate-800 rounded-r-lg px-2 py-0.5 ml-[-10px] pl-4 text-xs font-mono text-blue-200 border border-slate-700 w-full">
                            {player.mana}/{player.maxMana}

                            <div className="flex items-center">
                                {(player.lockedMana > 0 || (player.currentTurnManaMalus || 0) > 0) && (isActive || !isOpponent) && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex items-center text-xs text-amber-500 gap-0.5 ml-1"
                                        title={`${player.lockedMana} Dialektik gesperrt`}
                                    >
                                        <Lock size={12} />
                                        <span className="font-bold leading-none">{player.lockedMana > 0 ? player.lockedMana : player.currentTurnManaMalus}</span>
                                    </motion.div>
                                )}
                                {(player.currentTurnBonusMana || 0) > 0 && (isActive || !isOpponent) && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex items-center text-xs text-yellow-300 gap-0.5 ml-1"
                                        title={`${player.currentTurnBonusMana} zusätzliche Dialektik`}
                                    >
                                        <span className="font-bold text-sm leading-none">+</span>
                                        <span className="font-bold leading-none">{player.currentTurnBonusMana}</span>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deck Count */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookMarked className="text-purple-400" size={16} />
                        <span className="font-semibold text-sm">Deck</span>
                    </div>
                    <div className="text-base font-bold text-purple-400">
                        {player.deck.length}
                    </div>
                </div>
            </div>
        </div>
    );
};
