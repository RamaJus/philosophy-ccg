import React, { useState, useEffect, useRef } from 'react';
import { Card as CardType, BoardMinion } from '../types';
import { Swords, Heart, Zap, Sparkles, BookOpen } from 'lucide-react';

interface CardProps {
    card: CardType | BoardMinion;
    onClick?: () => void;
    isSelected?: boolean;
    isPlayable?: boolean;
    showHealth?: boolean;
    className?: string;
}

const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-orange-400 to-orange-600',
};

const factionIcons = {
    western: '🏛️',
    eastern: '☯️',
    universal: '🌍',
};

export const Card: React.FC<CardProps> = ({
    card,
    onClick,
    isSelected,
    isPlayable,
    showHealth = false,
    className = ''
}) => {
    const isMinion = card.type === 'minion';
    const boardMinion = showHealth ? (card as BoardMinion) : null;
    const isWittgenstein = card.id.includes('wittgenstein');

    // Damage animation state
    const [isDamaged, setIsDamaged] = useState(false);
    const currentHealth = boardMinion ? boardMinion.health : (card as any).health;
    const prevHealth = useRef(currentHealth);

    useEffect(() => {
        if (currentHealth !== undefined && prevHealth.current !== undefined && currentHealth < prevHealth.current) {
            setIsDamaged(true);
            const timer = setTimeout(() => setIsDamaged(false), 500);
            return () => clearTimeout(timer);
        }
        prevHealth.current = currentHealth;
    }, [currentHealth]);

    const cardClasses = `
        ${isMinion ? 'card-minion' : 'card-spell'}
        ${isSelected ? 'ring-4 ring-yellow-400 scale-110' : ''}
        ${isPlayable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}
        ${isWittgenstein ? 'ring-4 ring-yellow-500 shadow-2xl shadow-yellow-500/50' : ''}
        ${isDamaged ? 'animate-shake ring-4 ring-red-500' : ''}
        ${className}
    `;

    return (
        <div
            className={cardClasses}
            onClick={isPlayable ? onClick : undefined}
            style={{ width: '180px', height: '260px' }}
        >
            {/* Cost Badge */}
            <div className={`absolute top-2 left-2 w-10 h-10 rounded-full ${isWittgenstein ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'} flex items-center justify-center font-bold text-xl shadow-lg z-10 border-2 ${isWittgenstein ? 'border-yellow-200' : 'border-white'}`}>
                {card.cost}
            </div>

            {/* Rarity Gem */}
            <div className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br ${rarityColors[card.rarity]} flex items-center justify-center shadow-lg z-10`}>
                <Sparkles size={16} className="text-white" />
            </div>

            {/* Card Image Area */}
            <div className={`h-32 ${isWittgenstein ? 'bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700' : 'bg-gradient-to-br from-slate-700 to-slate-800'} relative overflow-hidden flex items-center justify-center`}>
                <div className="text-6xl">{factionIcons[card.faction]}</div>
                {isMinion && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                )}
                {isWittgenstein && (
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/40 to-transparent animate-pulse" />
                )}
            </div>

            {/* Card Name */}
            <div className={`px-3 py-2 ${isWittgenstein ? 'bg-gradient-to-r from-yellow-800 to-yellow-700' : 'bg-gradient-to-r from-slate-800 to-slate-700'}`}>
                <h3 className={`font-bold text-sm text-center ${isWittgenstein ? 'text-yellow-100' : 'text-white'} truncate`}>
                    {card.name}
                </h3>
            </div>

            {/* Description */}
            <div className={`px-3 py-2 flex-1 ${isWittgenstein ? 'bg-yellow-900/70' : 'bg-slate-800/90'}`}>
                <p className={`text-xs ${isWittgenstein ? 'text-yellow-50 font-semibold' : 'text-gray-300'} italic leading-tight line-clamp-3`}>
                    {card.description}
                </p>
            </div>

            {/* Stats for Minions */}
            {isMinion && (
                <div className="flex justify-between items-center px-3 py-2 bg-slate-900/90">
                    <div className="flex items-center gap-1 stat-badge from-red-500 to-red-600">
                        <Swords size={14} />
                        <span>{card.attack}</span>
                    </div>

                    {boardMinion ? (
                        <div className={`flex items-center gap-1 stat-badge ${boardMinion.health < boardMinion.maxHealth
                            ? 'from-orange-500 to-red-600'
                            : 'from-green-500 to-green-600'
                            }`}>
                            <Heart size={14} />
                            <span>{boardMinion.health}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 stat-badge from-green-500 to-green-600">
                            <Heart size={14} />
                            <span>{card.health}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Spell Icon */}
            {!isMinion && (
                <div className="flex justify-center items-center py-2 bg-slate-900/90">
                    <div className="flex items-center gap-2 text-purple-400">
                        <Zap size={16} />
                        <span className="text-xs font-semibold">ZAUBER</span>
                        <BookOpen size={16} />
                    </div>
                </div>
            )}
        </div>
    );
};
