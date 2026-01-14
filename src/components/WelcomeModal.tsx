import React, { useEffect, useCallback } from 'react';
import { Sparkles, BookOpen, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenTutorial: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, onOpenTutorial }) => {
    // ESC key handler
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const handleOpenTutorial = () => {
        onClose();
        onOpenTutorial();
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-600/50 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Header with sparkles */}
                <div className="p-8 text-center space-y-4 bg-gradient-to-b from-amber-900/20 to-transparent">
                    <div className="flex justify-center">
                        <Sparkles className="text-amber-400 animate-pulse" size={48} />
                    </div>
                    <h2 className="text-3xl font-bold text-amber-100 font-serif tracking-wide">
                        Willkommen bei Dialectica!
                    </h2>
                    <p className="text-lg text-slate-300 leading-relaxed">
                        Tritt ein in die <span className="text-amber-300 font-semibold">Arena der Ideen</span>, wo die größten Denker der Geschichte um die Wahrheit ringen.
                    </p>
                </div>

                {/* Buttons */}
                <div className="p-6 space-y-3 bg-slate-900/50">
                    <button
                        onClick={handleOpenTutorial}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white rounded-lg font-bold shadow-lg transition-all transform hover:scale-[1.02]"
                    >
                        <BookOpen size={20} />
                        Anleitung lesen
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg font-semibold transition-all"
                    >
                        <ArrowRight size={20} />
                        Direkt loslegen
                    </button>
                </div>
            </div>
        </div>
    );
};
