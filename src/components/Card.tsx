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

    const [isDamaged, setIsDamaged] = useState(false);
    const currentHealth = boardMinion ? boardMinion.health : (card as any).health;
    const prevHealth = useRef(currentHealth);

    const baseAttack = boardMinion ? boardMinion.attack : (card.attack || 0);
    const totalAttack = baseAttack + bonusDamage;

    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (currentHealth !== undefined && prevHealth.current !== undefined && currentHealth < prevHealth.current) {
            setIsDamaged(true);
            const timer = setTimeout(() => setIsDamaged(false), 500);
            return () => clearTimeout(timer);
        }
        prevHealth.current = currentHealth;
    }, [currentHealth]);

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
                        <div className="relative transform scale-150 shadow-2xl">
                            <Card
                                card={card}
                                isPlayable={false}
                                showHealth={showHealth}
                                bonusDamage={bonusDamage}
                            />
                        </div>

                        <div className="w-[200px] h-[300px] bg-slate-900/95 border border-slate-600 rounded-xl p-4 text-white shadow-2xl flex flex-col gap-3 overflow-y-auto">
                            <h3 className="text-lg font-bold text-amber-400 border-b border-slate-700 pb-2">{card.name}</h3>

                            <div className="space-y-1">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Fraktion</span>
                                <p className="text-sm font-medium">{card.faction} {factionIcons[card.faction]}</p>
                            </div>

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

                            <div className="space-y-1 mt-auto pt-2 border-t border-slate-700">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Typ</span>
                                <p className="text-sm font-medium">{card.type}</p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div
                className={cardClasses}
                onClick={isPlayable ? onClick : undefined}
                onContextMenu={handleContextMenu}
                style={{ width: '140px', height: '200px' }}
            >
                <div className={`px-2 py-1 rounded-t-xl ${isWittgenstein ? 'bg-gradient-to-r from-yellow-800 to-yellow-700' : 'bg-gradient-to-r from-slate-800 to-slate-700'}`}>
                    <h3 className={`font-bold text-xs text-center ${isWittgenstein ? 'text-yellow-100' : 'text-white'} truncate`}>
                        {card.name}
                    </h3>
                </div>

                <div className={`absolute top-8 left-1 w-8 h-8 rounded-full ${isWittgenstein ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600' : 'bg-gradient-to-br from-blue-400 to-blue-600'} flex items-center justify-center font-bold text-lg shadow-lg z-10 border-2 ${isWittgenstein ? 'border-yellow-200' : 'border-white'}`}>
                    {card.cost}
                </div>

                <div className={`absolute top-8 right-1 w-6 h-6 rounded-full bg-gradient-to-br ${rarityColors[card.rarity]} flex items-center justify-center shadow-lg z-10`}>
                    <Sparkles size={14} className="text-white" />
                </div>

                <div className={`h-24 ${isWittgenstein ? 'bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700' : 'bg-cover bg-center'} relative overflow-hidden flex items-center justify-center`}
                    style={!isWittgenstein ? {
                        backgroundImage: 'url(/card-background.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    } : undefined}>
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

                <div className={`px-2 py-1 flex-1 rounded-b-xl ${isWittgenstein ? 'bg-yellow-900/70' : 'bg-cover bg-center'} pb-8`}
                    style={!isWittgenstein ? {
                        backgroundImage: 'url(/card-background.jpg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    } : undefined}>
                    <p className={`text-[10px] ${isWittgenstein ? 'text-yellow-50 font-semibold' : 'text-amber-900'} italic leading-tight line-clamp-4 font-semibold`}>
                        {card.description}
                    </p>
                </div>

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

                {!isMinion && (
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center py-2 bg-slate-900/90 border-t border-slate-700/50 rounded-b-xl">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Zap size={16} />
                            <span className="text-xs font-semibold">ZAUBER</span>
                            <BookOpen size={16} />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
