import React from 'react';
import { Card } from '../types';
import { Card as CardComponent } from './Card';

interface DeckViewProps {
    deck: Card[];
    isOpen: boolean;
    onClose: () => void;
    onSelectCard?: (cardId: string) => void;
    mode: 'view' | 'search';
}

export const DeckView: React.FC<DeckViewProps> = ({ deck, isOpen, onClose, onSelectCard, mode }) => {
    if (!isOpen) return null;

    // Sort deck alphabetically by name (hides the actual draw order)
    const sortedDeck = [...deck].sort((a, b) => a.name.localeCompare(b.name, 'de'));

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-8">
            <div className="bg-slate-900 border-2 border-amber-600 rounded-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-2xl shadow-amber-900/20">
                <div className="p-6 border-b border-amber-600/30 flex justify-between items-center bg-slate-950/50 rounded-t-xl">
                    <div>
                        <h2 className="text-3xl font-serif text-amber-500">
                            {mode === 'search' ? 'Durchsuche dein Deck' : 'Dein Deck'}
                        </h2>
                        <p className="text-amber-200/60 mt-1 font-serif italic">
                            {mode === 'search'
                                ? 'Wähle eine Karte, um sie auf die Hand zu nehmen.'
                                : `${deck.length} Karten verbleibend (alphabetisch sortiert).`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-amber-500 hover:text-amber-300 transition-colors text-xl font-bold px-4 py-2 border border-amber-600/30 rounded hover:bg-amber-900/20"
                    >
                        Schließen
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {sortedDeck.map((card) => (
                            <div
                                key={card.id}
                                className={`transform transition-all duration-300 ${mode === 'search'
                                    ? 'hover:scale-105 hover:shadow-xl hover:shadow-amber-500/20'
                                    : ''
                                    }`}
                            >
                                <CardComponent
                                    card={card}
                                    isPlayable={mode === 'search'}
                                    onClick={mode === 'search' && onSelectCard ? () => onSelectCard(card.id) : undefined}
                                />
                            </div>
                        ))}
                    </div>

                    {deck.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-amber-700/50">
                            <p className="text-2xl font-serif italic">Das Deck ist leer.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
