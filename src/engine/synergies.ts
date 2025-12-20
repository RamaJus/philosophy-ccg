import { BoardMinion } from '../types';

// Synergy Logic
// Each philosopher gets +1 synergy for each OTHER distinct philosopher they share at least one school with.
// Multiple shared schools with the same philosopher only count as +1, not more.
// We also track which schools contributed to the synergy for hover display.
export const calculateSynergies = (currentBoard: BoardMinion[], synergyBlockTurns: number = 0): BoardMinion[] => {
    // RESET all synergy values first
    const resetBoard = currentBoard.map(minion => ({
        ...minion,
        attack: minion.attack - (minion.synergyBonus || 0),
        synergyBonus: 0,
        synergyBreakdown: {}
    })).map(m => {
        // Safety check to ensure health doesn't drop below 1 from removing bonuses (unless it was already 0)
        return {
            ...m,
            health: m.health > 0 ? Math.max(1, m.health) : 0
        };
    });

    // If synergies are blocked, return board with cleared bonuses
    if (synergyBlockTurns > 0) {
        return resetBoard;
    }

    const updatedBoard = [...resetBoard];
    const schoolCounts: Record<string, Record<string, number>> = {};

    // Initialize counts
    updatedBoard.forEach(minion => {
        schoolCounts[minion.instanceId || minion.id] = {};
    });

    // 1. Calculate school synergies (Self + Connection)
    for (let i = 0; i < updatedBoard.length; i++) {
        for (let j = i + 1; j < updatedBoard.length; j++) {
            const m1 = updatedBoard[i];
            const m2 = updatedBoard[j];

            // Find all shared schools between m1 and m2
            const sharedSchools = m1.school?.filter(s => m2.school?.includes(s)) || [];

            if (sharedSchools.length > 0) {
                const representativeSchool = sharedSchools[0];

                schoolCounts[m1.instanceId || m1.id][representativeSchool] = (schoolCounts[m1.instanceId || m1.id][representativeSchool] || 0) + 1;
                schoolCounts[m2.instanceId || m2.id][representativeSchool] = (schoolCounts[m2.instanceId || m2.id][representativeSchool] || 0) + 1;
            }
        }
    }

    // 3. Calculate individual synergy bonuses
    const finalBoard = updatedBoard.map(minion => {
        const breakdown = schoolCounts[minion.instanceId || minion.id];
        const bonus = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

        return {
            ...minion,
            attack: minion.attack + bonus,
            synergyBonus: bonus,
            synergyBreakdown: breakdown
        };
    });

    return finalBoard;
};
