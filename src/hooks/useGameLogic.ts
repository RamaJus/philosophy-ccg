import { useState, useCallback, useEffect } from 'react';
import { GameState, Player, BoardMinion, GameAction } from '../types';
import { generateDeck } from '../data/cards';
import { multiplayer } from '../network/MultiplayerManager';

const STARTING_HAND_SIZE = 4;
const MAX_HAND_SIZE = 10;
const MAX_BOARD_SIZE = 7;

function createPlayer(name: string, isPlayer: boolean): Player {
    const deck = generateDeck(20);
    const hand = deck.slice(0, STARTING_HAND_SIZE);

    return {
        id: isPlayer ? 'player' : 'opponent',
        name,
        health: 30,
        maxHealth: 30,
        mana: 0,
        maxMana: 0,
        deck: deck.slice(STARTING_HAND_SIZE),
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

export function useGameLogic(mode: 'single' | 'multiplayer_host' | 'multiplayer_client' = 'single') {
    const [gameState, setGameState] = useState<GameState>(createInitialState());

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
        setGameState(prev => ({
            ...prev,
            log: [...prev.log.slice(-9), message], // Keep last 10 messages
        }));
    }, []);

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
        setGameState(prev => {
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
            if (card.type === 'Philosoph' && activePlayer.board.length >= MAX_BOARD_SIZE && !card.id.includes('wittgenstein')) {
                addLog('Das Spielfeld ist voll!');
                return prev;
            }

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
                };
                updatedPlayer = {
                    ...updatedPlayer,
                    board: [...updatedPlayer.board, minion],
                };

                if (!card.id.includes('wittgenstein')) {
                    addLog(`${activePlayer.name} beschwor ${card.name}!`);
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
                } else if (card.id.includes('meditation') || card.id.includes('enlightenment')) {
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
                        return {
                            ...prev,
                            player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                            opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                            selectedCard: undefined,
                            gameOver: true,
                            winner: activePlayerKey,
                        };
                    }
                } else if (card.id.includes('sophistry')) {
                    // Steal 2 Mana
                    const manaToSteal = Math.min(updatedEnemy.mana, 2);
                    updatedEnemy.mana -= manaToSteal;
                    updatedPlayer.mana = Math.min(updatedPlayer.mana + manaToSteal, 10);
                    addLog(`${activePlayer.name} wirkte ${card.name} und stahl ${manaToSteal} Dialektik!`);
                } else if (card.id.includes('dogmatism')) {
                    // Lock 2 Mana next turn
                    updatedEnemy.lockedMana += 2;
                    addLog(`${activePlayer.name} wirkte ${card.name} und sperrte 2 Dialektik des Gegners!`);
                } else if (card.id.includes('hermeneutics')) {
                    // Trigger search mode
                    return {
                        ...prev,
                        player: activePlayerKey === 'player' ? updatedPlayer : updatedEnemy,
                        opponent: activePlayerKey === 'player' ? updatedEnemy : updatedPlayer,
                        selectedCard: undefined,
                        targetMode: 'search',
                        log: [...prev.log, `${activePlayer.name} nutzt Hermeneutik, um im Deck zu suchen...`],
                    };
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
        setGameState(prev => {
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

            if (!targetId) {
                // Attack player directly
                updatedEnemyPlayer.health -= attacker.attack;
                addLog(`${attacker.name} griff ${enemyPlayer.name} an und verursachte ${attacker.attack} Schaden!`);

                // Mark attacker as having attacked
                updatedActivePlayer.board = activePlayer.board.map((m, i) =>
                    i === attackerIndex ? { ...m, hasAttacked: true } : m
                );
            } else {
                // Attack minion
                const targetIndex = enemyPlayer.board.findIndex(m => m.id === targetId);
                if (targetIndex === -1) return prev;

                const target = enemyPlayer.board[targetIndex];

                // Calculate damage modifiers
                let attackerDamage = attacker.attack;
                let targetDamage = target.attack;
                let logMessage = `${attacker.name} griff ${target.name} an!`;

                // Work Bonuses
                if (activePlayer.activeWork && activePlayer.activeWork.workBonus && attacker.school) {
                    if (attacker.school.includes(activePlayer.activeWork.workBonus.school)) {
                        attackerDamage += activePlayer.activeWork.workBonus.damage;
                        logMessage += ` Bonus durch "${activePlayer.activeWork.name}"! (+${activePlayer.activeWork.workBonus.damage})`;
                    }
                }

                // Deal damage to both
                const updatedAttacker = { ...attacker, health: attacker.health - targetDamage, hasAttacked: true };
                const updatedTarget = { ...target, health: target.health - attackerDamage };

                addLog(logMessage);

                // Update boards
                updatedActivePlayer.board = [...activePlayer.board];
                updatedEnemyPlayer.board = [...enemyPlayer.board];

                if (updatedAttacker.health <= 0) {
                    updatedActivePlayer.board.splice(attackerIndex, 1);
                    updatedActivePlayer.graveyard = [...updatedActivePlayer.graveyard, attacker];
                    addLog(`${attacker.name} wurde besiegt!`);
                } else {
                    updatedActivePlayer.board[attackerIndex] = updatedAttacker;
                }

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
        setGameState(prev => {
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
        setGameState(prev => ({ ...prev, selectedCard: cardId }));
    }, []);

    const selectMinion = useCallback((minionId?: string) => {
        setGameState(prev => ({ ...prev, selectedMinion: minionId }));
    }, []);

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
                setGameState(createInitialState());
                // Start first turn
                setTimeout(() => {
                    setGameState(prev => {
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
            case 'SELECT_CARD':
                selectCard(action.cardId);
                break;
            case 'SELECT_MINION':
                selectMinion(action.minionId);
                break;
            case 'SEARCH_DECK':
                // Handle deck search result (card selected from deck)
                setGameState(prev => {
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
        }
    }, [endTurn, playCard, attack, selectCard, selectMinion, startTurn, addLog, mode]);

    return { gameState, dispatch };
}
