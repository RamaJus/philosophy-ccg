import { useState, useCallback, useEffect } from 'react';
import { GameState, Player, BoardMinion, GameAction } from '../types';
import { generateDeck } from '../data/cards';
import { multiplayer } from '../network/MultiplayerManager';

const STARTING_HAND_SIZE = 4;
const MAX_HAND_SIZE = 10;
// const MAX_BOARD_SIZE = 7; // Removed per user request

function createPlayer(name: string, isPlayer: boolean): Player {
    const deck = generateDeck();
    let hand = deck.slice(0, STARTING_HAND_SIZE);
    let remainingDeck = deck.slice(STARTING_HAND_SIZE);

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
    if (isPlayer) {
        const debugDeck = generateDeck();
        const debug1 = debugDeck.find(c => c.id === 'debug_1');
        const debug2 = debugDeck.find(c => c.id === 'debug_2');

        if (debug1) hand.push(debug1);
        if (debug2) hand.push(debug2);
    }

    return {
        id: isPlayer ? 'player' : 'opponent',
        name,
        health: 30,
        maxHealth: 30,
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
        player: createPlayer('Player', true),
        opponent: createPlayer('Gegner', false),
        gameOver: false,
        log: ['Spiel gestartet! Möge der beste Philosoph gewinnen.'],
    };
}



