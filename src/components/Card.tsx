import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Card as CardType, BoardMinion } from '../types';
import { Swords, Heart, Zap, BookOpen } from 'lucide-react';
import { cardDatabase } from '../data/cards';

// Card dimension constants - single source of truth
export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 200;
export const PREVIEW_SCALE = 1.5;
export const TOOLTIP_WIDTH = 792; // 660px * 1.2 = 20% wider

// Extract display name (last name for philosophers, full name for spells/works)
export const getDisplayName = (card: CardType | BoardMinion): string => {
    // Only extract last name for Philosopher cards
    if (card.type !== 'Philosoph') {
        return card.name;
    }

    // Special cases that should keep their full name or specific format
    const specialNames: Record<string, string> = {
        'Der letzte Mensch': 'Letzter Mensch',
        'Zenon von Kition': 'Zenon',
        'Anselm v. Canterbury': 'Canterbury',
        'Thomas v. Aquin': 'Aquin',
    };

    // Check for exact match first
    if (specialNames[card.name]) {
        return specialNames[card.name];
    }

    // Check if name contains "letzte" or "Mensch" - always show full "Letzter Mensch"
    if (card.name.toLowerCase().includes('letzte') ||
        (card.name.toLowerCase().includes('mensch') && !card.name.toLowerCase().includes('über'))) {
        return 'Letzter Mensch';
    }

    const parts = card.name.trim().split(' ');

    // Single name (e.g., "Diogenes", "Sokrates", "Platon")
    if (parts.length === 1) {
        return parts[0];
    }

    // Handle nobility prefixes: "von", "de", "van", "v." - just return last name only
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts.length > 1 ? parts[parts.length - 2].toLowerCase() : '';

    // If second last part is a nobility prefix, skip it and just return last name
    if (['von', 'de', 'van', 'v.'].includes(secondLastPart)) {
        return lastPart;
    }

    return lastPart;
};

interface CardProps {
    card: CardType | BoardMinion;
    onClick?: () => void;
    isSelected?: boolean;
    isPlayable?: boolean;
    showHealth?: boolean;
    className?: string;
    bonusDamage?: number;
    bonusHealth?: number;
    isAttacking?: boolean;
    canAttack?: boolean; // True if minion is on board and ready to attack
}




