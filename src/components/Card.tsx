import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card as CardType, BoardMinion } from '../types';
import { Swords, Heart, Zap, Sparkles, BookOpen } from 'lucide-react';

interface CardProps {
    card: CardType | BoardMinion;
    onClick?: () => void;
    isSelected?: boolean;
    isPlayable?: boolean;
    showHealth?: boolean;
    className?: string;
    bonusDamage?: number;
}

const rarityColors: Record<string, string> = {
    'Gewöhnlich': 'from-gray-400 to-gray-600',
    'Selten': 'from-blue-400 to-blue-600',
    'Episch': 'from-purple-400 to-purple-600',
    'Legendär': 'from-orange-400 to-orange-600',
};

const factionIcons: Record<string, string> = {
    'Westlich': '🏛️',
    'Östlich': '☯️',
    'Universell': '🌍',
};

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
    const isWittgenstein = card.id.includes('wittgenstein');

    // Damage animation state
    const [isDamaged, setIsDamaged] = useState(false);
    const currentHealth = boardMinion ? boardMinion.health : (card as any).health;
    const prevHealth = useRef(currentHealth);

    // Calculate total attack with bonus
    // Use boardMinion.attack if it's a board minion, otherwise use card.attack
    const baseAttack = boardMinion ? boardMinion.attack : (card.attack || 0);
    const totalAttack = baseAttack + bonusDamage;

    // Right-click preview state
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (currentHealth !== undefined && prevHealth.current !== undefined && currentHealth < prevHealth.current) {
            setIsDamaged(true);
            const timer = setTimeout(() => setIsDamaged(false), 500);
            return () => clearTimeout(timer);
        }
        prevHealth.current = currentHealth;
    }, [currentHealth]);

    // Handle right-click preview
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

    const cardClasses = `
        ${isMinion ? 'card-minion' : 'card-spell'}
        ${isSelected ? 'ring-4 ring-yellow-400 scale-110' : ''}
        ${isPlayable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}
        ${isWittgenstein ? 'ring-4 ring-yellow-500 shadow-2xl shadow-yellow-500/50' : ''}
        ${isDamaged ? 'animate-shake ring-4 ring-red-500' : ''}
        relative group transition-all duration-300 transform hover:scale-105 hover:z-10
        ${className}
    `;

    // Determine stat badge color
    const attackBadgeColor = bonusDamage > 0
        ? 'from-green-500 to-green-600'
        : bonusDamage < 0
            ? 'from-red-500 to-red-600'
            : 'from-slate-600 to-slate-700';

    return (
        <>
            {/* Portal for Large Preview */}
            {showPreview && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleContextMenuRelease}>
                    <div className="relative transform scale-150 pointer-events-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <Card
                            card={card}
                            isPlayable={false}
                            showHealth={showHealth}
                            bonusDamage={bonusDamage}
                        />
                    </div>
                </div>,
                document.body
            )}

            <div
                className={cardClasses}
                onClick={isPlayable ? onClick : undefined}
                onContextMenu={handleContextMenu}
                style={{ width: '140px', height: '200px' }} // Reduced size by ~20%
            >
                {/* Cost Badge */}
                <div className={`absolute top-1 left-1 w-8 h-8 rounded-full ${isWittgenstein ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'} flex items-center justify-center font-bold text-lg shadow-lg z-10 border-2 ${isWittgenstein ? 'border-yellow-200' : 'border-white'}`}>
                    {card.cost}
                </div>

                {/* Rarity Gem */}
                <div className={`absolute top-1 right-1 w-6 h-6 rounded-full bg-gradient-to-br ${rarityColors[card.rarity]} flex items-center justify-center shadow-lg z-10`}>
                    <Sparkles size={14} className="text-white" />
                </div>

                {/* Card Image Area */}
                <div className={`h-24 ${isWittgenstein ? 'bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700' : 'bg-gradient-to-br from-slate-700 to-slate-800'} relative overflow-hidden flex items-center justify-center`}>
                    {card.image ? (
                        <img
                            src={card.image}
                            alt={card.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-4xl">{factionIcons[card.faction]}</div>
                    )}
                    {isMinion && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    )}
                    {isWittgenstein && (
                        <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/40 to-transparent animate-pulse" />
                    )}
                </div>

                {/* Card Name */}
                <div className={`px-2 py-1 ${isWittgenstein ? 'bg-gradient-to-r from-yellow-800 to-yellow-700' : 'bg-gradient-to-r from-slate-800 to-slate-700'}`}>
                    <h3 className={`font-bold text-xs text-center ${isWittgenstein ? 'text-yellow-100' : 'text-white'} truncate`}>
                        {card.name}
                    </h3>
                </div>

                {/* Description - Full Text with padding for absolute stats */}
                <div className={`px-2 py-1 flex-1 ${isWittgenstein ? 'bg-yellow-900/70' : 'bg-slate-800/90'} pb-8`}>
                    <p className={`text-[10px] ${isWittgenstein ? 'text-yellow-50 font-semibold' : 'text-gray-300'} italic leading-tight line-clamp-4`}>
                        {card.description}
                    </p>
                </div>

                {/* Stats for Minions - Absolute Positioned */}
                {isMinion && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-2 py-1 bg-slate-900/90 border-t border-slate-700/50 rounded-b-xl">
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

                {/* Spell Icon - Absolute Positioned */}
                {!isMinion && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center py-2 bg-slate-900/90 border-t border-slate-700/50 rounded-b-xl">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Zap size={16} />
                            <span className="text-xs font-semibold">ZAUBER</span>
                            <BookOpen size={16} />
                        </div>
                    </div>
                )}

                {/* Tooltip Overlay */}
                {isMinion && card.school && (
                    <div className="absolute inset-0 bg-black/90 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-center items-start text-xs z-20 pointer-events-none">
                        <div className="mb-2">
                            <span className="text-blue-400 font-bold block">Schule:</span>
                            <span className="text-gray-300">{card.school.join(', ')}</span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
