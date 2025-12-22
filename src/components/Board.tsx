import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardMinion, Card as CardType } from '../types';
import { Card } from './Card';
import { ChevronLeft, ChevronRight, Shield, Clock, VolumeX } from 'lucide-react';

interface BoardProps {
    minions: BoardMinion[];
    onMinionClick?: (minionId: string) => void;
    selectedMinionIds?: string[];
    isPlayerBoard?: boolean;
    canTarget?: boolean;
    activeWork?: CardType;
    isSpecialTargeting?: boolean;
    synergiesBlocked?: boolean;
    attacksBlocked?: boolean;
    currentTurn?: number;
    isMyTurn?: boolean;
    attackingMinionIds?: string[];
}

export const Board: React.FC<BoardProps> = ({
    minions,
    onMinionClick,
    selectedMinionIds = [],
    isPlayerBoard = false,
    canTarget = false,
    activeWork,
    isSpecialTargeting = false,
    synergiesBlocked = false,
    attacksBlocked = false,
    currentTurn = 0,
    isMyTurn = false,
    attackingMinionIds = []
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
        <div className={`glass-panel p-4 min-h-[300px] transition-all duration-500 ${isPlayerBoard ? 'bg-blue-500/5' : 'bg-red-500/5'} ${isSpecialTargeting ? 'cursor-magic ring-2 ring-purple-500/50' : ''} ${isPlayerBoard && isMyTurn ? 'ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20' : ''}`}>
            {/* Status warnings */}
            {(synergiesBlocked || attacksBlocked) && (
                <div className="text-center mb-2">
                    {synergiesBlocked && <span className="block text-xs text-red-400 font-bold animate-pulse">⚠ SCHUL-SYNERGIEN BLOCKIERT</span>}
                    {attacksBlocked && <span className="block text-xs text-red-400 font-bold animate-pulse">⚠ ANGRIFFE AUF PHILOSOPHEN BLOCKIERT (KANT)</span>}
                </div>
            )}

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

                <div className="flex gap-5 justify-center overflow-visible px-8 pt-4 min-h-[220px] relative z-10">
                    <AnimatePresence mode="popLayout">
                        {minions.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center justify-center h-48 text-gray-500 italic w-full"
                            >
                                Keine Philosophen auf dem Schlachtfeld
                            </motion.div>
                        ) : (
                            visibleMinions.map((minion) => {
                                // Kant's block only applies to minion-vs-minion attacks, not face attacks.
                                // So we show minions as attackable, but highlight that minion targets are blocked.
                                const canAttack = isPlayerBoard && minion.canAttack && !minion.hasAttacked;
                                const isDiogenesInBarrel = minion.id.includes('diogenes') && minion.turnPlayed !== undefined && (currentTurn - minion.turnPlayed < 3);
                                const isAttackMode = selectedMinionIds.length > 0 && !isSpecialTargeting;
                                // Kant logic: attacksBlocked prevents attacking Philosophers
                                const isKantBlocked = attacksBlocked && minion.type === 'Philosoph';

                                // Combined blocked check: Diogenes OR Kant
                                const isBlocked = (isDiogenesInBarrel || isKantBlocked) && isAttackMode && !isPlayerBoard;

                                const isTargetable = canTarget && !isBlocked;

                                // Calculate Work Bonus (Health)
                                let bonusHealth = 0;
                                if (activeWork?.workBonus && minion.school?.includes(activeWork.workBonus.school)) {
                                    bonusHealth = activeWork.workBonus.health;
                                }

                                // Status Effects
                                const isSilenced = minion.silencedUntilTurn && minion.silencedUntilTurn > currentTurn;
                                const isPendingTransform = minion.pendingTransformation;

                                return (
                                    <motion.div
                                        key={minion.instanceId || minion.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8, y: -20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0, transition: { duration: 0.3 } }}
                                        className="relative flex flex-col items-center gap-2"
                                    >
                                        <div className="relative">
                                            <Card
                                                card={minion}
                                                onClick={onMinionClick ? () => onMinionClick(minion.instanceId || minion.id) : undefined}
                                                isSelected={selectedMinionIds.includes(minion.instanceId || minion.id)}
                                                isPlayable={(canAttack && !isSilenced) || isTargetable}
                                                showHealth={true}
                                                bonusDamage={bonusHealth}
                                                isAttacking={attackingMinionIds.includes(minion.instanceId || minion.id)}
                                                className={`
                                                    ${canAttack && !isSilenced ? 'ring-2 ring-green-400' : ''}
                                                    ${isTargetable && !isSpecialTargeting ? 'ring-2 ring-red-400 cursor-attack' : ''}
                                                    ${isTargetable && isSpecialTargeting ? 'ring-2 ring-purple-400 cursor-magic' : ''}
                                                    ${minion.hasAttacked || minion.hasUsedSpecial ? 'opacity-50' : ''}
                                                    ${/* IMPOSSIBLE CURSOR LOGIC */ ''}
                                                    ${!isPlayerBoard && !isTargetable && (selectedMinionIds.length > 0 || isSpecialTargeting) ? 'cursor-impossible' : ''}
                                                    ${/* ADD CURSOR LOGIC - Hovering own minion while another is selected (for multi-select) */ ''}
                                                    ${isPlayerBoard && !selectedMinionIds.includes(minion.instanceId || minion.id) && selectedMinionIds.length > 0 ? 'cursor-add' : ''}
                                                `}
                                            />
                                            {isSilenced && (
                                                <div className="absolute bottom-11 right-1 flex items-center gap-1 bg-black/70 rounded-full px-1.5 py-0.5" title={`Verstummt für ${(minion.silencedUntilTurn || 0) - currentTurn} Runde(n) (Diotima)`}>
                                                    <VolumeX size={10} className="text-red-400" />
                                                    <span className="text-[10px] font-bold text-white">{Math.max(0, (minion.silencedUntilTurn || 0) - currentTurn)}</span>
                                                </div>
                                            )}
                                            {isPendingTransform && minion.pendingTransformation && minion.turnPlayed !== undefined && (
                                                <div className="absolute bottom-11 right-1 flex items-center gap-1 bg-black/70 rounded-full px-1.5 py-0.5" title={`Transformation in ${Math.max(0, (minion.turnPlayed + 2) - currentTurn)} Runde(n) (Sartre)`}>
                                                    <Clock size={10} className="text-blue-400" />
                                                    <span className="text-[10px] font-bold text-white">{Math.max(0, (minion.turnPlayed + 2) - currentTurn)}</span>
                                                </div>
                                            )}
                                            {minion.untargetableUntilTurn && minion.untargetableUntilTurn > currentTurn && (
                                                <div className="absolute bottom-11 right-1 flex items-center gap-1 bg-black/70 rounded-full px-1.5 py-0.5" title={`Geschützt für ${minion.untargetableUntilTurn - currentTurn} Runde(n) (Diogenes)`}>
                                                    <Shield size={10} className="text-blue-400" />
                                                    <span className="text-[10px] font-bold text-white">{minion.untargetableUntilTurn - currentTurn}</span>
                                                </div>
                                            )}

                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
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
