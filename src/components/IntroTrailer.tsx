import React, { useRef } from 'react';

interface IntroTrailerProps {
    onComplete: () => void;
}

export const IntroTrailer: React.FC<IntroTrailerProps> = ({ onComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleVideoEnd = () => {
        // Stay on last frame for 2 seconds, then start game
        setTimeout(() => {
            onComplete();
        }, 2000);
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
                        onComplete(); // Skip immediately on error
                    }}
                />
            </div>
        </div>
    );
};
