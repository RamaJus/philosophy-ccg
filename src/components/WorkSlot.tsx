import React from 'react';
import { Card } from '../types';
import { Card as CardComponent } from './Card';

interface WorkSlotProps {
    card?: Card;
}

export const WorkSlot: React.FC<WorkSlotProps> = ({ card }) => {
    return (
        <div className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 border-dashed transition-all duration-500 ${card
            ? 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            : 'border-slate-700/30 bg-slate-900/20'
            } w-32 h-44 md:w-40 md:h-56`}>



            {card ? (
                <div className="transform scale-90 hover:scale-100 transition-transform duration-300">
                    <CardComponent card={card} isPlayable={false} />
                </div>
            ) : (
                <div className="text-center p-4 opacity-30">
                    <div className="text-xs text-gray-500 italic">Werk</div>
                </div>
            )}
        </div>
    );
};
