import { useState, useCallback, useEffect } from 'react';
import { GameState, Player, BoardMinion, GameAction } from '../types';
import { generateDeck } from '../data/cards';
import { multiplayer } from '../network/MultiplayerManager';

const STARTING_HAND_SIZE = 4;
const MAX_HAND_SIZE = 10;
// const MAX_BOARD_SIZE = 7; // Removed per user request

function createPlayer(name: string, isPlayer: boolean, startingHandSize: number = STARTING_HAND_SIZE): Player {
    const deck = generateDeck();
    let hand = deck.slice(0, startingHandSize);
    let remainingDeck = deck.slice(startingHandSize);

    // Guarantee at least one 1-cost card in starting hand
    const hasOneCostCard = hand.some(c => c.cost === 1);
    if (!hasOneCostCard) {
        // Find a 1-cost card in the remaining deck
        const oneCostIndex = remainingDeck.findIndex(c => c.cost === 1);
        if (oneCostIndex !== -1) {
            // Swap a random card from hand with the 1-cost card
            const swapIndex = Math.floor(Math.random() * hand.length);
            const cardToSwap = hand[swapIndex];
            hand[swapIndex] = remainingDeck[oneCostIndex];
            remainingDeck[oneCostIndex] = cardToSwap;
        }
    }

    // Add DEBUG cards to player's starting hand for testing
    // Add DEBUG cards to player's starting hand for testing
    // DISABLED: User requested to disable debug cards but keep code
    /*
    if (isPlayer) {
        const debugDeck = generateDeck();
        const debug1 = debugDeck.find(c => c.id === 'debug_1');
        const debug2 = debugDeck.find(c => c.id === 'debug_2');

        if (debug1) hand.push({ ...debug1, instanceId: `debug-1-${Date.now()}` });
        if (debug2) hand.push({ ...debug2, instanceId: `debug-2-${Date.now()}` });
    }
    */

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

function createInitialState(): GameState {
    return {
        turn: 0,
        activePlayer: 'player',
        player: createPlayer('Player', true, STARTING_HAND_SIZE),
        opponent: createPlayer('Gegner', false, STARTING_HAND_SIZE + 1), // Second player gets +1 card balance
        gameOver: false,
        log: ['Spiel gestartet! Möge der beste Philosoph gewinnen.'],
    };
}



// Synergy Logic
// Each philosopher gets +1 synergy for each OTHER distinct philosopher they share at least one school with.
// Multiple shared schools with the same philosopher only count as +1, not more.
// We also track which schools contributed to the synergy for hover display.
const calculateSynergies = (board: BoardMinion[]): BoardMinion[] => {
    // 1. Reset synergy bonuses first
    let updatedBoard = board.map(minion => {
        const bonus = minion.synergyBonus || 0;
        return {
            ...minion,
            attack: minion.attack - bonus,
            maxHealth: minion.maxHealth - bonus,
            health: minion.health - bonus,
            synergyBonus: 0,
            synergyBreakdown: {} as Record<string, number>,
            linkedWith: [] as string[]
        };
    });

    // 2. Build adjacency and track which schools cause the synergy
    // For each minion, track: for each school, how many OTHER minions share that school
    const schoolCounts: Record<string, Record<string, number>> = {};
    updatedBoard.forEach(m => schoolCounts[m.instanceId || m.id] = {});

    for (let i = 0; i < updatedBoard.length; i++) {
        for (let j = i + 1; j < updatedBoard.length; j++) {
            const m1 = updatedBoard[i];
            const m2 = updatedBoard[j];

            // Find all shared schools between m1 and m2
            const sharedSchools = m1.school?.filter(s => m2.school?.includes(s)) || [];

            if (sharedSchools.length > 0) {
                // For display purposes, pick ONE representative school (the first shared one)
                // This represents the "connection" between these two philosophers
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
            maxHealth: minion.maxHealth + bonus,
            health: minion.health + bonus,
            synergyBonus: bonus,
            synergyBreakdown: breakdown,
            linkedWith: [] as string[] // No longer needed for UI
        };
    });

    return finalBoard;
};

export function useGameLogic(mode: 'single' | 'multiplayer_host' | 'multiplayer_client' = 'single') {
    const [gameState, setGameState] = useState<GameState>(createInitialState());

    // Helper to update state with synergies
    const setGameStateWithSynergies = useCallback((updateFn: (prev: GameState) => GameState) => {
        setGameState(prev => {
            const newState = updateFn(prev);

            // Only recalculate if board changed
            if (newState.player.board !== prev.player.board || newState.opponent.board !== prev.opponent.board) {
                return {
                    ...newState,
                    player: { ...newState.player, board: calculateSynergies(newState.player.board) },
                    opponent: { ...newState.opponent, board: calculateSynergies(newState.opponent.board) }
                };
            }
            return newState;
        });
    }, []);

    // Multiplayer synchronization
    useEffect(() => {
        if (mode === 'multiplayer_host') {
            // Host sends state updates whenever state changes
            multiplayer.sendState(gameState);
        }
    }, [gameState, mode]);

    useEffect(() => {
        if (mode === 'multiplayer_host') {
            // Host listens for actions from client
            multiplayer.setCallbacks(
                () => { }, // Host ignores state updates
                (action) => {
                    // Execute client action locally
                    dispatch(action, true); // true = fromNetwork
                },
                () => { }
            );
        } else if (mode === 'multiplayer_client') {
            // Client listens for state updates from host
            multiplayer.setCallbacks(
                (newState) => {
                    console.log('Client received state update');
                    setGameState(newState);
                },
                () => { }, // Client ignores actions
                () => { }
            );
        }
    }, [mode]);

    const appendLog = useCallback((currentLog: string[], message: string) => {
        return [...currentLog.slice(-9), message];
    }, []);

    const addLog = useCallback((message: string) => {
        setGameStateWithSynergies(prev => ({
            ...prev,
            log: appendLog(prev.log, message),
        }));
    }, [setGameStateWithSynergies, appendLog]);

    const drawCard = useCallback((player: Player): Player => {
        if (player.deck.length === 0) {
            return player; // No cards to draw
        }

        if (player.hand.length >= MAX_HAND_SIZE) {
            // Hand is full, card is burned
            return {
                ...player,
                deck: player.deck.slice(1),
                graveyard: [...player.graveyard, player.deck[0]],
            };
        }

        const drawnCard = player.deck[0];
        // Card draw is silent - no log message

        return {
            ...player,
            hand: [...player.hand, drawnCard],
            deck: player.deck.slice(1),
        };
    }, []);

    const startTurn = useCallback((player: Player): Player => {
        const newMaxMana = Math.min(player.maxMana + 1, 10);
        // Apply locked mana and reset it
        const availableMana = Math.max(0, newMaxMana - player.lockedMana);

        let updatedPlayer = {
            ...player,
            maxMana: newMaxMana,
            mana: availableMana,
            lockedMana: 0, // Reset lock
            board: player.board.map(minion => ({
                ...minion,
                canAttack: true,
                hasAttacked: false,
            })),
        };

        // Draw a card
        updatedPlayer = drawCard(updatedPlayer);

        return updatedPlayer;
    }, [drawCard]);

    const playCard = useCallback((cardId: string) => {
        setGameStateWithSynergies(prev => {
            const { activePlayer: activePlayerKey, player, opponent } = prev;
            let currentLog = prev.log;
            const activePlayer = activePlayerKey === 'player' ? player : opponent;

            const cardIndex = activePlayer.hand.findIndex(c => c.instanceId === cardId);
            if (cardIndex === -1) return prev;

            const card = activePlayer.hand[cardIndex];

            // Check mana
            if (activePlayer.mana < card.cost) {
                currentLog = appendLog(currentLog, 'Nicht genug Dialektik (Mana)!');
                return { ...prev, log: currentLog };
            }

            // Check board space for minions (unless it's Wittgenstein who clears the board)
            // MAX_BOARD_SIZE restriction removed per user request
            // if (card.type === 'Philosoph' && activePlayer.board.length >= MAX_BOARD_SIZE && !card.id.includes('wittgenstein')) {
            //    addLog('Das Spielfeld ist voll!');
            //    return prev;
            // }

            let updatedPlayer = {
                ...activePlayer,
                mana: activePlayer.mana - card.cost,
                hand: activePlayer.hand.filter((_, i) => i !== cardIndex),
            };

            let updatedEnemy = activePlayerKey === 'player' ? opponent : player;

            if (card.type === 'Werk') {
                // Handle Work cards
                if (updatedPlayer.activeWork) {
                    updatedPlayer.graveyard = [...updatedPlayer.graveyard, updatedPlayer.activeWork];
                    currentLog = appendLog(currentLog, `${activePlayer.name} ersetzte "${updatedPlayer.activeWork.name}" durch "${card.name}".`);
                } else {
                    currentLog = appendLog(currentLog, `${activePlayer.name} veröffentlichte "${card.name}".`);
                }
                updatedPlayer.activeWork = card;
            } else if (card.type === 'Philosoph') {
                // Wittgenstein's special ability: Clear the entire board
                if (card.id.includes('wittgenstein')) {
                    // Move all minions to graveyard
                    updatedPlayer.graveyard = [
                        ...updatedPlayer.graveyard,
                        ...updatedPlayer.board,
                    ];
                    updatedEnemy.graveyard = [
                        ...updatedEnemy.graveyard,
                        ...updatedEnemy.board,
                    ];
                    updatedPlayer.board = [];
                    updatedEnemy.board = [];

                    currentLog = appendLog(currentLog, `${activePlayer.name} beschwor ${card.name}! "Wovon man nicht sprechen kann, darüber muss man schweigen." - Das Spielfeld wurde geleert!`);
                }

                const minion: BoardMinion = {
                    ...card,
                    type: 'Philosoph',
                    attack: card.attack!,
                    health: card.health!,
                    maxHealth: card.health!,
                    canAttack: false, // Summoning sickness
                    hasAttacked: false,
                    hasUsedSpecial: false,
                    turnPlayed: prev.turn, // Track when minion was played (for Diogenes)
                };

                // Schopenhauer: Deal 5 damage to player when played
                if (card.id.includes('schopenhauer')) {
                    updatedPlayer.health = Math.max(0, updatedPlayer.health - 5);
                    currentLog = appendLog(currentLog, `${card.name} fügt dir 5 Schaden zu! Leben ist Leiden.`);
                }

                updatedPlayer = {
                    ...updatedPlayer,
                    board: [...updatedPlayer.board, minion],
                };

                if (!card.id.includes('wittgenstein')) {
                    currentLog = appendLog(currentLog, `${activePlayer.name} beschwor ${card.name}!`);
                }

                // Marx Special: Auto-trigger steal on play
                if (card.id.includes('marx')) {
                    if (updatedEnemy.board.length > 0) {
                        // Find lowest-cost enemy minion
                        const lowestCostMinion = updatedEnemy.board.reduce((lowest, current) =>
                            current.cost < lowest.cost ? current : lowest
                        );

                        // Steal the minion
                        const stolenMinion: BoardMinion = {
                            ...lowestCostMinion,
                            canAttack: false, // Summoning sickness applies
                            hasAttacked: false,
                        };

                        // Remove from enemy board, add to Marx's side
                        updatedEnemy.board = updatedEnemy.board.filter(m => m.id !== lowestCostMinion.id);
                        updatedPlayer.board = [...updatedPlayer.board, stolenMinion];

                        currentLog = appendLog(currentLog, `${card.name}: "Proletarier aller Länder, vereinigt euch!" ${stolenMinion.name} wechselt die Seiten!`);
                    } else {
                        currentLog = appendLog(currentLog, `${card.name} wurde beschworen, aber es gibt keine Philosophen zum vereinigen!`);
                    }
                }

                // Foucault Special: Panoptischer Blick - auto-trigger on play
                if (card.id.includes('foucault')) {
                    const top3Cards = updatedEnemy.deck.slice(0, 3);
                    if (top3Cards.length > 0) {
                        currentLog = appendLog(currentLog, `${card.name}: "Panoptischer Blick!" Du siehst die nächsten Karten des Gegners.`);
                        // Return early to show modal
                        return {
                            ...prev,
                            // Correctly assign updated players based on active turn
                            player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                            opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                            selectedCard: undefined,
                            targetMode: 'foucault_reveal',
                            targetModeOwner: activePlayerKey,
                            foucaultRevealCards: top3Cards,
                            log: currentLog,
                        };
                    } else {
                        currentLog = appendLog(currentLog, `${card.name}: "Panoptischer Blick!" Das Deck des Gegners ist leer.`);
                    }
                }
            } else {
                // Spell logic
                updatedPlayer.graveyard = [...updatedPlayer.graveyard, card];

                // Simple spell effects
                if (card.id.includes('dialectic') || card.id.includes('cogito')) {
                    // Draw cards
                    const drawCount = card.id.includes('dialectic') ? 2 : 1;
                    for (let i = 0; i < drawCount; i++) {
                        updatedPlayer = drawCard(updatedPlayer);
                    }
                    currentLog = appendLog(currentLog, `${activePlayer.name} wirkte ${card.name} und zog ${drawCount} Karte(n).`);
                } else if (card.id.includes('meditation') || card.id.includes('Aufklärung')) {
                    // Heal
                    const healAmount = card.id.includes('meditation') ? 3 : 5;
                    updatedPlayer.health = Math.min(updatedPlayer.health + healAmount, updatedPlayer.maxHealth);
                    currentLog = appendLog(currentLog, `${activePlayer.name} wirkte ${card.name} und stellte ${healAmount} Glaubwürdigkeit wieder her.`);
                } else if (card.id.includes('aporia') || card.id.includes('wu-wei')) {
                    // Damage spells - target opponent
                    const damage = card.id.includes('aporia') ? 3 : 5;
                    updatedEnemy = { ...updatedEnemy, health: updatedEnemy.health - damage };
                    currentLog = appendLog(currentLog, `${activePlayer.name} wirkte ${card.name} und verursachte ${damage} Schaden!`);

                    // Check win conditions immediately after spell damage
                    if (updatedEnemy.health <= 0) {
                        // Win condition handled by useEffect
                    }
                } else if (card.id.includes('sophistry')) {
                    // Lock 1 enemy mana next turn + gain 1 temporary mana this turn
                    updatedEnemy.lockedMana = (updatedEnemy.lockedMana || 0) + 1;
                    updatedPlayer.mana = Math.min(updatedPlayer.mana + 1, 10);
                    currentLog = appendLog(currentLog, `${activePlayer.name} nutzte Sophistik: +1 Dialektik und sperrte 1 Dialektik des Gegners!`);
                } else if (card.id.includes('dogmatism')) {
                    // Lock 2 Mana next turn
                    updatedEnemy.lockedMana += 2;
                    currentLog = appendLog(currentLog, `${activePlayer.name} wirkte ${card.name} und sperrte 2 Dialektik des Gegners!`);
                } else if (card.id.includes('trolley')) {
                    // Trolley Problem: Sacrifice own minion to damage all enemies
                    // Check if board is empty
                    if (updatedPlayer.board.length === 0) {
                        currentLog = appendLog(currentLog, 'Du hast keine Philosophen zum Opfern!');
                        // Refund mana since spell can't be cast
                        updatedPlayer.mana += card.cost;
                        updatedPlayer.hand.push(card);
                        updatedPlayer.graveyard = updatedPlayer.graveyard.filter(c => c.id !== card.id);
                    } else {
                        // Both human players and AI need to select (AI handled elsewhere or shows UI)
                        return {
                            ...prev,
                            player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                            opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                            selectedCard: undefined,
                            targetMode: 'trolley_sacrifice',
                            targetModeOwner: activePlayerKey,
                            pendingPlayedCard: card,
                            log: currentLog,
                        };
                    }
                } else if (card.id.includes('hermeneutics') || card.id.includes('debug')) {
                    currentLog = appendLog(currentLog, `${activePlayer.name} wirkte ${card.name} und sucht im Deck.`);
                    // We don't remove the card from hand logic yet? 
                    // Wait, logic above ALREADY removed it from filter: "hand: activePlayer.hand.filter..."
                    // So we must store it here.
                    return {
                        ...prev,
                        player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                        opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                        selectedCard: undefined,
                        targetMode: 'search',
                        targetModeOwner: activePlayerKey,
                        pendingPlayedCard: card,
                        log: currentLog,
                    };
                } else if (card.id.includes('kontemplation')) {
                    // Look at top 3 cards of your deck, pick 1
                    const top3 = updatedPlayer.deck.slice(0, 3);
                    if (top3.length === 0) {
                        currentLog = appendLog(currentLog, `${activePlayer.name} wirkte ${card.name}, aber das Deck ist leer!`);
                    } else {
                        // Enter kontemplation mode to select a card (works for all players)
                        currentLog = appendLog(currentLog, `${activePlayer.name} wirkte ${card.name}. Wähle eine der obersten 3 Karten.`);
                        return {
                            ...prev,
                            player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                            opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                            selectedCard: undefined,
                            targetMode: 'kontemplation',
                            targetModeOwner: activePlayerKey,
                            kontemplationCards: top3,
                            log: currentLog,
                        };
                    }
                } else if (card.id.includes('axiom')) {
                    // Grant +1 mana for this turn
                    updatedPlayer.mana = updatedPlayer.mana + 1;
                    currentLog = appendLog(currentLog, `${activePlayer.name} wirkte ${card.name} und erhielt 1 zusätzliche Dialektik!`);
                } else if (card.id.includes('gottesbeweis')) {
                    // Trigger target mode
                    return {
                        ...prev,
                        player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                        opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                        selectedCard: undefined,
                        targetMode: 'gottesbeweis_target',
                        targetModeOwner: activePlayerKey,
                        pendingPlayedCard: card,
                        log: currentLog, // No log added yet but passing it anyway
                    };
                }
            }

            return {
                ...prev,
                player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                selectedCard: undefined,
                log: currentLog,
            };
        });
    }, [appendLog, drawCard]);

    const attack = useCallback((attackerIds: string[], targetId?: string) => {
        setGameStateWithSynergies(prev => {
            const { activePlayer: activePlayerKey, player, opponent } = prev;
            let currentLog = prev.log;

            const activePlayer = activePlayerKey === 'player' ? player : opponent;
            const enemyPlayer = activePlayerKey === 'player' ? opponent : player;

            // Get all attackers
            const attackers = attackerIds
                .map(id => activePlayer.board.find(m => (m.instanceId || m.id) === id)) // Support both ID types for safety
                .filter((m): m is BoardMinion => m !== undefined && m.canAttack && !m.hasAttacked);

            if (attackers.length === 0) {
                currentLog = appendLog(currentLog, 'Keine gültigen Angreifer ausgewählt!');
                return { ...prev, log: currentLog };
            }

            let updatedActivePlayer = { ...activePlayer };
            let updatedEnemyPlayer = { ...enemyPlayer };

            // Calculate total damage from all attackers (with work bonuses)
            let totalDamage = 0;
            const attackerNames: string[] = [];

            for (const attacker of attackers) {
                let damage = attacker.attack;
                if (activePlayer.activeWork?.workBonus && attacker.school?.includes(activePlayer.activeWork.workBonus.school)) {
                    damage += activePlayer.activeWork.workBonus.damage;
                }
                totalDamage += damage;
                attackerNames.push(attacker.name);
            }

            const attackerNamesStr = attackerNames.length === 1
                ? attackerNames[0]
                : attackerNames.slice(0, -1).join(', ') + ' und ' + attackerNames[attackerNames.length - 1];

            if (!targetId) {
                // Attack player directly
                updatedEnemyPlayer.health -= totalDamage;
                currentLog = appendLog(currentLog, `${attackerNamesStr} griff${attackers.length > 1 ? 'en' : ''} ${enemyPlayer.name} an! (${totalDamage} Schaden)`);

                // Mark all attackers as having attacked
                updatedActivePlayer.board = activePlayer.board.map(m =>
                    attackerIds.includes(m.instanceId || m.id) ? { ...m, hasAttacked: true } : m
                );
            } else {
                // Attack minion
                const targetIndex = enemyPlayer.board.findIndex(m => (m.instanceId || m.id) === targetId);
                if (targetIndex === -1) return prev;

                const target = enemyPlayer.board[targetIndex];

                // Diogenes protection
                if (target.id.includes('diogenes') && target.turnPlayed !== undefined) {
                    const turnsOnField = prev.turn - target.turnPlayed;
                    if (turnsOnField < 3) {
                        const diogenesMsg = `${target.name} lebt noch in seiner Tonne und kann erst in ${3 - turnsOnField} Runde(n) angegriffen werden!`;
                        if (prev.log.length === 0 || prev.log[prev.log.length - 1] !== diogenesMsg) {
                            currentLog = appendLog(currentLog, diogenesMsg);
                        }
                        return { ...prev, log: currentLog };
                    }
                }

                const targetDamage = target.attack;

                // First attacker takes all counter-damage
                const firstAttacker = attackers[0];
                const firstAttackerIndex = activePlayer.board.findIndex(m => (m.instanceId || m.id) === firstAttacker.instanceId);

                currentLog = appendLog(currentLog, `${attackerNamesStr} griff${attackers.length > 1 ? 'en' : ''} ${target.name} an! (${totalDamage} Schaden vs ${targetDamage} Gegenschlag)`);

                // Update boards
                updatedActivePlayer.board = [...activePlayer.board];
                updatedEnemyPlayer.board = [...enemyPlayer.board];

                // Mark all attackers as having attacked
                updatedActivePlayer.board = updatedActivePlayer.board.map(m =>
                    attackerIds.includes(m.instanceId || m.id) ? { ...m, hasAttacked: true } : m
                );

                // First attacker takes counter-damage
                const updatedFirstAttacker = {
                    ...firstAttacker,
                    health: firstAttacker.health - targetDamage,
                    hasAttacked: true
                };

                // Target takes summed damage
                const updatedTarget = { ...target, health: target.health - totalDamage };

                // Handle first attacker death
                if (updatedFirstAttacker.health <= 0) {
                    updatedActivePlayer.board = updatedActivePlayer.board.filter(m => (m.instanceId || m.id) !== (firstAttacker.instanceId || firstAttacker.id));
                    updatedActivePlayer.graveyard = [...updatedActivePlayer.graveyard, firstAttacker];
                    currentLog = appendLog(currentLog, `${firstAttacker.name} wurde besiegt!`);
                } else {
                    updatedActivePlayer.board[firstAttackerIndex] = updatedFirstAttacker;
                }

                // Handle target death
                if (updatedTarget.health <= 0) {
                    updatedEnemyPlayer.board = updatedEnemyPlayer.board.filter(m => (m.instanceId || m.id) !== (target.instanceId || target.id));
                    updatedEnemyPlayer.graveyard = [...updatedEnemyPlayer.graveyard, target];
                    currentLog = appendLog(currentLog, `${target.name} wurde besiegt!`);
                } else {
                    updatedEnemyPlayer.board[targetIndex] = updatedTarget;
                }
            }

            // Check win conditions
            const gameOver = updatedEnemyPlayer.health <= 0 || updatedActivePlayer.health <= 0;
            let winner: 'player' | 'opponent' | undefined = undefined;

            if (updatedEnemyPlayer.health <= 0) {
                winner = activePlayerKey;
            } else if (updatedActivePlayer.health <= 0) {
                winner = activePlayerKey === 'player' ? 'opponent' : 'player';
            }

            return {
                ...prev,
                player: activePlayerKey === 'player' ? updatedActivePlayer : updatedEnemyPlayer,
                opponent: activePlayerKey === 'player' ? updatedEnemyPlayer : updatedActivePlayer,
                selectedMinions: undefined,
                gameOver,
                winner,
                log: currentLog,
            };
        });
    }, [addLog]);

    const endTurn = useCallback(() => {
        setGameStateWithSynergies(prev => {
            const { activePlayer: currentPlayer, player, opponent, turn } = prev;
            let currentLog = prev.log;

            currentLog = appendLog(currentLog, `${currentPlayer === 'player' ? player.name : opponent.name} beendete den Zug.`);

            const nextPlayer = currentPlayer === 'player' ? 'opponent' : 'player';
            const playerToActivate = nextPlayer === 'player' ? player : opponent;

            const updatedPlayer = startTurn(playerToActivate);

            currentLog = appendLog(currentLog, `Runde ${turn + 1}: ${updatedPlayer.name} ist am Zug.`);

            const newState: GameState = {
                ...prev,
                turn: nextPlayer === 'player' ? turn + 1 : turn,
                activePlayer: nextPlayer,
                player: nextPlayer === 'player' ? updatedPlayer : player,
                opponent: nextPlayer === 'opponent' ? updatedPlayer : opponent,
                selectedCard: undefined,
                selectedMinions: undefined,
                log: currentLog,
            };

            return newState;
        });
    }, [addLog, startTurn]);

    const selectCard = useCallback((cardId?: string) => {
        setGameStateWithSynergies(prev => ({ ...prev, selectedCard: cardId }));
    }, [setGameStateWithSynergies]);

    const selectMinion = useCallback((minionId: string, toggle?: boolean) => {
        setGameStateWithSynergies(prev => {
            const current = prev.selectedMinions || [];
            if (toggle) {
                // Toggle: add if not present, remove if present
                const isSelected = current.includes(minionId);
                return {
                    ...prev,
                    selectedMinions: isSelected
                        ? current.filter(id => id !== minionId)
                        : [...current, minionId]
                };
            } else {
                // Non-toggle: replace selection
                return { ...prev, selectedMinions: [minionId] };
            }
        });
    }, [setGameStateWithSynergies]);

    const dispatch = useCallback((action: GameAction, fromNetwork: boolean = false) => {
        // If client, send action to host instead of executing locally
        if (mode === 'multiplayer_client' && !fromNetwork) {
            // Only allow selecting cards/minions locally for UI feedback, but not game logic
            if (action.type === 'SELECT_CARD' || action.type === 'SELECT_MINION') {
                // Allow local selection
            } else {
                console.log('Client sending action:', action);
                multiplayer.sendAction(action);
                return; // Don't execute locally yet, wait for state update
            }
        }

        switch (action.type) {
            case 'START_GAME':
                setGameStateWithSynergies(() => createInitialState());
                // Start first turn
                setTimeout(() => {
                    setGameStateWithSynergies(prev => {
                        let currentLog = prev.log;
                        const updatedPlayer = startTurn(prev.player);
                        currentLog = appendLog(currentLog, 'Runde 1: Player beginnt.');
                        return { ...prev, player: updatedPlayer, turn: 1, log: currentLog };
                    });
                }, 100);
                break;
            case 'END_TURN':
                endTurn();
                break;
            case 'PLAY_CARD':
                playCard(action.cardId);
                break;
            case 'ATTACK':
                attack(action.attackerIds, action.targetId);
                break;
            case 'USE_SPECIAL':
                // Handle special abilities (currently only Van Inwagen transformation)
                setGameStateWithSynergies(prev => {
                    const { player, opponent, activePlayer: activePlayerKey } = prev;
                    let currentLog = prev.log;
                    const activePlayer = activePlayerKey === 'player' ? player : opponent;
                    const enemyPlayer = activePlayerKey === 'player' ? prev.opponent : prev.player;

                    const minion = activePlayer.board.find(m => (m.instanceId || m.id) === action.minionId);
                    if (!minion || !minion.specialAbility || !minion.canAttack || minion.hasAttacked || minion.hasUsedSpecial) {
                        return prev; // Invalid special use
                    }

                    // Marx Special: Steal opponent's lowest-cost minion
                    if (minion.id.includes('marx')) {
                        if (enemyPlayer.board.length === 0) {
                            currentLog = appendLog(currentLog, 'Keine gegnerischen Philosophen zum vereinigen!');
                            return { ...prev, log: currentLog };
                        }

                        // Find lowest-cost enemy minion
                        const lowestCostMinion = enemyPlayer.board.reduce((lowest, current) =>
                            current.cost < lowest.cost ? current : lowest
                        );

                        // Move minion to Marx's side
                        const stolenMinion: BoardMinion = {
                            ...lowestCostMinion,
                            canAttack: true, // Can attack immediately
                            hasAttacked: false,
                        };

                        // Remove from enemy board, add to active board
                        const updatedEnemyBoard = enemyPlayer.board.filter(m => (m.instanceId || m.id) !== (lowestCostMinion.instanceId || lowestCostMinion.id));
                        const updatedActiveBoard = [
                            ...activePlayer.board.map(m =>
                                (m.instanceId || m.id) === action.minionId ? { ...m, hasUsedSpecial: true } : m
                            ),
                            stolenMinion
                        ];

                        const updatedPlayer = activePlayerKey === 'player'
                            ? { ...player, board: updatedActiveBoard }
                            : { ...player, board: updatedEnemyBoard };
                        const updatedOpponent = activePlayerKey === 'player'
                            ? { ...opponent, board: updatedEnemyBoard }
                            : { ...opponent, board: updatedActiveBoard };

                        currentLog = appendLog(currentLog, `${minion.name}: "Proletarier aller Länder, vereinigt euch!" ${stolenMinion.name} wechselt die Seiten!`);

                        return {
                            ...prev,
                            player: updatedPlayer,
                            opponent: updatedOpponent,
                            selectedMinion: undefined,
                            targetMode: undefined,
                            log: currentLog,
                        };
                    }

                    // Foucault Special: Panoptischer Blick - reveal top 3 cards of opponent's deck
                    if (minion.id.includes('foucault')) {
                        const top3Cards = enemyPlayer.deck.slice(0, 3);
                        if (top3Cards.length === 0) {
                            currentLog = appendLog(currentLog, 'Das Deck des Gegners ist leer!');
                            return { ...prev, log: currentLog };
                        }

                        const cardNames = top3Cards.map(c => c.name).join(', ');
                        currentLog = appendLog(currentLog, `${minion.name}: "Panoptischer Blick!" Du siehst: ${cardNames}`);

                        // Mark special as used
                        const updatedActiveBoard = activePlayer.board.map(m =>
                            (m.instanceId || m.id) === action.minionId ? { ...m, hasUsedSpecial: true } : m
                        );

                        const updatedPlayer = activePlayerKey === 'player'
                            ? { ...player, board: updatedActiveBoard }
                            : player;
                        const updatedOpponent = activePlayerKey === 'player'
                            ? opponent
                            : { ...opponent, board: updatedActiveBoard };

                        return {
                            ...prev,
                            player: updatedPlayer,
                            opponent: updatedOpponent,
                            selectedMinion: undefined,
                            log: currentLog,
                        };
                    }

                    if (minion.specialAbility === 'transform' && action.targetId) {
                        const targetMinion = enemyPlayer.board.find(m => (m.instanceId || m.id) === action.targetId);
                        if (!targetMinion) return prev;

                        // Create "Chair Matter" minion (0/1)
                        const chairMatter: BoardMinion = {
                            id: `chair_matter_${Date.now()}`,
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

                        // Update boards
                        const updatedEnemyBoard = enemyPlayer.board.map(m =>
                            (m.instanceId || m.id) === action.targetId ? chairMatter : m
                        );
                        const updatedActiveBoard = activePlayer.board.map(m =>
                            (m.instanceId || m.id) === action.minionId ? { ...m, hasUsedSpecial: true, hasAttacked: true } : m
                        );

                        const updatedPlayer = activePlayerKey === 'player'
                            ? { ...player, board: updatedActiveBoard }
                            : { ...player, board: updatedEnemyBoard };
                        const updatedOpponent = activePlayerKey === 'player'
                            ? { ...opponent, board: updatedEnemyBoard }
                            : { ...opponent, board: updatedActiveBoard };

                        return {
                            ...prev,
                            player: updatedPlayer,
                            opponent: updatedOpponent,
                            selectedMinion: undefined,
                            targetMode: undefined,
                            log: [...currentLog, `${minion.name} verwandelte ${targetMinion.name} in stuhlartige Materie!`],
                        };
                    }

                    return prev;
                });
                break;
            case 'SELECT_CARD':
                selectCard(action.cardId);
                break;
            case 'SELECT_MINION':
                selectMinion(action.minionId, action.toggle);
                break;
            case 'SEARCH_DECK':
                // Handle deck search result (card selected from deck)
                setGameStateWithSynergies(prev => {
                    const { player, opponent, activePlayer: activePlayerKey } = prev;
                    const activePlayer = activePlayerKey === 'player' ? player : opponent;

                    // Find card in deck
                    const cardIndex = activePlayer.deck.findIndex(c => c.instanceId === action.cardId);
                    if (cardIndex === -1) return prev;

                    const card = activePlayer.deck[cardIndex];

                    // Move to hand
                    const updatedPlayer = {
                        ...activePlayer,
                        deck: activePlayer.deck.filter((_, i) => i !== cardIndex),
                        hand: [...activePlayer.hand, card],
                    };

                    return {
                        ...prev,
                        player: activePlayerKey === 'player' ? updatedPlayer : player,
                        opponent: activePlayerKey === 'player' ? opponent : updatedPlayer,
                        targetMode: undefined, // Exit search mode
                        log: [...prev.log, `${activePlayer.name} suchte "${card.name}" aus dem Deck.`],
                    };
                });
                break;
            case 'TROLLEY_SACRIFICE':
                // Handle trolley problem sacrifice selection
                setGameStateWithSynergies(prev => {
                    const { player, opponent, activePlayer: activePlayerKey } = prev;
                    let currentLog = prev.log;
                    const activePlayer = activePlayerKey === 'player' ? player : opponent;
                    const enemyPlayer = activePlayerKey === 'player' ? opponent : player;

                    // Find the minion to sacrifice in active player's board
                    const sacrificeIndex = activePlayer.board.findIndex(m => (m.instanceId || m.id) === action.minionId);
                    if (sacrificeIndex === -1) return prev;

                    const sacrificedMinion = activePlayer.board[sacrificeIndex];

                    // Remove sacrificed minion and add to graveyard
                    const updatedActiveBoard = activePlayer.board.filter((_, i) => i !== sacrificeIndex);
                    const updatedActiveGraveyard = [...activePlayer.graveyard, sacrificedMinion];

                    // Damage all enemy minions
                    const damagedEnemyBoard = enemyPlayer.board.map(m => ({
                        ...m,
                        health: m.health - 4
                    }));

                    // Remove dead minions
                    const deadMinions = damagedEnemyBoard.filter(m => m.health <= 0);
                    const aliveEnemyBoard = damagedEnemyBoard.filter(m => m.health > 0);
                    const updatedEnemyGraveyard = [...enemyPlayer.graveyard, ...deadMinions];

                    currentLog = appendLog(currentLog, `${activePlayer.name} opferte ${sacrificedMinion.name} und fügte allen gegnerischen Philosophen 4 Schaden zu!`);

                    const updatedPlayer = {
                        ...activePlayer,
                        board: updatedActiveBoard,
                        graveyard: updatedActiveGraveyard,
                    };

                    const updatedEnemy = {
                        ...enemyPlayer,
                        board: aliveEnemyBoard,
                        graveyard: updatedEnemyGraveyard,
                    };

                    return {
                        ...prev,
                        player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                        opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                        targetMode: undefined,
                        selectedMinion: undefined,
                        log: currentLog,
                    };
                });
                break;
            case 'KONTEMPLATION_SELECT':
                // Handle Kontemplation card selection (top 3 cards, pick 1)
                setGameStateWithSynergies(prev => {
                    const { player, opponent, activePlayer: activePlayerKey, kontemplationCards } = prev;
                    if (!kontemplationCards || kontemplationCards.length === 0) return prev;
                    let currentLog = prev.log;

                    const activePlayer = activePlayerKey === 'player' ? player : opponent;

                    // Find the selected card
                    const selectedCard = kontemplationCards.find(c => c.instanceId === action.cardId);
                    if (!selectedCard) return prev;

                    // Get the other cards (not selected)
                    const otherCards = kontemplationCards.filter(c => c.instanceId !== action.cardId);

                    // Remove all top 3 cards from deck, then add back the non-selected ones (shuffled)
                    let newDeck = activePlayer.deck.slice(kontemplationCards.length);
                    // Shuffle the non-selected cards back into the deck
                    otherCards.forEach(card => {
                        const insertIndex = Math.floor(Math.random() * (newDeck.length + 1));
                        newDeck = [...newDeck.slice(0, insertIndex), card, ...newDeck.slice(insertIndex)];
                    });

                    currentLog = appendLog(currentLog, `Du hast "${selectedCard.name}" gewählt. Die anderen Karten wurden zurückgemischt.`);

                    const updatedPlayer = {
                        ...activePlayer,
                        deck: newDeck,
                        hand: [...activePlayer.hand, selectedCard],
                    };

                    return {
                        ...prev,
                        player: activePlayerKey === 'player' ? updatedPlayer : player,
                        opponent: activePlayerKey === 'player' ? opponent : updatedPlayer,
                        targetMode: undefined,
                        kontemplationCards: undefined,
                        log: currentLog,
                    };
                });
                break;
            case 'FOUCAULT_CLOSE':
                // Close Foucault reveal modal
                setGameStateWithSynergies(prev => ({
                    ...prev,
                    targetMode: undefined,
                    foucaultRevealCards: undefined,
                }));
                break;
            case 'GOTTESBEWEIS_TARGET':
                setGameStateWithSynergies(prev => {
                    const { player, opponent, activePlayer: activePlayerKey } = prev;
                    let currentLog = prev.log;
                    const activePlayer = activePlayerKey === 'player' ? player : opponent;
                    // Target can be on ANY board
                    const targetOnPlayerBoard = player.board.find(m => (m.instanceId || m.id) === action.minionId);
                    const targetOnOpponentBoard = opponent.board.find(m => (m.instanceId || m.id) === action.minionId);

                    const targetMinion = targetOnPlayerBoard || targetOnOpponentBoard;
                    if (!targetMinion) return prev;

                    // Apply Effect
                    let updatedTarget = { ...targetMinion };
                    let message = '';
                    let isHeal = false;

                    if (targetMinion.school?.includes('Religion')) {
                        // Heal / Buff
                        updatedTarget.health += 2;
                        updatedTarget.maxHealth += 2;
                        message = `${activePlayer.name} führte den Gottesbeweis auf ${targetMinion.name}: +2 Leben durch göttliche Stärkung!`;
                        isHeal = true;
                    } else {
                        // Damage
                        updatedTarget.health -= 4;
                        message = `${activePlayer.name} führte den Gottesbeweis auf ${targetMinion.name}: 4 Schaden durch göttlichen Zorn!`;
                    }

                    // Update State
                    // We need to update the specific board where the minion was found
                    let updatedPlayerBoard = player.board;
                    let updatedPlayerGraveyard = player.graveyard;
                    let updatedOpponentBoard = opponent.board;
                    let updatedOpponentGraveyard = opponent.graveyard;

                    if (targetOnPlayerBoard) {
                        if (!isHeal && updatedTarget.health <= 0) {
                            updatedPlayerBoard = updatedPlayerBoard.filter(m => (m.instanceId || m.id) !== action.minionId);
                            updatedPlayerGraveyard = [...updatedPlayerGraveyard, targetMinion];
                            message += " Besiegt!";
                        } else {
                            updatedPlayerBoard = updatedPlayerBoard.map(m => (m.instanceId || m.id) === action.minionId ? updatedTarget : m);
                        }
                    } else if (targetOnOpponentBoard) {
                        if (!isHeal && updatedTarget.health <= 0) {
                            updatedOpponentBoard = updatedOpponentBoard.filter(m => (m.instanceId || m.id) !== action.minionId);
                            updatedOpponentGraveyard = [...updatedOpponentGraveyard, targetMinion];
                            message += " Besiegt!";
                        } else {
                            updatedOpponentBoard = updatedOpponentBoard.map(m => (m.instanceId || m.id) === action.minionId ? updatedTarget : m);
                        }
                    }

                    currentLog = appendLog(currentLog, message);

                    return {
                        ...prev,
                        log: currentLog,
                        player: { ...player, board: updatedPlayerBoard, graveyard: updatedPlayerGraveyard },
                        opponent: { ...opponent, board: updatedOpponentBoard, graveyard: updatedOpponentGraveyard },
                        targetMode: undefined,
                        selectedCard: undefined,
                        pendingPlayedCard: undefined
                    };
                });
                break;

            case 'CANCEL_CAST':
                setGameStateWithSynergies(prev => {
                    let currentLog = prev.log;
                    // Only refund if we have a pending card and a cancellable mode
                    if (!prev.pendingPlayedCard) {
                        // Fallback: just clear mode if no card pending?
                        return { ...prev, targetMode: undefined };
                    }

                    const { pendingPlayedCard: card, activePlayer: activePlayerKey, player, opponent } = prev;
                    if (!card) return prev; // check again for TS

                    const refundPlayer = activePlayerKey === 'player' ? player : opponent;

                    // Check if cancellable mode
                    // Kontemplation is excluded per request? Actually user said: "Bei Karten, die trotzdem einen Vorteil geben... nicht zurückkehren (z.B. Kontemplation)"
                    // So if mode is kontemplation, we just clear mode but don't refund?
                    // But wait, if we clear mode, we lose the card (it was removed). This matches "nicht auf die Hand zurückkehren".

                    if (prev.targetMode === 'kontemplation') {
                        // User aborts selecting. Card is lost.
                        return {
                            ...prev,
                            targetMode: undefined,
                            kontemplationCards: undefined,
                            pendingPlayedCard: undefined
                        };
                    }

                    // For others (gottesbeweis, trolley, search/hermeneutics): Refund.
                    // Put card back in hand
                    const updatedHand = [...refundPlayer.hand, card];
                    // Refund Mana
                    const updatedMana = refundPlayer.mana + card.cost;

                    currentLog = appendLog(currentLog, `Zauber ${card.name} abgebrochen.`);

                    return {
                        ...prev,
                        player: activePlayerKey === 'player'
                            ? { ...refundPlayer, hand: updatedHand, mana: updatedMana }
                            : player,
                        opponent: activePlayerKey === 'opponent'
                            ? { ...refundPlayer, hand: updatedHand, mana: updatedMana }
                            : opponent,
                        targetMode: undefined,
                        pendingPlayedCard: undefined,
                        log: currentLog
                    };
                });
                break;
        }
    }, [endTurn, playCard, attack, selectCard, selectMinion, startTurn, addLog, mode]);

    return { gameState, dispatch };
}
