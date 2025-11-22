import React, { useState } from 'react';
import { Card as CardType } from '../types';
import { Skull, X } from 'lucide-react';
import { Card } from './Card';

interface GraveyardProps {
    cards: CardType[];
    title: string;
}

export const Graveyard: React.FC<GraveyardProps> = ({ cards, title }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (cards.length === 0) {
        return (
            <div className="w-24 h-32 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center opacity-50">
                <Skull size={24} className="text-gray-500 mb-2" />
                <span className="text-xs text-gray-500">Friedhof leer</span>
            </div>
        );
    }

    return (
        <>
            {/* Graveyard Pile */}
            <div
                className="w-24 h-32 bg-slate-900 border-2 border-gray-600 rounded-lg relative cursor-pointer hover:border-gray-400 transition-colors group"
                onClick={() => setIsOpen(true)}
            >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Skull size={32} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                    <span className="text-xs text-gray-400 mt-2 font-bold">{cards.length} Karten</span>
                </div>
                {/* Stack effect */}
                {cards.length > 1 && (
                    <div className="absolute -bottom-1 -right-1 w-full h-full bg-slate-800 border-2 border-gray-700 rounded-lg -z-10"></div>
                )}
            </div>

            {/* Modal */}
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
