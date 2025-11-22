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
        <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold mb-2 text-center text-gray-300">Your Hand</h3>
            <div className="flex gap-2 justify-center flex-wrap">
                {cards.length === 0 ? (
                    <p className="text-gray-500 italic py-4">No cards in hand</p>
                ) : (
                    cards.map((card) => (
                        <Card
                            key={card.id}
                            card={card}
                            onClick={() => onCardClick(card.id)}
                            isSelected={selectedCardId === card.id}
                            isPlayable={card.cost <= currentMana}
                            className="transform transition-transform hover:-translate-y-2"
                        />
                    ))
                )}
            </div>
        </div>
    );
};
