import React, { useState } from 'react';
import { Card as CardType } from '../types';
import { Skull, X } from 'lucide-react';
import { Card } from './Card';

interface GraveyardProps {
    cards: CardType[];
    title: string;
}

// Graveyard pile dimensions (same as work slot for consistency)
const PILE_WIDTH = 96;  // w-24 = 96px
const PILE_HEIGHT = 128; // h-32 = 128px

export const Graveyard: React.FC<GraveyardProps> = ({ cards, title }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Hide completely when no cards are present
    if (cards.length === 0) {
        return null;
    }

    // Get the last played card (most recent addition to graveyard)
    const lastPlayedCard = cards[cards.length - 1];

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
                        <Skull size={12} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-300">{cards.length}</span>
                    </div>

                    {/* Hover indicator */}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors flex items-center justify-center">
                        <span className="text-white/0 group-hover:text-white/70 text-xs transition-colors">🔍</span>
                    </div>
                </div>
            </div>

            {/* Modal - Full graveyard view */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
                    <div className="bg-slate-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                                <Skull size={24} />
                                {title} ({cards.length})
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {cards.map((card, index) => (
                                <div key={`${card.id}-gy-${index}`} className="scale-75 origin-top-left">
                                    <Card card={card} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
