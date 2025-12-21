import { Effect, EffectType } from './effects';
export type { Effect, EffectType };

export type CardType = 'Philosoph' | 'Zauber' | 'Werk';

export interface Card {
    instanceId?: string; // Unique ID for this specific card instance (assigned at runtime)
    id: string; // Base ID from database (e.g. 'kant')
    name: string;
    type: CardType;
    cost: number;
    description: string; // Philosophy/flavor text (shown on hover)
    effect?: string; // Game mechanic description (shown in tooltip)
    attack?: number;  // Only for minions
    health?: number;  // Only for minions
    maxHealth?: number; // Only for minions (to track damage)
    image?: string;
    rarity: 'Gewöhnlich' | 'Selten' | 'Legendär';
    school?: string[]; // e.g. 'rationalism', 'empiricism', 'religion'
    workBonus?: { school: string; damage: number }; // For 'work' cards
    specialAbility?: 'transform'; // Special abilities for certain cards
    special?: { name: string; description: string }; // Named special abilities like Marx
    effects?: Effect[]; // New Rule Engine effects
    gender?: 'male' | 'female'; // For internal logic/synergies
    pendingTransformation?: { turnTrigger: number; newStats: { attack: number; health: number; } }; // For Sartre
    returnToOwnerAtTurnEnd?: string; // ID of original owner for stolen minions
    untargetableForTurns?: number; // Diogenes: Cannot be attacked for X turns after placement
}

export interface BoardMinion extends Card {
    type: 'Philosoph';
    attack: number;
    health: number;
    maxHealth: number;
    canAttack: boolean; // Summoning sickness
    hasAttacked: boolean; // This turn
    hasUsedSpecial: boolean; // Used special ability this turn
    specialExhausted?: boolean; // Permanently exhausted until resurrection (one-time-per-life abilities)
    transformedFrom?: BoardMinion; // Original minion before transformation
    transformationEndsTurn?: number; // Turn number when transformation should revert
    synergyBonus?: number; // Current synergy bonus (+X/+X)
    synergyBreakdown?: Record<string, number>; // Per-school synergy counts, e.g. { "Ethik": 2, "Skeptizismus": 1 }
    turnPlayed?: number; // Turn when this minion was played (for Diogenes)
    silencedUntilTurn?: number; // Turn until the minion is silenced (cannot attack)
    pendingTransformation?: { turnTrigger: number; newStats: { attack: number; health: number; } }; // For Sartre
    untargetableUntilTurn?: number; // Diogenes: Cannot be targeted until this turn
    caveAscentRevertTurn?: number; // Turn when cave ascent effect reverts
    caveAscentOriginalStats?: { attack: number; health: number }; // Original stats before cave ascent
}

export interface Player {
    id: string;
    name: string;
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    deck: Card[];
    hand: Card[];
    board: BoardMinion[];
    graveyard: Card[];
    lockedMana: number; // Mana locked for the next turn
    currentTurnManaMalus?: number; // Visual tracker for mana locked THIS turn (since lockedMana resets to 0)
    currentTurnBonusMana?: number; // Visual tracker for bonus mana obtained this turn
    activeWork?: Card; // Currently active philosophical work
    synergyBlockTurns?: number; // Number of turns synergy bonuses are disabled
    minionAttackBlockTurns?: number; // Number of turns opponent minions cannot attack (Kant)
}

export interface GameState {
    turn: number;
    activePlayer: 'player' | 'opponent';
    player: Player;
    opponent: Player;
    gameOver: boolean;
    winner?: 'player' | 'opponent';
    selectedCard?: string; // Card instanceId in hand
    pendingPlayedCard?: Card; // Card currently being cast (for cancellation refund checks)
    selectedMinions?: string[]; // Minion instanceIds on board for attacking (multi-select)
    targetMode?: 'attack' | 'spell' | 'search' | 'transform' | 'friendly_minion_transform' | 'trolley_sacrifice' | 'special' | 'foucault_reveal' | 'gottesbeweis_target' | 'nietzsche_target' | 'van_inwagen_target' | 'arete_target' | 'cave_ascent_target' | 'recurrence_select' | 'discover'; // What we're targeting for
    targetModeOwner?: 'player' | 'opponent'; // Who initiated the targetMode (for multiplayer modal visibility)
    discoveryCards?: Card[]; // Generic storage for DISCOVER/Search effects
    recurrenceCards?: Card[]; // Cards in graveyard available for 'Ewige Wiederkunft'
    foucaultRevealCards?: Card[]; // Top 3 opponent cards for Foucault reveal
    log: string[]; // Game log messages
    lastPlayedCard?: Card; // For visual flash effect of performed spells
    lastPlayedCardPlayerId?: 'player' | 'opponent'; // Who played the spell
}

export type GameAction =
    | { type: 'START_GAME'; isDebugMode?: boolean }
    | { type: 'END_TURN' }
    | { type: 'PLAY_CARD'; cardId: string } // Uses instanceId
    | { type: 'ATTACK'; attackerIds: string[]; targetId?: string } // Uses instanceIds
    | { type: 'USE_SPECIAL'; minionId: string; targetId?: string } // Uses instanceIds
    | { type: 'SELECT_CARD'; cardId?: string } // Uses instanceId
    | { type: 'SELECT_MINION'; minionId: string; toggle?: boolean } // Uses instanceId
    | { type: 'SEARCH_DECK'; cardId: string } // Legacy: Manual select from deck
    | { type: 'AUTO_SEARCH_DECK'; filter: (card: any) => boolean; amount: number; activePlayerId?: string }
    | { type: 'TROLLEY_SACRIFICE'; minionId: string } // Uses instanceId
    | { type: 'SELECT_DISCOVERY'; cardId: string } // For picking a card from discoveryCards
    | { type: 'FOUCAULT_CLOSE' }
    | { type: 'FOUCAULT_CLOSE' }

    | { type: 'GOTTESBEWEIS_TARGET'; minionId: string } // Uses instanceId
    | { type: 'NIETZSCHE_TARGET'; minionId: string } // Uses instanceId
    | { type: 'VAN_INWAGEN_TARGET'; minionId: string } // Uses instanceId
    | { type: 'ARETE_TARGET'; minionId: string } // Full heal target
    | { type: 'CAVE_ASCENT_TARGET'; minionId: string } // +2 atk/-2 hp for 1 round
    | { type: 'RECURRENCE_SELECT'; cardId: string } // Uses instanceId
    | { type: 'CANCEL_CAST' }
    | { type: 'SYNC_STATE'; newState: GameState };
