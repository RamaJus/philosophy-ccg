import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Card as CardType, BoardMinion } from '../types';
import { Swords, Heart, Zap, BookOpen } from 'lucide-react';

interface CardProps {
    card: CardType | BoardMinion;
    onClick?: () => void;
    isSelected?: boolean;
    isPlayable?: boolean;
    showHealth?: boolean;
    className?: string;
    bonusDamage?: number;
}




export const Card: React.FC<CardProps> = ({
    card,
    onClick,
    isSelected,
    isPlayable,
    showHealth = false,
    className = '',
    bonusDamage = 0
}) => {
    const isMinion = card.type === 'Philosoph';
    const boardMinion = showHealth ? (card as BoardMinion) : null;

    const [isDamaged, setIsDamaged] = useState(false);
    const [isHealed, setIsHealed] = useState(false);
    const [isSynergyTriggered, setIsSynergyTriggered] = useState(false);

    const currentHealth = boardMinion ? boardMinion.health : (card as any).health;
    const prevHealth = useRef(currentHealth);

    const currentSynergy = boardMinion ? (boardMinion.synergyBonus || 0) : 0;
    // Initialize to 0 so that if a card enters with synergy, it glows immediately
    const prevSynergy = useRef(0);

    const baseAttack = boardMinion ? boardMinion.attack : (card.attack || 0);
    const totalAttack = baseAttack + bonusDamage;

    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (currentHealth !== undefined && prevHealth.current !== undefined) {
            if (currentHealth < prevHealth.current) {
                // Damage animation
                setIsDamaged(true);
                const timer = setTimeout(() => setIsDamaged(false), 500);
                return () => clearTimeout(timer);
            } else if (currentHealth > prevHealth.current) {
                // Healing animation
                setIsHealed(true);
                const timer = setTimeout(() => setIsHealed(false), 600);
                return () => clearTimeout(timer);
            }
        }
        prevHealth.current = currentHealth;
    }, [currentHealth]);

    useEffect(() => {
        if (currentSynergy > prevSynergy.current) {
            setIsSynergyTriggered(true);
            const timer = setTimeout(() => setIsSynergyTriggered(false), 500); // Duration adjusted per feedback
            return () => clearTimeout(timer);
        }
        prevSynergy.current = currentSynergy;
    }, [currentSynergy]);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowPreview(true);
    };

    const handleContextMenuRelease = () => {
        setShowPreview(false);
    };

    useEffect(() => {
        if (showPreview) {
            window.addEventListener('mouseup', handleContextMenuRelease);
            return () => window.removeEventListener('mouseup', handleContextMenuRelease);
        }
    }, [showPreview]);

    // Base classes that don't conflict with motion
    const baseClasses = `
        ${isMinion ? 'card-minion' : 'card-spell'}
        ${isSelected ? 'ring-4 ring-yellow-400 z-20' : ''}
        ${isPlayable ? 'cursor-pointer' : ''}
        relative group
        ${className}
    `;

    const attackBadgeColor = bonusDamage > 0
        ? 'from-green-500 to-green-600'
        : bonusDamage < 0
            ? 'from-red-500 to-red-600'
            : 'from-slate-600 to-slate-700';

    return (
        <>
            {showPreview && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleContextMenuRelease}>
                    <div className="flex gap-8 items-center pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            className="relative transform shadow-2xl"
                        >
                            <Card
                                card={card}
                                isPlayable={false}
                                showHealth={showHealth}
                                bonusDamage={bonusDamage}
                            />
                        </motion.div>

                        <motion.div
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="w-[440px] h-[300px] bg-slate-900/95 border border-slate-600 rounded-xl p-4 text-white shadow-2xl flex flex-col gap-3 overflow-y-auto"
                        >
                            <h3 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">{card.name}</h3>

                            {card.school && (
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Schulen</span>
                                    <div className="flex flex-wrap gap-1">
                                        {card.school.map(s => (
                                            <span key={s} className="text-xs px-2 py-1 bg-slate-800 rounded-full border border-slate-700 text-blue-300">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Show effect/special abilities in tooltip */}
                            {(card.effect || (card as BoardMinion).specialAbility || card.special || card.workBonus) && (
                                <div className="space-y-1 bg-purple-900/30 border border-purple-700/50 rounded-lg p-2">
                                    <span className="text-xs text-purple-400 uppercase tracking-wider flex items-center gap-1">
                                        <Zap size={12} /> Effekt
                                    </span>
                                    {card.effect && (
                                        <p className="text-sm font-medium text-purple-200">{card.effect}</p>
                                    )}
                                    {card.special && (
                                        <p className="text-sm font-medium text-purple-200">{card.special.name}: {card.special.description}</p>
                                    )}
                                    {card.workBonus && (
                                        <p className="text-sm font-medium text-amber-200">Bonus: +{card.workBonus.damage} Angriff für {card.workBonus.school}</p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1 mt-auto pt-2 border-t border-slate-700">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Typ</span>
                                <p className="text-sm font-medium">{card.type}</p>
                            </div>
                        </motion.div>
                    </div>
                </div>,
                document.body
            )}

            <motion.div
                layout
                className={baseClasses}
                onContextMenu={handleContextMenu}
                style={{ width: '140px', height: '200px', backgroundColor: '#fef3c7' }}
                initial={false}
                animate={{
                    scale: isSelected ? 1.1 : 1,
                    x: isDamaged ? [-5, 5, -5, 5, 0] : 0,
                    boxShadow: isHealed
                        ? "0 0 20px #4ade80"
                        : isSynergyTriggered
                            ? "0 0 40px #d8b4fe, 0 0 20px #a855f7" // Stronger glow
                            : isSelected
                                ? "0 0 0 4px #fbbf24"
                                : "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                }}
                whileHover={{
                    scale: isSelected ? 1.15 : 1.05,
                    zIndex: 10,
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                }}
                whileTap={{ scale: 0.95 }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                }}
            >
                {/* Transparent clickable overlay - captures ALL clicks */}
                {onClick && isPlayable && (
                    <div
                        onClick={onClick}
                        className="absolute inset-0 cursor-pointer"
                        style={{
                            zIndex: 50,
                        }}
                    />
                )}

                <div className={`px-2 py-1 rounded-t-xl ${card.rarity === 'Legendär' ? 'bg-gradient-to-r from-yellow-700 via-yellow-600 to-yellow-700' : 'bg-gradient-to-r from-slate-800 to-slate-700'}`} style={{ pointerEvents: 'none' }}>
                    <h3 className="font-bold text-xs text-center text-white truncate">
                        {card.name}
                    </h3>
                </div>


                <div className={`absolute top-8 left-1 w-8 h-8 rounded-full ${card.rarity === 'Legendär' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 border-yellow-200' : 'bg-gradient-to-br from-blue-400 to-blue-600 border-white'} flex items-center justify-center font-bold text-lg shadow-lg z-10 border-2 pointer-events-none`}>
                    {card.cost}
                </div>


                {/* Synergy Bonus Badge (for philosophers on board with synergy) */}
                {isMinion && boardMinion?.synergyBonus && boardMinion.synergyBonus > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-8 right-1 z-[60] group/synergy"
                        style={{ pointerEvents: 'auto' }}
                        onClick={(e) => {
                            // Forward click to main card handler if playable
                            if (onClick && isPlayable) {
                                e.stopPropagation();
                                onClick();
                            }
                        }}
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg border-2 border-purple-300 cursor-help">
                            <span className="text-white font-bold text-xs">+{boardMinion.synergyBonus}</span>
                        </div>
                        {/* Hover Tooltip with School Breakdown */}
                        <div className="absolute top-full right-0 mt-1 hidden group-hover/synergy:block pointer-events-none z-50">
                            <div className="bg-slate-900/95 border border-purple-500/50 rounded-lg px-2 py-1.5 shadow-xl min-w-max">
                                <div className="text-[10px] text-purple-300 font-semibold mb-1">Synergie</div>
                                {boardMinion.synergyBreakdown && Object.entries(boardMinion.synergyBreakdown).map(([school, count]) => (
                                    <div key={school} className="text-[10px] text-white whitespace-nowrap">
                                        +{count} {school}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Full Image Area */}
                <div
                    className="absolute top-8 left-0 right-0 bottom-0 overflow-hidden flex items-center justify-center bg-amber-50 pointer-events-none"
                    style={{
                        backgroundImage: 'url(/card-background.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#fef3c7',
                        pointerEvents: 'none'
                    }}>
                    {card.image ? (
                        <img
                            src={card.image}
                            alt={card.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-4xl">📜</div>
                    )}
                    {isMinion && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    )}
                </div>

                {/* Hover Overlay - Description Text (and effect for spells) */}
                <div className="absolute top-8 left-0 right-0 bottom-0 bg-black/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-3" style={{ pointerEvents: 'none' }}>
                    <div className="text-center">
                        <p className="text-[11px] text-amber-100 italic leading-tight font-semibold">
                            {card.description}
                        </p>
                        {card.type === 'Zauber' && card.effect && (
                            <p className="text-[10px] text-purple-300 mt-2 font-medium">
                                {card.effect}
                            </p>
                        )}
                    </div>
                </div>

                {isMinion && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-2 py-1 bg-slate-900/90 border-t border-slate-700/50 rounded-b-xl" style={{ pointerEvents: 'none' }}>
                        <div className={`flex items-center gap-1 stat-badge ${attackBadgeColor}`}>
                            <Swords size={12} />
                            <span>{totalAttack}</span>
                        </div>

                        {boardMinion ? (
                            <div className={`flex items-center gap-1 stat-badge ${boardMinion.health < boardMinion.maxHealth
                                ? 'from-orange-500 to-red-600'
                                : 'from-green-500 to-green-600'
                                }`}>
                                <Heart size={12} />
                                <span>{boardMinion.health}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 stat-badge from-green-500 to-green-600">
                                <Heart size={12} />
                                <span>{card.health}</span>
                            </div>
                        )}
                    </div>
                )}

                {!isMinion && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center py-2 bg-slate-900/90 border-t border-slate-700/50 rounded-b-xl" style={{ pointerEvents: 'none' }}>
                        <div className={`flex items-center gap-2 ${card.type === 'Werk' ? 'text-amber-400' : 'text-purple-400'}`}>
                            {card.type === 'Werk' ? <BookOpen size={16} /> : <Zap size={16} />}
                            <span className="text-xs font-semibold uppercase">{card.type}</span>
                            {card.type === 'Werk' ? <BookOpen size={16} /> : <BookOpen size={16} />}
                        </div>
                    </div>
                )}
            </motion.div>
        </>
    );
};
