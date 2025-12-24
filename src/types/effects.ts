export type EffectType =
    | 'DAMAGE'
    | 'HEAL'
    | 'DRAW'
    | 'MANA_MOD' // For adding temporary mana or locking enemy mana
    | 'SYNERGY_BLOCK'
    | 'SILENCE'
    | 'TRANSFORM' // Placeholder for complex effects
    | 'DESTROY' // For removing minions
    | 'DESTROY_SCHOOL' // Protagoras: destroy all enemy minions of a school
    | 'DISCOVER' // For looking at top cards and picking one
    | 'SEARCH' // For searching entire deck
    | 'TARGET_MODE' // For spells that require targeting (sets targetMode)
    | 'REVEAL' // For revealing opponent's cards (Foucault)
    | 'BOARD_CLEAR' // Wittgenstein
    | 'STEAL_MINION' // Marx
    | 'SWAP_STATS' // Camus
    | 'RECURRENCE' // Ewige Wiederkunft
    | 'PROTECT' // Diogenes/Kant
    | 'HEAL_ALL_MINIONS' // Idee des Guten
    | 'RANDOMIZE_NEXT_MINION' // Non Sequitur
    | 'BALANCE_HEALTH' // Mesotes
    | 'JONAS_PROTECTION'; // Hans Jonas: protect own minions for 1 enemy turn

export interface Effect {
    type: EffectType;
    target: 'SELF' | 'ENEMY' | 'ALL' | 'TARGET'; // TARGET implies user selection
    value?: number; // Generic value (damage amount, cards to draw, etc.)
    duration?: number; // For temporary effects like Silence/Synergy Block
    condition?: string; // Optional condition string (e.g. 'MALE', 'LOWEST_COST')
    mode?: string; // For TARGET_MODE
    transformTo?: Partial<import('./index').BoardMinion>; // For TRANSFORM effect
    school?: string; // For DESTROY_SCHOOL effect
}
