import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
            <div className="flex gap-[-40px] justify-center items-end h-[220px] relative">
                <AnimatePresence mode="popLayout">
                    {cards.length === 0 ? (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-gray-500 italic py-4 absolute top-0 w-full text-center"
                        >
                            Keine Karten
                        </motion.p>
                    ) : (
                        cards.map((card, index) => {
                            const offset = index - (cards.length - 1) / 2;
                            const rotationDeg = offset * 4; // Fan rotation per card offset
                            // Compensate for mana circle shift due to rotation
                            // Mana circle is ~50px left and ~152px above the bottom-center pivot
                            // delta_y ≈ 0.87 * angle (degrees) for small angles
                            const yCompensation = rotationDeg * 1.0 + Math.abs(offset) * 0.5;

                            return (
                                <motion.div
                                    layout
                                    key={card.instanceId || card.id}
                                    initial={{ opacity: 0, y: 100, scale: 0.5, rotate: -10 }}
                                    animate={{
                                        opacity: 1,
                                        y: yCompensation,
                                        scale: 1,
                                        rotate: rotationDeg,
                                        zIndex: index + 1
                                    }}
                                    exit={{ opacity: 0, y: -100, scale: 0.5, transition: { duration: 0.2 } }}
                                    whileHover={{
                                        y: -80,
                                        scale: 1.2,
                                        rotate: 0,
                                        zIndex: 100,
                                        transition: { duration: 0.2 }
                                    }}
                                    className="-ml-8 first:ml-0 pointer-events-auto origin-bottom"
                                >
                                    <Card
                                        card={card}
                                        onClick={() => onCardClick(card.instanceId || card.id)}
                                        isSelected={selectedCardId === (card.instanceId || card.id)}
                                        isPlayable={card.cost <= currentMana}
                                    />
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
