import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types';
import { X } from 'lucide-react';

interface PlayerStatsProps {
    player: Player;
    isOpponent?: boolean;
    isActive?: boolean;
}

export const PlayerStats: React.FC<PlayerStatsProps> = ({ player, isOpponent = false, isActive = true }) => {
    const [isDamaged, setIsDamaged] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const prevHealth = useRef(player.health);

    useEffect(() => {
        if (player.health < prevHealth.current) {
            setIsDamaged(true);
            const timer = setTimeout(() => setIsDamaged(false), 500);
            return () => clearTimeout(timer);
        }
        prevHealth.current = player.health;
    }, [player.health]);

    // Health color based on percentage
    const healthPercent = (player.health / player.maxHealth) * 100;
    const healthColor = healthPercent > 50
        ? 'text-emerald-400'
        : healthPercent > 25
            ? 'text-amber-400'
            : 'text-red-400';

    return (
        <>
            <div
                className={`
                    relative overflow-hidden rounded-xl border transition-all duration-300
                    ${isOpponent
                        ? 'bg-gradient-to-br from-slate-900/95 via-red-950/30 to-slate-900/95 border-red-900/50'
                        : 'bg-gradient-to-br from-slate-900/95 via-blue-950/30 to-slate-900/95 border-blue-900/50'
                    }
                    ${isDamaged ? 'animate-shake ring-2 ring-red-500 bg-red-900/30' : ''}
                    backdrop-blur-sm shadow-xl
                `}
            >
                {/* Subtle decorative border accent */}
                <div className={`absolute inset-x-0 top-0 h-0.5 ${isOpponent ? 'bg-gradient-to-r from-transparent via-red-500/50 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-500/50 to-transparent'}`} />

                <div className="p-3 flex gap-3">
                    {/* Avatar */}
                    <button
                        onClick={() => setShowAvatarModal(true)}
                        className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-slate-600/50 hover:border-amber-500/70 transition-all hover:scale-105 cursor-pointer group"
                        title="Klicken für Großansicht"
                    >
                        {/* Placeholder Avatar */}
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                            <span className="text-2xl opacity-60">👤</span>
                        </div>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/10 transition-colors flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-70 text-xs">🔍</span>
                        </div>
                    </button>

                    {/* Info Section */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        {/* Name */}
                        <h2 className="text-sm font-bold text-white/90 truncate tracking-wide">
                            {player.name}
                        </h2>

                        {/* Stats Row */}
                        <div className="flex items-center gap-4 mt-1">
                            {/* Glaubwürdigkeit (Health) */}
                            <div className="flex items-center gap-1.5" title="Glaubwürdigkeit">
                                {/* Custom heart symbol - more elegant */}
                                <div className={`relative ${isDamaged ? 'animate-pulse' : ''}`}>
                                    <svg
                                        className={`w-5 h-5 ${healthColor} drop-shadow-lg transition-colors`}
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={player.health}
                                        initial={{ y: -8, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 8, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className={`text-base font-bold tabular-nums ${healthColor}`}
                                    >
                                        {player.health}
                                    </motion.span>
                                </AnimatePresence>
                            </div>

                            {/* Dialektik (Mana) */}
                            <div className="flex items-center gap-1.5" title="Dialektik">
                                {/* Custom droplet/crystal symbol */}
                                <svg
                                    className="w-5 h-5 text-blue-400 drop-shadow-lg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z" />
                                    <ellipse cx="12" cy="15.8" rx="3" ry="3.5" opacity="0.6" />
                                </svg>
                                <span className="text-base font-bold tabular-nums text-blue-300">
                                    {player.mana}
                                    <span className="text-blue-500/70 text-sm">/{player.maxMana}</span>
                                </span>

                                {/* Lock indicator */}
                                {(player.lockedMana > 0 || (player.currentTurnManaMalus || 0) > 0) && (isActive || !isOpponent) && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex items-center text-amber-500"
                                        title={`${player.lockedMana > 0 ? player.lockedMana : player.currentTurnManaMalus} Dialektik gesperrt`}
                                    >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                        </svg>
                                        <span className="text-xs font-bold ml-0.5">
                                            {player.lockedMana > 0 ? player.lockedMana : player.currentTurnManaMalus}
                                        </span>
                                    </motion.div>
                                )}

                                {/* Bonus indicator */}
                                {(player.currentTurnBonusMana || 0) > 0 && (isActive || !isOpponent) && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="flex items-center text-yellow-400"
                                        title={`+${player.currentTurnBonusMana} zusätzliche Dialektik`}
                                    >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                                        </svg>
                                        <span className="text-xs font-bold ml-0.5">
                                            +{player.currentTurnBonusMana}
                                        </span>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom decorative accent */}
                <div className={`absolute inset-x-0 bottom-0 h-0.5 ${isOpponent ? 'bg-gradient-to-r from-transparent via-red-500/30 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-500/30 to-transparent'}`} />
            </div>

            {/* Avatar Modal */}
            <AnimatePresence>
                {showAvatarModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowAvatarModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Large Avatar Display */}
                            <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-amber-500/50 shadow-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                                <span className="text-8xl opacity-60">👤</span>
                            </div>

                            {/* Player Name */}
                            <div className="mt-4 text-center">
                                <h3 className="text-xl font-bold text-white">{player.name}</h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    {isOpponent ? 'Gegner' : 'Spieler'}
                                </p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setShowAvatarModal(false)}
                                className="absolute -top-3 -right-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-600 transition-colors"
                            >
                                <X size={20} className="text-white" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
