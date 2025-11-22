import React from 'react';
import { Card } from '../types';
import { Card as CardComponent } from './Card';

interface WorkSlotProps {
    card?: Card;
    isPlayer: boolean;
}

export const WorkSlot: React.FC<WorkSlotProps> = ({ card, isPlayer }) => {
    return (
        <div className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 border-dashed transition-all duration-500 ${card
                ? 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'border-slate-700/30 bg-slate-900/20'
            } w-32 h-44 md:w-40 md:h-56`}>

            {/* Label */}
            <div className="absolute -top-3 bg-slate-900 px-2 text-xs font-serif text-amber-500/70 uppercase tracking-widest border border-amber-900/30 rounded">
                Hauptwerk
            </div>

            {card ? (
                <div className="transform scale-90 hover:scale-100 transition-transform duration-300">
                    <CardComponent card={card} isPlayable={false} />

                    {/* Active Bonus Indicator */}
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-max max-w-[200px] z-10">
                        <div className="bg-amber-900/90 text-amber-100 text-xs px-3 py-1.5 rounded-full border border-amber-500/50 shadow-lg text-center backdrop-blur-sm">
                            <span className="font-bold text-amber-400">Bonus:</span> +{card.workBonus?.damage} Schaden für {card.workBonus?.school}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center p-4 opacity-30">
                    <div className="text-4xl mb-2">📜</div>
                    <p className="text-xs font-serif text-slate-400">Kein aktives Werk</p>
                </div>
            )}
        </div>
    );
};
