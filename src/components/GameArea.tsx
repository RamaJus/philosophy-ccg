import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameLogic } from '../hooks/useGameLogic';
import { Card } from '../types';
import { PlayerStats } from './PlayerStats';
import { Hand } from './Hand';
import { Board } from './Board';
import { GameLog } from './GameLog';
import { Graveyard } from './Graveyard';
import { DeckView } from './DeckView';
import { Card as CardComponent } from './Card';
import { WorkSlot } from './WorkSlot';
import { Swords, SkipForward, RotateCcw, Trophy, Zap } from 'lucide-react';
import { getRandomQuote } from '../data/quotes';
import { OracleCoinFlip } from './OracleCoinFlip';
import { MulliganModal } from './MulliganModal';
import { multiplayer } from '../network/MultiplayerManager';
import { playVoiceline } from '../audio/voicelines';

const MAX_BOARD_SIZE = 7;

interface GameAreaProps {
    mode: 'single' | 'multiplayer_host' | 'multiplayer_client';
    isDebugMode: boolean;
    customDeckIds?: string[];
    aiDeckIds?: string[];
}

export const GameArea: React.FC<GameAreaProps> = ({ mode, isDebugMode, customDeckIds, aiDeckIds }) => {
    const {
        gameState,
        dispatch,
        isClient,
        endTurn: endTurnMultiplayer,
        attack: attackMultiplayer,
        playCard: playCardMultiplayer,
        cancelCast: cancelCastMultiplayer,
        resolveFreudChoice,
        resolveZizekIdeology,
        resolveDiscovery,
        resolveRecurrence: resolveRecurrenceMultiplayer,
        resolveFoucault,
        resolvePantaRhei,
        mulliganKeep,
        mulliganRedraw,
    } = useGameLogic(
        mode === 'multiplayer_host' ? 'host' : mode === 'multiplayer_client' ? 'client' : 'single',
        isDebugMode,
        customDeckIds,
        aiDeckIds
    );
    const { player, opponent, activePlayer, selectedCard, selectedMinions, gameOver, winner, log, targetMode, targetModeOwner, foucaultRevealCards, recurrenceCards, discoveryCards, pantaRheiCards } = gameState;

    // Use ref to always have the latest state in AI callbacks
    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Store the philosophical quote when game ends
    const [philosophicalQuote, setPhilosophicalQuote] = useState<string>('');
    const [isDeckViewOpen, setIsDeckViewOpen] = useState(false);
    const [isDisconnected, setIsDisconnected] = useState(false);
    const [attackingMinionIds, setAttackingMinionIds] = useState<string[]>([]);
    const [deckPosition, setDeckPosition] = useState<{ x: number, y: number } | null>(null);
    const deckRef = useRef<HTMLDivElement>(null);

    // Oracle coin flip state
    const [showOracle, setShowOracle] = useState(false);
    const [oracleWinner, setOracleWinner] = useState<'player' | 'opponent'>('player');
    const [oracleComplete, setOracleComplete] = useState(false);

    // Set up coin flip listener for client
    useEffect(() => {
        if (mode === 'multiplayer_client') {
            const handleCoinFlip = (winner: 'player' | 'opponent') => {
                // From client's perspective: 'player' in host's message means host wins
                // So client sees 'opponent' as winner
                const clientPerspective = winner === 'player' ? 'opponent' : 'player';
                setOracleWinner(clientPerspective);
            };

            multiplayer.onCoinFlip(handleCoinFlip);

            // Check if coin flip was already received before listener was set (race condition fix)
            if (multiplayer.receivedCoinFlip) {
                handleCoinFlip(multiplayer.receivedCoinFlip);
                multiplayer.receivedCoinFlip = null; // Clear after processing
            }
        }
    }, [mode]);

    // Determine coin flip winner once at game start
    useEffect(() => {
        // Only trigger if not already shown and not complete
        if (gameState.turn === 1 && !oracleComplete && !gameOver && !showOracle) {
            // Host determines the winner randomly and sends to client
            if (mode !== 'multiplayer_client') {
                const winner = Math.random() < 0.5 ? 'player' : 'opponent';
                setOracleWinner(winner);
                // Send to client in multiplayer
                if (mode === 'multiplayer_host') {
                    multiplayer.sendCoinFlip(winner);
                }
            }
            setShowOracle(true);
        }
    }, [gameState.turn, oracleComplete, gameOver, mode, showOracle]);

    const handleOracleComplete = () => {
        setShowOracle(false);
        setOracleComplete(true);

        // Dispatch action to set who starts (only host does this, client gets it via sync)
        // Note: AI turn is NOT triggered here anymore - it waits for mulligan phase to complete
        if (mode !== 'multiplayer_client') {
            const action: import('../types').GameAction = { type: 'SET_STARTING_PLAYER', startingPlayer: oracleWinner };
            dispatch(action);
        }
    };

    useEffect(() => {
        const updateDeckPosition = () => {
            if (deckRef.current) {
                const rect = deckRef.current.getBoundingClientRect();
                // Store center of the deck
                setDeckPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
            }
        };

        // Initial update
        updateDeckPosition();
        // Update after a short delay to ensure layout is stable
        setTimeout(updateDeckPosition, 100);

        window.addEventListener('resize', updateDeckPosition);
        return () => window.removeEventListener('resize', updateDeckPosition);
    }, []);

    useEffect(() => {
        if (gameOver && winner) {
            setPhilosophicalQuote(getRandomQuote(winner === 'player'));
        }
    }, [gameOver, winner]);

    // Mulligan: AI auto-keeps in single player mode
    useEffect(() => {
        if (mode === 'single' && gameState.mulliganPhase && oracleComplete && !gameState.opponentMulliganDone) {
            // AI always keeps their hand
            setTimeout(() => {
                dispatch({ type: 'MULLIGAN_KEEP' });
            }, 300);
        }
    }, [mode, gameState.mulliganPhase, gameState.opponentMulliganDone, oracleComplete, dispatch]);

    // Mulligan: When mulligan phase ends and AI starts, trigger AI turn
    useEffect(() => {
        if (mode === 'single' && !gameState.mulliganPhase && oracleComplete && gameState.activePlayer === 'opponent') {
            // Mulligan phase just ended and AI starts - trigger AI turn
            setTimeout(() => {
                aiTurn();
            }, 500);
        }
    }, [mode, gameState.mulliganPhase, gameState.activePlayer, oracleComplete]);

    // Auto-open deck view when in search mode (only for the owner)
    // isClient is now provided by useGameLogic hook

    // Check if the current player owns the targetMode
    // Host sees 'player' as their own, Client sees 'opponent' as their own
    const isMyTargetMode = targetModeOwner !== undefined &&
        (isClient ? targetModeOwner === 'opponent' : targetModeOwner === 'player');

    useEffect(() => {
        if (targetMode === 'search' && isMyTargetMode) {
            setIsDeckViewOpen(true);
        }
    }, [targetMode, isMyTargetMode]);

    // In multiplayer client mode, we are the 'opponent' from the host's perspective, but we want to see ourselves as 'player'
    // This is tricky. The simplest way for P2P is:
    // Host: Player = Host, Opponent = Client
    // Client: Player = Client, Opponent = Host
    // BUT our state is synchronized from Host.
    // So if Host says "Player", it means Host.
    // If we are Client, we need to swap the view.

    // View Transformation for Client
    const viewPlayer = isClient ? opponent : player;
    const viewOpponent = isClient ? player : opponent;

    const viewIsPlayerTurn = isClient ? activePlayer === 'opponent' : activePlayer === 'player';

    // Flash Card Logic
    const [flashCard, setFlashCard] = useState<{ card: Card; position: 'top' | 'bottom' } | null>(null);

    const seenFlashIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Clear flash if no card is pending
        if (!gameState.lastPlayedCard || !gameState.lastPlayedCardPlayerId) {
            setFlashCard(null);
            return;
        }

        // Create unique key: cardId + turn + playerId
        // This allows same card to flash again if played in different turn (e.g., after Ewige Wiederkunft)
        // but prevents double-flash from multiple SYNC_STATE calls within the same play
        const cardId = gameState.lastPlayedCard.instanceId || gameState.lastPlayedCard.id;
        const uniqueFlashKey = `${cardId}-turn${gameState.turn}-${gameState.lastPlayedCardPlayerId}`;

        // Prevent repeat flash for exact same card play instance
        if (seenFlashIds.current.has(uniqueFlashKey)) {
            return;
        }

        // Mark as seen for this specific play
        seenFlashIds.current.add(uniqueFlashKey);

        // Determine position based on who played it relative to view
        const isMe = gameState.lastPlayedCardPlayerId === viewPlayer.id;
        const position = isMe ? 'bottom' : 'top';

        setFlashCard({ card: gameState.lastPlayedCard, position });

        const timer = setTimeout(() => {
            setFlashCard(null);
            // Don't clear seenFlashIds - we want to remember all flashed cards to prevent any double-flash
        }, 1000); // 1 second duration
        return () => clearTimeout(timer);
    }, [gameState.lastPlayedCard, gameState.lastPlayedCardPlayerId, gameState.turn]); // Trigger when card changes

    // Voiceline playback - triggered by pendingVoiceline state (synced from host)
    const lastVoicelineRef = useRef<string | null>(null);
    useEffect(() => {
        if (gameState.pendingVoiceline && gameState.pendingVoiceline !== lastVoicelineRef.current) {
            lastVoicelineRef.current = gameState.pendingVoiceline;
            playVoiceline(gameState.pendingVoiceline);
        } else if (!gameState.pendingVoiceline) {
            lastVoicelineRef.current = null;
        }
    }, [gameState.pendingVoiceline]);

    // Auto-start handled by useGameLogic now to prevent race conditions with custom deck loading
    // useEffect(() => {
    //     if (mode !== 'multiplayer_client') {
    //         dispatch({ type: 'START_GAME', isDebugMode });
    //     }
    // }, []);

    // Multiplayer: Set up disconnect detection
    useEffect(() => {
        if (mode === 'multiplayer_host' || mode === 'multiplayer_client') {
            multiplayer.setDisconnectCallback(() => {
                setIsDisconnected(true);
            });
        }
        return () => {
            multiplayer.clearListeners();
        };
    }, [mode]);

    const handleCardClick = (cardId: string) => {
        if (!viewIsPlayerTurn) return;

        // Handle discard mode - clicking a card discards it
        if (targetMode === 'discard' && isMyTargetMode) {
            const action: import('../types').GameAction = { type: 'DISCARD_CARD', cardId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        if (selectedCard === cardId) {
            dispatch({ type: 'SELECT_CARD', cardId: undefined });
        } else {
            dispatch({ type: 'SELECT_CARD', cardId });
            playCardMultiplayer(cardId); // Use multiplayer-aware function
        }
    };

    const handlePlayerMinionClick = (minionId: string) => {
        if (!viewIsPlayerTurn) return;

        if (targetMode === 'trolley_sacrifice') {
            const action: import('../types').GameAction = { type: 'TROLLEY_SACRIFICE', minionId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        if (targetMode === 'gottesbeweis_target') {
            const action: import('../types').GameAction = { type: 'GOTTESBEWEIS_TARGET', minionId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        if (targetMode === 'arete_target') {
            const action: import('../types').GameAction = { type: 'ARETE_TARGET', minionId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        if (targetMode === 'cave_ascent_target') {
            const action: import('../types').GameAction = { type: 'CAVE_ASCENT_TARGET', minionId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        // DEDUKTION, INDUKTION, and PHILOSOPHENHERRSCHAFT - these use SELECT_MINION but need to be networked
        if (targetMode === 'deduktion_target' || targetMode === 'induktion_target' || targetMode === 'philosophenherrschaft_target') {
            const action: import('../types').GameAction = { type: 'SELECT_MINION', minionId, toggle: true };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        // Toggle selection (add/remove from array) - Local UI only
        dispatch({ type: 'SELECT_MINION', minionId, toggle: true });
    };

    const handleOpponentMinionClick = (minionId: string) => {
        if (!viewIsPlayerTurn) return;
        if (!selectedMinions?.length && targetMode !== 'gottesbeweis_target' && targetMode !== 'nietzsche_target' && targetMode !== 'van_inwagen_target' && targetMode !== 'eros_target') return;

        if (targetMode === 'gottesbeweis_target') {
            const action: import('../types').GameAction = { type: 'GOTTESBEWEIS_TARGET', minionId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        if (targetMode === 'nietzsche_target') {
            const action: import('../types').GameAction = { type: 'NIETZSCHE_TARGET', minionId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        if (targetMode === 'van_inwagen_target') {
            const action: import('../types').GameAction = { type: 'VAN_INWAGEN_TARGET', minionId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        if (targetMode === 'arete_target') {
            const action: import('../types').GameAction = { type: 'ARETE_TARGET', minionId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        if (targetMode === 'eros_target') {
            const action: import('../types').GameAction = { type: 'EROS_TARGET', minionId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            return;
        }

        if (!selectedMinions?.length) return;

        // Staggered animation for multiple attackers, then dispatch attack after all animations complete
        const ANIM_DURATION = 300;
        const STAGGER_DELAY = 150;

        selectedMinions.forEach((attackerId, index) => {
            setTimeout(() => {
                setAttackingMinionIds(prev => [...prev, attackerId]);
                setTimeout(() => {
                    setAttackingMinionIds(prev => prev.filter(id => id !== attackerId));
                }, ANIM_DURATION);
            }, index * STAGGER_DELAY);
        });

        // Dispatch attack after all animations complete
        const totalAnimTime = (selectedMinions.length - 1) * STAGGER_DELAY + ANIM_DURATION;
        setTimeout(() => {
            attackMultiplayer(selectedMinions, minionId);
        }, totalAnimTime);
    };

    const handleSpecialClick = (minionId: string) => {
        if (!viewIsPlayerTurn) return;
        // Dispatch USE_SPECIAL to enter targeting mode for transform abilities
        const action: import('../types').GameAction = { type: 'USE_SPECIAL', minionId };
        if (isClient) multiplayer.sendAction(action); else dispatch(action);
    };

    const handleAttackPlayer = () => {
        if (!viewIsPlayerTurn || !selectedMinions?.length) return;

        // Staggered animation for multiple attackers, then dispatch attack after all animations complete
        const ANIM_DURATION = 300;
        const STAGGER_DELAY = 150;

        selectedMinions.forEach((minionId, index) => {
            setTimeout(() => {
                setAttackingMinionIds(prev => [...prev, minionId]);
                setTimeout(() => {
                    setAttackingMinionIds(prev => prev.filter(id => id !== minionId));
                }, ANIM_DURATION);
            }, index * STAGGER_DELAY);
        });

        // Dispatch attack after all animations complete
        const totalAnimTime = (selectedMinions.length - 1) * STAGGER_DELAY + ANIM_DURATION;
        setTimeout(() => {
            attackMultiplayer(selectedMinions);
        }, totalAnimTime);
    };

    const handleEndTurn = () => {
        if (!viewIsPlayerTurn) return;
        endTurnMultiplayer(); // Use multiplayer-aware function

        if (mode === 'single') {
            // Increment turn ID to cancel any previous AI turn timeouts
            aiTurnIdRef.current += 1;
            const turnId = aiTurnIdRef.current;

            // Set up safety timeout (15 seconds) - only triggers if still AI's turn
            setTimeout(() => {
                const currentState = gameStateRef.current;
                if (aiTurnIdRef.current === turnId && currentState.activePlayer === 'opponent') {
                    console.warn('[AI Safety] Turn timeout reached (15s), forcing turn end');
                    dispatch({ type: 'CANCEL_CAST' });
                    dispatch({ type: 'END_TURN' });
                }
            }, AI_TURN_TIMEOUT_MS);

            setTimeout(() => {
                aiTurn(0);
                // Clear the timeout when AI turn starts (it will be handled by iteration counter now)
            }, 1500);
        }
    };

    const handleSearchSelect = (cardId: string) => {
        if (targetMode === 'search') {
            const action: import('../types').GameAction = { type: 'SEARCH_DECK', cardId };
            if (isClient) multiplayer.sendAction(action); else dispatch(action);
            setIsDeckViewOpen(false);
        }
    };

    const handleFoucaultClose = () => {
        resolveFoucault();
    };

    const handleCancelCast = () => {
        cancelCastMultiplayer();
    };

    const handleRecurrenceSelect = (cardId: string) => {
        resolveRecurrenceMultiplayer(cardId);
    };

    const handleDiscoverySelect = (cardId: string) => {
        resolveDiscovery(cardId);
    };

    const handleFreudChoice = (choice: 'es' | 'ich' | 'ueberich') => {
        resolveFreudChoice(choice);
    };

    const handleZizekIdeology = (school: string) => {
        resolveZizekIdeology(school);
    };

    const handlePantaRheiSelect = (cardId: string) => {
        resolvePantaRhei(cardId);
    };

    // AI Turn safety: track iteration count and turn timeout
    const aiTurnIdRef = useRef(0);
    const AI_MAX_ITERATIONS = 10;
    const AI_TURN_TIMEOUT_MS = 15000;

    const aiTurn = (iterationCount: number = 0) => {
        if (mode !== 'single') return; // No AI in multiplayer

        // Safety: Track this AI turn's ID for timeout cancellation
        const currentTurnId = aiTurnIdRef.current;

        // Safety check: If we've exceeded max iterations, force end turn
        if (iterationCount >= AI_MAX_ITERATIONS) {
            console.warn('[AI Safety] Max iterations reached (' + AI_MAX_ITERATIONS + '), forcing turn end');
            dispatch({ type: 'CANCEL_CAST' }); // Clear any pending targetMode
            dispatch({ type: 'END_TURN' });
            return;
        }

        setTimeout(() => {
            // Safety: Check if this turn was superseded by a new turn
            if (currentTurnId !== aiTurnIdRef.current) {
                console.log('[AI Safety] Turn superseded, aborting');
                return;
            }

            const currentState = gameStateRef.current;
            const aiPlayer = currentState.opponent;
            const humanPlayer = currentState.player;

            if (currentState.activePlayer !== 'opponent' || currentState.gameOver) {
                return;
            }

            // === AI TARGET MODE HANDLERS ===
            // Handle all targeting modes that AI might trigger

            // Handle freud_choice (Sigmund Freud: choose Es, Ich, or Über-Ich)
            if (currentState.targetMode === 'freud_choice') {
                // AI picks based on board state: 'ueberich' if has minions, else 'ich' or 'es'
                const choice: 'es' | 'ich' | 'ueberich' = aiPlayer.board.length > 2 ? 'ueberich' : (Math.random() > 0.5 ? 'ich' : 'es');
                dispatch({ type: 'FREUD_CHOICE', choice });
                setTimeout(() => aiTurn(iterationCount + 1), 800);
                return;
            }

            // Handle zizek_ideology (Slavoj Žižek: choose school for ideology debuff)
            if (currentState.targetMode === 'zizek_ideology') {
                // AI picks a school that benefits them most (matches own minions, doesn't match enemy)
                const schools = ['Rationalismus', 'Empirismus', 'Idealismus', 'Existentialismus', 'Moralphilosophie', 'Politik', 'Skeptizismus', 'Religion', 'Metaphysik', 'Logik', 'Ästhetik', 'Stoizismus', 'Vorsokratiker'];
                // Simple: pick a random school or the most common among own minions
                const ownSchools: Record<string, number> = {};
                aiPlayer.board.forEach(m => m.school?.forEach(s => { ownSchools[s] = (ownSchools[s] || 0) + 1; }));
                const bestSchool = Object.entries(ownSchools).sort((a, b) => b[1] - a[1])[0]?.[0] || schools[Math.floor(Math.random() * schools.length)];
                dispatch({ type: 'ZIZEK_IDEOLOGY', school: bestSchool });
                setTimeout(() => aiTurn(iterationCount + 1), 800);
                return;
            }

            if (currentState.targetMode === 'gottesbeweis_target') {
                const targetPool = humanPlayer.board.length > 0 ? humanPlayer.board : aiPlayer.board;
                if (targetPool.length > 0) {
                    const randomTarget = targetPool[Math.floor(Math.random() * targetPool.length)];
                    dispatch({ type: 'GOTTESBEWEIS_TARGET', minionId: randomTarget.instanceId || randomTarget.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // FIX Bug 2: Handle cave_ascent_target (Aufstieg aus der Höhle)
            if (currentState.targetMode === 'cave_ascent_target') {
                if (aiPlayer.board.length > 0) {
                    // Pick a random friendly philosopher
                    const randomMinion = aiPlayer.board[Math.floor(Math.random() * aiPlayer.board.length)];
                    dispatch({ type: 'CAVE_ASCENT_TARGET', minionId: randomMinion.instanceId || randomMinion.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle arete_target
            if (currentState.targetMode === 'arete_target') {
                // Prefer low-health friendly minions for healing
                const allMinions = [...aiPlayer.board, ...humanPlayer.board];
                if (allMinions.length > 0) {
                    // Prefer own minions, then lowest health
                    const target = aiPlayer.board.length > 0
                        ? aiPlayer.board.reduce((a, b) => (a.health < b.health ? a : b))
                        : allMinions[0];
                    dispatch({ type: 'ARETE_TARGET', minionId: target.instanceId || target.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle deduktion_target (select 3 friendly philosophers)
            if (currentState.targetMode === 'deduktion_target') {
                if (aiPlayer.board.length > 0) {
                    // Select up to 3 random friendly philosophers
                    const targets = aiPlayer.board.slice(0, Math.min(3, aiPlayer.board.length));
                    for (const target of targets) {
                        dispatch({ type: 'SELECT_MINION', minionId: target.instanceId || target.id, toggle: true });
                    }
                    // If less than 3, we need to confirm manually (handled by reducer)
                    if (targets.length < 3) {
                        dispatch({ type: 'CONFIRM_DEDUKTION' });
                    }
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle induktion_target (select 1 friendly philosopher)
            if (currentState.targetMode === 'induktion_target') {
                if (aiPlayer.board.length > 0) {
                    // Pick the strongest friendly philosopher
                    const target = aiPlayer.board.reduce((a, b) => ((a.attack || 0) > (b.attack || 0) ? a : b));
                    dispatch({ type: 'SELECT_MINION', minionId: target.instanceId || target.id, toggle: true });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle trolley_sacrifice
            if (currentState.targetMode === 'trolley_sacrifice') {
                if (aiPlayer.board.length > 0) {
                    // Sacrifice weakest minion
                    const weakest = aiPlayer.board.reduce((a, b) => ((a.attack || 0) + (a.health || 0) < (b.attack || 0) + (b.health || 0) ? a : b));
                    dispatch({ type: 'TROLLEY_SACRIFICE', minionId: weakest.instanceId || weakest.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle nietzsche_target (target enemy with highest attack for -3/-3 or transform)
            if (currentState.targetMode === 'nietzsche_target') {
                if (humanPlayer.board.length > 0) {
                    // Target the strongest enemy philosopher
                    const target = humanPlayer.board.reduce((a, b) => ((a.attack || 0) > (b.attack || 0) ? a : b));
                    dispatch({ type: 'NIETZSCHE_TARGET', minionId: target.instanceId || target.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle van_inwagen_target (transform strongest enemy into 0/1 chair)
            if (currentState.targetMode === 'van_inwagen_target') {
                if (humanPlayer.board.length > 0) {
                    // Target the strongest enemy (highest attack + health)
                    const target = humanPlayer.board.reduce((a, b) =>
                        ((a.attack || 0) + (a.health || 0) > (b.attack || 0) + (b.health || 0) ? a : b));
                    dispatch({ type: 'VAN_INWAGEN_TARGET', minionId: target.instanceId || target.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle friendly_minion_transform (Sartre - cancel, he transforms automatically)
            if (currentState.targetMode === 'friendly_minion_transform') {
                dispatch({ type: 'CANCEL_CAST' });
                setTimeout(() => aiTurn(iterationCount + 1), 800);
                return;
            }

            // Handle foucault_reveal (just close the modal)
            if (currentState.targetMode === 'foucault_reveal') {
                dispatch({ type: 'FOUCAULT_CLOSE' });
                setTimeout(() => aiTurn(iterationCount + 1), 800);
                return;
            }

            // Handle recurrence_select (Ewige Wiederkunft - pick highest cost philosopher from graveyard)
            if (currentState.targetMode === 'recurrence_select') {
                const philosophers = currentState.recurrenceCards || [];
                if (philosophers.length > 0) {
                    const best = philosophers.reduce((a, b) => ((a.cost || 0) > (b.cost || 0) ? a : b));
                    dispatch({ type: 'RECURRENCE_SELECT', cardId: best.instanceId || best.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle discover (Kontemplation - pick first/random card)
            if (currentState.targetMode === 'discover') {
                const cards = currentState.discoveryCards || [];
                if (cards.length > 0) {
                    // Pick the highest cost card (usually strongest)
                    const best = cards.reduce((a, b) => ((a.cost || 0) > (b.cost || 0) ? a : b));
                    dispatch({ type: 'SELECT_DISCOVERY', cardId: best.instanceId || best.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle search (Hermeneutik - pick random card from deck)
            if (currentState.targetMode === 'search') {
                if (aiPlayer.deck.length > 0) {
                    // Pick a high-cost philosopher if available
                    const philosophers = aiPlayer.deck.filter(c => c.type === 'Philosoph');
                    const target = philosophers.length > 0
                        ? philosophers.reduce((a, b) => ((a.cost || 0) > (b.cost || 0) ? a : b))
                        : aiPlayer.deck[0];
                    dispatch({ type: 'SEARCH_DECK', cardId: target.instanceId || target.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle eros_target (prevent strongest enemy from attacking)
            if (currentState.targetMode === 'eros_target') {
                if (humanPlayer.board.length > 0) {
                    const target = humanPlayer.board.reduce((a, b) => ((a.attack || 0) > (b.attack || 0) ? a : b));
                    dispatch({ type: 'EROS_TARGET', minionId: target.instanceId || target.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle panta_rhei_select (force enemy to discard their highest cost card)
            if (currentState.targetMode === 'panta_rhei_select') {
                const cards = currentState.pantaRheiCards || [];
                if (cards.length > 0) {
                    const best = cards.reduce((a, b) => ((a.cost || 0) > (b.cost || 0) ? a : b));
                    dispatch({ type: 'PANTA_RHEI_SELECT', cardId: best.instanceId || best.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle philosophenherrschaft_target (give charge to a fresh minion)
            if (currentState.targetMode === 'philosophenherrschaft_target') {
                const freshMinions = aiPlayer.board.filter(m => !m.canAttack && !m.hasAttacked);
                if (freshMinions.length > 0) {
                    // Pick the one with highest attack
                    const target = freshMinions.reduce((a, b) => ((a.attack || 0) > (b.attack || 0) ? a : b));
                    dispatch({ type: 'SELECT_MINION', minionId: target.instanceId || target.id, toggle: true });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // Handle discard (full hand - discard lowest cost card)
            if (currentState.targetMode === 'discard') {
                if (aiPlayer.hand.length > 0) {
                    const cheapest = aiPlayer.hand.reduce((a, b) => ((a.cost || 0) < (b.cost || 0) ? a : b));
                    dispatch({ type: 'DISCARD_CARD', cardId: cheapest.instanceId || cheapest.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                } else {
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // FALLBACK: If there's any unhandled targetMode, cancel it to prevent hang
            if (currentState.targetMode) {
                console.warn('[AI] Unhandled targetMode:', currentState.targetMode, '- canceling to prevent hang');
                dispatch({ type: 'CANCEL_CAST' });
                setTimeout(() => aiTurn(iterationCount + 1), 800);
                return;
            }


            // Helper: Calculate board strength (sum of attack + health)
            const calcBoardStrength = (board: typeof aiPlayer.board) =>
                board.reduce((sum, m) => sum + (m.attack || 0) + (m.health || 0), 0);

            const aiBoardStrength = calcBoardStrength(aiPlayer.board);
            const humanBoardStrength = calcBoardStrength(humanPlayer.board);
            const isAheadOnBoard = aiBoardStrength > humanBoardStrength + 5;

            // Phase 3: Defensive mode check (≤25% health = red indicator)
            const healthPercent = (aiPlayer.health / aiPlayer.maxHealth) * 100;
            const isInDanger = healthPercent <= 25;

            // Helper: Check if a spell is safe to play (prevents crashes)
            const isSpellSafeToPlay = (spell: typeof aiPlayer.hand[0]): boolean => {
                if (spell.id === 'gottesbeweis') {
                    return aiPlayer.board.length > 0 || humanPlayer.board.length > 0;
                }
                if (spell.id === 'aufstieg_aus_der_hoehle') {
                    return aiPlayer.board.length > 0;
                }
                if (spell.id === 'trolley_problem') {
                    return aiPlayer.board.length > 0 && humanPlayer.board.length > 0;
                }
                if (spell.id === 'deduktion' || spell.id === 'induktion') {
                    return aiPlayer.board.length > 0;
                }
                if (spell.id === 'arete') {
                    return aiPlayer.board.length > 0 || humanPlayer.board.length > 0;
                }
                if (spell.id === 'philosophenherrschaft') {
                    return aiPlayer.board.some(m => !m.canAttack);
                }
                if (spell.id === 'ewige-wiederkunft') {
                    return aiPlayer.graveyard.some(c => c.type === 'Philosoph');
                }
                if (spell.id === 'eros') {
                    return humanPlayer.board.length > 0;
                }
                // NEW: Additional safety checks for spells that require deck/hand
                if (spell.id === 'kontemplation' || spell.id === 'hermeneutik') {
                    return aiPlayer.deck.length > 0;
                }
                if (spell.id === 'foucault') {
                    return humanPlayer.deck.length > 0;
                }
                if (spell.id === 'panta_rhei') {
                    return humanPlayer.hand.length > 0;
                }
                return true;
            };

            // Phase 1: Spell evaluation function - returns a score (higher = more valuable)
            const evaluateSpell = (spell: typeof aiPlayer.hand[0]): number => {
                let score = 0;

                switch (spell.id) {
                    // === HEALING SPELLS ===
                    case 'arete': // Full heal one philosopher
                        const damagedFriendly = aiPlayer.board.find(m => m.health < 5);
                        if (damagedFriendly) score = 4;
                        break;

                    case 'idee_des_guten': // Heal all own by 2
                        const totalDamage = aiPlayer.board.filter(m => m.health <= 3).length;
                        if (totalDamage >= 2) score = 5;
                        else if (totalDamage >= 1) score = 2;
                        break;

                    // === DAMAGE/REMOVAL SPELLS ===
                    case 'gottesbeweis': // 8 damage or 4 heal
                        if (humanPlayer.board.some(m => !m.school?.includes('Religion'))) score = 5;
                        break;

                    case 'aporia': // 6 direct damage to opponent
                        score = 4; // Always useful
                        if (humanPlayer.health <= 20) score = 6; // Better as finisher
                        break;

                    case 'wu-wei': // 10 direct damage to opponent
                        score = 5; // High value
                        if (humanPlayer.health <= 15) score = 8; // Excellent finisher
                        break;

                    case 'meditation': // Heal 6
                        if (aiPlayer.health <= aiPlayer.maxHealth - 6) score = 3;
                        if (aiPlayer.health <= 30) score = 5;
                        break;

                    case 'Aufklärung': // Heal 10
                        if (aiPlayer.health <= aiPlayer.maxHealth - 10) score = 4;
                        if (aiPlayer.health <= 40) score = 6;
                        break;

                    case 'trolley_problem': // 4 damage to all enemies
                        if (humanPlayer.board.length >= 3) score = 8;
                        else if (humanPlayer.board.length >= 2) score = 5;
                        else if (humanPlayer.board.length >= 1) score = 2;
                        break;

                    case 'tabula_rasa': // Board clear
                        if (humanBoardStrength > aiBoardStrength + 10) score = 10;
                        else if (humanBoardStrength > aiBoardStrength + 5) score = 6;
                        break;

                    // === BUFF SPELLS ===
                    case 'deduktion': // +1/+1 to 3 philosophers
                        if (aiPlayer.board.length >= 3) score = 6;
                        else if (aiPlayer.board.length >= 2) score = 4;
                        else if (aiPlayer.board.length >= 1) score = 2;
                        break;

                    case 'induktion': // +3/+3 to one philosopher
                        if (aiPlayer.board.length >= 1) score = 5;
                        break;

                    case 'philosophenherrschaft': // Give charge
                        if (aiPlayer.board.some(m => !m.canAttack)) score = 5;
                        break;

                    case 'aufstieg_aus_der_hoehle': // +2 attack, -2 health temporarily
                        const strongMinion = aiPlayer.board.find(m => m.health >= 4);
                        if (strongMinion) score = 3;
                        break;

                    // === MANA MANIPULATION ===
                    case 'sophistik': // +1 mana, lock 1 enemy
                        score = 3; // Always decent early game
                        break;

                    case 'eristik': // +2 mana, lock 2 enemy
                        score = 4;
                        break;

                    // === CARD DRAW/SEARCH ===
                    case 'hermeneutics': // Search deck
                        if (aiPlayer.hand.length <= 5) score = 4;
                        else score = 2;
                        break;

                    case 'kontemplation': // Discover from top 3
                        if (aiPlayer.hand.length <= 5) score = 4;
                        else score = 2;
                        break;

                    case 'dualismus': // Draw 2 cards
                        if (aiPlayer.hand.length <= 4) score = 5;
                        else score = 2;
                        break;

                    case 'axiom': // +1 mana this turn (0 cost)
                        score = 3; // Free mana is good for tempo
                        break;

                    case 'cogito': // Draw 1 (0 cost)
                        if (aiPlayer.hand.length <= 6) score = 4; // Free card draw is great
                        else score = 2;
                        break;

                    case 'scholastik': // Draw Religion/Logik
                        score = 2;
                        break;

                    case 'epiphanie': // Draw legendary
                        score = 3;
                        break;

                    case 'ewige-wiederkunft': // Return from graveyard
                        if (aiPlayer.graveyard.some(c => c.type === 'Philosoph')) score = 5;
                        break;

                    // === CONTROL SPELLS ===
                    case 'skeptischer_zweifel': // Block synergies 1 turn
                        score = 2;
                        break;

                    case 'radikale_dekonstruktion': // Block synergies 2 turns
                        score = 3;
                        break;

                    case 'eros': // Prevent attack 2 turns
                        if (humanPlayer.board.some(m => (m.attack || 0) >= 4)) score = 5;
                        else if (humanPlayer.board.length > 0) score = 2;
                        break;

                    case 'mesotes': // Balance health
                        if (humanPlayer.health > aiPlayer.health + 5) score = 6;
                        break;

                    case 'banalitaet_des_boesen': // Double attack for lowest cost
                        if (aiPlayer.board.length > 0) score = 4;
                        break;

                    default:
                        score = 1; // Unknown spells get low priority
                }

                return score;
            };

            // Phase 3: In danger mode, boost defensive spell scores
            const evaluateSpellWithDefense = (spell: typeof aiPlayer.hand[0]): number => {
                let score = evaluateSpell(spell);

                if (isInDanger) {
                    // Boost healing and board clears when in danger
                    if (['arete', 'idee_des_guten', 'tabula_rasa', 'mesotes'].includes(spell.id)) {
                        score += 5;
                    }
                }

                return score;
            };

            // Phase 2: Get playable cards and evaluate them
            const playableCards = aiPlayer.hand
                .filter(c => c.cost <= aiPlayer.mana)
                .filter(c => c.type !== 'Zauber' || isSpellSafeToPlay(c));

            if (playableCards.length > 0 && aiPlayer.board.length < MAX_BOARD_SIZE) {
                const philosophers = playableCards.filter(c => c.type === 'Philosoph');
                const spells = playableCards.filter(c => c.type === 'Zauber');
                const werke = playableCards.filter(c => c.type === 'Werk');

                // Evaluate spells and find the best one
                const evaluatedSpells = spells
                    .map(s => ({ spell: s, score: evaluateSpellWithDefense(s) }))
                    .filter(s => s.score >= 2) // Minimum threshold to play
                    .sort((a, b) => b.score - a.score);

                const bestSpell = evaluatedSpells.length > 0 ? evaluatedSpells[0] : null;

                // Evaluate philosophers - prefer higher cost (stronger)
                const bestPhilosopher = philosophers.length > 0
                    ? philosophers.sort((a, b) => b.cost - a.cost)[0]
                    : null;
                const philosopherScore = bestPhilosopher
                    ? bestPhilosopher.cost + (aiPlayer.board.length < 3 ? 3 : 0) // Bonus if board is thin
                    : 0;

                // Evaluate werke - lowest priority, play if nothing else is good
                const bestWerk = werke.length > 0 ? werke[0] : null;
                const werkScore = bestWerk ? 1 : 0;

                // Decision logic: pick highest value option
                // In danger mode, prefer spell if it's defensive
                if (bestSpell && bestSpell.score >= philosopherScore && bestSpell.score > werkScore) {
                    dispatch({ type: 'PLAY_CARD', cardId: bestSpell.spell.instanceId || bestSpell.spell.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }

                if (bestPhilosopher && philosopherScore > werkScore) {
                    dispatch({ type: 'PLAY_CARD', cardId: bestPhilosopher.instanceId || bestPhilosopher.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }

                if (bestWerk) {
                    dispatch({ type: 'PLAY_CARD', cardId: bestWerk.instanceId || bestWerk.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }

                // Fallback: play any playable card
                if (playableCards.length > 0) {
                    const card = playableCards[0];
                    dispatch({ type: 'PLAY_CARD', cardId: card.instanceId || card.id });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }
            }

            // 2. Attack phase - FIX: Check silencedUntilTurn to prevent Diotima hang
            const attackableMinions = aiPlayer.board.filter(m =>
                m.canAttack &&
                !m.hasAttacked &&
                !(m.silencedUntilTurn && m.silencedUntilTurn > currentState.turn) &&
                !(m.gender === 'male' && m.silencedUntilTurn && m.silencedUntilTurn > currentState.turn)
            );

            if (attackableMinions.length > 0) {
                // Sort attackers by attack power (use strongest first)
                const sortedAttackers = [...attackableMinions].sort((a, b) => (b.attack || 0) - (a.attack || 0));
                const attacker = sortedAttackers[0];
                const attackerPower = attacker.attack || 0;
                const attackerHealth = attacker.health || 0;

                // If ahead on board, go face more often
                if (isAheadOnBoard && Math.random() > 0.3) {
                    dispatch({ type: 'ATTACK', attackerIds: [attacker.instanceId || attacker.id] });
                    setTimeout(() => aiTurn(iterationCount + 1), 800);
                    return;
                }

                // Look for efficient trades on enemy board - BUT skip if Kant blocks minion attacks
                const canAttackMinions = (aiPlayer.minionAttackBlockTurns || 0) === 0;
                if (humanPlayer.board.length > 0 && canAttackMinions) {
                    // Sort enemy minions by threat (attack power) - FILTER out untargetable (Diogenes)
                    const enemyMinions = [...humanPlayer.board]
                        .filter(m => !(m.untargetableUntilTurn && m.untargetableUntilTurn > currentState.turn))
                        .sort((a, b) => (b.attack || 0) - (a.attack || 0));

                    // Find a good trade: can kill without dying, or at least trade evenly
                    let bestTarget = null;
                    for (const enemy of enemyMinions) {
                        const enemyHealth = enemy.health || 0;
                        const enemyAttack = enemy.attack || 0;

                        // Can we kill it?
                        if (attackerPower >= enemyHealth) {
                            // Will we survive?
                            if (attackerHealth > enemyAttack) {
                                // Great trade - we kill and survive
                                bestTarget = enemy;
                                break;
                            } else if (attackerHealth === enemyAttack ||
                                (enemyAttack >= 4 && attackerPower >= enemyHealth)) {
                                // Even trade or removing a threat - acceptable
                                bestTarget = enemy;
                                break;
                            }
                        }
                    }

                    // If no good trade found but enemy has high attack minions, trade anyway
                    if (!bestTarget && enemyMinions.some(m => (m.attack || 0) >= 4)) {
                        // Attack the highest threat even if not efficient
                        bestTarget = enemyMinions[0];
                    }

                    if (bestTarget) {
                        dispatch({
                            type: 'ATTACK',
                            attackerIds: [attacker.instanceId || attacker.id],
                            targetId: bestTarget.instanceId || bestTarget.id
                        });
                        setTimeout(() => aiTurn(iterationCount + 1), 800);
                        return;
                    }
                }

                // No good trades - go face
                dispatch({ type: 'ATTACK', attackerIds: [attacker.instanceId || attacker.id] });
                setTimeout(() => aiTurn(iterationCount + 1), 800);
                return;
            }

            // End turn
            setTimeout(() => {
                dispatch({ type: 'END_TURN' });
            }, 500);
        }, 500);
    };

    const handleNewGame = () => {
        dispatch({ type: 'START_GAME', isDebugMode, customDeckIds });
    };

    return (
        <div className="h-screen w-full overflow-hidden relative">
            {/* Oracle Coin Flip Animation */}
            {showOracle && (
                <OracleCoinFlip
                    playerName={viewPlayer.name}
                    opponentName={viewOpponent.name}
                    winnerId={oracleWinner}
                    onComplete={handleOracleComplete}
                />
            )}

            {/* Mulligan Modal - Show after oracle, during mulligan phase */}
            {!showOracle && oracleComplete && gameState.mulliganPhase && (
                <MulliganModal
                    hand={viewPlayer.hand}
                    onKeep={mulliganKeep}
                    onRedraw={mulliganRedraw}
                    isWaiting={isClient ? (gameState.opponentMulliganDone ?? false) : (gameState.playerMulliganDone ?? false)}
                />
            )}
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'url(/images/menu-background_orig.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-amber-900/85" />

            {/* Content */}
            <div className="relative z-10 h-full w-full text-white"  >
                {/* Header removed for laptop optimization */}

                <AnimatePresence>
                    {gameOver && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                transition={{ type: "spring", duration: 0.5 }}
                                className={`relative p-12 max-w-2xl w-full text-center overflow-hidden rounded-2xl shadow-2xl border-4 ${(mode === 'multiplayer_client' ? winner === 'opponent' : winner === 'player')
                                    ? 'border-amber-400/50 bg-gradient-to-b from-slate-900 to-amber-900/40'
                                    : 'border-red-900/50 bg-gradient-to-b from-slate-900 to-red-950/40'
                                    }`}
                            >
                                {/* Decorative elements */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                {(mode === 'multiplayer_client' ? winner === 'opponent' : winner === 'player') ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none"
                                        />
                                        <Trophy size={80} className="mx-auto text-amber-400 mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                                        <h2 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 mb-4 drop-shadow-sm">
                                            Sieg!
                                        </h2>
                                        <p className="text-amber-100/80 text-xl font-serif italic mb-8">
                                            Deine philosophischen Argumente haben gesiegt!
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-900/5 rounded-full blur-3xl pointer-events-none" />
                                        <div className="mx-auto mb-6 text-red-500/80 relative">
                                            <Trophy size={80} className="opacity-20 grayscale" />
                                            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-4xl font-bold">❌</div>
                                        </div>
                                        <h2 className="text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-red-400 mb-4">
                                            Niederlage
                                        </h2>
                                        <p className="text-red-200/80 text-xl font-serif italic mb-8">
                                            Die Logik des Gegners war zu stark.
                                        </p>
                                    </>
                                )}

                                <div className="border-t border-b border-white/10 py-6 my-6 bg-black/20 backdrop-blur-sm rounded-lg px-6">
                                    <p className="text-amber-100/90 italic text-lg leading-relaxed font-serif">
                                        "{philosophicalQuote.split(' — ')[0]}"
                                    </p>
                                    <p className="text-amber-400/60 text-sm mt-3 text-right font-semibold tracking-wider uppercase">
                                        — {philosophicalQuote.split(' — ')[1]}
                                    </p>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleNewGame}
                                    className={`px-8 py-3 rounded-lg font-bold text-lg transition-all shadow-lg flex items-center justify-center mx-auto gap-3 ${(mode === 'multiplayer_client' ? winner === 'opponent' : winner === 'player')
                                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/50'
                                        : 'bg-slate-700 hover:bg-slate-600 text-gray-200 shadow-slate-900/50'
                                        }`}
                                >
                                    <RotateCcw size={24} />
                                    Neues Spiel
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <DeckView
                    deck={viewPlayer.deck}
                    isOpen={isDeckViewOpen}
                    onClose={() => {
                        setIsDeckViewOpen(false);
                        if (targetMode === 'search') {
                            handleCancelCast();
                        }
                    }}
                    onSelectCard={handleSearchSelect}
                    mode={targetMode === 'search' ? 'search' : 'view'}
                />


                {/* Generic Discovery Modal (New Effect System) */}
                {targetMode === 'discover' && isMyTargetMode && discoveryCards && discoveryCards.length > 0 && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                        <div className="bg-slate-900 border-2 border-emerald-600 rounded-xl p-8 shadow-2xl shadow-emerald-900/20">
                            <h2 className="text-3xl font-serif text-emerald-400 mb-2 text-center">Entdecken</h2>
                            <p className="text-emerald-200/60 mb-6 font-serif italic text-center">
                                Wähle eine Karte.
                            </p>
                            <div className="flex gap-6 justify-center">
                                {discoveryCards.map((card) => (
                                    <div
                                        key={card.instanceId || card.id}
                                        className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20 cursor-pointer"
                                        onClick={() => handleDiscoverySelect(card.instanceId || card.id)}
                                    >
                                        <CardComponent card={card} isPlayable={true} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Foucault Reveal Modal (View-only) */}
                {targetMode === 'foucault_reveal' && isMyTargetMode && foucaultRevealCards && foucaultRevealCards.length > 0 && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                        <div className="bg-slate-900 border-2 border-cyan-600 rounded-xl p-8 shadow-2xl shadow-cyan-900/20">
                            <h2 className="text-3xl font-serif text-cyan-400 mb-2 text-center">Panoptischer Blick</h2>
                            <p className="text-cyan-200/60 mb-6 font-serif italic text-center">
                                Die nächsten Karten des Gegners:
                            </p>
                            <div className="flex gap-6 justify-center mb-6">
                                {foucaultRevealCards.map((card) => (
                                    <div
                                        key={card.instanceId || card.id}
                                        className="transform transition-all duration-300"
                                    >
                                        <CardComponent card={card} isPlayable={false} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center">
                                <button
                                    onClick={handleFoucaultClose}
                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-serif"
                                >
                                    Schließen
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Ewige Wiederkunft Graveyard Selection Modal */}
                {targetMode === 'recurrence_select' && isMyTargetMode && recurrenceCards && recurrenceCards.length > 0 && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                        <div className="bg-slate-900 border-2 border-green-600 rounded-xl p-8 shadow-2xl shadow-green-900/20 max-w-4xl max-h-[80vh] overflow-auto">
                            <h2 className="text-3xl font-serif text-green-400 mb-2 text-center">Ewige Wiederkunft</h2>
                            <p className="text-green-200/60 mb-6 font-serif italic text-center">
                                Wähle einen Philosophen aus deinem Friedhof.
                            </p>
                            <div className="flex flex-wrap gap-6 justify-center">
                                {recurrenceCards.map((card) => (
                                    <div
                                        key={card.instanceId || card.id}
                                        className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20 cursor-pointer"
                                        onClick={() => handleRecurrenceSelect(card.instanceId || card.id)}
                                    >
                                        <CardComponent card={card} isPlayable={true} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Panta Rhei Modal - View enemy hand and select card to discard */}
                {targetMode === 'panta_rhei_select' && isMyTargetMode && pantaRheiCards && pantaRheiCards.length > 0 && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                        <div className="bg-slate-900 border-2 border-blue-600 rounded-xl p-8 shadow-2xl shadow-blue-900/20 max-w-4xl max-h-[80vh] overflow-auto">
                            <h2 className="text-3xl font-serif text-blue-400 mb-2 text-center">Panta Rhei</h2>
                            <p className="text-blue-200/60 mb-6 font-serif italic text-center">
                                Wähle eine Karte, die der Gegner abwerfen muss.
                            </p>
                            <div className="flex flex-wrap gap-6 justify-center">
                                {pantaRheiCards.map((card) => (
                                    <div
                                        key={card.instanceId || card.id}
                                        className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 cursor-pointer"
                                        onClick={() => handlePantaRheiSelect(card.instanceId || card.id)}
                                    >
                                        <CardComponent card={card} isPlayable={true} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Freud Choice Modal (Es, Ich, Über-Ich) */}
                {targetMode === 'freud_choice' && isMyTargetMode && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                        <div className="bg-slate-900 border-2 border-purple-600 rounded-xl p-8 shadow-2xl shadow-purple-900/20">
                            <h2 className="text-3xl font-serif text-purple-400 mb-2 text-center">Es, Ich, Über-Ich</h2>
                            <p className="text-purple-200/60 mb-6 font-serif italic text-center">
                                Wähle eine Form für Sigmund Freud.
                            </p>
                            <div className="flex gap-6 justify-center">
                                <div
                                    className="bg-red-900/30 border-2 border-red-500 rounded-xl p-6 cursor-pointer hover:bg-red-900/50 hover:scale-105 transition-all text-center w-48"
                                    onClick={() => handleFreudChoice('es')}
                                >
                                    <h3 className="text-2xl font-bold text-red-400 mb-2">Es</h3>
                                    <p className="text-red-200/80 text-lg mb-2">8/1 mit Ansturm</p>
                                    <p className="text-red-200/50 text-sm italic">Das Es kennt keine Moral. Nur Triebe.</p>
                                </div>
                                <div
                                    className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-6 cursor-pointer hover:bg-blue-900/50 hover:scale-105 transition-all text-center w-48"
                                    onClick={() => handleFreudChoice('ich')}
                                >
                                    <h3 className="text-2xl font-bold text-blue-400 mb-2">Ich</h3>
                                    <p className="text-blue-200/80 text-lg mb-2">6/6</p>
                                    <p className="text-blue-200/50 text-sm italic">Das Ich vermittelt zwischen Es und Über-Ich.</p>
                                </div>
                                <div
                                    className="bg-amber-900/30 border-2 border-amber-500 rounded-xl p-6 cursor-pointer hover:bg-amber-900/50 hover:scale-105 transition-all text-center w-48"
                                    onClick={() => handleFreudChoice('ueberich')}
                                >
                                    <h3 className="text-2xl font-bold text-amber-400 mb-2">Über-Ich</h3>
                                    <p className="text-amber-200/80 text-lg mb-2">0/1</p>
                                    <p className="text-amber-200/50 text-sm italic">+1 Angriff für alle Philosophen diese Runde.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Žižek Ideology School Selection Modal */}
                {targetMode === 'zizek_ideology' && isMyTargetMode && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                        <div className="bg-slate-900 border-2 border-red-600 rounded-xl p-8 shadow-2xl shadow-red-900/20 max-w-4xl">
                            <h2 className="text-3xl font-serif text-red-400 mb-2 text-center">Herrschende Ideologie</h2>
                            <p className="text-red-200/60 mb-6 font-serif italic text-center">
                                Wähle eine Schule. Alle Philosophen, die NICHT dieser Schule angehören, erhalten -2/-2.
                            </p>
                            <div className="grid grid-cols-4 gap-3">
                                {['Rationalismus', 'Empirismus', 'Idealismus', 'Existentialismus', 'Moralphilosophie', 'Politik', 'Skeptizismus', 'Religion', 'Metaphysik', 'Logik', 'Ästhetik', 'Stoizismus', 'Vorsokratiker'].map(school => (
                                    <div
                                        key={school}
                                        className="bg-slate-800/50 border border-red-500/30 rounded-lg p-3 cursor-pointer hover:bg-red-900/30 hover:border-red-500 hover:scale-105 transition-all text-center"
                                        onClick={() => handleZizekIdeology(school)}
                                    >
                                        <span className="text-red-200 font-medium">{school}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Game Grid - Adjusted for full height */}
                <div className="grid grid-cols-12 gap-2 h-full p-2 pb-24">
                    {/* Left Side: Stats & Graveyard (2 cols) */}
                    <div className="col-span-2 flex flex-col gap-2 h-full overflow-y-auto">
                        <PlayerStats player={viewOpponent} isOpponent={true} />
                        <WorkSlot card={viewOpponent.activeWork} />
                        <Graveyard cards={viewOpponent.graveyard} title="Gegner" />
                    </div>

                    {/* Center: Board (8 cols) */}
                    <div className="col-span-8 flex flex-col h-full gap-2">
                        {/* Opponent Board */}
                        <div className="flex-1">
                            <Board
                                minions={viewOpponent.board}
                                onMinionClick={viewIsPlayerTurn && (selectedMinions?.length || targetMode === 'gottesbeweis_target' || targetMode === 'nietzsche_target' || targetMode === 'eros_target' || targetMode === 'arete_target') ? handleOpponentMinionClick : undefined}
                                selectedMinionIds={selectedMinions || []}
                                canTarget={viewIsPlayerTurn && (
                                    (!!selectedMinions?.length && (() => {
                                        // Specific check for attack validity (Diotima/Silence check)
                                        const attacker = viewPlayer.board.find(m => (m.instanceId || m.id) === selectedMinions[0]);
                                        if (!attacker) return false;
                                        // If silenced (Diotima) or already attacked, cannot target opponent
                                        if (attacker.silencedUntilTurn && attacker.silencedUntilTurn > gameState.turn) return false;
                                        if (attacker.hasAttacked) return false; // Should be handled by selection logic but safe to double check
                                        return true;
                                    })()) ||
                                    targetMode === 'gottesbeweis_target' ||
                                    targetMode === 'nietzsche_target' ||
                                    targetMode === 'eros_target' ||
                                    targetMode === 'arete_target'
                                )}
                                activeWork={viewOpponent.activeWork}
                                isSpecialTargeting={(() => {
                                    // Only true when explicit Target Mode is active (after clicking Effekt button)
                                    if (targetMode === 'gottesbeweis_target') return !!isMyTargetMode;
                                    if (targetMode === 'trolley_sacrifice') return !!isMyTargetMode;
                                    if (targetMode === 'nietzsche_target') return !!isMyTargetMode;
                                    if (targetMode === 'van_inwagen_target') return !!isMyTargetMode;
                                    if (targetMode === 'eros_target') return !!isMyTargetMode;
                                    if (targetMode === 'arete_target') return !!isMyTargetMode;
                                    return false;
                                })()}
                                synergiesBlocked={(viewOpponent.synergyBlockTurns || 0) > 0}
                                attacksBlocked={isClient ? (gameState.opponent.minionAttackBlockTurns || 0) > 0 : (gameState.player.minionAttackBlockTurns || 0) > 0}
                                jonasProtection={(viewOpponent.jonasProtectionTurns || 0) > 0}
                                currentTurn={gameState.turn}
                            />
                        </div>

                        {/* Turn Controls */}
                        <div className="glass-panel p-2 text-center shrink-0">
                            <div className="flex items-center justify-center gap-4">
                                <div className={`px-4 py-1 rounded-lg ${viewIsPlayerTurn ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                    <p className="text-sm font-semibold">Runde {gameState.turn}</p>
                                    <p className="text-xs">{viewIsPlayerTurn ? 'Dein Zug' : 'Gegner-Zug'}</p>
                                </div>

                                {targetMode === 'trolley_sacrifice' && isMyTargetMode && (
                                    <>
                                        <div className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/50 animate-pulse">
                                            <p className="text-sm font-bold">Wähle einen Philosophen zum Opfern</p>
                                        </div>
                                        <button
                                            onClick={handleCancelCast}
                                            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded border border-red-500 text-sm"
                                        >
                                            Zauber abbrechen
                                        </button>
                                    </>
                                )}

                                {targetMode === 'gottesbeweis_target' && isMyTargetMode && (
                                    <>
                                        <div className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/50 animate-pulse">
                                            <p className="text-sm font-bold">Wähle einen Philosophen für den Gottesbeweis</p>
                                        </div>
                                        <button
                                            onClick={handleCancelCast}
                                            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded border border-red-500 text-sm"
                                        >
                                            Zauber abbrechen
                                        </button>
                                    </>
                                )}

                                {targetMode === 'eros_target' && isMyTargetMode && (
                                    <>
                                        <div className="px-4 py-2 bg-pink-500/20 text-pink-400 rounded-lg border border-pink-500/50 animate-pulse">
                                            <p className="text-sm font-bold">Wähle einen gegnerischen Philosophen für Eros</p>
                                        </div>
                                        <button
                                            onClick={handleCancelCast}
                                            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded border border-red-500 text-sm"
                                        >
                                            Zauber abbrechen
                                        </button>
                                    </>
                                )}

                                {targetMode === 'arete_target' && isMyTargetMode && (
                                    <>
                                        <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/50 animate-pulse">
                                            <p className="text-sm font-bold">Wähle einen Philosophen zum Heilen (Arete)</p>
                                        </div>
                                        <button
                                            onClick={handleCancelCast}
                                            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded border border-red-500 text-sm"
                                        >
                                            Zauber abbrechen
                                        </button>
                                    </>
                                )}

                                {targetMode === 'cave_ascent_target' && isMyTargetMode && (
                                    <>
                                        <div className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/50 animate-pulse">
                                            <p className="text-sm font-bold">Wähle einen eigenen Philosophen (Aufstieg aus der Höhle)</p>
                                        </div>
                                        <button
                                            onClick={handleCancelCast}
                                            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded border border-red-500 text-sm"
                                        >
                                            Zauber abbrechen
                                        </button>
                                    </>
                                )}

                                {targetMode === 'deduktion_target' && isMyTargetMode && (
                                    <>
                                        <div className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/50 animate-pulse">
                                            <p className="text-sm font-bold">Deduktion: Wähle bis zu 3 Philosophen ({selectedMinions?.length || 0}/3)</p>
                                        </div>
                                        {(selectedMinions?.length || 0) > 0 && (selectedMinions?.length || 0) < 3 && (
                                            <button
                                                onClick={() => {
                                                    const action: import('../types').GameAction = { type: 'CONFIRM_DEDUKTION' };
                                                    if (isClient) multiplayer.sendAction(action); else dispatch(action);
                                                }}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded border border-blue-400 text-sm"
                                            >
                                                Bestätigen ({selectedMinions?.length})
                                            </button>
                                        )}
                                        <button
                                            onClick={handleCancelCast}
                                            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded border border-red-500 text-sm"
                                        >
                                            Abbrechen
                                        </button>
                                    </>
                                )}

                                {targetMode === 'induktion_target' && isMyTargetMode && (
                                    <>
                                        <div className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/50 animate-pulse">
                                            <p className="text-sm font-bold">Induktion: Wähle einen Philosophen</p>
                                        </div>
                                        <button
                                            onClick={handleCancelCast}
                                            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded border border-red-500 text-sm"
                                        >
                                            Zauber abbrechen
                                        </button>
                                    </>
                                )}

                                {targetMode === 'philosophenherrschaft_target' && isMyTargetMode && (
                                    <>
                                        <div className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/50 animate-pulse">
                                            <p className="text-sm font-bold">Philosophenherrschaft: Wähle einen Philosophen für Ansturm</p>
                                        </div>
                                        <button
                                            onClick={handleCancelCast}
                                            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded border border-red-500 text-sm"
                                        >
                                            Zauber abbrechen
                                        </button>
                                    </>
                                )}

                                {viewIsPlayerTurn && selectedMinions?.length && (
                                    <>
                                        <button
                                            onClick={handleAttackPlayer}
                                            className="px-4 py-1 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                        >
                                            <Swords size={14} />
                                            Gegner angreifen {selectedMinions.length > 1 ? `(${selectedMinions.length})` : ''}
                                        </button>

                                        {(() => {
                                            if (selectedMinions.length === 1) {
                                                const minion = viewPlayer.board.find(m => (m.instanceId || m.id) === selectedMinions[0]);
                                                if (minion?.specialAbility && !minion.hasUsedSpecial && !minion.hasAttacked && !minion.specialExhausted) {
                                                    return (
                                                        <button
                                                            onClick={() => handleSpecialClick(selectedMinions[0])}
                                                            className="px-4 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm border border-purple-400"
                                                        >
                                                            <Zap size={14} />
                                                            Effekt
                                                        </button>
                                                    );
                                                }
                                            }
                                            return null;
                                        })()}
                                        {/* show targeting mode indicator */}
                                        {(targetMode === 'nietzsche_target' || targetMode === 'van_inwagen_target') && (
                                            <div className="px-3 py-1 bg-purple-500/30 text-purple-200 rounded-lg border border-purple-400 animate-pulse flex items-center gap-2 text-sm">
                                                <Zap size={14} className="text-purple-400" />
                                                Wähle ein Ziel...
                                            </div>
                                        )}
                                    </>
                                )}

                                {viewIsPlayerTurn && (
                                    <>
                                        {/* Discard mode indicator */}
                                        {targetMode === 'discard' && isMyTargetMode && (
                                            <>
                                                <div className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/50 animate-pulse">
                                                    <p className="text-sm font-bold">Wähle eine Karte zum Abwerfen</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const action: import('../types').GameAction = { type: 'SET_DISCARD_MODE', active: false };
                                                        if (isClient) multiplayer.sendAction(action); else dispatch(action);
                                                    }}
                                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded border border-gray-500 text-sm"
                                                >
                                                    Abbrechen
                                                </button>
                                            </>
                                        )}

                                        {/* Hand full warning + discard button */}
                                        {viewPlayer.hand.length >= 10 && targetMode !== 'discard' && (
                                            <button
                                                onClick={() => {
                                                    const action: import('../types').GameAction = { type: 'SET_DISCARD_MODE', active: true };
                                                    if (isClient) multiplayer.sendAction(action); else dispatch(action);
                                                }}
                                                className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded border border-red-500 text-sm flex items-center gap-1"
                                            >
                                                Karte abwerfen
                                            </button>
                                        )}

                                        {/* End turn button - disabled if hand full and not in discard mode */}
                                        <button
                                            onClick={handleEndTurn}
                                            disabled={viewPlayer.hand.length >= 10}
                                            className={`btn-primary flex items-center gap-2 py-1 text-sm ${viewPlayer.hand.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title={viewPlayer.hand.length >= 10 ? 'Hand voll! Wirf erst eine Karte ab.' : ''}
                                        >
                                            <SkipForward size={16} />
                                            Zug beenden
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Player Board */}
                        <div className="flex-1">
                            <Board
                                minions={viewPlayer.board}
                                onMinionClick={handlePlayerMinionClick}
                                selectedMinionIds={selectedMinions || []}
                                isPlayerBoard={true}
                                activeWork={viewPlayer.activeWork}
                                canTarget={(targetMode === 'gottesbeweis_target' || targetMode === 'trolley_sacrifice' || targetMode === 'arete_target' || targetMode === 'cave_ascent_target' || targetMode === 'deduktion_target' || targetMode === 'induktion_target' || targetMode === 'philosophenherrschaft_target') && !!isMyTargetMode}
                                isSpecialTargeting={(targetMode === 'gottesbeweis_target' || targetMode === 'trolley_sacrifice' || targetMode === 'arete_target' || targetMode === 'cave_ascent_target' || targetMode === 'deduktion_target' || targetMode === 'induktion_target' || targetMode === 'philosophenherrschaft_target') && !!isMyTargetMode}
                                synergiesBlocked={(viewPlayer.synergyBlockTurns || 0) > 0}
                                attacksBlocked={isClient ? (gameState.player.minionAttackBlockTurns || 0) > 0 : (gameState.opponent.minionAttackBlockTurns || 0) > 0}
                                jonasProtection={(viewPlayer.jonasProtectionTurns || 0) > 0}
                                currentTurn={gameState.turn}
                                isMyTurn={viewIsPlayerTurn}
                                attackingMinionIds={attackingMinionIds}
                                ueberichBonus={viewPlayer.ueberichBonusTurn === gameState.turn}
                            />
                        </div>
                    </div>

                    {/* Right Side: Player Stats & Deck (2 cols) - Mirrored from opponent */}
                    <div className="col-span-2 flex flex-col gap-2 h-full overflow-y-auto justify-end pb-36">
                        <div className="ml-auto"><Graveyard cards={viewPlayer.graveyard} title="Dein Friedhof" /></div>
                        <div className="ml-auto"><WorkSlot card={viewPlayer.activeWork} /></div>
                        <PlayerStats player={viewPlayer} />
                    </div>
                </div>

                {/* Visual Deck Pile (Bottom Right) */}
                <div
                    ref={deckRef}
                    className="absolute bottom-6 right-6 z-50 cursor-pointer group"
                    onClick={() => setIsDeckViewOpen(true)}
                >
                    <div className="relative w-24 h-32 rounded-xl shadow-2xl group-hover:-translate-y-2 transition-transform duration-300 overflow-hidden border-2 border-amber-900/50">
                        <img
                            src="/images/deck_icon.jpg"
                            alt="Deck"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="text-center">
                                <span className="text-amber-100 font-bold text-lg drop-shadow-md">{viewPlayer.deck.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Flash Card Overlay */}
                <AnimatePresence>
                    {flashCard && (
                        <motion.div
                            key={flashCard.card.instanceId || 'flash'}
                            initial={{ opacity: 0, scale: 0.5, y: flashCard.position === 'top' ? -100 : 100 }}
                            animate={{ opacity: 1, scale: 1.5, y: 0 }}
                            exit={{ opacity: 0, scale: 2 }}
                            transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                            className={`fixed left-0 right-0 z-[100] flex justify-center pointer-events-none drop-shadow-2xl ${flashCard.position === 'top' ? 'top-[30%]' : 'bottom-[40%]'
                                }`}
                        >
                            <div className="shadow-2xl shadow-cyan-500/50 rounded-xl">
                                <CardComponent card={flashCard.card} isPlayable={false} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hand Overlay - limited height to only cover visible collapsed portion */}
                <div className="absolute bottom-0 left-0 right-0 h-[100px] z-40 flex justify-center items-end overflow-visible">
                    <Hand
                        cards={viewPlayer.hand}
                        onCardClick={handleCardClick}
                        selectedCardId={selectedCard}
                        currentMana={viewPlayer.mana}
                        deckPosition={deckPosition}
                        isDiscardMode={targetMode === 'discard' && isMyTargetMode}
                    />
                </div>
            </div>

            {/* Game Log - Fixed Bottom Left */}
            <GameLog messages={log} />

            {/* Disconnect Modal */}
            {isDisconnected && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
                    <div className="glass-panel p-8 text-center space-y-4 max-w-md">
                        <div className="text-6xl">🔌</div>
                        <h2 className="text-2xl font-bold text-red-400">Verbindung getrennt</h2>
                        <p className="text-gray-300">Der Gegner hat das Spiel verlassen oder die Verbindung wurde unterbrochen.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-lg font-semibold transition-all"
                        >
                            Zurück zur Lobby
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};
