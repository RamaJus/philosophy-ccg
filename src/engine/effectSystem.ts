import { GameState, Player, Card } from '../types';
import { Effect } from '../types/effects';
import { cardDatabase } from '../data/cards';

// Helper to get players safely based on active turn perspective
export const getActivePlayers = (state: GameState) => {
    return {
        activePlayer: state.activePlayer === 'player' ? state.player : state.opponent,
        enemyPlayer: state.activePlayer === 'player' ? state.opponent : state.player,
    };
};

export const processEffect = (
    state: GameState,
    effect: Effect,
    sourceCard?: Card
): Partial<GameState> => {
    const { activePlayer, enemyPlayer } = getActivePlayers(state);
    let newActivePlayer = { ...activePlayer };
    let newEnemyPlayer = { ...enemyPlayer };
    let logUpdates: string[] = [];

    switch (effect.type) {
        case 'DAMAGE': {
            const damage = effect.value || 0;
            if (effect.target === 'ENEMY') {
                newEnemyPlayer.health -= damage;
                logUpdates.push(`${activePlayer.name} dealt ${damage} damage to ${enemyPlayer.name}!`);
            } else if (effect.target === 'SELF') {
                newActivePlayer.health -= damage; // e.g. Schopenhauer
                logUpdates.push(`${activePlayer.name} took ${damage} damage!`);
            }
            break;
        }
        case 'HEAL': {
            const heal = effect.value || 0;
            if (effect.target === 'SELF') {
                newActivePlayer.health = Math.min(newActivePlayer.health + heal, newActivePlayer.maxHealth);
                logUpdates.push(`${activePlayer.name} healed for ${heal}.`);
            }
            break;
        }
        case 'DRAW': {
            const count = effect.value || 1;
            if (effect.target === 'SELF') {
                // Logic for drawing cards
                // We need to implement draw logic here or reuse a helper.
                // For now, replicating the simple draw logic:
                for (let i = 0; i < count; i++) {
                    if (newActivePlayer.deck.length > 0) {
                        if (newActivePlayer.hand.length < 10) { // MAX_HAND_SIZE
                            newActivePlayer.hand = [...newActivePlayer.hand, newActivePlayer.deck[0]];
                        } else {
                            newActivePlayer.graveyard = [...newActivePlayer.graveyard, newActivePlayer.deck[0]];
                        }
                        newActivePlayer.deck = newActivePlayer.deck.slice(1);
                    }
                }
                logUpdates.push(`${activePlayer.name} drew ${count} card(s).`);
            }
            break;
        }
        case 'MANA_MOD': {
            const amount = effect.value || 0;
            if (effect.target === 'SELF') {
                // Add temporary mana
                newActivePlayer.mana += amount;
                newActivePlayer.currentTurnBonusMana = (newActivePlayer.currentTurnBonusMana || 0) + amount;
                logUpdates.push(`${activePlayer.name} gained ${amount} Mana.`);
            } else if (effect.target === 'ENEMY') {
                // Lock enemy mana. Convention: value > 0 means LOCK amount.
                newEnemyPlayer.lockedMana = (newEnemyPlayer.lockedMana || 0) + amount;
                logUpdates.push(`${activePlayer.name} locked ${amount} of opponent's Mana!`);
            }
            break;
        }
        case 'SYNERGY_BLOCK': {
            const duration = effect.duration || 1;
            if (effect.target === 'ENEMY') {
                newEnemyPlayer.synergyBlockTurns = (newEnemyPlayer.synergyBlockTurns || 0) + duration;
                logUpdates.push(`${activePlayer.name} blocked opponent synergies for ${duration} turn(s)!`);
            }
            break;
        }
    }

    // Reconstruct state with updated players
    // We must be careful to assign them back to the correct keys
    return {
        player: state.activePlayer === 'player' ? newActivePlayer : newEnemyPlayer,
        opponent: state.activePlayer === 'player' ? newEnemyPlayer : newActivePlayer,
        log: [...state.log, ...logUpdates]
    };
};
