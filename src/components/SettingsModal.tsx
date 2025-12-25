import React, { useEffect, useCallback } from 'react';
import { X, Volume2, VolumeX, Settings, RotateCcw } from 'lucide-react';
import { GameSettings } from '../hooks/useSettings';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: GameSettings;
    onSettingChange: (key: keyof GameSettings, value: boolean | number) => void;
    onReset: () => void;
}

interface ToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-2">
        <div>
            <span className="text-white font-medium">{label}</span>
            {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-600'}`}
        >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
    </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSettingChange,
    onReset
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-700/50 rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <Settings className="text-amber-400" size={20} />
                        <h2 className="text-lg font-bold text-amber-100">Einstellungen</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Animations Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">
                            Animationen
                        </h3>
                        <div className="space-y-1 bg-slate-800/50 rounded-lg p-3">
                            <Toggle
                                label="Angriffs-Animation"
                                description="Karten schwingen Richtung Ziel"
                                checked={settings.attackAnimation}
                                onChange={(v) => onSettingChange('attackAnimation', v)}
                            />
                            <Toggle
                                label="Karte-Ausspielen-Animation"
                                description="Karten fliegen von Hand auf Spielfeld"
                                checked={settings.playCardAnimation}
                                onChange={(v) => onSettingChange('playCardAnimation', v)}
                            />
                            <Toggle
                                label="Karte-Ziehen-Animation"
                                description="Karten fliegen vom Deck zur Hand"
                                checked={settings.drawCardAnimation}
                                onChange={(v) => onSettingChange('drawCardAnimation', v)}
                            />
                            <Toggle
                                label="Karten-Vorschau-Animation"
                                description="Karten vergrößern sich bei Hover/Tooltip"
                                checked={settings.cardPreviewAnimation}
                                onChange={(v) => onSettingChange('cardPreviewAnimation', v)}
                            />
                        </div>
                    </div>

                    {/* Audio Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">
                            Audio
                        </h3>
                        <div className="space-y-3 bg-slate-800/50 rounded-lg p-3">
                            {/* Music Volume */}
                            <div className="flex items-center justify-between">
                                <span className="text-white font-medium">Musik-Lautstärke</span>
                                <button
                                    onClick={() => onSettingChange('musicMuted', !settings.musicMuted)}
                                    className={`p-2 rounded-lg transition-colors ${settings.musicMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-gray-300'}`}
                                >
                                    {settings.musicMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.musicMuted ? 0 : settings.musicVolume}
                                    onChange={(e) => onSettingChange('musicVolume', parseInt(e.target.value))}
                                    disabled={settings.musicMuted}
                                    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                                />
                                <span className="text-sm text-gray-400 w-10 text-right">
                                    {settings.musicMuted ? '0%' : `${settings.musicVolume}%`}
                                </span>
                            </div>

                            {/* Voiceline Volume */}
                            <div className="border-t border-slate-600 pt-3 mt-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-white font-medium">Voicelines</span>
                                    <button
                                        onClick={() => onSettingChange('voicelineMuted', !settings.voicelineMuted)}
                                        className={`p-2 rounded-lg transition-colors ${settings.voicelineMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-gray-300'}`}
                                    >
                                        {settings.voicelineMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mb-2">Sprachausgabe der legendären Philosophen</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={settings.voicelineMuted ? 0 : settings.voicelineVolume}
                                        onChange={(e) => onSettingChange('voicelineVolume', parseInt(e.target.value))}
                                        disabled={settings.voicelineMuted}
                                        className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-gray-400 w-10 text-right">
                                        {settings.voicelineMuted ? '0%' : `${settings.voicelineVolume}%`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Developer Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">
                            Entwickler
                        </h3>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <Toggle
                                label="Debug-Modus"
                                description="Zeigt Entwickler-Informationen"
                                checked={settings.debugMode}
                                onChange={(v) => onSettingChange('debugMode', v)}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 flex justify-between">
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-sm"
                    >
                        <RotateCcw size={16} />
                        Zurücksetzen
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
                    >
                        Fertig
                    </button>
                </div>
            </div>
        </div>
    );
};
