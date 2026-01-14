import React, { useState, useRef } from 'react';

interface IntroTrailerProps {
    onComplete: () => void;
}

export const IntroTrailer: React.FC<IntroTrailerProps> = ({ onComplete }) => {
    const [videoEnded, setVideoEnded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleVideoEnd = () => {
        setVideoEnded(true);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
            {/* Video Container */}
            <div className="relative w-full h-full flex items-center justify-center">
                <video
                    ref={videoRef}
                    src="/intro/Intro.mp4"
                    className="max-w-full max-h-full object-contain"
                    autoPlay
                    playsInline
                    onEnded={handleVideoEnd}
                    onError={(e) => {
                        console.error('Video load error:', e);
                        setVideoEnded(true);
                    }}
                />
            </div>

            {/* Start Game Button - Appears after video ends */}
            {videoEnded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <button
                        onClick={onComplete}
                        className="group relative px-12 py-5 text-2xl font-bold rounded-xl overflow-hidden transition-all duration-300 transform hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, #92400e 0%, #b45309 25%, #d97706 50%, #f59e0b 75%, #fbbf24 100%)',
                            boxShadow: '0 0 30px rgba(251, 191, 36, 0.4), 0 0 60px rgba(217, 119, 6, 0.2)',
                        }}
                    >
                        {/* Glow effect */}
                        <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                            }}
                        />

                        {/* Border glow */}
                        <div
                            className="absolute inset-0 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity"
                            style={{
                                border: '2px solid rgba(251, 191, 36, 0.6)',
                            }}
                        />

                        {/* Text */}
                        <span className="relative z-10 text-white drop-shadow-lg tracking-wide">
                            ⚔ Spiel starten
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};
