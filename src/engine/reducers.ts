import { GameState, Player, GameAction, BoardMinion } from '../types';
import { generateDeck, cardDatabase } from '../data/cards';
import { processEffect } from './effectSystem';
import { calculateSynergies } from './synergies';

// Constants
const STARTING_HAND_SIZE = 4;
const MAX_HAND_SIZE = 10;

// Helper: Create Player
export function createPlayer(name: string, isPlayer: boolean, startingHandSize: number = STARTING_HAND_SIZE, isDebugMode: boolean = false, customDeckIds?: string[]): Player {
    // Generate deck from custom IDs if provided, otherwise use all cards
    let deck;
    console.log('[createPlayer]', name, 'customDeckIds:', customDeckIds?.length || 0);
    if (customDeckIds && customDeckIds.length > 0) {
        // Create deck from custom card IDs
        const customCards = customDeckIds
            .map(id => cardDatabase.find(c => c.id === id))
            .filter((c): c is typeof cardDatabase[0] => c !== undefined)
            .map(card => ({
                ...card,
                instanceId: `${card.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }));
        console.log('[createPlayer] Created custom deck with', customCards.length, 'cards');
        // Shuffle custom deck
        deck = customCards.sort(() => Math.random() - 0.5);
    } else {
        console.log('[createPlayer] Using default deck (all cards)');
        deck = generateDeck();
    }

    let hand = deck.slice(0, startingHandSize);
    let remainingDeck = deck.slice(startingHandSize);

    // Guarantee starting hand has certain philosophers for playable early game
    // 1) Guarantee one 1-cost Philosopher (fallback: 2-cost Philosopher)
    // 2) Guarantee one 2-cost Philosopher (fallback: 3-cost Philosopher)

    const findPhilosopherByCost = (cards: typeof deck, costs: number[]) => {
        for (const cost of costs) {
            const index = cards.findIndex(c => c.type === 'Philosoph' && c.cost === cost);
            if (index !== -1) return index;
        }
        return -1;
    };

    const swapCardIntoHand = (targetCosts: number[], avoidInstanceIds: string[]) => {
        // Check if hand already has a Philosopher with one of the target costs
        const hasTarget = hand.some(c =>
            c.type === 'Philosoph' &&
            targetCosts.includes(c.cost) &&
            !avoidInstanceIds.includes(c.instanceId || c.id)
        );

        if (!hasTarget) {
            // Find one in deck
            const deckIndex = findPhilosopherByCost(remainingDeck, targetCosts);
            if (deckIndex !== -1) {
                // Find a non-essential card to swap out
                const swapIndex = hand.findIndex(c =>
                    !avoidInstanceIds.includes(c.instanceId || c.id)
                );
                if (swapIndex !== -1) {
                    const cardToSwap = hand[swapIndex];
                    const cardToAdd = remainingDeck[deckIndex];
                    hand[swapIndex] = cardToAdd;
                    remainingDeck[deckIndex] = cardToSwap;
                    return cardToAdd.instanceId || cardToAdd.id;
                }
            }
        } else {
            // Return the ID of the card we're keeping
            const existing = hand.find(c =>
                c.type === 'Philosoph' &&
                targetCosts.includes(c.cost) &&
                !avoidInstanceIds.includes(c.instanceId || c.id)
            );
            return existing?.instanceId || existing?.id || '';
        }
        return '';
    };

    // First: guarantee 1-cost Philosopher (fallback to 2-cost if no 1-cost exists)
    const keptId1 = swapCardIntoHand([1, 2], []);

    // Second: guarantee 2-cost Philosopher (fallback to 3-cost), avoiding the first kept card
    swapCardIntoHand([2, 3], keptId1 ? [keptId1] : []);

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
export function createInitialState(isDebugMode: boolean, customDeckIds?: string[], aiDeckIds?: string[]): GameState {
    // Read player name from localStorage (set in Lobby)
    const playerName = typeof window !== 'undefined'
        ? localStorage.getItem('philosophy-ccg-player-name') || 'Spieler'
        : 'Spieler';

    const player = createPlayer(playerName, true, STARTING_HAND_SIZE, isDebugMode, customDeckIds);
    player.mana = 1;
    player.maxMana = 1;

    // Opponent uses aiDeckIds if provided, otherwise same as player (all cards or custom)
    return {
        turn: 1,
        activePlayer: 'player',
        player,
        opponent: createPlayer('Gegner', false, STARTING_HAND_SIZE, isDebugMode, aiDeckIds),
        gameOver: false,
        log: [customDeckIds || aiDeckIds ? 'Spiel mit Custom-Deck gestartet!' : 'Spiel gestartet! Möge der beste Philosoph gewinnen.'],
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
            return createInitialState(action.isDebugMode || false, action.customDeckIds, action.aiDeckIds);

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

            // 2. Decrement synergy block and minion attack block for the player whose turn just ended
            // This ensures effects like 'Methodischer Zweifel' and 'Kant' last through the attack phase
            currentActivePlayer = {
                ...currentActivePlayer,
                synergyBlockTurns: Math.max(0, (currentActivePlayer.synergyBlockTurns || 0) - 1),
                minionAttackBlockTurns: Math.max(0, (currentActivePlayer.minionAttackBlockTurns || 0) - 1)
            };

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
                    extraAttacksRemaining: 0, // Extra attacks don't carry over to next turn
                    silencedUntilTurn: m.silencedUntilTurn && m.silencedUntilTurn <= nextTurn ? undefined : m.silencedUntilTurn // Clear silence if expired
                })),
                // minionAttackBlockTurns is now decremented at turn END (above), not at turn START
                jonasProtectionTurns: Math.max(0, (nextActivePlayer.jonasProtectionTurns || 0) - 1),
                ueberichBonusTurn: undefined, // Clear Über-Ich bonus at turn end
                // Note: synergyBlockTurns is now decremented at turn END, not turn START
            };

            // Draw Card
            updatedNextPlayer = drawCard(updatedNextPlayer);

            newState = {
                ...state,
                turn: nextTurn,
                activePlayer: nextActiveId as 'player' | 'opponent',
                [nextActiveId]: updatedNextPlayer,
                log: appendLog(state.log, `Runde ${nextTurn}: ${updatedNextPlayer.name} ist am Zug.`),
                lastPlayedCard: undefined, // Clear to prevent re-flash on state sync
                lastPlayedCardPlayerId: undefined
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

            // EPIPHANIE Logic (Draw random legendary)
            if (card.id === 'epiphanie') {
                const legendaryCards = updatedPlayer.deck.filter(c => c.rarity === 'Legendär');
                if (legendaryCards.length > 0) {
                    const randomIndex = Math.floor(Math.random() * legendaryCards.length);
                    const chosenCard = legendaryCards[randomIndex];

                    // Remove from deck
                    updatedPlayer.deck = updatedPlayer.deck.filter(c => c.instanceId !== chosenCard.instanceId);

                    // Add to hand (if space)
                    if (updatedPlayer.hand.length < 10) {
                        updatedPlayer.hand = [...updatedPlayer.hand, chosenCard];
                    } else {
                        // Hand full - burn card (add to graveyard) - Optional rule, but standard TCG. Or just leave in deck?
                        // "Ziehe" implies card leaves deck. If hand full, usually burned.
                        // Let's assume standard draw behavior: drawn to full hand => graveyard.
                        updatedPlayer.graveyard = [...updatedPlayer.graveyard, chosenCard];
                    }
                }
            }

            // BANALITÄT DES BÖSEN Logic (Lowest cost minion can attack twice this turn - no Charge)
            if (card.id === 'banalitaet_des_boesen') {
                if (updatedPlayer.board.length > 0) {
                    // Find the philosopher with the lowest cost (first one on board if tie)
                    const sorted = [...updatedPlayer.board].sort((a, b) => (a.cost || 0) - (b.cost || 0));
                    const lowestCostMinion = sorted[0];

                    // Grant one extra attack - works whether they've attacked or not (but no Charge)
                    updatedPlayer.board = updatedPlayer.board.map(m =>
                        (m.instanceId || m.id) === (lowestCostMinion.instanceId || lowestCostMinion.id)
                            ? { ...m, extraAttacksRemaining: 1 }
                            : m
                    );

                    // Add spell to graveyard
                    updatedPlayer.graveyard = [...updatedPlayer.graveyard, card];

                    newState = {
                        ...state,
                        [state.activePlayer]: updatedPlayer,
                        log: appendLog(state.log, `${activePlayer.name} spielte Banalität des Bösen. ${lowestCostMinion.name} kann zweimal angreifen!`),
                        lastPlayedCard: card,
                        lastPlayedCardPlayerId: state.activePlayer
                    };
                    break;
                }
            }

            // SCHOLASTIK Logic (Draw random Religion or Logik card)
            if (card.id === 'scholastik') {
                const matchingCards = updatedPlayer.deck.filter(c =>
                    c.school && (c.school.includes('Religion') || c.school.includes('Logik'))
                );

                if (matchingCards.length > 0) {
                    const randomIndex = Math.floor(Math.random() * matchingCards.length);
                    const chosenCard = matchingCards[randomIndex];

                    // Remove from deck
                    updatedPlayer.deck = updatedPlayer.deck.filter(c => c.instanceId !== chosenCard.instanceId);

                    // Add to hand (if space)
                    if (updatedPlayer.hand.length < 10) {
                        updatedPlayer.hand = [...updatedPlayer.hand, chosenCard];
                    } else {
                        updatedPlayer.graveyard = [...updatedPlayer.graveyard, chosenCard];
                    }

                    // Add spell to graveyard
                    updatedPlayer.graveyard = [...updatedPlayer.graveyard, card];

                    newState = {
                        ...state,
                        [state.activePlayer]: updatedPlayer,
                        log: appendLog(state.log, `${activePlayer.name} spielte Scholastik und zog ${chosenCard.name}!`),
                        lastPlayedCard: card,
                        lastPlayedCardPlayerId: state.activePlayer
                    };
                } else {
                    // No matching cards - just add spell to graveyard
                    updatedPlayer.graveyard = [...updatedPlayer.graveyard, card];
                    newState = {
                        ...state,
                        [state.activePlayer]: updatedPlayer,
                        log: appendLog(state.log, `${activePlayer.name} spielte Scholastik, aber keine passenden Karten im Deck.`),
                        lastPlayedCard: card,
                        lastPlayedCardPlayerId: state.activePlayer
                    };
                }
                break;
            }

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
                // Set flash card for visual effect
                if (card.type === 'Zauber') {
                    newState.lastPlayedCard = card;
                    newState.lastPlayedCardPlayerId = state.activePlayer;
                }
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
                const p = newState[state.activePlayer];
                let minionAttack = card.attack || 0;
                let minionHealth = card.health || 0;
                let logMessage = `${p.name} beschwörte ${card.name}.`;

                // Non Sequitur effect: randomize stats if flag is set
                if (p.randomizeNextMinion) {
                    minionAttack = Math.floor(Math.random() * 10) + 1; // 1-10
                    minionHealth = Math.floor(Math.random() * 10) + 1; // 1-10
                    logMessage = `Non Sequitur! ${card.name} erschien mit zufälligen Werten (${minionAttack}/${minionHealth})!`;
                } else if (card.id === 'sartre') {
                    newState.pendingVoiceline = 'sartre';
                    logMessage = `${p.name} beschwörte ${card.name}.`;
                } else if (card.id === 'wittgenstein') {
                    newState.pendingVoiceline = 'wittgenstein';
                    logMessage = `${p.name} beschwörte ${card.name}.`;
                }

                // FREUD: Special choice modal before placement
                if (card.specialAbility === 'freud_choice') {
                    newState = {
                        ...newState,
                        targetMode: 'freud_choice' as any,
                        targetModeOwner: state.activePlayer,
                        pendingPlayedCard: card,
                        log: appendLog(newState.log, `${p.name} spielte ${card.name}. Wähle: Es, Ich oder Über-Ich.`)
                    };
                    break;
                }

                // ŽIŽEK: School selection modal before placement
                if (card.specialAbility === 'ideology') {
                    newState = {
                        ...newState,
                        targetMode: 'zizek_ideology' as any,
                        targetModeOwner: state.activePlayer,
                        pendingPlayedCard: card,
                        log: appendLog(newState.log, `${p.name} spielte ${card.name}. Wähle eine herrschende Ideologie!`)
                    };
                    break;
                }

                const minion: BoardMinion = {
                    ...card,
                    type: 'Philosoph',
                    attack: minionAttack,
                    health: minionHealth,
                    maxHealth: minionHealth,
                    canAttack: card.hasCharge ? true : false, // Freud Es has charge
                    hasAttacked: false,
                    hasUsedSpecial: false,
                    turnPlayed: state.turn,
                    untargetableUntilTurn: card.untargetableForTurns ? state.turn + card.untargetableForTurns : undefined
                };

                newState = {
                    ...newState,
                    [state.activePlayer]: {
                        ...p,
                        board: [...p.board, minion],
                        randomizeNextMinion: false // Clear the flag
                    },
                    log: appendLog(newState.log, logMessage)
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
                .filter((m): m is BoardMinion => m !== undefined && m.canAttack && (!m.hasAttacked || (m.extraAttacksRemaining || 0) > 0));

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
                // Über-Ich bonus: +1 attack if active this turn
                if (activePlayer.ueberichBonusTurn === state.turn) {
                    damage += 1;
                }
                // Work bonus is now health-based, not attack-based
                totalDamage += damage;
                attackerNames.push(attacker.name);
            }

            if (totalDamage === 0) return { ...state, log: currentLog };

            const attackerNamesStr = attackerNames.join(', ');

            if (!targetId) {
                // Attack Player
                updatedEnemyPlayer.health -= totalDamage;
                currentLog = appendLog(currentLog, `${attackerNamesStr} griff ${enemyPlayer.name} für ${totalDamage} Schaden an!`);

                // Mark as attacked (consume extra attacks first)
                updatedActivePlayer.board = activePlayer.board.map(m => {
                    if (!attackerIds.includes(m.instanceId || m.id)) return m;
                    // If has extra attacks, consume one instead of setting hasAttacked
                    if ((m.extraAttacksRemaining || 0) > 0) {
                        return { ...m, extraAttacksRemaining: (m.extraAttacksRemaining || 0) - 1 };
                    }
                    return { ...m, hasAttacked: true };
                });
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
                    currentLog = appendLog(currentLog, `${target.name} kann noch nicht angegriffen werden.`);
                    return { ...state, log: currentLog, pendingVoiceline: 'diogenes' };
                }

                const targetDamage = target.attack;

                // Combat Logic
                // 1. Attackers hit Target
                let targetHealth = target.health - totalDamage;

                // Jonas Protection Check: If defending player has protection, minion can't go below 1 health
                const defendingPlayer = state.activePlayer === 'player' ? state.opponent : state.player;
                if ((defendingPlayer.jonasProtectionTurns || 0) > 0 && targetHealth < 1) {
                    targetHealth = 1;
                    currentLog = appendLog(currentLog, `Ökologischer Imperativ schützt ${target.name}!`);
                }

                // 2. Target hits FIRST attacker back
                let attackersUpdated = [...activePlayer.board];
                const firstAttackerIndex = attackersUpdated.findIndex(m => (m.instanceId || m.id) === attackers[0].instanceId || (m.id === attackers[0].id));

                if (firstAttackerIndex !== -1) {
                    const firstMinion = attackersUpdated[firstAttackerIndex];
                    // Consume extra attack or mark as attacked
                    const newExtraAttacks = (firstMinion.extraAttacksRemaining || 0) > 0
                        ? (firstMinion.extraAttacksRemaining || 0) - 1
                        : 0;
                    const newHasAttacked = (firstMinion.extraAttacksRemaining || 0) > 0 ? firstMinion.hasAttacked : true;

                    attackersUpdated[firstAttackerIndex] = {
                        ...firstMinion,
                        health: firstMinion.health - targetDamage,
                        hasAttacked: newHasAttacked,
                        extraAttacksRemaining: newExtraAttacks
                    };
                }

                // Rest of attackers mark as attacked (consume extra attacks)
                attackers.slice(1).forEach(att => {
                    const idx = attackersUpdated.findIndex(m => (m.instanceId || m.id) === att.instanceId);
                    if (idx !== -1) {
                        const minion = attackersUpdated[idx];
                        if ((minion.extraAttacksRemaining || 0) > 0) {
                            attackersUpdated[idx] = { ...minion, extraAttacksRemaining: (minion.extraAttacksRemaining || 0) - 1 };
                        } else {
                            attackersUpdated[idx] = { ...minion, hasAttacked: true };
                        }
                    }
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

            // Death check after attack
            if (updatedEnemyPlayer.health <= 0) {
                newState.gameOver = true;
                newState.winner = state.activePlayer;
                newState.log = appendLog(newState.log, `${updatedEnemyPlayer.name} wurde besiegt!`);
            } else if (updatedActivePlayer.health <= 0) {
                newState.gameOver = true;
                newState.winner = state.activePlayer === 'player' ? 'opponent' : 'player';
                newState.log = appendLog(newState.log, `${updatedActivePlayer.name} wurde besiegt!`);
            }
            break;
        }

        case 'SELECT_CARD':
            return { ...state, selectedCard: action.cardId };

        case 'SELECT_MINION': {
            const { minionId, toggle } = action;

            // Handle DEDUKTION (3 targets) and INDUKTION (1 target)
            if (state.targetMode === 'deduktion_target') {
                const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
                // Only friendly minions
                if (!activePlayer.board.some(m => (m.instanceId || m.id) === minionId)) return state;

                let newSelected = state.selectedMinions || [];
                // Simply add the ID, allowing duplicates as per "3 choices" interpretation (or unique?)
                // "Wähle 3 Philosophen" -> If we want to allow same, we just push.
                // But toggle UI usually handles distinct selection.
                // Let's assume unique targets for now as it's cleaner UI.
                // If user clicks same, nothing happens or deselect?
                // Let's stick to unique for simplicity first.
                if (newSelected.includes(minionId)) {
                    // Deselect if already selected
                    newSelected = newSelected.filter(id => id !== minionId);
                } else {
                    if (newSelected.length < 3) {
                        newSelected = [...newSelected, minionId];
                    }
                }

                // If 3 selected, execute
                if (newSelected.length === 3) {
                    let updatedPlayer = { ...activePlayer };
                    // Apply +1/+1 to all selected
                    updatedPlayer.board = updatedPlayer.board.map(m => {
                        if (newSelected.includes(m.instanceId || m.id)) {
                            return {
                                ...m,
                                attack: m.attack + 1,
                                health: m.health + 1,
                                maxHealth: m.maxHealth + 1
                            };
                        }
                        return m;
                    });

                    // Move pending card to graveyard
                    if (state.pendingPlayedCard) {
                        updatedPlayer.graveyard = [...updatedPlayer.graveyard, state.pendingPlayedCard];
                    }

                    return {
                        ...state,
                        [state.activePlayer]: updatedPlayer,
                        selectedMinions: [],
                        targetMode: undefined,
                        pendingPlayedCard: undefined,
                        log: appendLog(state.log, `${activePlayer.name} nutzte Deduktion: +1/+1 für 3 Philosophen.`),
                        lastPlayedCard: undefined,
                        lastPlayedCardPlayerId: undefined
                    };
                }

                return { ...state, selectedMinions: newSelected };

            } else if (state.targetMode === 'induktion_target') {
                const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
                const minionIndex = activePlayer.board.findIndex(m => (m.instanceId || m.id) === minionId);

                if (minionIndex === -1) return state; // Must be friendly

                let updatedPlayer = { ...activePlayer };
                const minion = updatedPlayer.board[minionIndex];

                // Apple +3/+3
                const updatedMinion = {
                    ...minion,
                    attack: minion.attack + 3,
                    health: minion.health + 3,
                    maxHealth: minion.maxHealth + 3
                };

                updatedPlayer.board = updatedPlayer.board.map((m, i) => i === minionIndex ? updatedMinion : m);

                // Move pending card to graveyard
                if (state.pendingPlayedCard) {
                    updatedPlayer.graveyard = [...updatedPlayer.graveyard, state.pendingPlayedCard];
                }

                return {
                    ...state,
                    [state.activePlayer]: updatedPlayer,
                    selectedMinions: [],
                    targetMode: undefined,
                    pendingPlayedCard: undefined,
                    log: appendLog(state.log, `${activePlayer.name} nutzte Induktion auf ${minion.name}: +3/+3.`),
                    lastPlayedCard: undefined,
                    lastPlayedCardPlayerId: undefined
                };
            } else if (state.targetMode === 'philosophenherrschaft_target') {
                const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
                const minionIndex = activePlayer.board.findIndex(m => (m.instanceId || m.id) === minionId);

                if (minionIndex === -1) return state; // Must be friendly

                let updatedPlayer = { ...activePlayer };
                const minion = updatedPlayer.board[minionIndex];

                // Grant charge (canAttack = true)
                const updatedMinion = {
                    ...minion,
                    canAttack: true,
                    hasAttacked: false
                };

                updatedPlayer.board = updatedPlayer.board.map((m, i) => i === minionIndex ? updatedMinion : m);

                // Move pending card to graveyard
                if (state.pendingPlayedCard) {
                    updatedPlayer.graveyard = [...updatedPlayer.graveyard, state.pendingPlayedCard];
                }

                return {
                    ...state,
                    [state.activePlayer]: updatedPlayer,
                    selectedMinions: [],
                    targetMode: undefined,
                    pendingPlayedCard: undefined,
                    log: appendLog(state.log, `${activePlayer.name} gab ${minion.name} Ansturm! Er kann sofort angreifen.`),
                    lastPlayedCard: undefined,
                    lastPlayedCardPlayerId: undefined
                };
            }

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
                log: appendLog(state.log, `${activePlayer.name} wählte eine Karte aus dem Deck.`),
                lastPlayedCard: undefined, // Clear to prevent double-flash
                lastPlayedCardPlayerId: undefined
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
                log: appendLog(state.log, `${activePlayer.name} wählte eine Karte.`),
                lastPlayedCard: undefined, // Clear to prevent double-flash
                lastPlayedCardPlayerId: undefined
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
                log = appendLog(log, `${targetMinion.name} wurde zum letzten Menschen.`);
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
                selectedMinions: undefined,
                lastPlayedCard: undefined,
                lastPlayedCardPlayerId: undefined,
                pendingVoiceline: updatedMinion ? 'nietzsche' : undefined
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

            let log = appendLog(state.log, `${targetMinion.name} wurde zu stuhlartiger Materie.`);

            const updatedEnemyBoard = enemyPlayer.board.map(m => (m.instanceId || m.id) === minionId ? chairMatter : m);
            const updatedActiveBoard = activePlayer.board.map(m => (m.instanceId || m.id) === vanInwagenId ? { ...m, hasUsedSpecial: true, hasAttacked: true, specialExhausted: true } : m);

            newState = {
                ...state,
                [state.activePlayer]: { ...activePlayer, board: updatedActiveBoard },
                [state.activePlayer === 'player' ? 'opponent' : 'player']: { ...enemyPlayer, board: updatedEnemyBoard },
                log,
                targetMode: undefined,
                selectedMinions: undefined,
                lastPlayedCard: undefined,
                lastPlayedCardPlayerId: undefined,
                pendingVoiceline: 'van_inwagen'
            };
            break;
        }

        case 'ARETE_TARGET': {
            // Arete: Fully heal a selected philosopher
            const { minionId } = action;
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const enemyPlayer = state.activePlayer === 'player' ? state.opponent : state.player;

            // Can target both friendly and enemy minions
            const isOnActive = activePlayer.board.some(m => (m.instanceId || m.id) === minionId);
            const targetBoard = isOnActive ? activePlayer.board : enemyPlayer.board;
            const targetMinion = targetBoard.find(m => (m.instanceId || m.id) === minionId);

            if (!targetMinion) return state;

            const healedMinion: BoardMinion = {
                ...targetMinion,
                health: targetMinion.maxHealth || targetMinion.health
            };

            let log = appendLog(state.log, `${targetMinion.name} wurde durch Arete vollständig geheilt!`);

            // Update board
            const updateBoard = (board: BoardMinion[]) =>
                board.map(m => (m.instanceId || m.id) === minionId ? healedMinion : m);

            let updatedActive = isOnActive ? { ...activePlayer, board: updateBoard(activePlayer.board) } : activePlayer;
            let updatedEnemy = !isOnActive ? { ...enemyPlayer, board: updateBoard(enemyPlayer.board) } : enemyPlayer;

            // Add spell to graveyard
            if (state.pendingPlayedCard) {
                updatedActive.graveyard = [...updatedActive.graveyard, state.pendingPlayedCard];
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

        case 'CAVE_ASCENT_TARGET': {
            // Aufstieg aus der Höhle: +2 Attack, -2 Health (permanent). Dies if health < 3
            const { minionId } = action;
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;

            // Only target own minions
            const targetMinion = activePlayer.board.find(m => (m.instanceId || m.id) === minionId);
            if (!targetMinion) return state;

            let log = state.log;

            // Check if minion will die (health < 3 means after -2 it would be < 1)
            if (targetMinion.health < 3) {
                log = appendLog(log, `${targetMinion.name} konnte das Licht nicht ertragen und starb!`);

                const updatedBoard = activePlayer.board.filter(m => (m.instanceId || m.id) !== minionId);
                const updatedGraveyard = [...activePlayer.graveyard, targetMinion];

                let updatedActive = { ...activePlayer, board: updatedBoard, graveyard: updatedGraveyard };

                // Add spell to graveyard
                if (state.pendingPlayedCard) {
                    updatedActive.graveyard = [...updatedActive.graveyard, state.pendingPlayedCard];
                }

                newState = {
                    ...state,
                    [state.activePlayer]: updatedActive,
                    log,
                    targetMode: undefined,
                    pendingPlayedCard: undefined
                };
            } else {
                // Apply +2 attack, -2 health permanently (no revert)
                const transformedMinion: BoardMinion = {
                    ...targetMinion,
                    attack: targetMinion.attack + 2,
                    health: targetMinion.health - 2,
                    maxHealth: targetMinion.maxHealth - 2
                };

                log = appendLog(log, `${targetMinion.name} stieg aus der Höhle auf! (+2 Angriff, -2 Leben)`);

                const updatedBoard = activePlayer.board.map(m => (m.instanceId || m.id) === minionId ? transformedMinion : m);
                let updatedActive = { ...activePlayer, board: updatedBoard };

                // Add spell to graveyard
                if (state.pendingPlayedCard) {
                    updatedActive.graveyard = [...updatedActive.graveyard, state.pendingPlayedCard];
                }

                newState = {
                    ...state,
                    [state.activePlayer]: updatedActive,
                    log,
                    targetMode: undefined,
                    pendingPlayedCard: undefined
                };
            }
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
                log: appendLog(state.log, `${activePlayer.name} holte eine Karte vom Friedhof zurück.`),
                lastPlayedCard: undefined,
                lastPlayedCardPlayerId: undefined
            };
            break;
        }

        case 'PANTA_RHEI_SELECT': {
            // Panta Rhei: Force enemy to discard selected card
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const enemyPlayer = state.activePlayer === 'player' ? state.opponent : state.player;
            const card = state.pantaRheiCards?.find(c => c.instanceId === action.cardId || c.id === action.cardId);

            if (!card) return state;

            // Remove card from enemy hand
            const newEnemyHand = enemyPlayer.hand.filter(c => (c.instanceId || c.id) !== (card.instanceId || card.id));
            // Add card to enemy graveyard
            const newEnemyGraveyard = [...enemyPlayer.graveyard, card];

            const updatedEnemy = { ...enemyPlayer, hand: newEnemyHand, graveyard: newEnemyGraveyard };

            newState = {
                ...state,
                player: state.activePlayer === 'player' ? activePlayer : updatedEnemy,
                opponent: state.activePlayer === 'player' ? updatedEnemy : activePlayer,
                pantaRheiCards: undefined,
                targetMode: undefined,
                log: appendLog(state.log, `${card.name} wurde vom Gegner abgeworfen!`),
                lastPlayedCard: undefined,
                lastPlayedCardPlayerId: undefined
            };
            break;
        }

        case 'SET_OPPONENT_DECK': {
            const { deckIds, playerName, avatarId } = action;

            // Create updated opponent with playerName and avatarId if provided
            let updatedOpponent = { ...state.opponent };

            if (playerName) {
                updatedOpponent.name = playerName;
            }
            if (avatarId) {
                updatedOpponent.avatarId = avatarId;
            }

            // If deckIds provided, rebuild deck
            if (deckIds && deckIds.length > 0) {
                const customCards = deckIds
                    .map(id => cardDatabase.find(c => c.id === id))
                    .filter((c): c is typeof cardDatabase[0] => c !== undefined)
                    .map(card => ({
                        ...card,
                        instanceId: `${card.id}-opponent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    }));

                if (customCards.length > 0) {
                    const shuffledDeck = customCards.sort(() => Math.random() - 0.5);
                    let hand = shuffledDeck.slice(0, STARTING_HAND_SIZE);
                    let deck = shuffledDeck.slice(STARTING_HAND_SIZE);

                    // Ensure 1-cost card
                    const hasOneCostCard = hand.some(c => c.cost === 1);
                    if (!hasOneCostCard) {
                        const oneCostIndex = deck.findIndex(c => c.cost === 1);
                        if (oneCostIndex !== -1) {
                            const swapIndex = Math.floor(Math.random() * hand.length);
                            const cardToSwap = hand[swapIndex];
                            hand[swapIndex] = deck[oneCostIndex];
                            deck[oneCostIndex] = cardToSwap;
                        }
                    }

                    updatedOpponent = {
                        ...updatedOpponent,
                        deck,
                        hand
                    };
                }
            }

            const logMessage = deckIds && deckIds.length > 0
                ? `${updatedOpponent.name} hat ein Custom-Deck ausgewählt!`
                : `${updatedOpponent.name} ist dem Spiel beigetreten!`;

            newState = {
                ...state,
                opponent: updatedOpponent,
                log: appendLog(state.log, logMessage)
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

        case 'EROS_TARGET': {
            // Eros: Silence a targeted enemy philosopher for 2 turns (they can't attack)
            const enemyPlayerId = state.activePlayer === 'player' ? 'opponent' : 'player';
            const enemyPlayer = state[enemyPlayerId];
            const { minionId } = action;

            const targetMinion = enemyPlayer.board.find(m => (m.instanceId || m.id) === minionId);
            if (!targetMinion) return state;

            // Apply silence for 2 turns
            const silencedMinion = {
                ...targetMinion,
                silencedUntilTurn: state.turn + 3 // Silenced for next 2 attacking rounds
            };

            const updatedBoard = enemyPlayer.board.map(m =>
                (m.instanceId || m.id) === minionId ? silencedMinion : m
            );

            let updatedEnemy = { ...enemyPlayer, board: updatedBoard };
            const activePlayer = state[state.activePlayer];

            // Add spell to graveyard
            let updatedActive = { ...activePlayer };
            if (state.pendingPlayedCard) {
                updatedActive.graveyard = [...updatedActive.graveyard, state.pendingPlayedCard];
            }

            newState = {
                ...state,
                [state.activePlayer]: updatedActive,
                [enemyPlayerId]: updatedEnemy,
                targetMode: undefined,
                pendingPlayedCard: undefined,
                log: appendLog(state.log, `Eros! ${targetMinion.name} ist verliebt und kann 2 Runden nicht angreifen.`),
                lastPlayedCard: undefined,
                lastPlayedCardPlayerId: undefined
            };
            break;
        }

        case 'SET_DISCARD_MODE': {
            if (action.active) {
                newState = {
                    ...state,
                    targetMode: 'discard',
                    targetModeOwner: state.activePlayer
                };
            } else {
                newState = {
                    ...state,
                    targetMode: undefined,
                    targetModeOwner: undefined
                };
            }
            break;
        }

        case 'DISCARD_CARD': {
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const cardIndex = activePlayer.hand.findIndex(c => c.instanceId === action.cardId);

            if (cardIndex === -1) return state;

            const card = activePlayer.hand[cardIndex];
            const updatedHand = activePlayer.hand.filter((_, i) => i !== cardIndex);

            const updatedPlayer = {
                ...activePlayer,
                hand: updatedHand,
                graveyard: [...activePlayer.graveyard, card]
            };

            newState = {
                ...state,
                [state.activePlayer]: updatedPlayer,
                targetMode: undefined,
                targetModeOwner: undefined,
                log: appendLog(state.log, `${activePlayer.name} warf eine Karte ab.`)
            };
            break;
        }

        case 'CONFIRM_DEDUKTION': {
            // Allow confirming Deduktion with less than 3 targets
            if (state.targetMode !== 'deduktion_target') return state;
            const selected = state.selectedMinions || [];
            if (selected.length === 0) return state;

            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            let updatedPlayer = { ...activePlayer };

            // Apply +1/+1 to all selected
            updatedPlayer.board = updatedPlayer.board.map(m => {
                if (selected.includes(m.instanceId || m.id)) {
                    return {
                        ...m,
                        attack: m.attack + 1,
                        health: m.health + 1,
                        maxHealth: m.maxHealth + 1
                    };
                }
                return m;
            });

            // Move pending card to graveyard
            if (state.pendingPlayedCard) {
                updatedPlayer.graveyard = [...updatedPlayer.graveyard, state.pendingPlayedCard];
            }

            newState = {
                ...state,
                [state.activePlayer]: updatedPlayer,
                selectedMinions: [],
                targetMode: undefined,
                pendingPlayedCard: undefined,
                log: appendLog(state.log, `${activePlayer.name} nutzte Deduktion: +1/+1 für ${selected.length} Philosophen.`),
                lastPlayedCard: undefined,
                lastPlayedCardPlayerId: undefined
            };
            break;
        }

        case 'SET_STARTING_PLAYER': {
            // Set who starts after coin flip (used after Oracle animation)
            const { startingPlayer } = action;

            let updatedPlayer = { ...state.player };
            let updatedOpponent = { ...state.opponent };

            if (startingPlayer === 'opponent') {
                // Opponent starts: they get 1 mana, player gets 0 mana but extra card
                updatedOpponent.mana = 1;
                updatedOpponent.maxMana = 1;
                updatedPlayer.mana = 0;
                updatedPlayer.maxMana = 0;
                // Player (goes second) draws extra card
                if (updatedPlayer.deck.length > 0) {
                    const drawnCard = updatedPlayer.deck[0];
                    updatedPlayer.hand = [...updatedPlayer.hand, drawnCard];
                    updatedPlayer.deck = updatedPlayer.deck.slice(1);
                }
            } else {
                // Player starts: player has 1 mana (already set), opponent gets extra card
                // Opponent (goes second) draws extra card
                if (updatedOpponent.deck.length > 0) {
                    const drawnCard = updatedOpponent.deck[0];
                    updatedOpponent.hand = [...updatedOpponent.hand, drawnCard];
                    updatedOpponent.deck = updatedOpponent.deck.slice(1);
                }
            }

            newState = {
                ...state,
                activePlayer: startingPlayer,
                player: updatedPlayer,
                opponent: updatedOpponent,
                log: appendLog(state.log, `${startingPlayer === 'player' ? updatedPlayer.name : updatedOpponent.name} beginnt das Spiel.`)
            };
            break;
        }

        case 'FREUD_CHOICE': {
            // Player selected Es, Ich, or Über-Ich for Freud
            const { choice } = action as { type: 'FREUD_CHOICE'; choice: 'es' | 'ich' | 'ueberich' };
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;

            if (!state.pendingPlayedCard || state.pendingPlayedCard.id !== 'freud') {
                return state;
            }

            let updatedPlayer = { ...activePlayer };
            let logMessage = '';

            if (choice === 'es') {
                // Es: 8/1 with charge
                const minion: BoardMinion = {
                    ...state.pendingPlayedCard,
                    id: 'freud_es',
                    name: 'Freud: Es',
                    attack: 8,
                    health: 1,
                    maxHealth: 1,
                    description: 'Das Es kennt keine Moral. Nur Triebe.',
                    image: '/images/cards/freud_es.png',
                    type: 'Philosoph',
                    canAttack: true, // Charge!
                    hasAttacked: false,
                    hasUsedSpecial: false,
                    specialAbility: undefined, // No special ability button (Charge is passive)
                    turnPlayed: state.turn,
                };
                updatedPlayer.board = [...updatedPlayer.board, minion];
                logMessage = `${activePlayer.name} wählte das Es! Freud erscheint als 8/1 mit Ansturm.`;
            } else if (choice === 'ich') {
                // Ich: 6/6
                const minion: BoardMinion = {
                    ...state.pendingPlayedCard,
                    id: 'freud_ich',
                    name: 'Freud: Ich',
                    attack: 6,
                    health: 6,
                    maxHealth: 6,
                    description: 'Das Ich vermittelt zwischen Es und Über-Ich.',
                    image: '/images/cards/freud_ich.png',
                    type: 'Philosoph',
                    canAttack: false,
                    hasAttacked: false,
                    hasUsedSpecial: false,
                    turnPlayed: state.turn,
                };
                updatedPlayer.board = [...updatedPlayer.board, minion];
                logMessage = `${activePlayer.name} wählte das Ich! Freud erscheint als 6/6.`;
            } else if (choice === 'ueberich') {
                // Über-Ich: 2/2, give all friendly minions +1 attack this turn (automatic effect)
                const minion: BoardMinion = {
                    ...state.pendingPlayedCard,
                    id: 'freud_ueberich',
                    name: 'Freud: Über-Ich',
                    attack: 2,
                    health: 2,
                    maxHealth: 2,
                    description: 'Das Über-Ich ist der moralische Richter.',
                    image: '/images/cards/freud_ueberich.png',
                    type: 'Philosoph',
                    canAttack: false,
                    hasAttacked: false,
                    hasUsedSpecial: false,
                    specialAbility: undefined, // No effect button (automatic effect)
                    turnPlayed: state.turn,
                };
                updatedPlayer.board = [...updatedPlayer.board, minion];
                updatedPlayer.ueberichBonusTurn = state.turn;
                logMessage = `${activePlayer.name} wählte das Über-Ich! Alle Philosophen erhalten +1 Angriff diese Runde.`;
            }

            newState = {
                ...state,
                [state.activePlayer]: updatedPlayer,
                targetMode: undefined,
                targetModeOwner: undefined,
                pendingPlayedCard: undefined,
                log: appendLog(state.log, logMessage)
            };
            break;
        }

        case 'ZIZEK_IDEOLOGY': {
            // Žižek: Apply -2/-2 to all minions not of the chosen school
            const { school } = action as { type: 'ZIZEK_IDEOLOGY'; school: string };
            const activePlayer = state.activePlayer === 'player' ? state.player : state.opponent;
            const enemyPlayer = state.activePlayer === 'player' ? state.opponent : state.player;
            const zizekCard = state.pendingPlayedCard;

            if (!zizekCard || zizekCard.id !== 'zizek') {
                return state;
            }

            // Apply debuff to both boards
            const applyIdeologyDebuff = (board: BoardMinion[]): BoardMinion[] => {
                return board.map(m => {
                    const hasSchool = m.school && m.school.includes(school);
                    if (hasSchool) return m;
                    // Apply -2/-2
                    return {
                        ...m,
                        attack: Math.max(0, m.attack - 2),
                        health: m.health - 2
                    };
                }).filter(m => m.health > 0);
            };

            const deadActiveMinions = activePlayer.board.filter(m => {
                const hasSchool = m.school && m.school.includes(school);
                return !hasSchool && (m.health - 2) <= 0;
            });
            const deadEnemyMinions = enemyPlayer.board.filter(m => {
                const hasSchool = m.school && m.school.includes(school);
                return !hasSchool && (m.health - 2) <= 0;
            });

            let updatedActivePlayer = {
                ...activePlayer,
                board: applyIdeologyDebuff(activePlayer.board),
                graveyard: [...activePlayer.graveyard, ...deadActiveMinions]
            };
            let updatedEnemyPlayer = {
                ...enemyPlayer,
                board: applyIdeologyDebuff(enemyPlayer.board),
                graveyard: [...enemyPlayer.graveyard, ...deadEnemyMinions]
            };

            // Place Žižek on board
            const minion: BoardMinion = {
                ...zizekCard,
                type: 'Philosoph',
                attack: zizekCard.attack || 0,
                health: zizekCard.health || 0,
                maxHealth: zizekCard.health || 0,
                canAttack: false,
                hasAttacked: false,
                hasUsedSpecial: false,
                turnPlayed: state.turn,
            };
            updatedActivePlayer.board = [...updatedActivePlayer.board, minion];

            const totalDebuffed = deadActiveMinions.length + deadEnemyMinions.length;
            const logMessage = `Herrschende Ideologie: "${school}"! ${totalDebuffed > 0 ? `${totalDebuffed} Philosoph(en) starben.` : 'Alle Andersdenkenden wurden geschwächt.'}`;

            newState = {
                ...state,
                [state.activePlayer]: updatedActivePlayer,
                [state.activePlayer === 'player' ? 'opponent' : 'player']: updatedEnemyPlayer,
                targetMode: undefined,
                targetModeOwner: undefined,
                pendingPlayedCard: undefined,
                log: appendLog(state.log, logMessage)
            };
            break;
        }

        case 'SYNC_STATE': {
            // Client receives full state from host
            // Double-flash prevention is handled by GameArea's seenFlashIds tracking
            return action.newState;
        }

        default:
            // Do not return state here, break to allow synergy calc
            break;
    }

    // Auto-Calculate Synergies on every state change
    newState.player.board = calculateSynergies(newState.player.board, newState.player.synergyBlockTurns);
    newState.opponent.board = calculateSynergies(newState.opponent.board, newState.opponent.synergyBlockTurns);

    return newState;
}
