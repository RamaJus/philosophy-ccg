import React from 'react';
import { BoardMinion, Card as CardType } from '../types';
import { Card } from './Card';
import { Target } from 'lucide-react';

interface BoardProps {
    minions: BoardMinion[];
    onMinionClick?: (minionId: string) => void;
    onSpecialClick?: (minionId: string) => void;
    selectedMinionId?: string;
    isPlayerBoard?: boolean;
    canTarget?: boolean;
    activeWork?: CardType;
}

export const Board: React.FC<BoardProps> = ({
    minions,
    onMinionClick,
    onSpecialClick,
    selectedMinionId,
    isPlayerBoard = false,
    canTarget = false,
    activeWork
}) => {
    return (
        <div className={`glass-panel p-4 min-h-[300px] ${isPlayerBoard ? 'bg-blue-500/5' : 'bg-red-500/5'}`}>
            <h3 className="text-sm font-semibold mb-2 text-center text-gray-300">
                {isPlayerBoard ? 'Deine Philosophen' : 'Gegnerische Philosophen'}
            </h3>
            <div className="flex gap-3 justify-center flex-wrap">
                {minions.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-gray-500 italic">
                        Keine Philosophen auf dem Schlachtfeld
                    </div>
                ) : (
                    minions.map((minion) => {
                        const canAttack = isPlayerBoard && minion.canAttack && !minion.hasAttacked;
                        const canUseSpecial = isPlayerBoard && minion.specialAbility && minion.canAttack && !minion.hasAttacked && !minion.hasUsedSpecial;
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
                                        ${isTargetable ? 'ring-2 ring-red-400 cursor-crosshair' : ''}
                                        ${!minion.canAttack && isPlayerBoard && !minion.hasAttacked ? 'ring-4 ring-red-600' : ''}
                                        ${minion.hasAttacked || minion.hasUsedSpecial ? 'opacity-50' : ''}
                                    `}
                                />
                                {canAttack && (
                                    <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 animate-bounce">
                                        <Target size={16} className="text-white" />
                                    </div>
                                )}
                                {canUseSpecial && onSpecialClick && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSpecialClick(minion.id);
                                        }}
                                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-lg transition-colors border-2 border-purple-400"
                                    >
                                        ⚡ SPEZIAL
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
