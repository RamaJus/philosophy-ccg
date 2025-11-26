import React, { useState } from 'react';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

interface GameLogProps {
    messages: string[];
}

export const GameLog: React.FC<GameLogProps> = ({ messages }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="glass-panel">
            {/* Collapsed Button View */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors rounded-lg"
            >
                <div className="flex items-center gap-2">
                    <ScrollText size={16} className="text-amber-400" />
                    <h3 className="text-sm font-semibold text-gray-300">Spielprotokoll</h3>
                    <span className="text-xs text-gray-500">({messages.length})</span>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Expanded Log View */}
            {isExpanded && (
                <div className="px-4 pb-4 max-h-64 overflow-y-auto space-y-1">
                    {messages.map((msg, idx) => (
                        <p key={idx} className="text-xs text-gray-400 leading-relaxed">
                            {msg}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
};
