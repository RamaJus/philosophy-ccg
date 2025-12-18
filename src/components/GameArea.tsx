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

const MAX_BOARD_SIZE = 7;

interface GameAreaProps {
    mode: 'single' | 'multiplayer_host' | 'multiplayer_client';
    isDebugMode: boolean;
}

export const GameArea: React.FC<GameAreaProps> = ({ mode, isDebugMode }) => {
    const { gameState, dispatch } = useGameLogic(
        mode === 'multiplayer_host' ? 'host' : mode === 'multiplayer_client' ? 'client' : 'single',
        isDebugMode
    );
    const { player, opponent, activePlayer, selectedCard, selectedMinions, gameOver, winner, log, targetMode, targetModeOwner, kontemplationCards, foucaultRevealCards, recurrenceCards, discoveryCards } = gameState;

    // Use ref to always have the latest state in AI callbacks
    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Store the philosophical quote when game ends
    const [philosophicalQuote, setPhilosophicalQuote] = useState<string>('');
    const [isDeckViewOpen, setIsDeckViewOpen] = useState(false);

    useEffect(() => {
        if (gameOver && winner) {
            setPhilosophicalQuote(getRandomQuote(winner === 'player'));
        }
    }, [gameOver, winner]);

    // Auto-open deck view when in search mode (only for the owner)
    const isClient = mode === 'multiplayer_client';

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

    const lastFlashedCardId = useRef<string | null>(null);

    useEffect(() => {
        // Clear flash if no card is pending
        if (!gameState.lastPlayedCard || !gameState.lastPlayedCardPlayerId) {
            setFlashCard(null);
            return;
        }

        // Prevent repeat flash for exact same card instance
        if (lastFlashedCardId.current === (gameState.lastPlayedCard.instanceId || gameState.lastPlayedCard.id)) {
            return;
        }
        lastFlashedCardId.current = gameState.lastPlayedCard.instanceId || gameState.lastPlayedCard.id;

        // Determine position based on who played it relative to view
        const isMe = gameState.lastPlayedCardPlayerId === viewPlayer.id;
        const position = isMe ? 'bottom' : 'top';

        setFlashCard({ card: gameState.lastPlayedCard, position });

        const timer = setTimeout(() => {
            setFlashCard(null);
            // Reset ref after flash completes so same card can flash again if played again
            lastFlashedCardId.current = null;
        }, 1000); // 1 second duration
        return () => clearTimeout(timer);
    }, [gameState.lastPlayedCard, gameState.lastPlayedCardPlayerId]); // Trigger when card changes

    // Auto-start the game on mount (only for single player or host)
    useEffect(() => {
        if (mode !== 'multiplayer_client') {
            dispatch({ type: 'START_GAME' });
        }
    }, []);

    const handleCardClick = (cardId: string) => {
        if (!viewIsPlayerTurn) return;

        if (selectedCard === cardId) {
            dispatch({ type: 'SELECT_CARD', cardId: undefined });
        } else {
            dispatch({ type: 'SELECT_CARD', cardId });
            dispatch({ type: 'PLAY_CARD', cardId });
        }
    };

    const handlePlayerMinionClick = (minionId: string) => {
        if (!viewIsPlayerTurn) return;

        if (targetMode === 'trolley_sacrifice') {
            dispatch({ type: 'TROLLEY_SACRIFICE', minionId });
            return;
        }

        if (targetMode === 'gottesbeweis_target') {
            dispatch({ type: 'GOTTESBEWEIS_TARGET', minionId });
            return;
        }

        // Toggle selection (add/remove from array)
        dispatch({ type: 'SELECT_MINION', minionId, toggle: true });
    };

    const handleOpponentMinionClick = (minionId: string) => {
        if (!viewIsPlayerTurn) return;
        if (!selectedMinions?.length && targetMode !== 'gottesbeweis_target' && targetMode !== 'nietzsche_target' && targetMode !== 'van_inwagen_target') return;

        if (targetMode === 'gottesbeweis_target') {
            dispatch({ type: 'GOTTESBEWEIS_TARGET', minionId });
            return;
        }

        if (targetMode === 'nietzsche_target') {
            dispatch({ type: 'NIETZSCHE_TARGET', minionId });
            return;
        }

        if (targetMode === 'van_inwagen_target') {
            dispatch({ type: 'VAN_INWAGEN_TARGET', minionId });
            return;
        }

        if (!selectedMinions?.length) return;

        // Multi-attack: use all selected minions
        dispatch({ type: 'ATTACK', attackerIds: selectedMinions, targetId: minionId });
    };

    const handleSpecialClick = (minionId: string) => {
        if (!viewIsPlayerTurn) return;
        // Dispatch USE_SPECIAL to enter targeting mode for transform abilities
        dispatch({ type: 'USE_SPECIAL', minionId });
    };

    const handleAttackPlayer = () => {
        if (!viewIsPlayerTurn || !selectedMinions?.length) return;
        dispatch({ type: 'ATTACK', attackerIds: selectedMinions });
    };

    const handleEndTurn = () => {
        if (!viewIsPlayerTurn) return;
        dispatch({ type: 'END_TURN' });

        if (mode === 'single') {
            setTimeout(() => {
                aiTurn();
            }, 1500);
        }
    };

    const handleSearchSelect = (cardId: string) => {
        if (targetMode === 'search') {
            dispatch({ type: 'SEARCH_DECK', cardId });
            setIsDeckViewOpen(false);
        }
    };

    const handleKontemplationSelect = (cardId: string) => {
        dispatch({ type: 'KONTEMPLATION_SELECT', cardId });
    };

    const handleFoucaultClose = () => {
        dispatch({ type: 'FOUCAULT_CLOSE' });
    };

    const handleRecurrenceSelect = (cardId: string) => {
        dispatch({ type: 'RECURRENCE_SELECT', cardId });
    };

    const handleDiscoverySelect = (cardId: string) => {
        dispatch({ type: 'SELECT_DISCOVERY', cardId });
    };

    const aiTurn = () => {
        if (mode !== 'single') return; // No AI in multiplayer

        setTimeout(() => {
            const currentState = gameStateRef.current;
            const aiPlayer = currentState.opponent;
            const humanPlayer = currentState.player;

            if (currentState.activePlayer !== 'opponent' || currentState.gameOver) {
                return;
            }

            // AI Target Logic (for Gottesbeweis etc.)
            if (currentState.targetMode === 'gottesbeweis_target') {
                // Determine target (prioritize human board, fallback to self)
                const targetPool = humanPlayer.board.length > 0 ? humanPlayer.board : aiPlayer.board;
                if (targetPool.length > 0) {
                    const randomTarget = targetPool[Math.floor(Math.random() * targetPool.length)];
                    dispatch({ type: 'GOTTESBEWEIS_TARGET', minionId: randomTarget.instanceId || randomTarget.id });
                    setTimeout(() => aiTurn(), 800);
                    return;
                } else {
                    // No targets? limit case
                    dispatch({ type: 'CANCEL_CAST' });
                    setTimeout(() => aiTurn(), 800);
                    return;
                }
            }

            const playableCards = aiPlayer.hand.filter(c => c.cost <= aiPlayer.mana);
            if (playableCards.length > 0 && aiPlayer.board.length < MAX_BOARD_SIZE) {
                const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
                dispatch({ type: 'PLAY_CARD', cardId: randomCard.instanceId || randomCard.id });

                setTimeout(() => aiTurn(), 800);
                return;
            }

            const attackableMinions = aiPlayer.board.filter(m => m.canAttack && !m.hasAttacked);
            if (attackableMinions.length > 0) {
                const attacker = attackableMinions[Math.floor(Math.random() * attackableMinions.length)];

                if (humanPlayer.board.length > 0 && Math.random() > 0.5) {
                    const target = humanPlayer.board[Math.floor(Math.random() * humanPlayer.board.length)];
                    dispatch({ type: 'ATTACK', attackerIds: [attacker.instanceId || attacker.id], targetId: target.instanceId || target.id });
                } else {
                    dispatch({ type: 'ATTACK', attackerIds: [attacker.instanceId || attacker.id] });
                }

                setTimeout(() => aiTurn(), 800);
                return;
            }

            setTimeout(() => {
                dispatch({ type: 'END_TURN' });
            }, 500);
        }, 500);
    };

    const handleNewGame = () => {
        dispatch({ type: 'START_GAME' });
    };

    return (
        <div className="h-screen w-full overflow-hidden relative">
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'url(/images/menu-background.jpg)',
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
                                        "{philosophicalQuote}"
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
                            dispatch({ type: 'CANCEL_CAST' });
                        }
                    }}
                    onSelectCard={handleSearchSelect}
                    mode={targetMode === 'search' ? 'search' : 'view'}
                />

                {/* Kontemplation Card Selection Modal */}
                {targetMode === 'kontemplation' && isMyTargetMode && kontemplationCards && kontemplationCards.length > 0 && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                        <div className="bg-slate-900 border-2 border-purple-600 rounded-xl p-8 shadow-2xl shadow-purple-900/20">
                            <h2 className="text-3xl font-serif text-purple-400 mb-2 text-center">Kontemplation</h2>
                            <p className="text-purple-200/60 mb-6 font-serif italic text-center">
                                Wähle eine der obersten 3 Karten deines Decks.
                            </p>
                            <div className="flex gap-6 justify-center">
                                {kontemplationCards.map((card) => (
                                    <div
                                        key={card.instanceId || card.id}
                                        className="transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 cursor-pointer"
                                        onClick={() => handleKontemplationSelect(card.instanceId || card.id)}
                                    >
                                        <CardComponent card={card} isPlayable={true} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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

                {/* Main Game Grid - Adjusted for full height */}
                <div className="grid grid-cols-12 gap-2 h-full p-2 pb-24">
                    {/* Left Side: Stats & Graveyard (2 cols) */}
                    <div className="col-span-2 flex flex-col gap-2 h-full overflow-y-auto">
                        <PlayerStats player={viewOpponent} isOpponent={true} />
                        <WorkSlot card={viewOpponent.activeWork} />
                        <Graveyard cards={viewOpponent.graveyard} title="Gegner" />
                        <GameLog messages={log} />
                    </div>

                    {/* Center: Board (8 cols) */}
                    <div className="col-span-8 flex flex-col h-full gap-2">
                        {/* Opponent Board */}
                        <div className="flex-1">
                            <Board
                                minions={viewOpponent.board}
                                onMinionClick={viewIsPlayerTurn && (selectedMinions?.length || targetMode === 'gottesbeweis_target' || targetMode === 'nietzsche_target') ? handleOpponentMinionClick : undefined}
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
                                    targetMode === 'nietzsche_target'
                                )}
                                activeWork={viewOpponent.activeWork}
                                isSpecialTargeting={(() => {
                                    // 1. Explicit Target Modes (Spells)
                                    if (targetMode === 'gottesbeweis_target') return !!isMyTargetMode;
                                    if (targetMode === 'trolley_sacrifice') return !!isMyTargetMode;
                                    if (targetMode === 'nietzsche_target') return !!isMyTargetMode;

                                    // 2. Minion Special Ability Trigger (Implicit Mode)
                                    if (!selectedMinions?.length || selectedMinions.length > 1) return false;
                                    const m = viewPlayer.board.find(min => (min.instanceId || min.id) === selectedMinions[0]);
                                    return !!(m?.specialAbility && !m.hasUsedSpecial && !m.hasAttacked);
                                })()}
                                synergiesBlocked={(viewOpponent.synergyBlockTurns || 0) > 0}
                                attacksBlocked={isClient ? (gameState.player.minionAttackBlockTurns || 0) > 0 : (gameState.opponent.minionAttackBlockTurns || 0) > 0}
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
                                            onClick={() => dispatch({ type: 'CANCEL_CAST' })}
                                            className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded border border-red-500 text-sm"
                                        >
                                            Zauber abbrechen
                                        </button>
                                    </>
                                )}

                                {targetMode === 'kontemplation' && isMyTargetMode && (
                                    <div className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/50 animate-pulse">
                                        <p className="text-sm font-bold">Wähle eine der obersten 3 Karten</p>
                                    </div>
                                )}

                                {targetMode === 'gottesbeweis_target' && isMyTargetMode && (
                                    <>
                                        <div className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/50 animate-pulse">
                                            <p className="text-sm font-bold">Wähle einen Philosophen für den Gottesbeweis</p>
                                        </div>
                                        <button
                                            onClick={() => dispatch({ type: 'CANCEL_CAST' })}
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
                                    <button
                                        onClick={handleEndTurn}
                                        className="btn-primary flex items-center gap-2 py-1 text-sm"
                                    >
                                        <SkipForward size={16} />
                                        Zug beenden
                                    </button>
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
                                canTarget={(targetMode === 'gottesbeweis_target' || targetMode === 'trolley_sacrifice') && !!isMyTargetMode}
                                isSpecialTargeting={(targetMode === 'gottesbeweis_target' || targetMode === 'trolley_sacrifice') && !!isMyTargetMode}
                                synergiesBlocked={(viewPlayer.synergyBlockTurns || 0) > 0}
                                attacksBlocked={isClient ? (gameState.opponent.minionAttackBlockTurns || 0) > 0 : (gameState.player.minionAttackBlockTurns || 0) > 0}
                                currentTurn={gameState.turn}
                            />
                        </div>
                    </div>

                    {/* Right Side: Player Stats & Deck (2 cols) */}
                    <div className="col-span-2 flex flex-col gap-2 h-full overflow-y-auto">
                        <PlayerStats player={viewPlayer} />
                        <div className="ml-auto"><WorkSlot card={viewPlayer.activeWork} /></div>
                        <div className="ml-auto"><Graveyard cards={viewPlayer.graveyard} title="Dein Friedhof" /></div>
                    </div>
                </div>

                {/* Visual Deck Pile (Bottom Right) */}
                <div
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
                    />
                </div>
            </div>
        </div >
    );
};
