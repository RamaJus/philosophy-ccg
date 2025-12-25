import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { AVATARS } from '../data/avatars';

interface AvatarSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAvatarId: string;
    onSelectAvatar: (id: string) => void;
}

export const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
    isOpen,
    onClose,
    currentAvatarId,
    onSelectAvatar,
}) => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-900/50 rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-8 border-b border-amber-900/30 pb-4">
                    <h2 className="text-3xl font-serif text-amber-100/90">Wähle deinen Avatar</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-amber-100/60 hover:text-amber-100"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {AVATARS.map((avatar) => (
                        <div
                            key={avatar.id}
                            onClick={() => {
                                onSelectAvatar(avatar.id);
                                onClose();
                            }}
                            className={`
                                group relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300
                                border-2 
                                ${currentAvatarId === avatar.id
                                    ? 'border-amber-400 scale-[1.02] shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                                    : 'border-transparent hover:border-amber-900/50 hover:scale-[1.02]'
                                }
                            `}
                        >
                            {/* Image */}
                            <div className="aspect-[3/4] relative">
                                <img
                                    src={avatar.image}
                                    alt={avatar.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                                {/* Info Overlay */}
                                <div className="absolute inset-x-0 bottom-0 p-4">
                                    <h3 className={`font-serif text-lg leading-tight mb-1 ${currentAvatarId === avatar.id ? 'text-amber-400' : 'text-amber-100'}`}>
                                        {avatar.name}
                                    </h3>
                                    <p className="text-xs text-amber-100/70 line-clamp-2">
                                        {avatar.description}
                                    </p>
                                </div>
                            </div>

                            {/* Selection Indicator */}
                            {currentAvatarId === avatar.id && (
                                <div className="absolute top-2 right-2 w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
