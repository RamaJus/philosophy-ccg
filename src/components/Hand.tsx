import React from 'react';
import { Card as CardType } from '../types';
import { Card } from './Card';

interface HandProps {
    cards: CardType[];
    onCardClick: (cardId: string) => void;
    selectedCardId?: string;
    currentMana: number;
}

export const Hand: React.FC<HandProps> = ({ cards, onCardClick, selectedCardId, currentMana }) => {
    return (
        <div className="group flex flex-col items-center transition-all duration-300 transform translate-y-[66%] hover:translate-y-0">
            <div className="glass-panel px-8 py-4 bg-slate-900/90 backdrop-blur-md rounded-t-2xl border-t border-slate-700 shadow-2xl">
                <h3 className="text-xs font-semibold mb-2 text-center text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Deine Hand</h3>
                <div className="flex gap-[-40px] justify-center items-end h-[160px] group-hover:h-[220px] transition-all duration-300">
                    {cards.length === 0 ? (
                        <p className="text-gray-500 italic py-4">Keine Karten</p>
                    ) : (
                        cards.map((card, index) => (
                            <div
                                key={card.id}
                                className="transition-all duration-300 transform hover:-translate-y-12 hover:z-20 hover:scale-110 -ml-8 first:ml-0"
                                style={{ zIndex: index }}
                            >
                                <Card
                                    card={card}
                                    onClick={() => onCardClick(card.id)}
                                    isSelected={selectedCardId === card.id}
                                    isPlayable={card.cost <= currentMana}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