export const Card: React.FC<CardProps> = ({
    card,
    onClick,
    isSelected,
    isPlayable,
    showHealth = false,
    className = '',
    bonusDamage = 0,
    bonusHealth = 0,
    isAttacking = false,
    canAttack = false
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

    // Get original card from database for tooltip display (shows unbuffed/undebuffed values)
    const originalCard = useMemo(() => {
        // Find by base id (strip instanceId suffix)
        const baseId = card.id.split('-')[0];
        return cardDatabase.find(c => c.id === baseId) || card;
    }, [card.id]);

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

    // Determine border color based on card type and state
    const getBorderColor = () => {
        // Attack-ready minions on board get green border
        if (isMinion && showHealth && canAttack) {
            return '#22c55e'; // emerald-500
        }
        // Legendary philosophers get gold border
        if (isMinion && card.rarity === 'Legendär') {
            return '#f59e0b'; // amber-500
        }
        // Normal philosophers get gray border
        if (isMinion) {
            return '#64748b'; // slate-500
        }
        // Spells get cyan border
        if (card.type === 'Zauber') {
            return '#06b6d4'; // cyan-500
        }
        // Works get amber border
        if (card.type === 'Werk') {
            return '#d97706'; // amber-600
        }
        return '#64748b'; // default gray
    };

    const isLegendaryPhilosopher = isMinion && card.rarity === 'Legendär';

    // Base classes that don't conflict with motion
    const baseClasses = `
        ${isMinion ? 'card-minion' : 'card-spell'}
        ${isLegendaryPhilosopher ? 'legendary-glow' : ''}
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
                            animate={{ scale: PREVIEW_SCALE, opacity: 1 }}
                            className="relative transform shadow-2xl"
                        >
                            {/* Show original card from database, not the buffed/debuffed version */}
                            <Card
                                card={originalCard}
                                isPlayable={false}
                                showHealth={false}
                            />
                        </motion.div>

                        <motion.div
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-slate-900/95 border border-slate-600 rounded-xl p-4 text-white shadow-2xl flex flex-col gap-3 overflow-y-auto"
                            style={{
                                width: `${TOOLTIP_WIDTH}px`,
                                height: `${CARD_HEIGHT * PREVIEW_SCALE}px`
                            }}
                        >
                            <h3 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">{originalCard.name}</h3>

                            {originalCard.school && (
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Schulen</span>
                                    <div className="flex flex-wrap gap-1">
                                        {originalCard.school.map(s => (
                                            <span key={s} className="text-xs px-2 py-1 bg-slate-800 rounded-full border border-slate-700 text-blue-300">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Show effect/special abilities in tooltip */}
                            {(originalCard.effect || originalCard.special || originalCard.workBonus) && (
                                <div className="space-y-1 bg-purple-900/30 border border-purple-700/50 rounded-lg p-2">
                                    <span className="text-xs text-purple-400 uppercase tracking-wider flex items-center gap-1">
                                        <Zap size={12} /> Effekt
                                    </span>
                                    {originalCard.effect && (
                                        <p className="text-sm font-medium text-purple-200">{originalCard.effect}</p>
                                    )}
                                    {originalCard.special && (
                                        <p className="text-sm font-medium text-purple-200">{originalCard.special.name}: {originalCard.special.description}</p>
                                    )}
                                    {originalCard.workBonus && (
                                        <p className="text-sm font-medium text-green-200">Bonus: +{originalCard.workBonus.health} Leben für {originalCard.workBonus.school}</p>
                                    )}
                                </div>
                            )}

                            {/* Show tooltip for philosophers */}
                            {originalCard.tooltip && (
                                <div className="space-y-1 bg-amber-900/30 border border-amber-700/50 rounded-lg p-2">
                                    <span className="text-xs text-amber-400 uppercase tracking-wider">Hintergrund</span>
                                    <p className="text-sm text-amber-100 leading-relaxed">{originalCard.tooltip}</p>
                                </div>
                            )}

                            <div className="space-y-1 mt-auto pt-2 border-t border-slate-700">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Typ</span>
                                <p className="text-sm font-medium">{originalCard.type}</p>
                            </div>
                        </motion.div>
                    </div>
                </div>,
                document.body
            )}

            <motion.div
                className={`${baseClasses} ${isAttacking ? 'animate-attack-swing' : ''}`}
                onContextMenu={handleContextMenu}
                style={{
                    width: `${CARD_WIDTH}px`,
                    height: `${CARD_HEIGHT}px`,
                    backgroundColor: '#fef3c7',
                    borderColor: getBorderColor(),
                    borderWidth: '2px',
                    borderStyle: 'solid'
                }}
                initial={false}
                animate={{
                    scale: isSelected ? 1.1 : 1,
                    x: isDamaged ? [-5, 5, -5, 5, 0] : 0,
                    boxShadow: isHealed
                        ? "0 0 20px #4ade80"
                        : isSynergyTriggered
                            ? "0 0 40px #d8b4fe, 0 0 20px #a855f7"
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
                    stiffness: 500,
                    damping: 30,
                    mass: 0.8
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

                <div className={`px-2 py-1 rounded-t-xl ${card.type === 'Philosoph' && card.rarity === 'Legendär'
                    ? 'bg-gradient-to-r from-yellow-700 via-yellow-600 to-yellow-700'
                    : card.type === 'Zauber'
                        ? 'bg-gradient-to-r from-cyan-700 to-blue-700'
                        : card.type === 'Werk'
                            ? 'bg-gradient-to-r from-amber-700 to-orange-700'
                            : 'bg-gradient-to-r from-slate-800 to-slate-700'
                    }`} style={{ pointerEvents: 'none' }}>
                    <h3 className="font-bold text-xs text-center text-white truncate">
                        {getDisplayName(card)}
                    </h3>
                </div>


                <div className={`absolute top-8 left-1 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-white flex items-center justify-center font-bold text-lg shadow-lg z-10 border-2 pointer-events-none`}>
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
                        <p className={`text-[11px] italic leading-tight font-semibold ${!isMinion ? 'text-purple-300' : 'text-amber-100'
                            }`}>
                            {card.description}
                        </p>
                    </div>
                </div>

                {isMinion && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-2 py-1 bg-slate-900/90 border-t border-slate-700/50 rounded-b-xl" style={{ pointerEvents: 'none' }}>
                        <div className={`flex items-center gap-1 stat-badge ${attackBadgeColor}`}>
                            <Swords size={12} />
                            <span>{totalAttack}</span>
                        </div>

                        {boardMinion ? (
                            <div className={`flex items-center gap-1 stat-badge ${bonusHealth > 0
                                ? 'from-cyan-400 to-cyan-600'
                                : boardMinion.health < boardMinion.maxHealth
                                    ? 'from-orange-500 to-red-600'
                                    : 'from-green-500 to-green-600'
                                }`}>
                                <Heart size={12} />
                                <span>{boardMinion.health + bonusHealth}</span>
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
                    <div className={`absolute bottom-0 left-0 right-0 flex justify-center items-center py-2 border-t rounded-b-xl ${card.type === 'Werk'
                        ? 'bg-amber-900/90 border-amber-700/50'
                        : 'bg-slate-900/90 border-slate-700/50'
                        }`} style={{ pointerEvents: 'none' }}>
                        <div className={`flex items-center gap-2 ${card.type === 'Werk' ? 'text-amber-300' : 'text-cyan-400'
                            }`}>
                            {card.type === 'Werk' ? <BookOpen size={16} /> : <Zap size={16} />}
                            <span className="text-xs font-semibold uppercase">{card.type}</span>
                            {card.type === 'Werk' ? <BookOpen size={16} /> : <Zap size={16} />}
                        </div>
                    </div>
                )}
            </motion.div>
        </>
    );
};
