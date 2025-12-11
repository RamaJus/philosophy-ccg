import React, { useState } from 'react';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

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
                        <p key={idx} className={`text-xs leading-relaxed ${getMessageStyle(msg)}`}>
                            {msg}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
};
