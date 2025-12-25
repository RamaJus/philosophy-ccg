import React, { useState, useEffect, useCallback } from 'react';
import { Card as CardType } from '../types';
import { Card as CardComponent } from './Card';
import { cardDatabase } from '../data/cards';

interface GraveyardProps {
    cards: CardType[];
    title: string;
}

// Graveyard pile dimensions (same as work slot for consistency)
const PILE_WIDTH = 96;  // w-24 = 96px
const PILE_HEIGHT = 128; // h-32 = 128px

// Helper function to get the original card from database
// This normalizes transformed cards (Freud Es/Ich/Über-Ich) back to their originals
const getOriginalCard = (card: CardType): CardType => {
    // Map transformation IDs to their original card IDs
    const transformationMapping: Record<string, string> = {
        'freud_es': 'freud',
        'freud_ich': 'freud',
        'freud_ueberich': 'freud',
    };

    // Check if this is a known transformation
    const originalId = transformationMapping[card.id] || card.id;

    // Look up the original card in the database
    const originalCard = cardDatabase.find(c => c.id === originalId);

    if (originalCard) {
        // Return a copy with original stats but keep instanceId for React keys
        return {
            ...originalCard,
            instanceId: card.instanceId,
        };
    }

    // If not found in database (shouldn't happen), return the card as-is
    return card;
};

export const Graveyard: React.FC<GraveyardProps> = ({ cards, title }) => {
    const [isOpen, setIsOpen] = useState(false);

    // ESC key handler
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
            setIsOpen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    // Always render the placeholder to maintain layout position
    // But make it invisible when empty
    if (cards.length === 0) {
        return (
            <div
                style={{ width: `${PILE_WIDTH}px`, height: `${PILE_HEIGHT}px` }}
                className="opacity-0 pointer-events-none"
            />
        );
    }

    // Get the last played card (most recent addition to graveyard)
    const lastPlayedCard = cards[cards.length - 1];

    // Sort cards alphabetically for modal display
    const sortedCards = [...cards].sort((a, b) => {
        const cardA = getOriginalCard(a);
        const cardB = getOriginalCard(b);
        return cardA.name.localeCompare(cardB.name, 'de');
    });

    return (
        <>
            {/* Graveyard Pile - Shows last played card with stack effect */}
            <div
                className="relative cursor-pointer group"
                onClick={() => setIsOpen(true)}
                style={{ width: `${PILE_WIDTH}px`, height: `${PILE_HEIGHT}px` }}
            >
                {/* Stack effect layers (previous cards visible beneath) */}
                {cards.length > 2 && (
                    <div
                        className="absolute bg-slate-800 border border-gray-700 rounded-lg shadow-md"
                        style={{
                            width: `${PILE_WIDTH}px`,
                            height: `${PILE_HEIGHT}px`,
                            top: '6px',
                            left: '6px',
                            zIndex: 1
                        }}
                    />
                )}
                {cards.length > 1 && (
                    <div
                        className="absolute bg-slate-800 border border-gray-600 rounded-lg shadow-md"
                        style={{
                            width: `${PILE_WIDTH}px`,
                            height: `${PILE_HEIGHT}px`,
                            top: '3px',
                            left: '3px',
                            zIndex: 2
                        }}
                    />
                )}

                {/* Top card - the last played card shown face-up */}
                <div
                    className="absolute rounded-lg overflow-hidden border-2 border-gray-600 group-hover:border-gray-400 transition-colors shadow-lg"
                    style={{
                        width: `${PILE_WIDTH}px`,
                        height: `${PILE_HEIGHT}px`,
                        top: 0,
                        left: 0,
                        zIndex: 3
                    }}
                >
                    {/* Card image scaled to fit the graveyard pile size */}
                    <div
                        className="w-full h-full bg-cover bg-center"
                        style={{
                            backgroundImage: `url(${lastPlayedCard.image || '/images/placeholder.png'})`,
                        }}
                    />
                    {/* Slight dark overlay for better visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Card count badge */}
                    <div className="absolute bottom-1 right-1 bg-black/70 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <span className="text-xs font-bold text-gray-300">{cards.length}</span>
                    </div>

                    {/* Hover indicator */}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors flex items-center justify-center">
                        <span className="text-white/0 group-hover:text-white/70 text-xs transition-colors">🔍</span>
                    </div>
                </div>
            </div>

            {/* Modal - Same design as DeckView */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-slate-900 border-2 border-amber-600 rounded-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-2xl shadow-amber-900/20"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-amber-600/30 flex justify-between items-center bg-slate-950/50 rounded-t-xl">
                            <div>
                                <h2 className="text-3xl font-serif text-amber-500">
                                    {title}
                                </h2>
                                <p className="text-amber-200/60 mt-1 font-serif italic">
                                    {cards.length} Karten im Friedhof (alphabetisch sortiert).
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-amber-500 hover:text-amber-300 transition-colors text-xl font-bold px-4 py-2 border border-amber-600/30 rounded hover:bg-amber-900/20"
                            >
                                Schließen
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {sortedCards.map((card, index) => {
                                    // Normalize card to original version with base stats
                                    const normalizedCard = getOriginalCard(card);
                                    return (
                                        <div
                                            key={`${card.instanceId || card.id}-gy-${index}`}
                                            className="transform transition-all duration-300"
                                        >
                                            <CardComponent card={normalizedCard} isPlayable={false} />
                                        </div>
                                    );
                                })}
                            </div>

                            {cards.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-amber-700/50">
                                    <p className="text-2xl font-serif italic">Der Friedhof ist leer.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
