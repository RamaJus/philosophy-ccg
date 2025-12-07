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
        <div className="group/hand flex flex-col items-center transition-all duration-300 transform translate-y-[60%] hover:translate-y-0">
            <div className="flex gap-[-40px] justify-center items-end h-[220px] transition-all duration-300">
                {cards.length === 0 ? (
                    <p className="text-gray-500 italic py-4">Keine Karten</p>
                ) : (
                    cards.map((card, index) => (
                        <div
                            key={card.id}
                            className="transition-all duration-300 transform hover:-translate-y-12 hover:!z-50 hover:scale-110 -ml-8 first:ml-0 pointer-events-auto"
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
    );
};
