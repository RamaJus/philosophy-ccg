import React, { useEffect, useState, useMemo } from 'react';
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
    const [phase, setPhase] = useState<'enter' | 'flip' | 'reveal' | 'done'>('enter');
    const winnerName = winnerId === 'player' ? playerName : opponentName;

    useEffect(() => {
        // Phase timing - slower, more elegant
        const timers = [
            setTimeout(() => setPhase('flip'), 600),
            setTimeout(() => setPhase('reveal'), 3500),
            setTimeout(() => setPhase('done'), 5500),
            setTimeout(() => onComplete(), 6000),
        ];
        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    // Golden dust particles - stable configuration
    const dustParticles = useMemo(() =>
        Array.from({ length: 40 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 2 + Math.random() * 4,
            delay: Math.random() * 3,
            duration: 3 + Math.random() * 4,
            opacity: 0.3 + Math.random() * 0.5,
        }))
        , []);

    return (
        <AnimatePresence>
            {phase !== 'done' && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Dark overlay with vignette */}
                    <motion.div
                        className="absolute inset-0"
                        style={{
                            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.95) 100%)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                    />

                    {/* Golden dust particles */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {dustParticles.map((particle) => (
                            <motion.div
                                key={particle.id}
                                className="absolute rounded-full"
                                style={{
                                    width: particle.size,
                                    height: particle.size,
                                    left: `${particle.x}%`,
                                    top: `${particle.y}%`,
                                    background: 'radial-gradient(circle, rgba(255,215,0,1) 0%, rgba(218,165,32,0.8) 50%, transparent 100%)',
                                    boxShadow: '0 0 6px rgba(255,215,0,0.6)',
                                }}
                                animate={{
                                    y: [0, -30, 0],
                                    opacity: [0, particle.opacity, particle.opacity * 0.5, 0],
                                    scale: [0.5, 1, 0.8],
                                }}
                                transition={{
                                    duration: particle.duration,
                                    delay: particle.delay,
                                    ease: 'easeInOut',
                                    repeat: Infinity,
                                }}
                            />
                        ))}
                    </div>

                    {/* Ambient glow from above */}
                    <motion.div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64"
                        style={{
                            background: 'radial-gradient(ellipse at top, rgba(255,200,100,0.15) 0%, transparent 70%)',
                            filter: 'blur(40px)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5 }}
                    />

                    {/* Pythia Left */}
                    <motion.div
                        className="absolute left-0 bottom-0 h-[72%] w-auto pointer-events-none"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{
                            opacity: phase !== 'enter' ? 0.7 : 0,
                            x: phase !== 'enter' ? 0 : -50
                        }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                    >
                        <img
                            src="/images/pythia-right-dark.png"
                            alt=""
                            className="h-full w-auto object-contain object-left-bottom"
                            style={{
                                filter: 'brightness(0.6)',
                                maskImage: 'linear-gradient(to right, black 40%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to right, black 40%, transparent 100%)',
                            }}
                        />
                    </motion.div>

                    {/* Pythia Right */}
                    <motion.div
                        className="absolute right-0 bottom-0 h-[72%] w-auto pointer-events-none"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{
                            opacity: phase !== 'enter' ? 0.7 : 0,
                            x: phase !== 'enter' ? 0 : 50
                        }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
                    >
                        <img
                            src="/images/pythia-left-dark.png"
                            alt=""
                            className="h-full w-auto object-contain object-right-bottom"
                            style={{
                                filter: 'brightness(0.6)',
                                maskImage: 'linear-gradient(to left, black 40%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent 100%)',
                            }}
                        />
                    </motion.div>

                    {/* Coin container */}
                    <div className="relative z-10" style={{ perspective: '1200px' }}>
                        {/* Coin */}
                        <motion.div
                            className="relative w-48 h-48"
                            style={{ transformStyle: 'preserve-3d' }}
                            initial={{ rotateY: 0, scale: 0.3, opacity: 0 }}
                            animate={
                                phase === 'enter'
                                    ? { rotateY: 0, scale: 0.3, opacity: 0 }
                                    : phase === 'flip'
                                        ? {
                                            rotateY: [0, 1440 + (winnerId === 'player' ? 0 : 180)],
                                            scale: 1,
                                            opacity: 1
                                        }
                                        : {
                                            rotateY: winnerId === 'player' ? 1440 : 1620,
                                            scale: 1,
                                            opacity: 1
                                        }
                            }
                            transition={
                                phase === 'flip'
                                    ? {
                                        rotateY: { duration: 2.8, ease: [0.25, 0.1, 0.25, 1] },
                                        scale: { duration: 0.5, ease: 'easeOut' },
                                        opacity: { duration: 0.3 }
                                    }
                                    : { duration: 0.5 }
                            }
                        >
                            {/* Front side - Owl (Player wins) */}
                            <div
                                className="absolute inset-0 rounded-full overflow-hidden"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    boxShadow: '0 0 60px rgba(218,165,32,0.4), 0 4px 20px rgba(0,0,0,0.5)',
                                }}
                            >
                                <img
                                    src="/images/coin-owl-s.png"
                                    alt="Owl"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Back side - Temple (Opponent wins) */}
                            <div
                                className="absolute inset-0 rounded-full overflow-hidden"
                                style={{
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    boxShadow: '0 0 60px rgba(218,165,32,0.4), 0 4px 20px rgba(0,0,0,0.5)',
                                }}
                            >
                                <img
                                    src="/images/coin-temple.jpg"
                                    alt="Temple"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Subtle shine sweep during rotation */}
                            <motion.div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                                }}
                                animate={{
                                    opacity: phase === 'flip' ? [0, 0.8, 0] : 0,
                                }}
                                transition={{
                                    duration: 0.4,
                                    repeat: phase === 'flip' ? 6 : 0,
                                    repeatDelay: 0.05,
                                }}
                            />
                        </motion.div>

                        {/* Golden glow behind coin */}
                        <motion.div
                            className="absolute inset-0 rounded-full -z-10"
                            style={{
                                background: 'radial-gradient(circle, rgba(218,165,32,0.3) 0%, rgba(255,200,100,0.1) 40%, transparent 70%)',
                                filter: 'blur(25px)',
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={
                                phase !== 'enter'
                                    ? { scale: 2.5, opacity: 1 }
                                    : { scale: 0, opacity: 0 }
                            }
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>

                    {/* Reveal text */}
                    <AnimatePresence>
                        {phase === 'reveal' && (
                            <motion.div
                                className="absolute bottom-1/4 text-center z-20"
                                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <motion.p
                                    className="text-lg mb-3 tracking-[0.3em] uppercase"
                                    style={{
                                        color: 'rgba(218,165,32,0.8)',
                                        textShadow: '0 0 20px rgba(218,165,32,0.3)',
                                    }}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.6 }}
                                >
                                    Die Pythia verkündet
                                </motion.p>
                                <motion.h2
                                    className="text-5xl font-bold"
                                    style={{
                                        fontFamily: 'Cinzel, Georgia, serif',
                                        background: 'linear-gradient(180deg, #ffd700 0%, #daa520 50%, #b8860b 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))',
                                    }}
                                    initial={{ scale: 1.15, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
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
