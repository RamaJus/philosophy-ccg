import React, { useState, useEffect } from 'react';
import { multiplayer } from '../network/MultiplayerManager';
import { Copy, Globe, Cpu, QrCode, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface LobbyProps {
    onStartGame: (mode: 'single' | 'multiplayer_host' | 'multiplayer_client') => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onStartGame }) => {
    const [myId, setMyId] = useState<string>('');
    const [peerIdInput, setPeerIdInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting'>('idle');
    const [copySuccess, setCopySuccess] = useState(false);
    const [showQR, setShowQR] = useState(false);

    useEffect(() => {
        // Check for join code in URL
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get('join');
        if (joinCode) {
            setPeerIdInput(joinCode);
            // Optional: Auto-join could be triggered here, but better to let user confirm
        }
    }, []);

    const initializeHost = async () => {
        // Try to get a random 6-digit ID
        let id = multiplayer.generateRandomId();
        try {
            await multiplayer.initialize(id);
            setMyId(id);
        } catch (err: any) {
            if (err.message === 'ID_TAKEN') {
                // Retry once with a new ID
                id = multiplayer.generateRandomId();
                await multiplayer.initialize(id);
                setMyId(id);
            } else {
                console.error("Failed to initialize host:", err);
            }
        }
    };

    const handleHost = async () => {
        setStatus('waiting');
        multiplayer.isHost = true;

        if (!myId) {
            await initializeHost();
        }

        multiplayer.setCallbacks(
            () => { },
            () => { },
            () => {
                onStartGame('multiplayer_host');
            }
        );
    };

    const handleJoin = async () => {
        if (!peerIdInput) return;
        setStatus('connecting');
        multiplayer.isHost = false;

        // Client also needs an ID, but it can be random/long
        if (!multiplayer.myId) {
            await multiplayer.initialize();
        }

        multiplayer.connectToPeer(peerIdInput);
        multiplayer.setCallbacks(
            () => { },
            () => { },
            () => {
                onStartGame('multiplayer_client');
            }
        );
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(myId);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const copyLinkToClipboard = () => {
        const link = `${window.location.origin}?join=${myId}`;
        navigator.clipboard.writeText(link);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'url(/images/menu-background.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            {/* Overlay for better readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-amber-900/85" />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-4xl">
                <div className="glass-panel p-12 max-w-4xl w-full space-y-10 border-2 border-amber-700/30 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-slate-900/80 to-slate-800/70">
                    {/* Title */}
                    <div className="text-center">
                        <h1 className="text-6xl font-bold" style={{
                            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #d97706 50%, #b45309 75%, #92400e 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            textShadow: '0 0 40px rgba(251, 191, 36, 0.3)',
                            letterSpacing: '0.05em'
                        }}>
                            DIALECTICA
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Single Player */}
                        <button
                            onClick={() => onStartGame('single')}
                            className="group relative overflow-hidden p-8 rounded-xl border-2 border-amber-700/40 hover:border-amber-500/60 transition-all duration-300 bg-gradient-to-br from-slate-800/60 to-slate-900/60 hover:from-amber-900/30 hover:to-slate-900/50 text-left space-y-4"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/0 to-amber-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative">
                                <div className="bg-gradient-to-br from-amber-600/30 to-amber-700/30 w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-amber-600/40">
                                    <Cpu className="text-amber-300" size={28} />
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-2xl font-bold text-amber-100 mb-2">Gegen KI spielen</h3>
                                    <p className="text-sm text-amber-200/60">Übe deine Argumente gegen einen computergesteuerten Gegner.</p>
                                </div>
                            </div>
                        </button>

                        {/* Multiplayer */}
                        <div className="relative overflow-hidden p-8 rounded-xl border-2 border-amber-700/40 bg-gradient-to-br from-slate-800/60 to-slate-900/60 space-y-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 w-14 h-14 rounded-full flex items-center justify-center border border-emerald-600/40">
                                    <Globe className="text-emerald-300" size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-emerald-100">Online spielen</h3>
                                    <p className="text-sm text-emerald-200/60">Fordere einen Freund heraus.</p>
                                </div>
                            </div>

                            {status === 'idle' && (
                                <div className="space-y-4">
                                    <div className="pt-2 border-t border-amber-700/30">
                                        <p className="text-sm text-amber-300/80 mb-3 font-medium">Einem Spiel beitreten:</p>
                                        <div className="flex gap-2">
                                            <input
                                                value={peerIdInput}
                                                onChange={(e) => setPeerIdInput(e.target.value)}
                                                placeholder="6-stelliger Code"
                                                className="bg-slate-900/60 border-2 border-amber-700/40 rounded-lg px-4 py-3 text-sm flex-1 text-amber-100 placeholder-amber-800/60 focus:border-amber-500/60 outline-none transition-colors font-mono text-center tracking-widest"
                                                maxLength={6}
                                            />
                                            <button
                                                onClick={handleJoin}
                                                disabled={!peerIdInput || peerIdInput.length < 6}
                                                className="px-6 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold text-sm transition-all duration-300 shadow-lg disabled:shadow-none"
                                            >
                                                Beitreten
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-center pt-2">
                                        <span className="text-amber-600/60 text-xs font-medium">- ODER -</span>
                                    </div>

                                    <button
                                        onClick={handleHost}
                                        className="w-full py-3 bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-lg font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-xl"
                                    >
                                        Spiel hosten (Code generieren)
                                    </button>
                                </div>
                            )}

                            {status === 'waiting' && (
                                <div className="space-y-4 py-2">
                                    <div className="text-center">
                                        <p className="text-amber-300 font-semibold mb-3">Warte auf Gegner...</p>
                                        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 p-6 rounded-xl border-2 border-amber-600/40 inline-block mb-4 shadow-xl">
                                            <p className="text-xs text-amber-400/70 uppercase tracking-wider mb-2 font-medium">Dein Code</p>
                                            <p className="text-4xl font-mono font-bold text-amber-100 tracking-widest">{myId || '...'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={copyToClipboard}
                                            className="p-3 bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/60 hover:to-slate-700/60 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-xs border border-amber-700/30"
                                        >
                                            <Copy size={14} className={copySuccess ? 'text-emerald-400' : 'text-amber-300'} />
                                            Code kopieren
                                        </button>
                                        <button
                                            onClick={copyLinkToClipboard}
                                            className="p-3 bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/60 hover:to-slate-700/60 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-xs border border-amber-700/30"
                                        >
                                            <Share2 size={14} className="text-blue-400" />
                                            Link teilen
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setShowQR(!showQR)}
                                        className="w-full p-3 bg-gradient-to-br from-slate-700/60 to-slate-800/60 hover:from-slate-600/60 hover:to-slate-700/60 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-xs border border-amber-700/30"
                                    >
                                        <QrCode size={14} className="text-amber-300" />
                                        {showQR ? 'QR-Code verbergen' : 'QR-Code anzeigen'}
                                    </button>

                                    {showQR && myId && (
                                        <div className="flex justify-center p-4 bg-white rounded-lg shadow-xl">
                                            <QRCodeSVG value={`${window.location.origin}?join=${myId}`} size={150} />
                                        </div>
                                    )}

                                    <div className="text-center">
                                        <button
                                            onClick={() => setStatus('idle')}
                                            className="text-xs text-amber-500/60 hover:text-amber-400 underline mt-2 transition-colors"
                                        >
                                            Abbrechen
                                        </button>
                                    </div>
                                </div>
                            )}

                            {status === 'connecting' && (
                                <div className="text-center space-y-4 py-4">
                                    <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                                    <p className="text-emerald-300 font-semibold">Verbinde...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
