import React, { useState, useEffect } from 'react';
import { multiplayer } from '../network/MultiplayerManager';
import { Copy, Globe, Cpu } from 'lucide-react';

interface LobbyProps {
    onStartGame: (mode: 'single' | 'multiplayer_host' | 'multiplayer_client') => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onStartGame }) => {
    const [myId, setMyId] = useState<string>('');
    const [peerIdInput, setPeerIdInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting'>('idle');
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        // Initialize multiplayer on mount to get ID
        multiplayer.initialize().then(id => {
            setMyId(id);
        });
    }, []);

    const handleHost = () => {
        setStatus('waiting');
        multiplayer.isHost = true;
        multiplayer.setCallbacks(
            () => { }, // Host doesn't receive state, it sends it
            () => { }, // Action callback set later in GameArea
            () => {
                // On connect
                onStartGame('multiplayer_host');
            }
        );
    };

    const handleJoin = () => {
        if (!peerIdInput) return;
        setStatus('connecting');
        multiplayer.isHost = false;
        multiplayer.connectToPeer(peerIdInput);
        multiplayer.setCallbacks(
            () => { }, // State callback set later
            () => { }, // Client doesn't receive actions
            () => {
                // On connect
                onStartGame('multiplayer_client');
            }
        );
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(myId);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel p-8 max-w-2xl w-full space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-clip-text text-transparent">
                        Philosophie Kartenspiel
                    </h1>
                    <p className="text-gray-400 italic">Wähle deinen Modus</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Single Player */}
                    <button
                        onClick={() => onStartGame('single')}
                        className="glass-panel p-6 hover:bg-blue-500/10 transition-all group text-left space-y-4"
                    >
                        <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Cpu className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-blue-100">Gegen KI spielen</h3>
                            <p className="text-sm text-gray-400">Übe deine Argumente gegen einen computergesteuerten Gegner.</p>
                        </div>
                    </button>

                    {/* Multiplayer */}
                    <div className="glass-panel p-6 space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center">
                                <Globe className="text-green-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-green-100">Online spielen</h3>
                                <p className="text-sm text-gray-400">Fordere einen Freund heraus.</p>
                            </div>
                        </div>

                        {status === 'idle' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Dein Code (zum Teilen)</label>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={myId || 'Lade ID...'}
                                            className="bg-black/30 border border-gray-700 rounded px-3 py-2 text-sm flex-1 font-mono text-gray-300"
                                        />
                                        <button
                                            onClick={copyToClipboard}
                                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                                            title="Kopieren"
                                        >
                                            <Copy size={16} className={copySuccess ? 'text-green-400' : 'text-gray-300'} />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-700/50">
                                    <p className="text-sm text-gray-400 mb-2">Einem Spiel beitreten:</p>
                                    <div className="flex gap-2">
                                        <input
                                            value={peerIdInput}
                                            onChange={(e) => setPeerIdInput(e.target.value)}
                                            placeholder="Code des Freundes eingeben"
                                            className="bg-black/30 border border-gray-700 rounded px-3 py-2 text-sm flex-1 text-white placeholder-gray-600 focus:border-amber-500 outline-none transition-colors"
                                        />
                                        <button
                                            onClick={handleJoin}
                                            disabled={!peerIdInput}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold text-sm transition-colors"
                                        >
                                            Beitreten
                                        </button>
                                    </div>
                                </div>

                                <div className="text-center pt-2">
                                    <span className="text-gray-500 text-xs">- ODER -</span>
                                </div>

                                <button
                                    onClick={handleHost}
                                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded font-semibold text-sm transition-colors"
                                >
                                    Spiel hosten (Warte auf Gegner)
                                </button>
                            </div>
                        )}

                        {status === 'waiting' && (
                            <div className="text-center space-y-4 py-4">
                                <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto"></div>
                                <div>
                                    <p className="text-amber-400 font-semibold">Warte auf Gegner...</p>
                                    <p className="text-sm text-gray-400 mt-2">Teile deinen Code oben mit deinem Freund.</p>
                                </div>
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="text-xs text-gray-500 hover:text-gray-300 underline"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        )}

                        {status === 'connecting' && (
                            <div className="text-center space-y-4 py-4">
                                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto"></div>
                                <p className="text-green-400 font-semibold">Verbinde...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
