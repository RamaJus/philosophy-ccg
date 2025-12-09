import React, { useState } from 'react';
import { BoardMinion, Card as CardType } from '../types';
import { Card } from './Card';
import { Target, Link, ChevronLeft, ChevronRight } from 'lucide-react';

interface BoardProps {
    minions: BoardMinion[];
    onMinionClick?: (minionId: string) => void;
    selectedMinionId?: string;
    isPlayerBoard?: boolean;
    canTarget?: boolean;
    activeWork?: CardType;
    isSpecialTargeting?: boolean;
}

export const Board: React.FC<BoardProps> = ({
    minions,
    onMinionClick,
    selectedMinionId,
    isPlayerBoard = false,
    canTarget = false,
    activeWork,
    isSpecialTargeting = false
}) => {
    const [startIndex, setStartIndex] = useState(0);
    const VISIBLE_COUNT = 6;

    const handlePrev = () => {
        setStartIndex(prev => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setStartIndex(prev => Math.min(minions.length - VISIBLE_COUNT, prev + 1));
    };

    const visibleMinions = minions.slice(startIndex, startIndex + VISIBLE_COUNT);

    return (
        <div className={`glass-panel p-4 min-h-[300px] ${isPlayerBoard ? 'bg-blue-500/5' : 'bg-red-500/5'} ${isSpecialTargeting ? 'cursor-magic ring-2 ring-purple-500/50' : ''}`}>
            <h3 className="text-sm font-semibold mb-2 text-center text-gray-300">
                {isPlayerBoard ? 'Deine Philosophen' : 'Gegnerische Philosophen'}
            </h3>

            <div className="relative flex items-center justify-center">
                {/* Left Arrow */}
                {startIndex > 0 && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-0 z-10 p-2 bg-slate-800/80 rounded-full text-white hover:bg-slate-700 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                <div className="flex gap-3 justify-center flex-wrap px-8">
                    {minions.length === 0 ? (
                        <div className="flex items-center justify-center h-48 text-gray-500 italic w-full">
                            Keine Philosophen auf dem Schlachtfeld
                        </div>
                    ) : (
                        visibleMinions.map((minion, i) => {
                            // Calculate actual index in the full array for synergy check
                            const actualIndex = startIndex + i;

                            const canAttack = isPlayerBoard && minion.canAttack && !minion.hasAttacked;
                            const isTargetable = !isPlayerBoard && canTarget;

                            // Calculate Work Bonus
                            let bonusDamage = 0;
                            if (activeWork?.workBonus && minion.school?.includes(activeWork.workBonus.school)) {
                                bonusDamage = activeWork.workBonus.damage;
                            }

                            return (
                                <div key={minion.id} className="relative flex flex-col items-center gap-2">
                                    <Card
                                        card={minion}
                                        onClick={onMinionClick ? () => onMinionClick(minion.id) : undefined}
                                        isSelected={selectedMinionId === minion.id}
                                        isPlayable={canAttack || isTargetable}
                                        showHealth={true}
                                        bonusDamage={bonusDamage}
                                        className={`
                                            ${canAttack ? 'ring-2 ring-green-400' : ''}
                                            ${isTargetable && !isSpecialTargeting ? 'ring-2 ring-red-400 cursor-attack' : ''}
                                            ${isTargetable && isSpecialTargeting ? 'ring-2 ring-purple-400 cursor-magic' : ''}
                                            ${!minion.canAttack && isPlayerBoard && !minion.hasAttacked ? 'ring-4 ring-red-600' : ''}
                                            ${minion.hasAttacked || minion.hasUsedSpecial ? 'opacity-50' : ''}
                                        `}
                                    />
                                    {canAttack && (
                                        <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 animate-bounce">
                                            <Target size={16} className="text-white" />
                                        </div>
                                    )}

                                    {/* Synergy Link Logic - Check next minion in full array */}
                                    {minions[actualIndex + 1] && minion.linkedWith?.includes(minions[actualIndex + 1].id) && (
                                        <div className="absolute top-1/2 -right-5 transform -translate-y-1/2 z-20 flex flex-col items-center bg-slate-900/80 rounded-full p-1 border border-blue-500/50 backdrop-blur-sm">
                                            <Link size={14} className="text-blue-400" />
                                            <span className="text-[10px] font-bold text-blue-300 leading-none">+{minion.synergyBonus}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Right Arrow */}
                {startIndex + VISIBLE_COUNT < minions.length && (
                    <button
                        onClick={handleNext}
                        className="absolute right-0 z-10 p-2 bg-slate-800/80 rounded-full text-white hover:bg-slate-700 transition-colors"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>
        </div>
    );
};
