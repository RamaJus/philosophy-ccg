import { GameState, Effect } from '../types';

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
                logUpdates.push(`${activePlayer.name} fügte ${enemyPlayer.name} ${damage} Schaden zu!`);
            } else if (effect.target === 'SELF') {
                newActivePlayer.health -= damage; // e.g. Schopenhauer
                logUpdates.push(`${activePlayer.name} erlitt ${damage} Schaden!`);
            }
            break;
        }
        case 'HEAL': {
            const heal = effect.value || 0;
            if (effect.target === 'SELF') {
                newActivePlayer.health = Math.min(newActivePlayer.health + heal, newActivePlayer.maxHealth);
                logUpdates.push(`${activePlayer.name} regenerierte ${heal} Glaubwürdigkeit.`);
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
                logUpdates.push(`${activePlayer.name} zog ${count} Karte(n).`);
            }
            break;
        }
        case 'MANA_MOD': {
            const amount = effect.value || 0;
            if (effect.target === 'SELF') {
                // Add temporary mana
                newActivePlayer.mana += amount;
                newActivePlayer.currentTurnBonusMana = (newActivePlayer.currentTurnBonusMana || 0) + amount;
                logUpdates.push(`${activePlayer.name} erhielt ${amount} Dialektik.`);
            } else if (effect.target === 'ENEMY') {
                // Lock enemy mana. Convention: value > 0 means LOCK amount.
                newEnemyPlayer.lockedMana = (newEnemyPlayer.lockedMana || 0) + amount;
                logUpdates.push(`${activePlayer.name} sperrte ${amount} gegnerische Dialektik!`);
            }
            break;
        }
        case 'SYNERGY_BLOCK': {
            const duration = effect.duration || 1;
            if (effect.target === 'ENEMY') {
                newEnemyPlayer.synergyBlockTurns = (newEnemyPlayer.synergyBlockTurns || 0) + duration;
                logUpdates.push(`${activePlayer.name} blockierte gegnerische Synergien für ${duration} Runde(n)!`);
            }
            break;
        }
        case 'SILENCE': {
            const duration = effect.duration || 1;
            // Target specific minions or global
            if (effect.target === 'ENEMY') {
                newEnemyPlayer.board = newEnemyPlayer.board.map(m => {
                    // Check conditions
                    if (effect.condition === 'MALE' && m.gender !== 'male') return m;

                    // Apply Silence (Can't attack)
                    // We assume silencedUntilTurn is checked in ATTACK handler
                    return { ...m, silencedUntilTurn: state.turn + duration };
                });

                const conditionText = effect.condition === 'MALE' ? 'männlichen ' : '';
                logUpdates.push(`${activePlayer.name} verstummte alle ${conditionText}gegnerischen Philosophen für ${duration} Runde(n)!`);
            }
            break;
        }
        case 'DISCOVER': {
            const amount = effect.value || 3;
            if (effect.target === 'SELF') {
                if (newActivePlayer.deck.length === 0) {
                    logUpdates.push('Deck ist leer, Entdeckung nicht möglich.');
                    break;
                }
                const revealed = newActivePlayer.deck.slice(0, amount);
                // Remove from deck immediately (they are in limbo)
                newActivePlayer.deck = newActivePlayer.deck.slice(amount);

                // Return state updates including discovery
                return {
                    player: state.activePlayer === 'player' ? newActivePlayer : newEnemyPlayer,
                    opponent: state.activePlayer === 'player' ? newEnemyPlayer : newActivePlayer,
                    log: [...state.log, ...logUpdates, `${activePlayer.name} looks at top ${amount} cards.`],
                    discoveryCards: revealed,
                    targetMode: 'discover',
                    targetModeOwner: state.activePlayer
                };
            }
            break;
        }
        case 'SEARCH': {
            if (effect.target === 'SELF') {
                return {
                    player: state.activePlayer === 'player' ? newActivePlayer : newEnemyPlayer,
                    opponent: state.activePlayer === 'player' ? newEnemyPlayer : newActivePlayer,
                    log: [...state.log, `${activePlayer.name} searches their deck.`],
                    targetMode: 'search',
                    targetModeOwner: state.activePlayer
                };
            }
            break;
        }
        case 'TARGET_MODE': {
            // Sets a targetMode for spells that need targeting (Trolley, Gottesbeweis)
            if (effect.mode) {
                return {
                    player: state.activePlayer === 'player' ? newActivePlayer : newEnemyPlayer,
                    opponent: state.activePlayer === 'player' ? newEnemyPlayer : newActivePlayer,
                    log: [...state.log, ...logUpdates],
                    targetMode: effect.mode as any,
                    targetModeOwner: state.activePlayer
                };
            }
            break;
        }
        case 'REVEAL': {
            // Reveal top N opponent cards (Foucault's Panoptischer Blick)
            const count = effect.value || 3;
            const topCards = newEnemyPlayer.deck.slice(0, count);
            if (topCards.length > 0) {
                return {
                    player: state.activePlayer === 'player' ? newActivePlayer : newEnemyPlayer,
                    opponent: state.activePlayer === 'player' ? newEnemyPlayer : newActivePlayer,
                    log: [...state.log, ...logUpdates, `${activePlayer.name} reveals top ${count} cards of opponent's deck.`],
                    foucaultRevealCards: topCards,
                    targetMode: 'foucault_reveal',
                    targetModeOwner: state.activePlayer
                };
            }
            break;
        }
        case 'RECURRENCE': {
            if (effect.target === 'SELF') {
                const graveyard = newActivePlayer.graveyard;
                // Filter for philosophers maybe? Or any card? Original prompt said "Philosopher from graveyard".
                // Let's assume all cards for now or filter if needed. "Hole Philosoph..." -> Filter type 'Philosoph'
                const philosophers = graveyard.filter(c => c.type === 'Philosoph');

                if (philosophers.length === 0) {
                    logUpdates.push(`${activePlayer.name} hat keine Philosophen im Friedhof.`);
                    break;
                }

                return {
                    player: state.activePlayer === 'player' ? newActivePlayer : newEnemyPlayer,
                    opponent: state.activePlayer === 'player' ? newEnemyPlayer : newActivePlayer,
                    log: [...state.log, ...logUpdates, `${activePlayer.name} beschwört die Ewige Wiederkunft.`],
                    recurrenceCards: philosophers,
                    targetMode: 'recurrence_select',
                    targetModeOwner: state.activePlayer
                };
            }
            break;
        }
        case 'BOARD_CLEAR': {
            if (effect.target === 'ALL') {
                const activeGraveyard = [...newActivePlayer.graveyard, ...newActivePlayer.board];
                const enemyGraveyard = [...newEnemyPlayer.graveyard, ...newEnemyPlayer.board];

                newActivePlayer.board = [];
                newActivePlayer.graveyard = activeGraveyard;
                newEnemyPlayer.board = [];
                newEnemyPlayer.graveyard = enemyGraveyard;

                logUpdates.push(`${activePlayer.name} leerte das Schlachtfeld!`);
            }
            break;
        }
        case 'SWAP_STATS': {
            if (effect.target === 'ENEMY') {
                const tempHealth = newActivePlayer.health;
                newActivePlayer.health = newEnemyPlayer.health;
                newEnemyPlayer.health = tempHealth;
                logUpdates.push(`${activePlayer.name} tauschte Glaubwürdigkeit mit dem Gegner!`);
            }
            break;
        }
        case 'STEAL_MINION': {
            if (effect.condition === 'LOWEST_COST') {
                // Find minion with lowest cost
                // Since board minions might not have cost stored (Wait, BoardMinion extends Card, so it SHOULD have cost),
                // We need to check if cost is preserved. Yes, Card interface has cost.
                if (newEnemyPlayer.board.length > 0) {
                    const sorted = [...newEnemyPlayer.board].sort((a, b) => (a.cost || 0) - (b.cost || 0));
                    const stolen = sorted[0];

                    // Remove from enemy
                    newEnemyPlayer.board = newEnemyPlayer.board.filter(m => (m.instanceId || m.id) !== (stolen.instanceId || stolen.id));

                    // Add to self PERMANENTLY without Haste
                    const stolenMinion: import('../types').BoardMinion = {
                        ...stolen,
                        canAttack: false,
                        hasAttacked: false,
                        returnToOwnerAtTurnEnd: undefined // No return
                    };

                    newActivePlayer.board = [...newActivePlayer.board, stolenMinion];
                    logUpdates.push(`${activePlayer.name} stahl ${stolen.name} dauerhaft!`);
                }
            }
            break;
        }
        case 'PROTECT': {
            const duration = effect.duration || 1;
            if (effect.target === 'ENEMY') {
                // Kant: Block enemy from attacking minions for X turns
                newEnemyPlayer.minionAttackBlockTurns = (newEnemyPlayer.minionAttackBlockTurns || 0) + duration;
                logUpdates.push(`${activePlayer.name} rief das Kategorische Imperativ an! Gegner kann ${duration} Runde(n) keine Philosophen angreifen.`);
            }
            break;
        }
        case 'HEAL_ALL_MINIONS': {
            // Heal all friendly minions by value
            const healAmount = effect.value || 0;
            if (effect.target === 'SELF') {
                newActivePlayer.board = newActivePlayer.board.map(m => ({
                    ...m,
                    health: Math.min(m.health + healAmount, m.maxHealth)
                }));
                logUpdates.push(`${activePlayer.name} heilte alle Philosophen um ${healAmount}!`);
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
