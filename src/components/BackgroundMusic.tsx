import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface BackgroundMusicProps {
    audioFile?: string;
    volume?: number;
}

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({
    audioFile = '/music/background.mp3',
    volume = 0.5
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        // Try to play music when component mounts
        // This might fail due to browser autoplay policy
        const playAudio = async () => {
            if (audioRef.current) {
                audioRef.current.volume = volume; // Set volume to 50%
                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch (error) {
                    console.log('Autoplay prevented. User interaction required.');
                }
            }
        };
        playAudio();
    }, [volume]);

    const toggleMute = () => {
        if (audioRef.current) {
            if (!isPlaying) {
                // If not playing yet, start playing
                audioRef.current.play();
                setIsPlaying(true);
            }
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <>
            <audio
                ref={audioRef}
                loop
                src={audioFile}
            />

            {/* Mute/Unmute Button */}
            <button
                onClick={toggleMute}
                className="fixed top-4 right-4 z-50 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-sm rounded-full p-3 text-white shadow-lg transition-all duration-200 hover:scale-110"
                title={isMuted ? 'Musik einschalten' : 'Musik ausschalten'}
            >
                {isMuted ? (
                    <VolumeX size={20} />
                ) : (
                    <Volume2 size={20} />
                )}
            </button>
        </>
    );
};
