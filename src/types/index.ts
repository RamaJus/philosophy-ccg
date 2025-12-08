export type CardType = 'Philosoph' | 'Zauber' | 'Werk';

export interface Card {
    id: string;
    name: string;
    type: CardType;
    cost: number;
    description: string;
    attack?: number;  // Only for minions
    health?: number;  // Only for minions
    maxHealth?: number; // Only for minions (to track damage)
    image?: string;
    rarity: 'Gewöhnlich' | 'Selten' | 'Episch' | 'Legendär';
    school?: string[]; // e.g. 'rationalism', 'empiricism', 'religion'
    workBonus?: { school: string; damage: number }; // For 'work' cards
    specialAbility?: 'transform'; // Special abilities for certain cards
    special?: { name: string; description: string }; // Named special abilities like Marx
}

export interface BoardMinion extends Card {
    type: 'Philosoph';
    attack: number;
    health: number;
    maxHealth: number;
    canAttack: boolean; // Summoning sickness
    hasAttacked: boolean; // This turn
    hasUsedSpecial: boolean; // Used special ability this turn
    transformedFrom?: BoardMinion; // Original minion before transformation
    transformationEndsTurn?: number; // Turn number when transformation should revert
    synergyBonus?: number; // Current synergy bonus (+X/+X)
    linkedWith?: string[]; // IDs of minions this is linked with (for visual effect)
    turnPlayed?: number; // Turn when this minion was played (for Diogenes)
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
    activeWork?: Card; // Currently active philosophical work
}

export interface GameState {
    turn: number;
    activePlayer: 'player' | 'opponent';
    player: Player;
    opponent: Player;
    gameOver: boolean;
    winner?: 'player' | 'opponent';
    selectedCard?: string; // Card ID in hand
    selectedMinion?: string; // Minion ID on board for attacking
    targetMode?: 'attack' | 'spell' | 'search' | 'transform' | 'trolley_sacrifice' | 'special'; // What we're targeting for
    log: string[]; // Game log messages
}

export type GameAction =
    | { type: 'START_GAME' }
    | { type: 'END_TURN' }
    | { type: 'PLAY_CARD'; cardId: string }
    | { type: 'ATTACK'; attackerId: string; targetId?: string } // No targetId = attack player
    | { type: 'USE_SPECIAL'; minionId: string; targetId?: string } // Special ability (e.g. Van Inwagen)
    | { type: 'SELECT_CARD'; cardId?: string }
    | { type: 'SELECT_MINION'; minionId?: string }
    | { type: 'SEARCH_DECK'; cardId: string }
    | { type: 'TROLLEY_SACRIFICE'; minionId: string };
