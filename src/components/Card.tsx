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
    const baseAttack = card.attack || 0;
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
        ${className}
    `;

    return (
        <>
            {/* Large Preview Overlay - Redesigned for readability */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] backdrop-blur-md p-4">
                    <div className="bg-slate-900 border-2 border-amber-600/50 rounded-xl max-w-2xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl">
                        {/* Left Side: Card Visual */}
                        <div className="p-6 flex justify-center items-center bg-slate-950/50 md:w-1/2 md:border-r border-slate-800">
                            <div
                                className={`${cardClasses} shadow-2xl transform scale-110`}
                                style={{ width: '180px', height: '260px', pointerEvents: 'none' }}
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
                                    {card.image ? (
                                        <img
                                            src={card.image}
                                            alt={card.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-6xl">{factionIcons[card.faction]}</div>
                                    )}
                                    {isMinion && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    )}
                                </div>

                                {/* Card Name */}
                                <div className={`px-3 py-2 ${isWittgenstein ? 'bg-gradient-to-r from-yellow-800 to-yellow-700' : 'bg-gradient-to-r from-slate-800 to-slate-700'}`}>
                                    <h3 className={`font-bold text-sm text-center ${isWittgenstein ? 'text-yellow-100' : 'text-white'} truncate`}>
                                        {card.name}
                                    </h3>
                                </div>

                                {/* Short Description Preview */}
                                <div className={`px-3 py-2 flex-1 ${isWittgenstein ? 'bg-yellow-900/70' : 'bg-slate-800/90'}`}>
                                    <p className={`text-[10px] ${isWittgenstein ? 'text-yellow-50 font-semibold' : 'text-gray-300'} italic leading-tight line-clamp-3`}>
                                        {card.description}
                                    </p>
                                </div>

                                {/* Stats */}
                                {isMinion && (
                                    <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-3 py-2 bg-slate-900/90 border-t border-slate-700/50">
                                        <div className={`flex items-center gap-1 stat-badge ${bonusDamage > 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}`}>
                                            <Swords size={14} />
                                            <span>{totalAttack}</span>
                                        </div>
                                        <div className="flex items-center gap-1 stat-badge from-green-500 to-green-600">
                                            <Heart size={14} />
                                            <span>{card.health}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Detailed Info */}
                        <div className="p-6 md:w-1/2 flex flex-col gap-4 overflow-y-auto max-h-[60vh] md:max-h-none text-left">
                            <div>
                                <h2 className="text-2xl font-bold text-amber-100 mb-1">{card.name}</h2>
                                <div className="flex gap-2 text-xs text-amber-400/80 uppercase tracking-wider font-semibold">
                                    <span>{card.rarity}</span>
                                    <span>•</span>
                                    <span>{card.faction}</span>
                                    <span>•</span>
                                    <span>{card.type}</span>
                                </div>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <p className="text-gray-200 italic leading-relaxed text-sm">
                                    "{card.description}"
                                </p>
                            </div>

                            <div className="space-y-3">
                                {card.workBonus && (
                                    <div className="bg-amber-900/20 p-3 rounded border border-amber-500/30">
                                        <span className="text-amber-400 font-bold text-sm block mb-1">Bonus Effekt:</span>
                                        <span className="text-amber-100 text-sm">+{card.workBonus.damage} Schaden für {card.workBonus.school}</span>
                                    </div>
                                )}

                                {card.school && (
                                    <div>
                                        <span className="text-blue-400 font-bold text-sm block mb-1">Schule(n):</span>
                                        <div className="flex flex-wrap gap-2">
                                            {card.school.map(s => (
                                                <span key={s} className="px-2 py-1 bg-blue-900/40 border border-blue-700/50 rounded text-xs text-blue-200">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Regular Card */}
            <div
                className={`${cardClasses} group relative`}
                onClick={isPlayable ? onClick : undefined}
                onContextMenu={handleContextMenu}
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
                    {card.image ? (
                        <img
                            src={card.image}
                            alt={card.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-6xl">{factionIcons[card.faction]}</div>
                    )}
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

                {/* Description - Full Text with padding for absolute stats */}
                <div className={`px-3 py-2 flex-1 ${isWittgenstein ? 'bg-yellow-900/70' : 'bg-slate-800/90'} pb-10`}>
                    <p className={`text-xs ${isWittgenstein ? 'text-yellow-50 font-semibold' : 'text-gray-300'} italic leading-tight line-clamp-4`}>
                        {card.description}
                    </p>
                </div>

                {/* Stats for Minions - Absolute Positioned */}
                {isMinion && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-3 py-2 bg-slate-900/90 border-t border-slate-700/50 rounded-b-xl">
                        <div className={`flex items-center gap-1 stat-badge ${bonusDamage > 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'}`}>
                            <Swords size={14} />
                            <span>{totalAttack}</span>
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
