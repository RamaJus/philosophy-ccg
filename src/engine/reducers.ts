import { GameState, Player, GameAction, BoardMinion } from '../types';
import { generateDeck, cardDatabase } from '../data/cards';
import { processEffect } from './effectSystem';
import { calculateSynergies } from './synergies';

// Constants
const STARTING_HAND_SIZE = 4;
const MAX_HAND_SIZE = 10;

// Helper: Create Player
export function createPlayer(name: string, isPlayer: boolean, startingHandSize: number = STARTING_HAND_SIZE, isDebugMode: boolean = false): Player {
    const deck = generateDeck();
    let hand = deck.slice(0, startingHandSize);
    let remainingDeck = deck.slice(startingHandSize);

    // Guarantee at least one 1-cost card in starting hand
    const hasOneCostCard = hand.some(c => c.cost === 1);
    if (!hasOneCostCard) {
        const oneCostIndex = remainingDeck.findIndex(c => c.cost === 1);
        if (oneCostIndex !== -1) {
            const swapIndex = Math.floor(Math.random() * hand.length);
            const cardToSwap = hand[swapIndex];
            hand[swapIndex] = remainingDeck[oneCostIndex];
            remainingDeck[oneCostIndex] = cardToSwap;
        }
    }

    if (isDebugMode) {
        const debugCard = cardDatabase.find(c => c.id === 'debug_search');
        if (debugCard) {
            hand.push({ ...debugCard, instanceId: `debug-search-1-${Date.now()}` });
            hand.push({ ...debugCard, instanceId: `debug-search-2-${Date.now()}` });
            hand.push({ ...debugCard, instanceId: `debug-search-3-${Date.now()}` });
        }
    }

    return {
        id: isPlayer ? 'player' : 'opponent',
        name,
        health: 80,
        maxHealth: 80,
        mana: 0,
        maxMana: 0,
        deck: remainingDeck,
        hand,
        board: [],
        graveyard: [],
        lockedMana: 0,
    };
}

// Helper: Initial State
export function createInitialState(isDebugMode: boolean): GameState {
    const player = createPlayer('Player', true, STARTING_HAND_SIZE, isDebugMode);
    player.mana = 1;
    player.maxMana = 1;

    return {
        turn: 1,
        activePlayer: 'player',
        player,
        opponent: createPlayer('Gegner', false, STARTING_HAND_SIZE + 1, isDebugMode),
        gameOver: false,
        log: ['Spiel gestartet! Möge der beste Philosoph gewinnen.'],
    };
}

// Helper: Append Log
const appendLog = (currentLog: string[], message: string) => [...currentLog, message];

// Helper: Draw Card
const drawCard = (player: Player): Player => {
    if (player.deck.length === 0) return player;
    if (player.hand.length >= MAX_HAND_SIZE) {
        return {
            ...player,
            deck: player.deck.slice(1),
            graveyard: [...player.graveyard, player.deck[0]], // Burn
        };
    }
    return {
        ...player,
        hand: [...player.hand, player.deck[0]],
        deck: player.deck.slice(1),
    };
};

