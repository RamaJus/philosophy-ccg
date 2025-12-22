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
                            // Calculate offset from center (symmetric: -2, -1, 0, 1, 2 for 5 cards)
                            const center = (cards.length - 1) / 2;
                            const offset = index - center;

                            // Rotation: 3 degrees per unit
                            const rotationDeg = offset * 3;

                            // X-offset: Symmetric positioning logic with fixed overlap
                            const xOffset = offset * 100;

                            // Y-Offset Calculation to fix visual asymmetry:
                            // 1. Arc effect: |offset| * 5 (lower outer cards)
                            // 2. Geometric correction: offset * 2
                            //    - Counteracts the natural drop of the top-left corner when rotating left.
                            // 3. Global lift: -40px (1cm) to raise the entire fan
                            const yOffset = (Math.abs(offset) * 5) + (offset * 2) - 36;

                            return (
                                <motion.div
                                    layout
                                    key={card.instanceId || card.id}
                                    initial={{ opacity: 0, x: 500, y: 100, scale: 0.2, rotate: 20 }}
                                    animate={{
                                        opacity: 1,
                                        x: xOffset,
                                        y: yOffset,
                                        scale: 1,
                                        rotate: rotationDeg,
                                        zIndex: index // Standard stacking: right cards on top of left cards
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 20,
                                        duration: 0.5
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: -200,
                                        x: 0,
                                        scale: 0.3,
                                        rotate: 0,
                                        transition: { duration: 0.3, ease: "easeIn" }
                                    }}
                                    whileHover={{
                                        y: -80,
                                        scale: 1.2,
                                        rotate: 0,
                                        zIndex: 100,
                                        transition: { duration: 0.2 }
                                    }}
                                    className="absolute pointer-events-auto origin-bottom"
                                    style={{ left: '50%', marginLeft: '-70px' }} // Center the card (half of 140px width)
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
