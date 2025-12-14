import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types';
import { Heart, Droplet, BookMarked, Lock } from 'lucide-react';

interface PlayerStatsProps {
    player: Player;
    isOpponent?: boolean;
}

export const PlayerStats: React.FC<PlayerStatsProps> = ({ player, isOpponent = false }) => {
    const [isDamaged, setIsDamaged] = useState(false);
    const prevHealth = useRef(player.health);
    const prevLockedMana = useRef(player.lockedMana);
    const [showLockWarn, setShowLockWarn] = useState(false);

    useEffect(() => {
        if (player.health < prevHealth.current) {
            setIsDamaged(true);
            const timer = setTimeout(() => setIsDamaged(false), 500);
            return () => clearTimeout(timer);
        }
        prevHealth.current = player.health;
    }, [player.health]);

    useEffect(() => {
        if (player.lockedMana > prevLockedMana.current) {
            // Mana lock applied - show warning
            setShowLockWarn(true);
            const timer = setTimeout(() => setShowLockWarn(false), 2000);
            prevLockedMana.current = player.lockedMana;
            return () => clearTimeout(timer);
        }
        // Always sync the ref to current value (important for multiplayer sync)
        prevLockedMana.current = player.lockedMana;
    }, [player.lockedMana]);

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
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Droplet className="text-blue-400" size={16} />
                            <span className="font-semibold text-sm">Dialektik</span>
                        </div>
                        <div className="text-base font-bold text-blue-400 flex items-center gap-2">
                            {player.lockedMana > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="flex items-center text-xs text-amber-500 bg-amber-900/40 px-2 py-0.5 rounded border border-amber-500/50"
                                    title={`Nächster Zug: -${player.lockedMana} Dialektik`}
                                >
                                    <Lock size={12} className="mr-1" />
                                    <span>-{player.lockedMana}</span>
                                </motion.div>
                            )}
                            {player.mana}/{player.maxMana}
                        </div>
                    </div>



                    {/* Lock Warning Overlay */}
                    <AnimatePresence>
                        {showLockWarn && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none z-50"
                            >
                                <div className="bg-slate-900/90 border-2 border-amber-500 text-amber-400 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md">
                                    <Lock size={20} />
                                    <span className="font-bold">Dialektik gesperrt!</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
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