// REDUCER
export function gameReducer(state: GameState, action: GameAction): GameState {
    let newState = { ...state };

    switch (action.type) {
        case 'START_GAME':
            return createInitialState(action.isDebugMode || false);

        case 'END_TURN': {
            // Logic for ending turn (Switch active player, Draw card, Reset Mana)
            const currentActiveId = state.activePlayer;
            const currentActiveHand = state[currentActiveId].hand;

            if (currentActiveHand.length >= 10) {
                return { ...state, log: appendLog(state.log, 'Hand ist voll! Spiele eine Karte.') };
            }

            const currentEnemyId = state.activePlayer === 'player' ? 'opponent' : 'player';
            let currentActivePlayer = state[currentActiveId];
            let currentEnemyPlayer = state[currentEnemyId];

            // 1. Return Stolen Minions (Ownership Transfer)
            const minionsToReturn = currentActivePlayer.board.filter(m => m.returnToOwnerAtTurnEnd);
            if (minionsToReturn.length > 0) {
                // Remove from active
                currentActivePlayer = {
                    ...currentActivePlayer,
                    board: currentActivePlayer.board.filter(m => !m.returnToOwnerAtTurnEnd)
                };

                // Add back to owner (assuming owner is opponent for now, simplified)
                // We reset HasAttacked logic when returning? Or keep it?
                // Usually returning control doesn't untap, but next turn logic will untap.
                const returnedMinions = minionsToReturn.map(m => ({
                    ...m,
                    returnToOwnerAtTurnEnd: undefined,
                    canAttack: false // Safety
                }));
                currentEnemyPlayer = {
                    ...currentEnemyPlayer,
                    board: [...currentEnemyPlayer.board, ...returnedMinions]
                };
            }

            // State update for players before switching context
            state = {
                ...state,
                [currentActiveId]: currentActivePlayer,
                [currentEnemyId]: currentEnemyPlayer
            };

            const nextActiveId = state.activePlayer === 'player' ? 'opponent' : 'player';
            let nextActivePlayer = state[nextActiveId];
            const nextTurn = state.turn + 1;

            // 2. Process Pending Transformations for the player STARTING their turn
            // "Nach einer Runde" logic: If turnPlayed was T, and now is T+2 (Start of next own turn).
            const updatedNextBoard = nextActivePlayer.board.map(m => {
                if (m.pendingTransformation && m.turnPlayed !== undefined) {
                    // Check if 2 turns passed (1 round)
                    if (nextTurn - m.turnPlayed >= 2) {
                        // Transform!
                        return {
                            ...m,
                            ...m.pendingTransformation.newStats,
                            maxHealth: m.pendingTransformation.newStats.health,
                            // Keep name/image or update? Sartre card text says "Verwandelt sich in... version seiner selbst". 
                            // Usually implies name change or just stats. "8/6 Version".
                            // Let's keep it simple stat change unless we want visual flair.
                            // We can clear pendingTransformation.
                            pendingTransformation: undefined,
                            name: m.name + ' (Entfesselt)',
                            description: 'Die Essenz wurde durch Existenz bestimmt.'
                        };
                    }
                }
                return m;
            });
            nextActivePlayer = { ...nextActivePlayer, board: updatedNextBoard };

            // Start Turn Logic for Next Player
            const newMaxMana = Math.min(nextActivePlayer.maxMana + 1, 12);
            const availableMana = Math.max(0, newMaxMana - nextActivePlayer.lockedMana);

            let updatedNextPlayer: Player = {
                ...nextActivePlayer,
                maxMana: newMaxMana,
                mana: availableMana,
                lockedMana: 0,
                currentTurnManaMalus: nextActivePlayer.lockedMana,
                currentTurnBonusMana: 0,
                // Reset Board State (Attacks etc)
                board: nextActivePlayer.board.map(m => ({
                    ...m,
                    canAttack: true,
                    hasAttacked: false,
                    hasUsedSpecial: false,
                    silencedUntilTurn: m.silencedUntilTurn && m.silencedUntilTurn <= nextTurn ? undefined : m.silencedUntilTurn // Clear silence if expired
                })),
                minionAttackBlockTurns: Math.max(0, (nextActivePlayer.minionAttackBlockTurns || 0) - 1),
                synergyBlockTurns: Math.max(0, (nextActivePlayer.synergyBlockTurns || 0) - 1),
            };

            // Draw Card
            updatedNextPlayer = drawCard(updatedNextPlayer);

            newState = {
                ...state,
                turn: nextTurn,
                activePlayer: nextActiveId as 'player' | 'opponent',
                [nextActiveId]: updatedNextPlayer,
                log: appendLog(state.log, `Runde ${nextTurn}: ${updatedNextPlayer.name} ist am Zug.`)
            };
            break;
        }

        case 'PLAY_CARD': {
            // Logic handled by Effect System partially
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const card = activePlayer.hand.find(c => c.instanceId === action.cardId);

            if (!card) return state;

            // Mana Check
            if (activePlayer.mana < card.cost) {
                return { ...state, log: appendLog(state.log, 'Nicht genug Dialektik!') };
            }

            // Pay Mana & Remove Card
            let updatedPlayer = {
                ...activePlayer,
                mana: activePlayer.mana - card.cost,
                hand: activePlayer.hand.filter(c => c.instanceId !== action.cardId)
            };

            // Apply to state
            newState = {
                ...state,
                [state.activePlayer]: updatedPlayer
            };

            // Rule Engine: Process Effects (if any)
            if (card.effects && card.effects.length > 0) {
                card.effects.forEach(effect => {
                    const partialState = processEffect(newState, effect);
                    // Merge partial state
                    newState = { ...newState, ...partialState };
                });
                newState.log = appendLog(newState.log, `${updatedPlayer.name} spielte ${card.name}.`);
            }

            // Handle card type placement (runs for ALL cards, regardless of effects)
            if (card.type === 'Zauber') {
                if (!newState.targetMode) {
                    // Spell completed immediately - add to graveyard
                    const p = newState[state.activePlayer];
                    newState = {
                        ...newState,
                        [state.activePlayer]: {
                            ...p,
                            graveyard: [...p.graveyard, card]
                        }
                    };
                } else {
                    // Targeting mode active - store spell for later
                    newState = {
                        ...newState,
                        pendingPlayedCard: card
                    };
                }
            } else if (card.type === 'Werk') {
                // Works are permanent buffs - place in activeWork slot
                const p = newState[state.activePlayer];
                newState = {
                    ...newState,
                    [state.activePlayer]: {
                        ...p,
                        activeWork: card
                    },
                    log: appendLog(newState.log, `${p.name} spielte das Werk: ${card.name}.`)
                };
            } else if (card.type === 'Philosoph') {
                // Summon minion to board
                const minion: BoardMinion = {
                    ...card,
                    type: 'Philosoph',
                    attack: card.attack || 0,
                    health: card.health || 0,
                    maxHealth: card.health || 0,
                    canAttack: false,
                    hasAttacked: false,
                    hasUsedSpecial: false,
                    turnPlayed: state.turn,
                    untargetableUntilTurn: card.untargetableForTurns ? state.turn + card.untargetableForTurns : undefined
                };
                const p = newState[state.activePlayer];
                newState = {
                    ...newState,
                    [state.activePlayer]: {
                        ...p,
                        board: [...p.board, minion]
                    },
                    log: appendLog(newState.log, `${p.name} beschwörte ${card.name}.`)
                };
            }
            break;
        }

        case 'ATTACK': {
            const { attackerIds, targetId } = action;
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const enemyPlayer = state.activePlayer === 'player' ? state.opponent : state.player;
            let currentLog = state.log;

            const attackers = attackerIds
                .map(id => activePlayer.board.find(m => (m.instanceId || m.id) === id))
                .filter((m): m is BoardMinion => m !== undefined && m.canAttack && !m.hasAttacked);

            if (attackers.length === 0) return state;

            let updatedActivePlayer = { ...activePlayer };
            let updatedEnemyPlayer = { ...enemyPlayer };

            let totalDamage = 0;
            const attackerNames: string[] = [];

            for (const attacker of attackers) {
                // Check Diotima Silence
                if (attacker.gender === 'male' && attacker.silencedUntilTurn && attacker.silencedUntilTurn > state.turn) {
                    currentLog = appendLog(currentLog, `${attacker.name} ist verstummt und kann nicht angreifen!`);
                    continue;
                }

                let damage = attacker.attack;
                if (activePlayer.activeWork?.workBonus && attacker.school?.includes(activePlayer.activeWork.workBonus.school)) {
                    damage += activePlayer.activeWork.workBonus.damage;
                }
                totalDamage += damage;
                attackerNames.push(attacker.name);
            }

            if (totalDamage === 0) return { ...state, log: currentLog };

            const attackerNamesStr = attackerNames.join(', ');

            if (!targetId) {
                // Attack Player
                updatedEnemyPlayer.health -= totalDamage;
                currentLog = appendLog(currentLog, `${attackerNamesStr} griff ${enemyPlayer.name} für ${totalDamage} Schaden an!`);

                // Mark as attacked
                updatedActivePlayer.board = activePlayer.board.map(m =>
                    attackerIds.includes(m.instanceId || m.id) ? { ...m, hasAttacked: true } : m
                );
            } else {
                // Attack Minion
                const targetIndex = enemyPlayer.board.findIndex(m => (m.instanceId || m.id) === targetId);
                if (targetIndex === -1) return state;
                const target = enemyPlayer.board[targetIndex];

                // Kant Check
                if ((activePlayer.minionAttackBlockTurns || 0) > 0) {
                    currentLog = appendLog(currentLog, `Angriff blockiert durch Kants Kategorischen Imperativ.`);
                    return { ...state, log: currentLog };
                }

                // Diogenes Check (Untargetable)
                if (target.untargetableUntilTurn && target.untargetableUntilTurn > state.turn) {
                    currentLog = appendLog(currentLog, `${target.name} versteckt sich in seiner Tonne und kann noch nicht angegriffen werden!`);
                    return { ...state, log: currentLog };
                }

                const targetDamage = target.attack;

                // Combat Logic
                // 1. Attackers hit Target
                let targetHealth = target.health - totalDamage;

                // 2. Target hits FIRST attacker back
                let attackersUpdated = [...activePlayer.board];
                const firstAttackerIndex = attackersUpdated.findIndex(m => (m.instanceId || m.id) === attackers[0].instanceId || (m.id === attackers[0].id));

                if (firstAttackerIndex !== -1) {
                    attackersUpdated[firstAttackerIndex] = {
                        ...attackersUpdated[firstAttackerIndex],
                        health: attackersUpdated[firstAttackerIndex].health - targetDamage,
                        hasAttacked: true
                    };
                }

                // Rest of attackers mark as attacked
                attackers.slice(1).forEach(att => {
                    const idx = attackersUpdated.findIndex(m => (m.instanceId || m.id) === att.instanceId);
                    if (idx !== -1) attackersUpdated[idx] = { ...attackersUpdated[idx], hasAttacked: true };
                });

                // Remove dead minions
                updatedActivePlayer.board = attackersUpdated.filter(m => m.health > 0);
                updatedActivePlayer.graveyard = [...updatedActivePlayer.graveyard, ...attackersUpdated.filter(m => m.health <= 0)];

                if (targetHealth <= 0) {
                    updatedEnemyPlayer.board = updatedEnemyPlayer.board.filter((_, i) => i !== targetIndex);
                    updatedEnemyPlayer.graveyard = [...updatedEnemyPlayer.graveyard, target];
                    currentLog = appendLog(currentLog, `${attackerNamesStr} zerstörte ${target.name}!`);
                } else {
                    updatedEnemyPlayer.board[targetIndex] = { ...target, health: targetHealth };
                    currentLog = appendLog(currentLog, `${attackerNamesStr} griff ${target.name} an.`);
                }
            }

            newState = {
                ...state,
                activePlayer: state.activePlayer, // ensure key preservation
                [state.activePlayer]: updatedActivePlayer,
                [state.activePlayer === 'player' ? 'opponent' : 'player']: updatedEnemyPlayer,
                log: currentLog,
                selectedMinions: [] // Clear selection after attack
            };
            break;
        }

        case 'SELECT_CARD':
            return { ...state, selectedCard: action.cardId };

        case 'SELECT_MINION': {
            const { minionId, toggle } = action;
            let newSelected = state.selectedMinions || [];
            if (toggle) {
                if (newSelected.includes(minionId)) {
                    newSelected = newSelected.filter(id => id !== minionId);
                } else {
                    newSelected = [...newSelected, minionId];
                }
            } else {
                newSelected = [minionId];
            }
            return { ...state, selectedMinions: newSelected };
        }

        case 'SEARCH_DECK': {
            // Manual selection from deck (Marx)
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            if (!action.cardId) return state; // Safety check

            const cardIndex = activePlayer.deck.findIndex(c => c.instanceId === action.cardId);

            if (cardIndex === -1) return state;

            const card = activePlayer.deck[cardIndex];
            const updatedDeck = activePlayer.deck.filter((_, i) => i !== cardIndex);

            const updatedPlayer = {
                ...activePlayer,
                deck: updatedDeck,
                hand: [...activePlayer.hand, card]
            };

            newState = {
                ...state,
                [state.activePlayer]: updatedPlayer,
                targetMode: undefined, // Close search view
                log: appendLog(state.log, `${activePlayer.name} wählte ${card.name} aus dem Deck.`)
            };
            break;
        }

        case 'AUTO_SEARCH_DECK': {
            const { filter, amount } = action;
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            let updatedDeck = [...activePlayer.deck];
            let updatedHand = [...activePlayer.hand];

            // Find matching cards
            const matches = updatedDeck.filter(filter);

            if (matches.length === 0) {
                // return { ...state, log: appendLog(log, 'Keine passenden Karten gefunden.') };
                // Just log and do nothing
            } else {
                // Shuffle matches to get random ones if needed
                const shuffledMatches = matches.sort(() => Math.random() - 0.5);
                const selected = shuffledMatches.slice(0, amount);

                selected.forEach(card => {
                    if (updatedHand.length < 10) {
                        // Remove from deck
                        const index = updatedDeck.findIndex(c => c.instanceId === card.instanceId);
                        if (index !== -1) {
                            updatedDeck.splice(index, 1);
                            updatedHand.push(card);
                        }
                    }
                });

                // Shuffle deck after searching
                updatedDeck.sort(() => Math.random() - 0.5);

                const updatedPlayer = {
                    ...activePlayer,
                    hand: updatedHand,
                    deck: updatedDeck
                };

                newState = {
                    ...state,
                    [state.activePlayer]: updatedPlayer,
                    log: appendLog(state.log, `${activePlayer.name} suchte im Deck und zog ${selected.length} Karte(n).`)
                };
            }
            break;
        }

        case 'USE_SPECIAL': {
            const { minionId } = action;
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const minionIndex = activePlayer.board.findIndex(m => (m.instanceId || m.id) === minionId);

            if (minionIndex === -1) return state;

            const minion = activePlayer.board[minionIndex];
            if (minion.hasUsedSpecial) return state;

            let updatedMinion = { ...minion, hasUsedSpecial: true };
            const log = state.log;

            // Handle different types of transform abilities
            if (minion.specialAbility === 'transform') {
                // Check which philosopher to set the correct target mode
                const cardId = minion.id.toLowerCase();

                if (cardId.includes('nietzsche')) {
                    // Nietzsche targets enemy minions
                    return {
                        ...state,
                        targetMode: 'nietzsche_target',
                        targetModeOwner: state.activePlayer,
                        selectedMinions: [minionId],
                        log: appendLog(log, 'Wähle einen Philosophen für Nietzsches Willenszertrümmerung.')
                    };
                } else if (cardId.includes('van_inwagen') || cardId.includes('inwagen')) {
                    // Van Inwagen targets enemy minions
                    return {
                        ...state,
                        targetMode: 'van_inwagen_target',
                        targetModeOwner: state.activePlayer,
                        selectedMinions: [minionId],
                        log: appendLog(log, 'Wähle einen Philosophen für Van Inwagens Stuhl-Paradoxon.')
                    };
                } else {
                    // Sartre and others target friendly minions
                    return {
                        ...state,
                        targetMode: 'friendly_minion_transform',
                        targetModeOwner: state.activePlayer,
                        selectedMinions: [minionId],
                        log: appendLog(log, 'Wähle einen Diener zum Transformieren.')
                    };
                }
            }

            // Handle other specials or just mark used
            newState = {
                ...state,
                [state.activePlayer]: {
                    ...activePlayer,
                    board: activePlayer.board.map((m, i) => i === minionIndex ? updatedMinion : m)
                }
            };
            break;
        }

        case 'TROLLEY_SACRIFICE': {
            const { minionId } = action;
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const enemyPlayer = state.activePlayer === 'player' ? state.opponent : state.player;
            let log = state.log;

            const sacrificeIndex = activePlayer.board.findIndex(m => (m.instanceId || m.id) === minionId);
            if (sacrificeIndex === -1) return state;

            const sacrificedMinion = activePlayer.board[sacrificeIndex];

            // Sacrafice
            const updatedActiveBoard = activePlayer.board.filter((_, i) => i !== sacrificeIndex);
            const updatedActiveGraveyard = [...activePlayer.graveyard, sacrificedMinion];

            // Damage Enemy Board (4 damage AoE)
            let updatedEnemyBoard = enemyPlayer.board.map(m => ({ ...m, health: m.health - 4 }));
            const deadMinions = updatedEnemyBoard.filter(m => m.health <= 0);
            updatedEnemyBoard = updatedEnemyBoard.filter(m => m.health > 0);
            const updatedEnemyGraveyard = [...enemyPlayer.graveyard, ...deadMinions];

            log = appendLog(log, `${activePlayer.name} opferte ${sacrificedMinion.name} und fügte allen gegnerischen Philosophen 4 Schaden zu!`);

            // Add pending spell card to graveyard if exists
            const spellGraveyard = state.pendingPlayedCard
                ? [...updatedActiveGraveyard, state.pendingPlayedCard]
                : updatedActiveGraveyard;

            newState = {
                ...state,
                [state.activePlayer]: { ...activePlayer, board: updatedActiveBoard, graveyard: spellGraveyard },
                [state.activePlayer === 'player' ? 'opponent' : 'player']: { ...enemyPlayer, board: updatedEnemyBoard, graveyard: updatedEnemyGraveyard },
                log,
                targetMode: undefined,
                pendingPlayedCard: undefined
            };
            break;
        }

        case 'SELECT_DISCOVERY': {
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            if (!state.discoveryCards) return state;

            const selectedCard = state.discoveryCards.find(c => c.instanceId === action.cardId);
            if (!selectedCard) return state;

            // Shuffle others back
            const otherCards = state.discoveryCards.filter(c => c.instanceId !== action.cardId);
            let newDeck = [...activePlayer.deck];

            otherCards.forEach(c => {
                const idx = Math.floor(Math.random() * (newDeck.length + 1));
                newDeck.splice(idx, 0, c);
            });

            const updatedPlayer = {
                ...activePlayer,
                hand: [...activePlayer.hand, selectedCard],
                deck: newDeck
            };

            newState = {
                ...state,
                [state.activePlayer]: updatedPlayer,
                discoveryCards: undefined,
                targetMode: undefined,
                log: appendLog(state.log, `${activePlayer.name} wählte ${selectedCard.name}.`)
            };
            break;
        }

        case 'FOUCAULT_CLOSE':
            newState = {
                ...state,
                targetMode: undefined,
                foucaultRevealCards: undefined
            };
            break;

        case 'GOTTESBEWEIS_TARGET': {
            const { minionId } = action;
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const enemyPlayer = state.activePlayer === 'player' ? state.opponent : state.player;
            let log = state.log;

            // Target search (Any board)
            const isOnActive = activePlayer.board.some(m => (m.instanceId || m.id) === minionId);
            const targetValues = isOnActive ? activePlayer.board : enemyPlayer.board;
            const targetMinion = targetValues.find(m => (m.instanceId || m.id) === minionId);

            if (!targetMinion) return state;

            let updatedMinion = { ...targetMinion };
            if (targetMinion.school?.includes('Religion')) {
                updatedMinion.health += 4;
                updatedMinion.maxHealth += 4;
                updatedMinion.attack += 4; // Legacy didn't have attack buff? Grep said "+4 Leben". I'll stick to Health.
                // Wait, grep said: updatedTarget.health += 4; updatedTarget.maxHealth += 4;
                log = appendLog(log, `${activePlayer.name} stärkte ${targetMinion.name} durch Gottesbeweis (+4 Leben)!`);
            } else {
                updatedMinion.health -= 8;
                log = appendLog(log, `${activePlayer.name} strafte ${targetMinion.name} durch Gottesbeweis (8 Schaden)!`);
            }

            // Apply update
            const updateBoard = (board: BoardMinion[]) =>
                updatedMinion.health <= 0
                    ? board.filter(m => (m.instanceId || m.id) !== minionId)
                    : board.map(m => (m.instanceId || m.id) === minionId ? updatedMinion : m);

            const updatedActive = isOnActive ? { ...activePlayer, board: updateBoard(activePlayer.board) } : activePlayer;
            const updatedEnemy = !isOnActive ? { ...enemyPlayer, board: updateBoard(enemyPlayer.board) } : enemyPlayer;

            // Graveyard handle
            if (updatedMinion.health <= 0) {
                const gy = isOnActive ? updatedActive.graveyard : updatedEnemy.graveyard;
                if (isOnActive) updatedActive.graveyard = [...gy, targetMinion];
                else updatedEnemy.graveyard = [...gy, targetMinion];
                log = appendLog(log, `${targetMinion.name} wurde besiegt!`);
            }

            // Add pending spell card to graveyard if exists
            if (state.pendingPlayedCard) {
                const p = updatedActive;
                updatedActive.graveyard = [...p.graveyard, state.pendingPlayedCard];
            }

            newState = {
                ...state,
                [state.activePlayer]: updatedActive,
                [state.activePlayer === 'player' ? 'opponent' : 'player']: updatedEnemy,
                log,
                targetMode: undefined,
                pendingPlayedCard: undefined
            };
            break;
        }

        case 'NIETZSCHE_TARGET': {
            const { minionId } = action;
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const enemyPlayer = state.activePlayer === 'player' ? state.opponent : state.player;

            // Nietzsche is attacker (selectedMinions[0])
            const nietzscheId = state.selectedMinions?.[0];
            if (!nietzscheId) return state;

            // Target search
            const isOnActive = activePlayer.board.some(m => (m.instanceId || m.id) === minionId);
            const targetValues = isOnActive ? activePlayer.board : enemyPlayer.board;
            const targetMinion = targetValues.find(m => (m.instanceId || m.id) === minionId);
            if (!targetMinion) return state;

            // Logic: -3/-3. If alive -> Transform to "Der letzte Mensch"
            const newAttack = Math.max(0, targetMinion.attack - 3);
            const newHealth = targetMinion.health - 3;

            let updatedMinion: BoardMinion | null = null;
            let log = state.log;

            if (newHealth <= 0) {
                log = appendLog(log, `${targetMinion.name} wurde von Nietzsche zerschmettert!`);
            } else {
                updatedMinion = {
                    ...targetMinion,
                    name: 'Der letzte Mensch',
                    description: 'Ein verächtliches Wesen, das nur Komfort sucht.',
                    image: '/images/cards/letzter_mensch.png',
                    attack: newAttack,
                    health: newHealth,
                    maxHealth: newHealth,
                    type: 'Philosoph',
                    hasAttacked: true,
                    hasUsedSpecial: false,
                    specialAbility: undefined
                };
                log = appendLog(log, `${targetMinion.name} wurde zum letzten Menschen!`);
            }

            // Update Boards
            const updateBoard = (board: BoardMinion[]) =>
                !updatedMinion
                    ? board.filter(m => (m.instanceId || m.id) !== minionId)
                    : board.map(m => (m.instanceId || m.id) === minionId ? updatedMinion! : m);

            let updatedActive = isOnActive ? { ...activePlayer, board: updateBoard(activePlayer.board) } : activePlayer;
            let updatedEnemy = !isOnActive ? { ...enemyPlayer, board: updateBoard(enemyPlayer.board) } : enemyPlayer;

            // Nietzsche Exhaustion - Mark as permanently exhausted so button won't show again
            updatedActive.board = updatedActive.board.map(m => (m.instanceId || m.id) === nietzscheId ? { ...m, hasUsedSpecial: true, hasAttacked: true, specialExhausted: true } : m);

            newState = {
                ...state,
                [state.activePlayer]: updatedActive,
                [state.activePlayer === 'player' ? 'opponent' : 'player']: updatedEnemy,
                log,
                targetMode: undefined,
                selectedMinions: undefined
            };
            break;
        }

        case 'VAN_INWAGEN_TARGET': {
            // Transform to Chair Matter (0/1)
            const { minionId } = action;
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const enemyPlayer = state.activePlayer === 'player' ? state.opponent : state.player;

            const vanInwagenId = state.selectedMinions?.[0];
            const targetMinion = enemyPlayer.board.find(m => (m.instanceId || m.id) === minionId);

            if (!targetMinion || !vanInwagenId) return state;

            const chairMatter: BoardMinion = {
                id: `chair_matter_${Date.now()}`,
                instanceId: `chair_matter_${Date.now()}`,
                name: 'Stuhlartige Materie',
                type: 'Philosoph',
                cost: 0,
                attack: 0,
                health: 1,
                maxHealth: 1,
                canAttack: false,
                hasAttacked: true,
                hasUsedSpecial: false,
                description: 'Verwandelte Materie ohne Bewusstsein.',
                rarity: 'Gewöhnlich',
                image: '/images/cards/chair_matter.png',
            };

            let log = appendLog(state.log, `${targetMinion.name} wurde in stuhlartige Materie verwandelt!`);

            const updatedEnemyBoard = enemyPlayer.board.map(m => (m.instanceId || m.id) === minionId ? chairMatter : m);
            const updatedActiveBoard = activePlayer.board.map(m => (m.instanceId || m.id) === vanInwagenId ? { ...m, hasUsedSpecial: true, hasAttacked: true, specialExhausted: true } : m);

            newState = {
                ...state,
                [state.activePlayer]: { ...activePlayer, board: updatedActiveBoard },
                [state.activePlayer === 'player' ? 'opponent' : 'player']: { ...enemyPlayer, board: updatedEnemyBoard },
                log,
                targetMode: undefined,
                selectedMinions: undefined
            };
            break;
        }

        case 'RECURRENCE_SELECT': {
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const card = state.recurrenceCards?.find(c => c.instanceId === action.cardId || c.id === action.cardId);

            if (!card) return state;

            const newHand = [...activePlayer.hand, card];
            const newGraveyard = activePlayer.graveyard.filter(c => c.instanceId !== action.cardId);

            newState = {
                ...state,
                [state.activePlayer]: { ...activePlayer, hand: newHand, graveyard: newGraveyard },
                recurrenceCards: undefined,
                targetMode: undefined,
                log: appendLog(state.log, `${activePlayer.name} holte ${card.name} zurück!`)
            };
            break;
        }

        case 'CANCEL_CAST': {
            // Return pending card to hand if cancel is triggered during targeting
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            if (state.pendingPlayedCard) {
                const updatedPlayer = {
                    ...activePlayer,
                    hand: [...activePlayer.hand, state.pendingPlayedCard],
                    mana: activePlayer.mana + state.pendingPlayedCard.cost // Refund mana
                };
                newState = {
                    ...state,
                    [state.activePlayer]: updatedPlayer,
                    pendingPlayedCard: undefined,
                    targetMode: undefined,
                    targetModeOwner: undefined,
                    selectedCard: undefined,
                    selectedMinions: [],
                    log: appendLog(state.log, `${activePlayer.name} brach den Zauber ab.`)
                };
            } else {
                newState = {
                    ...state,
                    targetMode: undefined,
                    targetModeOwner: undefined,
                    selectedCard: undefined,
                    selectedMinions: []
                };
            }
            break;
        }

        case 'SYNC_STATE':
            return action.newState;

        default:
            // Do not return state here, break to allow synergy calc
            break;
    }

    // Auto-Calculate Synergies on every state change
    newState.player.board = calculateSynergies(newState.player.board, newState.player.synergyBlockTurns);
    newState.opponent.board = calculateSynergies(newState.opponent.board, newState.opponent.synergyBlockTurns);

    return newState;
}
