import React, { useEffect, useCallback } from 'react';
import { X, Sparkles, Wrench, Bug, Clock } from 'lucide-react';
import { changelog, getLatestVersion } from '../data/changelog';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
    // Update last seen version when modal opens
    useEffect(() => {
        if (isOpen) {
            localStorage.setItem('philosophy-ccg-last-seen-version', getLatestVersion());
        }
    }, [isOpen]);

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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-amber-600/50 rounded-xl w-full max-w-2xl max-h-[80vh] shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 bg-gradient-to-b from-amber-900/30 to-transparent border-b border-amber-700/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className="text-amber-400" size={28} />
                        <h2 className="text-2xl font-bold text-amber-100 font-serif tracking-wide">
                            Changelog
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <X className="text-slate-400 hover:text-white" size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {changelog.map((entry, index) => (
                        <div
                            key={entry.version}
                            className={`space-y-4 ${index > 0 ? 'pt-6 border-t border-slate-700/50' : ''}`}
                        >
                            {/* Version Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-amber-200">
                                    Version {entry.version}
                                </h3>
                                <span className="text-sm text-slate-400">
                                    {new Date(entry.date).toLocaleDateString('de-DE', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>

                            {/* New Features */}
                            {entry.categories.new && entry.categories.new.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <Sparkles size={16} />
                                        <span className="font-semibold text-sm uppercase tracking-wider">Neu</span>
                                    </div>
                                    <ul className="space-y-1 ml-6">
                                        {entry.categories.new.map((item, i) => (
                                            <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                                                <span className="text-emerald-500 mt-1">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Improvements */}
                            {entry.categories.improvements && entry.categories.improvements.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <Wrench size={16} />
                                        <span className="font-semibold text-sm uppercase tracking-wider">Verbesserungen</span>
                                    </div>
                                    <ul className="space-y-1 ml-6">
                                        {entry.categories.improvements.map((item, i) => (
                                            <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                                                <span className="text-blue-500 mt-1">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Fixes */}
                            {entry.categories.fixes && entry.categories.fixes.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-orange-400">
                                        <Bug size={16} />
                                        <span className="font-semibold text-sm uppercase tracking-wider">Fehlerbehebungen</span>
                                    </div>
                                    <ul className="space-y-1 ml-6">
                                        {entry.categories.fixes.map((item, i) => (
                                            <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                                                <span className="text-orange-500 mt-1">•</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Helper function to check if there's a new version
export const hasNewVersion = (): boolean => {
    const lastSeen = localStorage.getItem('philosophy-ccg-last-seen-version');
    const latest = getLatestVersion();
    return lastSeen !== latest;
};
