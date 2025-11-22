export type CardType = 'minion' | 'spell';

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
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    faction: 'western' | 'eastern' | 'universal';
    school?: string[]; // e.g. 'rationalism', 'empiricism', 'religion'
    strongAgainst?: string[]; // list of schools this card is strong against
    weakAgainst?: string[]; // list of schools this card is weak against
}

export interface BoardMinion extends Card {
    type: 'minion';
    attack: number;
    health: number;
    maxHealth: number;
    canAttack: boolean; // Summoning sickness
    hasAttacked: boolean; // This turn
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
    targetMode?: 'attack' | 'spell'; // What we're targeting for
    log: string[]; // Game log messages
}

export type GameAction =
    | { type: 'START_GAME' }
    | { type: 'END_TURN' }
    | { type: 'PLAY_CARD'; cardId: string }
    | { type: 'ATTACK'; attackerId: string; targetId?: string } // No targetId = attack player
    | { type: 'SELECT_CARD'; cardId?: string }
    | { type: 'SELECT_MINION'; minionId?: string };
