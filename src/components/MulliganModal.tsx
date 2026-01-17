import React from 'react';
import { motion } from 'framer-motion';
import { Card as CardComponent } from './Card';
import { Card } from '../types';
import { RefreshCw, Check } from 'lucide-react';

interface MulliganModalProps {
    hand: Card[];
    onKeep: () => void;
    onRedraw: () => void;
    isWaiting: boolean; // True if player has decided but waiting for opponent
}

export const MulliganModal: React.FC<MulliganModalProps> = ({
    hand,
    onKeep,
    onRedraw,
    isWaiting
}) => {
    return (
        <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Content */}
            <motion.div
                className="relative z-10 flex flex-col items-center gap-6 p-8 max-w-4xl"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
                {/* Title */}
                <div className="text-center">
                    <h2
                        className="text-3xl font-bold mb-2"
                        style={{
                            fontFamily: 'Cinzel, Georgia, serif',
                            background: 'linear-gradient(180deg, #ffd700 0%, #daa520 50%, #b8860b 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Deine Starthand
                    </h2>
                    <p className="text-amber-200/80 text-sm">
                        {isWaiting ? 'Warte auf Gegner...' : 'Möchtest du diese Karten behalten oder neu ziehen?'}
                    </p>
                </div>

                {/* Cards Display */}
                <div className="flex gap-4 justify-center flex-wrap">
                    {hand.map((card, index) => (
                        <motion.div
                            key={card.instanceId || card.id}
                            initial={{ opacity: 0, y: 30, rotateY: -90 }}
                            animate={{ opacity: 1, y: 0, rotateY: 0 }}
                            transition={{
                                delay: index * 0.15,
                                type: 'spring',
                                damping: 15
                            }}
                            className="transform hover:scale-105 transition-transform"
                            style={{ perspective: '1000px' }}
                        >
                            <CardComponent
                                card={card}
                                isPlayable={!isWaiting}
                            />
                        </motion.div>
                    ))}
                </div>

                {/* Buttons */}
                {!isWaiting ? (
                    <motion.div
                        className="flex gap-4 mt-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <button
                            onClick={onRedraw}
                            className="px-6 py-3 bg-amber-700/80 hover:bg-amber-600 text-white rounded-lg 
                                     transition-all flex items-center gap-2 border border-amber-500/50
                                     hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
                        >
                            <RefreshCw size={18} />
                            Neu ziehen
                        </button>
                        <button
                            onClick={onKeep}
                            className="px-6 py-3 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg 
                                     transition-all flex items-center gap-2 border border-emerald-500/50
                                     hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20"
                        >
                            <Check size={18} />
                            Behalten
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        className="flex items-center gap-3 text-amber-300/70 mt-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                            <RefreshCw size={20} />
                        </motion.div>
                        <span>Warte auf Gegner...</span>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
};
