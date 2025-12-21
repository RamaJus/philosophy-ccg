import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollText, X } from 'lucide-react';

interface GameLogProps {
    messages: string[];
}

// Determine message type and return appropriate color class
const getMessageStyle = (msg: string): string => {
    const lowerMsg = msg.toLowerCase();

    // Damage/Attack messages
    if (lowerMsg.includes('schaden') || lowerMsg.includes('angriff') || lowerMsg.includes('greift an') || lowerMsg.includes('stirbt') || lowerMsg.includes('zerstört')) {
        return 'text-red-400';
    }
    // Healing messages
    if (lowerMsg.includes('heil') || lowerMsg.includes('glaubwürdigkeit') || lowerMsg.includes('wiederhergestellt')) {
        return 'text-green-400';
    }
    // Card draw/mana messages
    if (lowerMsg.includes('zieh') || lowerMsg.includes('karte') || lowerMsg.includes('dialektik')) {
        return 'text-blue-400';
    }
    // Spell/special effect messages
    if (lowerMsg.includes('zauber') || lowerMsg.includes('effekt') || lowerMsg.includes('spezial') || lowerMsg.includes('verwandel')) {
        return 'text-purple-400';
    }
    // Turn messages
    if (lowerMsg.includes('zug') || lowerMsg.includes('runde')) {
        return 'text-amber-400';
    }
    // Default
    return 'text-gray-400';
};

export const GameLog: React.FC<GameLogProps> = ({ messages }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Get last 3 messages for mini-feed
    const recentMessages = messages.slice(-3);

    return (
        <>
            {/* Mini-Feed Section - anchored bottom left */}
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 space-y-1.5 backdrop-blur-sm">
                {/* Header with expand button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded transition-all hover:bg-slate-700/30"
                >
                    <div className="flex items-center gap-2">
                        <ScrollText size={12} className="text-amber-500/60" />
                        <span className="text-[10px] font-medium text-gray-500">Protokoll</span>
                    </div>
                    <span className="text-[10px] text-gray-600">{messages.length}</span>
                </button>

                {/* Recent Messages Mini-Feed */}
                <div className="space-y-0.5 px-1">
                    {recentMessages.map((msg, idx) => (
                        <p
                            key={`${messages.length - 3 + idx}-${msg.substring(0, 20)}`}
                            className={`text-[10px] leading-tight truncate ${getMessageStyle(msg)}`}
                            title={msg}
                        >
                            {msg}
                        </p>
                    ))}
                </div>
            </div>

            {/* Full Log Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-lg mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-slate-900/95 border border-slate-600 rounded-xl shadow-2xl overflow-hidden">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <ScrollText size={20} className="text-amber-400" />
                                        <h2 className="text-lg font-bold text-white">Spielprotokoll</h2>
                                        <span className="text-xs text-gray-500 bg-slate-700 px-2 py-0.5 rounded-full">
                                            {messages.length} Einträge
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <X size={18} className="text-gray-400" />
                                    </button>
                                </div>

                                {/* Modal Content - Scrollable */}
                                <div
                                    ref={modalRef}
                                    className="max-h-96 overflow-y-auto p-4 space-y-2"
                                >
                                    {messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`text-sm leading-relaxed ${getMessageStyle(msg)}`}
                                        >
                                            <span className="text-gray-600 text-xs mr-2">#{idx + 1}</span>
                                            {msg}
                                        </div>
                                    ))}
                                </div>

                                {/* Modal Footer */}
                                <div className="p-3 border-t border-slate-700 bg-slate-800/30 text-center">
                                    <p className="text-xs text-gray-500">Klicke außerhalb oder drücke ESC zum Schließen</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
