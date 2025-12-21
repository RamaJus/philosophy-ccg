import React, { useState, useEffect } from 'react';
import { multiplayer } from '../network/MultiplayerManager';
import { Copy, Globe, Cpu, QrCode, Share2, BookOpen, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DeckEditor } from './DeckEditor';
import { useDeck } from '../hooks/useDeck';

interface LobbyProps {
    onStartGame: (mode: 'single' | 'multiplayer_host' | 'multiplayer_client') => void;
    isDebugMode: boolean;
    setIsDebugMode: (value: boolean) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onStartGame, isDebugMode, setIsDebugMode }) => {
    const [myId, setMyId] = useState<string>('');
    const [peerIdInput, setPeerIdInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting'>('idle');
    const [copySuccess, setCopySuccess] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [showDeckEditor, setShowDeckEditor] = useState(false);
    const [playerName, setPlayerName] = useState(() => {
        return localStorage.getItem('philosophy-ccg-player-name') || 'Spieler';
    });

    const { cardCount, isValid, isCustom, DECK_SIZE } = useDeck();

    useEffect(() => {
        // Check for join code in URL
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get('join');
        if (joinCode) {
            setPeerIdInput(joinCode);
            // Optional: Auto-join could be triggered here, but better to let user confirm
        }
    }, []);

    // Save player name to localStorage whenever it changes
    const handlePlayerNameChange = (name: string) => {
        setPlayerName(name);
        localStorage.setItem('philosophy-ccg-player-name', name);
    };

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
        setConnectionError(null);
        multiplayer.isHost = false;

        // Client also needs an ID, but it can be random/long
        if (!multiplayer.myId) {
            await multiplayer.initialize();
        }

        // Set up timeout (10 seconds)
        const timeoutId = setTimeout(() => {
            setConnectionError('Verbindung fehlgeschlagen. Host nicht gefunden.');
            setStatus('idle');
        }, 10000);

        // Set up error callback
        multiplayer.setErrorCallback((error) => {
            clearTimeout(timeoutId);
            setConnectionError(error || 'Verbindungsfehler');
            setStatus('idle');
        });

        multiplayer.connectToPeer(peerIdInput);
        multiplayer.setCallbacks(
            () => { }, // onState
            () => { }, // onAction
            () => { // onConnect
                clearTimeout(timeoutId);
                // Send handshake with deck IDs immediately after connection
                if (isCustom && isValid) {
                    const deckIds = JSON.parse(localStorage.getItem('philosophy-ccg-deck') || '{}').cardIds;
                    if (deckIds) {
                        console.log('[Lobby] Sending Handshake with deck:', deckIds.length);
                        multiplayer.sendHandshake(deckIds);
                    }
                }

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
        <>
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
                        <div className="text-center relative">
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

                            {/* Debug Toggle */}
                            <div className="absolute top-0 right-0">
                                <button
                                    onClick={() => setIsDebugMode(!isDebugMode)}
                                    className={`text-xs px-2 py-1 rounded border transition-all ${isDebugMode
                                        ? 'bg-red-900/50 border-red-500 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                        : 'bg-slate-800/50 border-slate-700 text-slate-500'
                                        }`}
                                >
                                    {isDebugMode ? '🛠️ DEBUG AKTIV' : 'Debug Modus'}
                                </button>
                            </div>
                        </div>

                        {/* Player Name Input */}
                        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-600/40 bg-slate-800/40">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600/30 to-blue-700/30 border border-blue-600/40 flex items-center justify-center">
                                <User className="text-blue-300" size={20} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 uppercase tracking-wider">Dein Name</label>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => handlePlayerNameChange(e.target.value)}
                                    placeholder="Spielername eingeben..."
                                    maxLength={20}
                                    className="w-full bg-transparent border-none outline-none text-lg font-semibold text-white placeholder-gray-500"
                                />
                            </div>
                        </div>

                        {/* Deck Editor Button */}
                        <button
                            onClick={() => setShowDeckEditor(true)}
                            className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-between gap-4 ${isCustom && isValid
                                ? 'border-green-600/60 bg-gradient-to-br from-green-900/30 to-slate-900/60 hover:border-green-500/80'
                                : isCustom && !isValid
                                    ? 'border-red-600/60 bg-gradient-to-br from-red-900/30 to-slate-900/60 hover:border-red-500/80'
                                    : 'border-purple-700/40 bg-gradient-to-br from-slate-800/60 to-slate-900/60 hover:border-purple-500/60'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${isCustom && isValid
                                    ? 'bg-gradient-to-br from-green-600/30 to-green-700/30 border-green-600/40'
                                    : isCustom && !isValid
                                        ? 'bg-gradient-to-br from-red-600/30 to-red-700/30 border-red-600/40'
                                        : 'bg-gradient-to-br from-purple-600/30 to-purple-700/30 border-purple-600/40'
                                    }`}>
                                    <BookOpen className={isCustom && isValid ? 'text-green-300' : isCustom && !isValid ? 'text-red-300' : 'text-purple-300'} size={24} />
                                </div>
                                <div className="text-left">
                                    <h3 className={`text-xl font-bold ${isCustom && isValid ? 'text-green-100' : isCustom && !isValid ? 'text-red-100' : 'text-purple-100'}`}>
                                        {isCustom ? 'Custom-Deck' : 'Standard-Deck'}
                                    </h3>
                                    <p className={`text-sm ${isCustom && isValid ? 'text-green-200/80' : isCustom && !isValid ? 'text-red-200/80' : 'text-purple-200/60'}`}>
                                        {isCustom
                                            ? `${cardCount}/${DECK_SIZE} Karten`
                                            : 'Alle Karten (kein Limit)'
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${isCustom && isValid
                                ? 'bg-green-900/50 text-green-300 border border-green-600'
                                : isCustom && !isValid
                                    ? 'bg-red-900/50 text-red-300 border border-red-600'
                                    : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                                }`}>
                                {isCustom && isValid ? '✓ Bereit' : isCustom && !isValid ? '⚠ Unvollständig' : 'Standard'}
                            </div>
                        </button>

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

                                        {connectionError && (
                                            <div className="p-2 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
                                                {connectionError}
                                            </div>
                                        )}

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

            {/* Deck Editor Modal */}
            <DeckEditor isOpen={showDeckEditor} onClose={() => setShowDeckEditor(false)} />
        </>
    );
};
