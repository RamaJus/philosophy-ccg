import React from 'react';
import { Card } from '../types';
import { Card as CardComponent } from './Card';

interface WorkSlotProps {
    card?: Card;
}

// Fixed dimensions: card is ~120x168, slot is 1mm (~4px) larger
const SLOT_WIDTH = 128;  // 120 + 8px buffer
const SLOT_HEIGHT = 176; // 168 + 8px buffer

export const WorkSlot: React.FC<WorkSlotProps> = ({ card }) => {
    // Hide completely when no card is present
    if (!card) {
        return null;
    }

    return (
        <div
            className="relative flex items-center justify-center rounded-lg border-2 border-dashed transition-all duration-500 border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            style={{ width: `${SLOT_WIDTH}px`, height: `${SLOT_HEIGHT}px` }}
        >
            <div className="transform scale-90 hover:scale-95 transition-transform duration-300">
                <CardComponent card={card} isPlayable={false} />
            </div>
        </div>
    );
};
