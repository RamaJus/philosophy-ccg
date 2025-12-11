import React, { useState } from 'react';
import { BoardMinion, Card as CardType } from '../types';
import { Card } from './Card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BoardProps {
    minions: BoardMinion[];
    onMinionClick?: (minionId: string) => void;
    selectedMinionIds?: string[];
    isPlayerBoard?: boolean;
    canTarget?: boolean;
    activeWork?: CardType;
    isSpecialTargeting?: boolean;
    synergiesBlocked?: boolean;
}

export const Board: React.FC<BoardProps> = ({
    minions,
    onMinionClick,
    selectedMinionIds = [],
    isPlayerBoard = false,
    canTarget = false,
    activeWork,
    isSpecialTargeting = false,
    synergiesBlocked = false
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
                {synergiesBlocked && <span className="block text-xs text-red-400 font-bold animate-pulse mt-1">⚠ SCHUL-SYNERGIEN BLOCKIERT</span>}
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
                        visibleMinions.map((minion) => {
                            const canAttack = isPlayerBoard && minion.canAttack && !minion.hasAttacked;
                            const isTargetable = canTarget;

                            // Calculate Work Bonus
                            let bonusDamage = 0;
                            if (activeWork?.workBonus && minion.school?.includes(activeWork.workBonus.school)) {
                                bonusDamage = activeWork.workBonus.damage;
                            }

                            return (
                                <div key={minion.instanceId || minion.id} className="relative flex flex-col items-center gap-2">
                                    <Card
                                        card={minion}
                                        onClick={onMinionClick ? () => onMinionClick(minion.instanceId || minion.id) : undefined}
                                        isSelected={selectedMinionIds.includes(minion.instanceId || minion.id)}
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
