import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OracleCoinFlipProps {
    playerName: string;
    opponentName: string;
    winnerId: 'player' | 'opponent';
    onComplete: () => void;
}

export const OracleCoinFlip: React.FC<OracleCoinFlipProps> = ({
    playerName,
    opponentName,
    winnerId,
    onComplete
}) => {
    const [phase, setPhase] = useState<'smoke' | 'flip' | 'reveal' | 'done'>('smoke');
    const winnerName = winnerId === 'player' ? playerName : opponentName;

    useEffect(() => {
        // Phase timing
        const timers = [
            setTimeout(() => setPhase('flip'), 800),
            setTimeout(() => setPhase('reveal'), 3000),
            setTimeout(() => setPhase('done'), 4500),
            setTimeout(() => onComplete(), 5000),
        ];
        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    // Smoke particles configuration
    const smokeParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 50,
        size: 80 + Math.random() * 120,
        delay: Math.random() * 0.5,
    }));

    return (
        <AnimatePresence>
            {phase !== 'done' && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Dark overlay */}
                    <motion.div
                        className="absolute inset-0 bg-black/80"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                    />

                    {/* Smoke particles */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {smokeParticles.map((particle) => (
                            <motion.div
                                key={particle.id}
                                className="absolute rounded-full"
                                style={{
                                    width: particle.size,
                                    height: particle.size,
                                    left: `calc(50% + ${particle.x}px)`,
                                    bottom: -particle.size,
                                    background: 'radial-gradient(circle, rgba(147,112,219,0.4) 0%, rgba(75,0,130,0.2) 50%, transparent 70%)',
                                    filter: 'blur(30px)',
                                }}
                                initial={{ y: 0, opacity: 0, scale: 0.5 }}
                                animate={{
                                    y: [-100, -400 - particle.y],
                                    opacity: [0, 0.6, 0.4, 0],
                                    scale: [0.5, 1.2, 1.5],
                                    x: [0, particle.x * 2],
                                }}
                                transition={{
                                    duration: 4,
                                    delay: particle.delay,
                                    ease: 'easeOut',
                                    repeat: Infinity,
                                    repeatDelay: 0.5,
                                }}
                            />
                        ))}
                    </div>

                    {/* Coin container */}
                    <div className="relative z-10" style={{ perspective: '1000px' }}>
                        {/* Coin */}
                        <motion.div
                            className="relative w-40 h-40"
                            style={{ transformStyle: 'preserve-3d' }}
                            initial={{ rotateY: 0, scale: 0 }}
                            animate={
                                phase === 'smoke'
                                    ? { rotateY: 0, scale: 0 }
                                    : phase === 'flip'
                                        ? {
                                            rotateY: [0, 1800 + (winnerId === 'player' ? 0 : 180)],
                                            scale: 1
                                        }
                                        : {
                                            rotateY: winnerId === 'player' ? 1800 : 1980,
                                            scale: 1
                                        }
                            }
                            transition={
                                phase === 'flip'
                                    ? {
                                        rotateY: { duration: 2.2, ease: [0.4, 0, 0.2, 1] },
                                        scale: { duration: 0.3, ease: 'easeOut' }
                                    }
                                    : { duration: 0.3 }
                            }
                        >
                            {/* Front side - Owl (Player) */}
                            <div
                                className="absolute inset-0 rounded-full flex items-center justify-center"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    background: 'linear-gradient(145deg, #ffd700, #b8860b, #daa520)',
                                    boxShadow: '0 0 40px rgba(255, 215, 0, 0.5), inset 0 2px 10px rgba(255,255,255,0.3), inset 0 -2px 10px rgba(0,0,0,0.3)',
                                    border: '4px solid #b8860b',
                                }}
                            >
                                <span className="text-7xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                                    🦉
                                </span>
                            </div>

                            {/* Back side - Temple (Opponent) */}
                            <div
                                className="absolute inset-0 rounded-full flex items-center justify-center"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    background: 'linear-gradient(145deg, #c0c0c0, #808080, #a9a9a9)',
                                    boxShadow: '0 0 40px rgba(192, 192, 192, 0.5), inset 0 2px 10px rgba(255,255,255,0.3), inset 0 -2px 10px rgba(0,0,0,0.3)',
                                    border: '4px solid #808080',
                                }}
                            >
                                <span className="text-7xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                                    🏛️
                                </span>
                            </div>

                            {/* Shine effect */}
                            <motion.div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
                                }}
                                animate={{
                                    opacity: phase === 'flip' ? [0, 1, 0] : 0,
                                }}
                                transition={{
                                    duration: 0.3,
                                    repeat: phase === 'flip' ? 7 : 0,
                                    repeatDelay: 0.1,
                                }}
                            />
                        </motion.div>

                        {/* Glow effect */}
                        <motion.div
                            className="absolute inset-0 rounded-full -z-10"
                            style={{
                                background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
                                filter: 'blur(20px)',
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={
                                phase !== 'smoke'
                                    ? { scale: 2, opacity: 1 }
                                    : { scale: 0, opacity: 0 }
                            }
                            transition={{ duration: 0.5 }}
                        />
                    </div>

                    {/* Reveal text */}
                    <AnimatePresence>
                        {phase === 'reveal' && (
                            <motion.div
                                className="absolute bottom-1/4 text-center z-20"
                                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <motion.p
                                    className="text-lg text-purple-300 mb-2 tracking-widest uppercase"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    Die Pythia verkündet
                                </motion.p>
                                <motion.h2
                                    className="text-4xl font-bold"
                                    style={{
                                        fontFamily: 'Cinzel, serif',
                                        background: 'linear-gradient(180deg, #ffd700 0%, #ff8c00 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        textShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                                    }}
                                    initial={{ scale: 1.1 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                >
                                    {winnerName} beginnt!
                                </motion.h2>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
