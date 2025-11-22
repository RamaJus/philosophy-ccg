import React from 'react';
import { ScrollText } from 'lucide-react';

interface GameLogProps {
    messages: string[];
}

export const GameLog: React.FC<GameLogProps> = ({ messages }) => {
    return (
        <div className="glass-panel p-4 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
                <ScrollText size={16} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-gray-300">Spielprotokoll</h3>
            </div>
            <div className="space-y-1">
                {messages.map((msg, idx) => (
                    <p key={idx} className="text-xs text-gray-400 leading-relaxed">
                        {msg}
                    </p>
                ))}
            </div>
        </div>
    );
};