// Synergy Logic
const calculateSynergies = (board: BoardMinion[]): BoardMinion[] => {
    // 1. Reset synergy bonuses first
    let updatedBoard = board.map(minion => {
        const bonus = minion.synergyBonus || 0;
        return {
            ...minion,
            attack: minion.attack - bonus,
            maxHealth: minion.maxHealth - bonus,
            health: minion.health - bonus, // Reduce current health too? Usually yes for aura removal.
            synergyBonus: 0,
            linkedWith: [] as string[]
        };
    });

    // 2. Identify clusters and calculate bonuses
    // We need to group minions that share AT LEAST ONE school.
    // This is a graph problem (connected components).
    const adjacency: Record<string, string[]> = {};
    updatedBoard.forEach(m => adjacency[m.id] = []);

    for (let i = 0; i < updatedBoard.length; i++) {
        for (let j = i + 1; j < updatedBoard.length; j++) {
            const m1 = updatedBoard[i];
            const m2 = updatedBoard[j];
            const hasSharedSchool = m1.school?.some(s => m2.school?.includes(s));

            if (hasSharedSchool) {
                adjacency[m1.id].push(m2.id);
                adjacency[m2.id].push(m1.id);
            }
        }
    }

    // Find connected components
    const visited = new Set<string>();
    const clusters: BoardMinion[][] = [];

    for (const minion of updatedBoard) {
        if (visited.has(minion.id)) continue;

        const cluster: BoardMinion[] = [];
        const queue = [minion];
        visited.add(minion.id);

        while (queue.length > 0) {
            const current = queue.shift()!;
            cluster.push(current);

            for (const neighborId of adjacency[current.id]) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    const neighbor = updatedBoard.find(m => m.id === neighborId)!;
                    queue.push(neighbor);
                }
            }
        }
        clusters.push(cluster);
    }

    // 3. Apply bonuses and reorder
    let finalBoard: BoardMinion[] = [];

    for (const cluster of clusters) {
        // Calculate bonus: +1 for 2, +2 for 3+, etc. (Size - 1)
        // User said: "Wenn sie mehr als eine Schule gemeinsam haben, bleibt es trotzdem bei +1. Die Zahl erhöht sich erst, wenn ein dritter Philosoph auf das Feld kommt und wird dann zu +2"
        // This implies: 2 minions -> +1. 3 minions -> +2. 4 minions -> +3?
        // Let's assume linear scaling: size - 1.
        const bonus = Math.max(0, cluster.length - 1);

        const updatedCluster = cluster.map(minion => {
            // Fix health: if health dropped below 1 during reset, keep it at 1? 
            // Or let it die? Usually aura removal can kill.
            // But here we just re-add the bonus immediately if it still applies.
            // To avoid "healing" by re-applying, we should be careful.
            // Current implementation: reset subtracts, new adds.
            // If bonus stays same, net change is 0.

            return {
                ...minion,
                attack: minion.attack + bonus,
                maxHealth: minion.maxHealth + bonus,
                health: minion.health + bonus,
                synergyBonus: bonus,
                linkedWith: cluster.filter(m => m.id !== minion.id).map(m => m.id)
            };
        });

        finalBoard = [...finalBoard, ...updatedCluster];
    }

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

    const addLog = useCallback((message: string) => {
        setGameStateWithSynergies(prev => ({
            ...prev,
            log: [...prev.log.slice(-9), message], // Keep last 10 messages
        }));
    }, [setGameStateWithSynergies]);

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
            const activePlayer = activePlayerKey === 'player' ? player : opponent;

            const cardIndex = activePlayer.hand.findIndex(c => c.id === cardId);
            if (cardIndex === -1) return prev;

            const card = activePlayer.hand[cardIndex];

            // Check mana
            if (activePlayer.mana < card.cost) {
                addLog('Nicht genug Dialektik (Mana)!');
                return prev;
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
                    addLog(`${activePlayer.name} ersetzte "${updatedPlayer.activeWork.name}" durch "${card.name}".`);
                } else {
                    addLog(`${activePlayer.name} veröffentlichte "${card.name}".`);
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

                    addLog(`${activePlayer.name} beschwor ${card.name}! "Wovon man nicht sprechen kann, darüber muss man schweigen." - Das Spielfeld wurde geleert!`);
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
                    addLog(`${card.name} fügt dir 5 Schaden zu! Leben ist Leiden.`);
                }

                updatedPlayer = {
                    ...updatedPlayer,
                    board: [...updatedPlayer.board, minion],
                };

                if (!card.id.includes('wittgenstein')) {
                    addLog(`${activePlayer.name} beschwor ${card.name}!`);
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

                        addLog(`${card.name}: "Proletarier aller Länder, vereinigt euch!" ${stolenMinion.name} wechselt die Seiten!`);
                    } else {
                        addLog(`${card.name} wurde beschworen, aber es gibt keine Philosophen zum vereinigen!`);
                    }
                }

                // Foucault Special: Panoptischer Blick - auto-trigger on play
                if (card.id.includes('foucault')) {
                    const top3Cards = updatedEnemy.deck.slice(0, 3);
                    if (top3Cards.length > 0) {
                        const cardNames = top3Cards.map(c => c.name).join(', ');
                        addLog(`${card.name}: "Panoptischer Blick!" Du siehst die nächsten Karten des Gegners: ${cardNames}`);
                    } else {
                        addLog(`${card.name}: "Panoptischer Blick!" Das Deck des Gegners ist leer.`);
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
                    addLog(`${activePlayer.name} wirkte ${card.name} und zog ${drawCount} Karte(n).`);
                } else if (card.id.includes('meditation') || card.id.includes('Aufklärung')) {
                    // Heal
                    const healAmount = card.id.includes('meditation') ? 3 : 5;
                    updatedPlayer.health = Math.min(updatedPlayer.health + healAmount, updatedPlayer.maxHealth);
                    addLog(`${activePlayer.name} wirkte ${card.name} und stellte ${healAmount} Glaubwürdigkeit wieder her.`);
                } else if (card.id.includes('aporia') || card.id.includes('wu-wei')) {
                    // Damage spells - target opponent
                    const damage = card.id.includes('aporia') ? 3 : 5;
                    updatedEnemy = { ...updatedEnemy, health: updatedEnemy.health - damage };
                    addLog(`${activePlayer.name} wirkte ${card.name} und verursachte ${damage} Schaden!`);

                    // Check win conditions immediately after spell damage
                    if (updatedEnemy.health <= 0) {
                        // Win condition handled by useEffect
                    }
                } else if (card.id.includes('sophistry')) {
                    // Steal 2 Mana
                    // Ensure we don't steal more than they have, or more than we can hold
                    const enemyMana = updatedEnemy.mana;
                    const manaToSteal = Math.min(enemyMana, 2);

                    updatedEnemy.mana = Math.max(0, updatedEnemy.mana - manaToSteal);
                    updatedPlayer.mana = Math.min(updatedPlayer.mana + manaToSteal, 10);

                    if (manaToSteal > 0) {
                        addLog(`${activePlayer.name} nutzte Sophistik und stahl ${manaToSteal} Dialektik!`);
                    } else {
                        addLog(`${activePlayer.name} nutzte Sophistik, aber der Gegner hatte keine Dialektik!`);
                    }
                } else if (card.id.includes('dogmatism')) {
                    // Lock 2 Mana next turn
                    updatedEnemy.lockedMana += 2;
                    addLog(`${activePlayer.name} wirkte ${card.name} und sperrte 2 Dialektik des Gegners!`);
                } else if (card.id.includes('trolley')) {
                    // Trolley Problem: Sacrifice own minion to damage all enemies
                    if (activePlayerKey === 'player') {
                        // Player needs to select a minion to sacrifice
                        if (updatedPlayer.board.length === 0) {
                            addLog('Du hast keine Philosophen zum Opfern!');
                            // Refund mana since spell can't be cast
                            updatedPlayer.mana += card.cost;
                            updatedPlayer.hand.push(card);
                            updatedPlayer.graveyard = updatedPlayer.graveyard.filter(c => c.id !== card.id);
                        } else {
                            return {
                                ...prev,
                                player: updatedPlayer,
                                opponent: updatedEnemy,
                                selectedCard: undefined,
                                targetMode: 'trolley_sacrifice',
                            };
                        }
                    } else {
                        // AI Logic: Sacrifice weakest minion
                        if (updatedPlayer.board.length > 0) {
                            const weakestMinion = updatedPlayer.board.reduce((weakest, current) =>
                                current.health < weakest.health ? current : weakest
                            );

                            // Remove sacrificed minion
                            updatedPlayer.board = updatedPlayer.board.filter(m => m.id !== weakestMinion.id);
                            updatedPlayer.graveyard.push(weakestMinion);

                            // Damage all enemy minions
                            updatedEnemy.board = updatedEnemy.board.map(m => ({
                                ...m,
                                health: m.health - 4
                            })).filter(m => m.health > 0);

                            // Move dead minions to graveyard
                            const deadMinions = updatedEnemy.board.filter(m => m.health <= 0);
                            updatedEnemy.graveyard = [...updatedEnemy.graveyard, ...deadMinions];
                            updatedEnemy.board = updatedEnemy.board.filter(m => m.health > 0);

                            addLog(`${activePlayer.name} opferte ${weakestMinion.name} und fügte allen gegnerischen Philosophen 4 Schaden zu!`);
                        }
                    }
                } else if (card.id.includes('hermeneutics') || card.id.includes('debug')) {
                    // Trigger search mode only for player
                    if (activePlayerKey === 'player') {
                        return {
                            ...prev,
                            player: updatedPlayer,
                            opponent: updatedEnemy,
                            selectedCard: undefined,
                            targetMode: 'search',
                        };
                    } else {
                        // AI Logic: Pick a random card from deck
                        if (updatedPlayer.deck.length > 0) {
                            const randomIndex = Math.floor(Math.random() * updatedPlayer.deck.length);
                            const searchedCard = updatedPlayer.deck[randomIndex];
                            updatedPlayer.deck.splice(randomIndex, 1);
                            updatedPlayer.hand.push(searchedCard);
                            addLog(`${activePlayer.name} wirkte ${card.name} und suchte eine Karte aus dem Deck.`);
                        }
                    }
                } else if (card.id.includes('kontemplation')) {
                    // Look at top 3 cards of your deck, pick 1
                    const top3 = updatedPlayer.deck.slice(0, 3);
                    if (top3.length === 0) {
                        addLog(`${activePlayer.name} wirkte ${card.name}, aber das Deck ist leer!`);
                    } else if (activePlayerKey === 'player') {
                        // Player: Enter kontemplation mode to select a card
                        addLog(`${activePlayer.name} wirkte ${card.name}. Wähle eine der obersten 3 Karten.`);
                        return {
                            ...prev,
                            player: updatedPlayer,
                            opponent: updatedEnemy,
                            selectedCard: undefined,
                            targetMode: 'kontemplation',
                            kontemplationCards: top3,
                        };
                    } else {
                        // AI: Pick first card
                        const pickedCard = top3[0];
                        updatedPlayer.deck = updatedPlayer.deck.slice(1);
                        updatedPlayer.hand = [...updatedPlayer.hand, pickedCard];
                        // Shuffle remaining top cards back (they're already in deck)
                        addLog(`${activePlayer.name} wirkte ${card.name} und wählte eine Karte.`);
                    }
                } else if (card.id.includes('axiom')) {
                    // Gain 1 additional mana this turn
                    updatedPlayer.mana = Math.min(updatedPlayer.mana + 1, 10);
                    addLog(`${activePlayer.name} wirkte ${card.name} und erhielt 1 zusätzliche Dialektik!`);
                }
            }

            return {
                ...prev,
                player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                selectedCard: undefined,
            };
        });
    }, [addLog, drawCard]);

    const attack = useCallback((attackerId: string, targetId?: string) => {
        setGameStateWithSynergies(prev => {
            const { activePlayer: activePlayerKey, player, opponent } = prev;
            const activePlayer = activePlayerKey === 'player' ? player : opponent;
            const enemyPlayer = activePlayerKey === 'player' ? opponent : player;

            const attackerIndex = activePlayer.board.findIndex(m => m.id === attackerId);
            if (attackerIndex === -1) return prev;

            const attacker = activePlayer.board[attackerIndex];

            if (!attacker.canAttack || attacker.hasAttacked) {
                addLog('Dieser Philosoph kann noch nicht angreifen!');
                return prev;
            }

            let updatedActivePlayer = { ...activePlayer };
            let updatedEnemyPlayer = { ...enemyPlayer };

            // Calculate damage modifiers (Work Bonus)
            let damageToDeal = attacker.attack;
            let bonusLog = '';

            if (activePlayer.activeWork && activePlayer.activeWork.workBonus && attacker.school) {
                if (attacker.school.includes(activePlayer.activeWork.workBonus.school)) {
                    damageToDeal += activePlayer.activeWork.workBonus.damage;
                    bonusLog = ` (Bonus durch "${activePlayer.activeWork.name}"! +${activePlayer.activeWork.workBonus.damage})`;
                }
            }

            if (!targetId) {
                // Attack player directly
                updatedEnemyPlayer.health -= damageToDeal;
                addLog(`${attacker.name} griff ${enemyPlayer.name} an und verursachte ${damageToDeal} Schaden!${bonusLog}`);

                // Mark attacker as having attacked
                updatedActivePlayer.board = activePlayer.board.map((m, i) =>
                    i === attackerIndex ? { ...m, hasAttacked: true } : m
                );
            } else {
                // Attack minion
                const targetIndex = enemyPlayer.board.findIndex(m => m.id === targetId);
                if (targetIndex === -1) return prev;

                const target = enemyPlayer.board[targetIndex];

                // Diogenes protection: Can't be attacked for 3 turns
                if (target.id.includes('diogenes') && target.turnPlayed !== undefined) {
                    const turnsOnField = prev.turn - target.turnPlayed;
                    if (turnsOnField < 3) {
                        addLog(`${target.name} lebt noch in seiner Tonne und kann erst in ${3 - turnsOnField} Runde(n) angegriffen werden!`);
                        return prev;
                    }
                }

                // Calculate damage modifiers
                // Calculate damage modifiers
                let targetDamage = target.attack;
                let logMessage = `${attacker.name} griff ${target.name} an! (${damageToDeal} Schaden vs ${targetDamage} Schaden)${bonusLog}`;

                // Deal damage to both
                const updatedAttacker = { ...attacker, health: attacker.health - targetDamage, hasAttacked: true };
                const updatedTarget = { ...target, health: target.health - damageToDeal };

                addLog(logMessage);

                // Update boards with new health values
                updatedActivePlayer.board = [...activePlayer.board];
                updatedEnemyPlayer.board = [...enemyPlayer.board];

                // Handle Attacker Death
                if (updatedAttacker.health <= 0) {
                    updatedActivePlayer.board.splice(attackerIndex, 1);
                    updatedActivePlayer.graveyard = [...updatedActivePlayer.graveyard, attacker];
                    addLog(`${attacker.name} wurde besiegt!`);
                } else {
                    updatedActivePlayer.board[attackerIndex] = updatedAttacker;
                }

                // Handle Target Death
                if (updatedTarget.health <= 0) {
                    updatedEnemyPlayer.board.splice(targetIndex, 1);
                    updatedEnemyPlayer.graveyard = [...updatedEnemyPlayer.graveyard, target];
                    addLog(`${target.name} wurde besiegt!`);
                } else {
                    updatedEnemyPlayer.board[targetIndex] = updatedTarget;
                }
            }

            // Check win conditions immediately after attack
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
                selectedMinion: undefined,
                gameOver,
                winner,
            };
        });
    }, [addLog]);

    const endTurn = useCallback(() => {
        setGameStateWithSynergies(prev => {
            const { activePlayer: currentPlayer, player, opponent, turn } = prev;

            addLog(`${currentPlayer === 'player' ? player.name : opponent.name} beendete den Zug.`);

            const nextPlayer = currentPlayer === 'player' ? 'opponent' : 'player';
            const playerToActivate = nextPlayer === 'player' ? player : opponent;

            const updatedPlayer = startTurn(playerToActivate);

            addLog(`Runde ${turn + 1}: ${updatedPlayer.name} ist am Zug.`);

            const newState: GameState = {
                ...prev,
                turn: nextPlayer === 'player' ? turn + 1 : turn,
                activePlayer: nextPlayer,
                player: nextPlayer === 'player' ? updatedPlayer : player,
                opponent: nextPlayer === 'opponent' ? updatedPlayer : opponent,
                selectedCard: undefined,
                selectedMinion: undefined,
            };

            return newState;
        });
    }, [addLog, startTurn]);

    const selectCard = useCallback((cardId?: string) => {
        setGameStateWithSynergies(prev => ({ ...prev, selectedCard: cardId }));
    }, [setGameStateWithSynergies]);

    const selectMinion = useCallback((minionId?: string) => {
        setGameStateWithSynergies(prev => ({ ...prev, selectedMinion: minionId }));
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
                        const updatedPlayer = startTurn(prev.player);
                        addLog('Runde 1: Player beginnt.');
                        return { ...prev, player: updatedPlayer, turn: 1 };
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
                attack(action.attackerId, action.targetId);
                break;
            case 'USE_SPECIAL':
                // Handle special abilities (currently only Van Inwagen transformation)
                setGameStateWithSynergies(prev => {
                    const { player, opponent, activePlayer: activePlayerKey } = prev;
                    const activePlayer = activePlayerKey === 'player' ? player : opponent;
                    const enemyPlayer = activePlayerKey === 'player' ? prev.opponent : prev.player;

                    const minion = activePlayer.board.find(m => m.id === action.minionId);
                    if (!minion || !minion.specialAbility || !minion.canAttack || minion.hasAttacked || minion.hasUsedSpecial) {
                        return prev; // Invalid special use
                    }

                    // Marx Special: Steal opponent's lowest-cost minion
                    if (minion.id.includes('marx')) {
                        if (enemyPlayer.board.length === 0) {
                            addLog('Keine gegnerischen Philosophen zum vereinigen!');
                            return prev;
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
                        const updatedEnemyBoard = enemyPlayer.board.filter(m => m.id !== lowestCostMinion.id);
                        const updatedActiveBoard = [
                            ...activePlayer.board.map(m =>
                                m.id === action.minionId ? { ...m, hasUsedSpecial: true } : m
                            ),
                            stolenMinion
                        ];

                        const updatedPlayer = activePlayerKey === 'player'
                            ? { ...player, board: updatedActiveBoard }
                            : { ...player, board: updatedEnemyBoard };
                        const updatedOpponent = activePlayerKey === 'player'
                            ? { ...opponent, board: updatedEnemyBoard }
                            : { ...opponent, board: updatedActiveBoard };

                        addLog(`${minion.name}: "Proletarier aller Länder, vereinigt euch!" ${stolenMinion.name} wechselt die Seiten!`);

                        return {
                            ...prev,
                            player: updatedPlayer,
                            opponent: updatedOpponent,
                            selectedMinion: undefined,
                            targetMode: undefined,
                        };
                    }

                    // Foucault Special: Panoptischer Blick - reveal top 3 cards of opponent's deck
                    if (minion.id.includes('foucault')) {
                        const top3Cards = enemyPlayer.deck.slice(0, 3);
                        if (top3Cards.length === 0) {
                            addLog('Das Deck des Gegners ist leer!');
                            return prev;
                        }

                        const cardNames = top3Cards.map(c => c.name).join(', ');
                        addLog(`${minion.name}: "Panoptischer Blick!" Du siehst: ${cardNames}`);

                        // Mark special as used
                        const updatedActiveBoard = activePlayer.board.map(m =>
                            m.id === action.minionId ? { ...m, hasUsedSpecial: true } : m
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
                        };
                    }

                    if (minion.specialAbility === 'transform' && action.targetId) {
                        const targetMinion = enemyPlayer.board.find(m => m.id === action.targetId);
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
                        };

                        // Update boards
                        const updatedEnemyBoard = enemyPlayer.board.map(m =>
                            m.id === action.targetId ? chairMatter : m
                        );
                        const updatedActiveBoard = activePlayer.board.map(m =>
                            m.id === action.minionId ? { ...m, hasUsedSpecial: true, hasAttacked: true } : m
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
                            log: [...prev.log, `${minion.name} verwandelte ${targetMinion.name} in stuhlartige Materie!`],
                        };
                    }

                    return prev;
                });
                break;
            case 'SELECT_CARD':
                selectCard(action.cardId);
                break;
            case 'SELECT_MINION':
                selectMinion(action.minionId);
                break;
            case 'SEARCH_DECK':
                // Handle deck search result (card selected from deck)
                setGameStateWithSynergies(prev => {
                    const { player, opponent, activePlayer: activePlayerKey } = prev;
                    const activePlayer = activePlayerKey === 'player' ? player : opponent;

                    // Find card in deck
                    const cardIndex = activePlayer.deck.findIndex(c => c.id === action.cardId);
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
                    const { player, opponent } = prev;

                    // Find the minion to sacrifice
                    const sacrificeIndex = player.board.findIndex(m => m.id === action.minionId);
                    if (sacrificeIndex === -1) return prev;

                    const sacrificedMinion = player.board[sacrificeIndex];

                    // Remove sacrificed minion and add to graveyard
                    const updatedPlayerBoard = player.board.filter((_, i) => i !== sacrificeIndex);
                    const updatedPlayerGraveyard = [...player.graveyard, sacrificedMinion];

                    // Damage all enemy minions
                    const damagedEnemyBoard = opponent.board.map(m => ({
                        ...m,
                        health: m.health - 4
                    }));

                    // Remove dead minions
                    const deadMinions = damagedEnemyBoard.filter(m => m.health <= 0);
                    const aliveEnemyBoard = damagedEnemyBoard.filter(m => m.health > 0);
                    const updatedEnemyGraveyard = [...opponent.graveyard, ...deadMinions];

                    addLog(`${player.name} opferte ${sacrificedMinion.name} und fügte allen gegnerischen Philosophen 4 Schaden zu!`);

                    return {
                        ...prev,
                        player: {
                            ...player,
                            board: updatedPlayerBoard,
                            graveyard: updatedPlayerGraveyard,
                        },
                        opponent: {
                            ...opponent,
                            board: aliveEnemyBoard,
                            graveyard: updatedEnemyGraveyard,
                        },
                        targetMode: undefined,
                        selectedMinion: undefined,
                    };
                });
                break;
            case 'KONTEMPLATION_SELECT':
                // Handle Kontemplation card selection (top 3 cards, pick 1)
                setGameStateWithSynergies(prev => {
                    const { player, kontemplationCards } = prev;
                    if (!kontemplationCards || kontemplationCards.length === 0) return prev;

                    // Find the selected card
                    const selectedCard = kontemplationCards.find(c => c.id === action.cardId);
                    if (!selectedCard) return prev;

                    // Get the other cards (not selected)
                    const otherCards = kontemplationCards.filter(c => c.id !== action.cardId);

                    // Remove all top 3 cards from deck, then add back the non-selected ones (shuffled)
                    let newDeck = player.deck.slice(kontemplationCards.length);
                    // Shuffle the non-selected cards back into the deck
                    otherCards.forEach(card => {
                        const insertIndex = Math.floor(Math.random() * (newDeck.length + 1));
                        newDeck = [...newDeck.slice(0, insertIndex), card, ...newDeck.slice(insertIndex)];
                    });

                    addLog(`Du hast "${selectedCard.name}" gewählt. Die anderen Karten wurden zurückgemischt.`);

                    return {
                        ...prev,
                        player: {
                            ...player,
                            deck: newDeck,
                            hand: [...player.hand, selectedCard],
                        },
                        targetMode: undefined,
                        kontemplationCards: undefined,
                    };
                });
                break;
        }
    }, [endTurn, playCard, attack, selectCard, selectMinion, startTurn, addLog, mode]);

    return { gameState, dispatch };
}
