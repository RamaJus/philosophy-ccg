import React, { useEffect, useCallback } from 'react';
import { X, BookOpen, MousePointer2, Sword, PlayCircle } from 'lucide-react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
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

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-emerald-700/50 rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-emerald-900/50 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <BookOpen className="text-emerald-400" size={24} />
                        <h2 className="text-xl font-bold text-emerald-100 font-serif tracking-wide">Dialectica — Spielanleitung</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-emerald-900/20 rounded-lg transition-colors group"
                    >
                        <X size={24} className="text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1 text-slate-300 leading-relaxed">

                    {/* Intro */}
                    <div className="text-center space-y-2 pb-2 border-b border-slate-700/50">
                        <h3 className="text-2xl font-bold text-amber-100 font-serif">Willkommen in der Arena der Ideen</h3>
                        <p className="text-lg text-amber-200/80 italic">
                            Vernichte die Glaubwürdigkeit (Lebenspunkte) deines Gegners, bevor er es mit deiner tut.
                        </p>
                    </div>

                    {/* Core Mechanics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Dialektik */}
                        <div className="bg-slate-800/40 p-4 rounded-lg border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
                            <h4 className="text-indigo-300 font-bold mb-2 flex items-center gap-2">
                                <span className="bg-indigo-500/20 p-1.5 rounded">1</span> Dialektik
                            </h4>
                            <p className="text-sm">
                                Jede Runde steigt dein Verständnis. Nutze es, um Philosophen zu beschwüren und Zauber zu wirken.
                                <br />
                                <span className="text-emerald-400 font-semibold mt-1 block">Tipp: Grün leuchtende Karten sind spielbar!</span>
                            </p>
                        </div>

                        {/* Philosophen */}
                        <div className="bg-slate-800/40 p-4 rounded-lg border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                            <h4 className="text-amber-300 font-bold mb-2 flex items-center gap-2">
                                <span className="bg-amber-500/20 p-1.5 rounded">2</span> Philosophen
                            </h4>
                            <p className="text-sm">
                                Deine Streiter auf dem Feld. Jeder gehört einer oder mehrerer Schulen an.
                                <br />
                                <span className="text-slate-400 mt-1 block">– <strong>Synergien:</strong> Kombiniere gleiche Schulen für stärkere Angriffe.</span>
                                <span className="text-slate-400 block">– <strong>Angriff:</strong> Greife Gegner an (Board Control) oder den Spieler direkt.</span>
                            </p>
                        </div>

                        {/* Werke & Zauber */}
                        <div className="bg-slate-800/40 p-4 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                            <h4 className="text-purple-300 font-bold mb-2 flex items-center gap-2">
                                <span className="bg-purple-500/20 p-1.5 rounded">3</span> Werke & Zauber
                            </h4>
                            <p className="text-sm space-y-1">
                                <span className="block"><strong className="text-purple-200">Werke:</strong> Bleiben liegen und geben dauerhafte Boni.</span>
                                <span className="block"><strong className="text-fuchsia-200">Zauber:</strong> Sofortiger, einmaliger Effekt.</span>
                            </p>
                        </div>

                        {/* Legendär & Tooltips */}
                        <div className="bg-slate-800/40 p-4 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
                            <h4 className="text-red-300 font-bold mb-2 flex items-center gap-2">
                                <span className="bg-red-500/20 p-1.5 rounded">4</span> Wissen ist Macht
                            </h4>
                            <p className="text-sm">
                                Legendäre Denker haben einzigartige Fähigkeiten.
                                <br />
                                <span className="flex items-center gap-2 mt-2 bg-slate-900/60 p-2 rounded border border-slate-700">
                                    <MousePointer2 size={14} className="text-blue-400" />
                                    <span className="text-blue-100">Rechtsklick / Gedrückt halten für Details!</span>
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Common Pitfalls / Tips */}
                    <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 rounded-lg">
                        <h4 className="text-emerald-400 font-bold mb-2 uppercase text-xs tracking-wider">Strategie-Tipps für den Anfang</h4>
                        <ul className="text-sm space-y-2 list-disc list-inside text-slate-300">
                            <li><strong className="text-emerald-200">Vergiss nicht, den Zug zu beenden!</strong> Der Button ist rechts unten.</li>
                            <li>Achte auf Synergien (gleiche Symbole) – sie können das Spiel entscheiden.</li>
                            <li>Lies die Tooltips genau – manche Effekte sind komplexer als sie scheinen.</li>
                        </ul>
                    </div>

                    <div className="text-center pt-2">
                        <p className="font-serif italic text-slate-500 text-sm">
                            "Die Philosophen haben die Welt nur verschieden interpretiert; es kömmt darauf an, sie zu verändern." – Marx
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700/50 flex justify-center bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="px-8 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105"
                    >
                        Verstanden
                    </button>
                </div>
            </div>
        </div>
    );
};
