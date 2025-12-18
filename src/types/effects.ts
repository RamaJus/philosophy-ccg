export type EffectType =
    | 'DAMAGE'
    | 'HEAL'
    | 'DRAW'
    | 'MANA_MOD' // For adding temporary mana or locking enemy mana
    | 'SYNERGY_BLOCK'
    | 'SILENCE'
    | 'TRANSFORM' // Placeholder for complex effects
    | 'DESTROY' // For removing minions
    | 'DISCOVER' // For looking at top cards and picking one
    | 'SEARCH'; // For searching entire deck

export interface Effect {
    type: EffectType;
    target: 'SELF' | 'ENEMY' | 'ALL' | 'TARGET'; // TARGET implies user selection
    value?: number; // Generic value (damage amount, cards to draw, etc.)
    duration?: number; // For temporary effects like Silence/Synergy Block
    condition?: string; // Optional condition string
}
