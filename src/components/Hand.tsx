import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card as CardType } from '../types';
import { Card } from './Card';

interface HandProps {
    cards: CardType[];
    onCardClick: (cardId: string) => void;
    selectedCardId?: string;
    currentMana: number;
    deckPosition?: { x: number, y: number } | null;
}

export const Hand: React.FC<HandProps> = ({ cards, onCardClick, selectedCardId, currentMana, deckPosition }) => {
    return (
        <div className="group/hand flex flex-col items-center transition-all duration-300 transform translate-y-[65%] hover:translate-y-[8px]">
            <div className="flex gap-[-40px] justify-center items-end h-[220px] relative" style={{ perspective: '1000px' }}>
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

                            // Calculate start position relative to deck
                            // Hand center x is roughly window.innerWidth / 2
                            // Hand bottom y is roughly window.innerHeight
                            // We need to calculate the delta to the deck
                            const handCenterX = window.innerWidth / 2;
                            const handBottomY = window.innerHeight; // Approximate bottom since Hand is at bottom: 0

                            let initialX = 500; // Fallback
                            let initialY = 200; // Fallback

                            if (deckPosition) {
                                // Calculate vector from Hand Center to Deck
                                // We want the CARD (at xOffset, yOffset) to look like it comes from the DECK
                                // So initial position + final position should align?
                                // No, 'x' in motion is translation from natural position (center of hand)
                                // So we want: initial X = deckPosition.x - handCenterX - xOffset? No, - xOffset is handled by layout?
                                // Actually, if we set 'x' property, it overrides layout?
                                // Just translation.

                                // Vector from Hand Center to Deck Center
                                const deltaX = deckPosition.x - handCenterX;
                                const deltaY = deckPosition.y - handBottomY;

                                // We want initial render to be AT the deck.
                                initialX = deltaX;
                                initialY = deltaY;
                            }

                            return (
                                <motion.div
                                    layout
                                    key={card.instanceId || card.id}
                                    initial={{
                                        opacity: 0,
                                        x: initialX,
                                        y: initialY,
                                        scale: 0.1,
                                        rotate: -45 + (Math.random() * 90), // Random rotation on deck
                                        rotateY: 180 // Face down
                                    }}
                                    animate={{
                                        opacity: 1,
                                        x: xOffset,
                                        y: yOffset,
                                        scale: 1,
                                        rotate: rotationDeg,
                                        rotateY: 0, // Face up
                                        zIndex: index
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 20,
                                        mass: 1,
                                        duration: 0.8,
                                        delay: index * 0.1 // Stagger based on index
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
                                    className="absolute pointer-events-auto origin-bottom preserve-3d"
                                    style={{
                                        left: '50%',
                                        marginLeft: '-70px',
                                        transformStyle: 'preserve-3d',
                                        perspective: '1000px'
                                    }}
                                >
                                    {/* Front of Card */}
                                    <div className="backface-hidden" style={{ backfaceVisibility: 'hidden' }}>
                                        <Card
                                            card={card}
                                            onClick={() => onCardClick(card.instanceId || card.id)}
                                            isSelected={selectedCardId === (card.instanceId || card.id)}
                                            isPlayable={card.cost <= currentMana}
                                        />
                                    </div>

                                    {/* Back of Card */}
                                    <div
                                        className="absolute inset-0 backface-hidden rounded-xl border-2 border-amber-900/50 overflow-hidden shadow-xl"
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            transform: 'rotateY(180deg)',
                                            width: '140px',
                                            height: '200px',
                                            backgroundColor: '#1e1a17'
                                        }}
                                    >
                                        <img
                                            src="/images/deck_icon.jpg"
                                            alt="Card Back"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
