import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, SkipForward } from 'lucide-react';

const TRACKS = [
    '/music/background1.mp3',
    '/music/background2.mp3',
    '/music/background3.mp3',
    '/music/background4.mp3',
    '/music/background5.mp3',
    '/music/background6.mp3',
];

interface BackgroundMusicProps {
    volume?: number;
}

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({
    volume = 0.5
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(() =>
        Math.floor(Math.random() * TRACKS.length)
    );
    const audioRef = useRef<HTMLAudioElement>(null);

    // Get a random different track
    const getNextTrackIndex = useCallback(() => {
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * TRACKS.length);
        } while (nextIndex === currentTrackIndex && TRACKS.length > 1);
        return nextIndex;
    }, [currentTrackIndex]);

    // Skip to next track
    const skipTrack = useCallback(() => {
        setCurrentTrackIndex(getNextTrackIndex());
    }, [getNextTrackIndex]);

    // Handle track end - play next random track
    const handleTrackEnd = useCallback(() => {
        skipTrack();
    }, [skipTrack]);

    // Try to play on first user interaction (bypass autoplay restrictions)
    useEffect(() => {
        const startPlayback = async () => {
            if (audioRef.current && !isPlaying) {
                audioRef.current.volume = volume;
                audioRef.current.muted = isMuted;
                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch {
                    // Still blocked, will try again on next interaction
                }
            }
        };

        // Try autoplay immediately
        startPlayback();

        // Also listen for first user interaction
        const handleInteraction = () => {
            startPlayback();
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };

        document.addEventListener('click', handleInteraction);
        document.addEventListener('keydown', handleInteraction);

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
    }, [volume, isMuted, isPlaying]);

    // Play audio when track changes (for skip functionality)
    useEffect(() => {
        if (isPlaying && audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.muted = isMuted;
            audioRef.current.play().catch(() => { });
        }
    }, [currentTrackIndex, volume, isMuted, isPlaying]);

    const toggleMute = () => {
        if (audioRef.current) {
            if (!isPlaying) {
                audioRef.current.play();
                setIsPlaying(true);
            }
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleSkipClick = () => {
        skipTrack();
    };

    return (
        <>
            <audio
                ref={audioRef}
                src={TRACKS[currentTrackIndex]}
                onEnded={handleTrackEnd}
            />

            {/* Music Controls - Fixed bottom left */}
            <div className="fixed bottom-4 left-4 z-50 flex gap-2">
                {/* Skip Button */}
                <button
                    onClick={handleSkipClick}
                    className="bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-sm rounded-full p-3 text-white shadow-lg transition-all duration-200 hover:scale-110"
                    title="Nächstes Lied"
                >
                    <SkipForward size={20} />
                </button>

                {/* Mute/Unmute Button */}
                <button
                    onClick={toggleMute}
                    className="bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-sm rounded-full p-3 text-white shadow-lg transition-all duration-200 hover:scale-110"
                    title={isMuted ? 'Musik einschalten' : 'Musik ausschalten'}
                >
                    {isMuted ? (
                        <VolumeX size={20} />
                    ) : (
                        <Volume2 size={20} />
                    )}
                </button>
            </div>
        </>
    );
};
