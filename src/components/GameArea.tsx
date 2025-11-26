import React, { useEffect, useRef, useState } from 'react';
import { useGameLogic } from '../hooks/useGameLogic';
import { PlayerStats } from './PlayerStats';
import { Hand } from './Hand';
import { Board } from './Board';
import { GameLog } from './GameLog';
import { Graveyard } from './Graveyard';
import { DeckView } from './DeckView';
import { WorkSlot } from './WorkSlot';
import { Swords, SkipForward, RotateCcw, Trophy, Library } from 'lucide-react';
import { getRandomQuote } from '../data/quotes';

const MAX_BOARD_SIZE = 7;

interface GameAreaProps {
    mode: 'single' | 'multiplayer_host' | 'multiplayer_client';
}

export const GameArea: React.FC<GameAreaProps> = ({ mode }) => {
    const { gameState, dispatch } = useGameLogic(mode);
    const { player, opponent, activePlayer, selectedCard, selectedMinion, gameOver, winner, log, targetMode } = gameState;

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

    // Auto-open deck view when in search mode
    useEffect(() => {
        if (targetMode === 'search') {
            setIsDeckViewOpen(true);
        }
    }, [targetMode]);

    // In multiplayer client mode, we are the 'opponent' from the host's perspective, but we want to see ourselves as 'player'
    // This is tricky. The simplest way for P2P is:
    // Host: Player = Host, Opponent = Client
    // Client: Player = Client, Opponent = Host
    // BUT our state is synchronized from Host.
    // So if Host says "Player", it means Host.
    // If we are Client, we need to swap the view.

    const isClient = mode === 'multiplayer_client';

    // View Transformation for Client
    const viewPlayer = isClient ? opponent : player;
    const viewOpponent = isClient ? player : opponent;
    const viewIsPlayerTurn = isClient ? activePlayer === 'opponent' : activePlayer === 'player';

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

        if (selectedMinion === minionId) {
            dispatch({ type: 'SELECT_MINION', minionId: undefined });
        } else {
            dispatch({ type: 'SELECT_MINION', minionId });
        }
    };

    const handleOpponentMinionClick = (minionId: string) => {
        if (!viewIsPlayerTurn || !selectedMinion) return;
        dispatch({ type: 'ATTACK', attackerId: selectedMinion, targetId: minionId });
    };

    const handleAttackPlayer = () => {
        if (!viewIsPlayerTurn || !selectedMinion) return;
        dispatch({ type: 'ATTACK', attackerId: selectedMinion });
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

    const aiTurn = () => {
        if (mode !== 'single') return; // No AI in multiplayer

        setTimeout(() => {
            const currentState = gameStateRef.current;
            const aiPlayer = currentState.opponent;
            const humanPlayer = currentState.player;

            if (currentState.activePlayer !== 'opponent' || currentState.gameOver) {
                return;
            }

            const playableCards = aiPlayer.hand.filter(c => c.cost <= aiPlayer.mana);
            if (playableCards.length > 0 && aiPlayer.board.length < MAX_BOARD_SIZE) {
                const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
                dispatch({ type: 'PLAY_CARD', cardId: randomCard.id });

                setTimeout(() => aiTurn(), 800);
                return;
            }

            const attackableMinions = aiPlayer.board.filter(m => m.canAttack && !m.hasAttacked);
            if (attackableMinions.length > 0) {
                const attacker = attackableMinions[Math.floor(Math.random() * attackableMinions.length)];

                if (humanPlayer.board.length > 0 && Math.random() > 0.5) {
                    const target = humanPlayer.board[Math.floor(Math.random() * humanPlayer.board.length)];
                    dispatch({ type: 'ATTACK', attackerId: attacker.id, targetId: target.id });
                } else {
                    dispatch({ type: 'ATTACK', attackerId: attacker.id });
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
        <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
            {/* Header removed for laptop optimization */}

            {gameOver && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="glass-panel p-8 max-w-lg text-center space-y-4">
                        <Trophy size={64} className="mx-auto text-amber-400 animate-bounce" />
                        <h2 className="text-3xl font-bold">
                            {winner === 'player' ? '🎉 Sieg!' : '💀 Niederlage'}
                        </h2>
                        <p className="text-gray-300 text-lg">
                            {winner === 'player'
                                ? 'Deine philosophischen Argumente haben gesiegt!'
                                : 'Die Logik des Gegners war zu stark.'}
                        </p>
                        <div className="border-t border-b border-amber-500/30 py-4 my-4">
                            <p className="text-amber-200 italic text-sm leading-relaxed">
                                {philosophicalQuote}
                            </p>
                        </div>
                        <button onClick={handleNewGame} className="btn-primary">
                            <RotateCcw size={20} className="inline mr-2" />
                            Neues Spiel
                        </button>
                    </div>
                </div>
            )}

            <DeckView
                deck={viewPlayer.deck}
                isOpen={isDeckViewOpen}
                onClose={() => setIsDeckViewOpen(false)}
                onSelectCard={handleSearchSelect}
                mode={targetMode === 'search' ? 'search' : 'view'}
            />

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
                            onMinionClick={viewIsPlayerTurn && selectedMinion ? handleOpponentMinionClick : undefined}
                            canTarget={viewIsPlayerTurn && !!selectedMinion}
                            activeWork={viewOpponent.activeWork}
                        />
                    </div>

                    {/* Turn Controls */}
                    <div className="glass-panel p-2 text-center shrink-0">
                        <div className="flex items-center justify-center gap-4">
                            <div className={`px-4 py-1 rounded-lg ${viewIsPlayerTurn ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                <p className="text-sm font-semibold">Runde {gameState.turn}</p>
                                <p className="text-xs">{viewIsPlayerTurn ? 'Dein Zug' : 'Gegner-Zug'}</p>
                            </div>

                            {viewIsPlayerTurn && selectedMinion && (
                                <button
                                    onClick={handleAttackPlayer}
                                    className="px-4 py-1 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                >
                                    <Swords size={14} />
                                    Gegner angreifen
                                </button>
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
                            selectedMinionId={selectedMinion}
                            isPlayerBoard={true}
                            activeWork={viewPlayer.activeWork}
                        />
                    </div>
                </div>

                {/* Right Side: Player Stats & Deck (2 cols) */}
                <div className="col-span-2 flex flex-col gap-2 h-full overflow-y-auto">
                    <PlayerStats player={viewPlayer} />
                    <div className="w-full flex justify-center">
                        <button
                            onClick={() => setIsDeckViewOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-600/30 rounded-lg text-amber-200 transition-colors text-sm"
                        >
                            <Library size={14} />
                            Deck ({viewPlayer.deck.length})
                        </button>
                    </div>
                    <WorkSlot card={viewPlayer.activeWork} />
                    <Graveyard cards={viewPlayer.graveyard} title="Dein Friedhof" />
                </div>
            </div>

            {/* Hand Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
                <div className="pointer-events-auto">
                    <Hand
                        cards={viewPlayer.hand}
                        onCardClick={handleCardClick}
                        selectedCardId={selectedCard}
                        currentMana={viewPlayer.mana}
                    />
                </div>
            </div>
        </div>
    );
};
