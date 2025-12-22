import React, { useState, useEffect, useMemo } from 'react';
import { multiplayer } from '../network/MultiplayerManager';
import { Copy, Globe, Cpu, QrCode, Share2, BookOpen, User, Settings } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DeckEditor } from './DeckEditor';
import { SettingsModal } from './SettingsModal';
import { useDeck } from '../hooks/useDeck';
import { useSettings } from '../hooks/useSettings';
import { cardDatabase } from '../data/cards';

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
    const [showSettings, setShowSettings] = useState(false);
    const [playerName, setPlayerName] = useState(() => {
        return localStorage.getItem('philosophy-ccg-player-name') || 'Spieler';
    });

    const { cardCount, isValid, isCustom, DECK_SIZE, refreshDeck } = useDeck();
    const { settings, saveSettings, resetToDefaults } = useSettings();

    // Sync debug mode from settings
    useEffect(() => {
        setIsDebugMode(settings.debugMode);
    }, [settings.debugMode, setIsDebugMode]);

    // Portrait orientation mapping: which direction the philosopher faces
    // 'right' = faces right (good for left side), 'left' = faces left (good for right side), 'center' = faces forward (either side)
    const portraitOrientation: Record<string, 'left' | 'right' | 'center'> = {
        // Facing LEFT (should appear on RIGHT side of menu)
        'al-ghazali': 'left',
        'anselm': 'left',
        'aquinas': 'left',
        'beauvoir': 'left',
        'confucius': 'left',
        'demokrit': 'left',
        'hegel': 'left',
        'heraklit': 'left',
        'hume': 'left',
        'hypatia': 'left',
        'kierkegaard': 'left',
        'nietzsche': 'left',
        'platon': 'left',
        'popper': 'left',
        'rumi': 'left',
        'schopenhauer': 'left',
        'thales_von_milet': 'left',
        'zhuangzi': 'left',
        'adorno': 'left',

        // Facing RIGHT (should appear on LEFT side of menu)
        'anaximenes': 'right',
        'augustinus': 'right',
        'bentham': 'right',
        'camus': 'right',
        'descartes': 'right',
        'diderot': 'right',
        'diogenes': 'right',
        'diotima': 'right',
        'epicurus': 'right',
        'heidegger': 'right',
        'hobbes': 'right',
        'kant': 'right',
        'laozi': 'right',
        'locke': 'right',
        'marx': 'right',
        'mencius': 'right',
        'montaigne': 'right',
        'nagarjuna': 'right',
        'pyrrhon': 'right',
        'rousseau': 'right',
        'russell': 'right',
        'sartre': 'right',
        'seneca': 'right',
        'sokrates': 'right',
        'spinoza': 'right',
        'van_inwagen': 'right',

        // Facing CENTER (can appear on either side)
        'arendt': 'center',
        'aristoteles': 'center',
        'buddha': 'center',
        'foucault': 'center',
        'mozi': 'center',
        'wittgenstein': 'center',
    };

    // Get two random philosophers for the portrait display
    // Left side needs philosophers facing right, right side needs philosophers facing left
    const [leftPhilosopher, rightPhilosopher] = useMemo(() => {
        const philosophers = cardDatabase.filter(c => c.type === 'Philosoph' && c.image);

        // Get philosopher ID from image path
        const getIdFromImage = (imagePath: string) => {
            const match = imagePath.match(/\/([^/]+)\.(png|jpg|jpeg)$/i);
            return match ? match[1].toLowerCase() : '';
        };

        // Philosophers that can go on left side (facing right or center)
        const leftCandidates = philosophers.filter(p => {
            const id = getIdFromImage(p.image || '');
            const orientation = portraitOrientation[id] || 'center';
            return orientation === 'right' || orientation === 'center';
        });

        // Philosophers that can go on right side (facing left or center)
        const rightCandidates = philosophers.filter(p => {
            const id = getIdFromImage(p.image || '');
            const orientation = portraitOrientation[id] || 'center';
            return orientation === 'left' || orientation === 'center';
        });

        const shuffledLeft = [...leftCandidates].sort(() => Math.random() - 0.5);
        const shuffledRight = [...rightCandidates].sort(() => Math.random() - 0.5);

        const left = shuffledLeft[0];
        // Make sure we don't pick the same philosopher for both sides
        const right = shuffledRight.find(p => p.id !== left?.id) || shuffledRight[0];

        return [left, right];
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinCode = params.get('join');
        if (joinCode) {
            setPeerIdInput(joinCode);
        }
    }, []);

    const handlePlayerNameChange = (name: string) => {
        setPlayerName(name);
        localStorage.setItem('philosophy-ccg-player-name', name);
    };

    const initializeHost = async () => {
        let id = multiplayer.generateRandomId();
        try {
            await multiplayer.initialize(id);
            setMyId(id);
        } catch (err: any) {
            if (err.message === 'ID_TAKEN') {
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
            () => { onStartGame('multiplayer_host'); }
        );
    };

    const handleJoin = async () => {
        if (!peerIdInput) return;
        setStatus('connecting');
        setConnectionError(null);
        multiplayer.isHost = false;

        if (!multiplayer.myId) {
            await multiplayer.initialize();
        }

        const timeoutId = setTimeout(() => {
            setConnectionError('Verbindung fehlgeschlagen. Host nicht gefunden.');
            setStatus('idle');
        }, 10000);

        multiplayer.setErrorCallback((error) => {
            clearTimeout(timeoutId);
            setConnectionError(error || 'Verbindungsfehler');
            setStatus('idle');
        });

        multiplayer.connectToPeer(peerIdInput);
        multiplayer.setCallbacks(
            () => { },
            () => { },
            () => {
                clearTimeout(timeoutId);
                // Always send handshake with player name, and deck IDs if custom
                const deckIds = (isCustom && isValid)
                    ? JSON.parse(localStorage.getItem('philosophy-ccg-deck') || '{}').cardIds
                    : undefined;
                multiplayer.sendHandshake(deckIds, playerName);
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
            <div className="min-h-screen flex items-center justify-center p-2 relative overflow-hidden">
                {/* Background */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'url(/images/menu-background.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                {/* Main overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-amber-900/85" />
                {/* Left side fade - darkens the background pattern near left philosopher */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-80 hidden lg:block"
                    style={{
                        background: 'linear-gradient(to right, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 50%, transparent 100%)',
                    }}
                />
                {/* Right side fade - darkens the background pattern near right philosopher */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-80 hidden lg:block"
                    style={{
                        background: 'linear-gradient(to left, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 50%, transparent 100%)',
                    }}
                />

                {/* Left Philosopher Portrait */}
                {leftPhilosopher && (
                    <div className="absolute left-0 top-0 bottom-0 w-64 pointer-events-none hidden lg:block">
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-30"
                            style={{
                                backgroundImage: `url(${leftPhilosopher.image})`,
                                maskImage: 'linear-gradient(to right, black 50%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to right, black 50%, transparent 100%)'
                            }}
                        />
                        <div className="absolute bottom-8 left-4 text-white/50 text-sm font-serif italic">
                            {leftPhilosopher.name}
                        </div>
                    </div>
                )}

                {/* Right Philosopher Portrait */}
                {rightPhilosopher && (
                    <div className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none hidden lg:block">
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-30"
                            style={{
                                backgroundImage: `url(${rightPhilosopher.image})`,
                                maskImage: 'linear-gradient(to left, black 50%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to left, black 50%, transparent 100%)'
                            }}
                        />
                        <div className="absolute bottom-8 right-4 text-white/50 text-sm font-serif italic text-right">
                            {rightPhilosopher.name}
                        </div>
                    </div>
                )}

                {/* Content Container */}
                <div className="relative z-10 w-full max-w-3xl">
                    <div className="glass-panel p-6 max-w-3xl w-full space-y-4 border-2 border-amber-700/30 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-slate-900/80 to-slate-800/70">
                        {/* Title */}
                        <div className="text-center relative pb-2">
                            <h1 className="text-4xl font-bold" style={{
                                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #d97706 50%, #b45309 75%, #92400e 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                letterSpacing: '0.05em'
                            }}>
                                DIALECTICA
                            </h1>
                            <div className="absolute top-0 right-0">
                                <button
                                    onClick={() => setIsDebugMode(!isDebugMode)}
                                    className={`text-xs px-2 py-0.5 rounded border transition-all ${isDebugMode
                                        ? 'bg-red-900/50 border-red-500 text-red-200'
                                        : 'bg-slate-800/50 border-slate-700 text-slate-500'
                                        }`}
                                >
                                    {isDebugMode ? '🛠️ DEBUG' : 'Debug'}
                                </button>
                            </div>
                        </div>

                        {/* Deck Editor Button */}
                        <button
                            onClick={() => setShowDeckEditor(true)}
                            className={`w-full p-3 rounded-lg border-2 transition-all duration-300 flex items-center justify-between gap-3 ${isCustom && isValid
                                ? 'border-green-600/60 bg-gradient-to-br from-green-900/30 to-slate-900/60'
                                : isCustom && !isValid
                                    ? 'border-red-600/60 bg-gradient-to-br from-red-900/30 to-slate-900/60'
                                    : 'border-purple-700/40 bg-gradient-to-br from-slate-800/60 to-slate-900/60'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isCustom && isValid
                                    ? 'bg-gradient-to-br from-green-600/30 to-green-700/30 border-green-600/40'
                                    : isCustom && !isValid
                                        ? 'bg-gradient-to-br from-red-600/30 to-red-700/30 border-red-600/40'
                                        : 'bg-gradient-to-br from-purple-600/30 to-purple-700/30 border-purple-600/40'
                                    }`}>
                                    <BookOpen className={isCustom && isValid ? 'text-green-300' : isCustom && !isValid ? 'text-red-300' : 'text-purple-300'} size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className={`text-base font-bold ${isCustom && isValid ? 'text-green-100' : isCustom && !isValid ? 'text-red-100' : 'text-purple-100'}`}>
                                        {isCustom ? 'Custom-Deck' : 'Standard-Deck'}
                                    </h3>
                                    <p className={`text-xs ${isCustom && isValid ? 'text-green-200/80' : isCustom && !isValid ? 'text-red-200/80' : 'text-purple-200/60'}`}>
                                        {isCustom ? `${cardCount}/${DECK_SIZE} Karten` : 'Alle Karten'}
                                    </p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-bold ${isCustom && isValid
                                ? 'bg-green-900/50 text-green-300 border border-green-600'
                                : isCustom && !isValid
                                    ? 'bg-red-900/50 text-red-300 border border-red-600'
                                    : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                                }`}>
                                {isCustom && isValid ? '✓' : isCustom && !isValid ? '⚠' : '◆'}
                            </div>
                        </button>

                        {/* Profile & Game Mode Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Player Profile Section */}
                            <div className="p-3 rounded-lg border border-slate-600/40 bg-gradient-to-br from-slate-800/60 to-slate-900/60 space-y-2">
                                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                    <User size={14} className="text-blue-400" />
                                    Dein Profil
                                </h3>
                                <div className="flex items-center gap-3">
                                    <button
                                        className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-500/50 flex items-center justify-center"
                                        title="Avatar (bald)"
                                    >
                                        <span className="text-2xl opacity-60">👤</span>
                                    </button>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={playerName}
                                            onChange={(e) => handlePlayerNameChange(e.target.value)}
                                            placeholder="Name..."
                                            maxLength={10}
                                            className="w-full bg-slate-900/60 border border-slate-600/50 rounded px-2 py-1.5 text-sm text-white font-semibold outline-none focus:border-blue-500/60"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Single Player Button */}
                            <button
                                onClick={() => onStartGame('single')}
                                className="group relative overflow-hidden p-3 rounded-lg border-2 border-amber-700/40 hover:border-amber-500/60 transition-all bg-gradient-to-br from-slate-800/60 to-slate-900/60 hover:from-amber-900/30 text-left flex items-center gap-3"
                            >
                                <div className="bg-gradient-to-br from-amber-600/30 to-amber-700/30 w-12 h-12 rounded-full flex items-center justify-center border border-amber-600/40 flex-shrink-0">
                                    <Cpu className="text-amber-300" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-amber-100">Gegen KI</h3>
                                    <p className="text-xs text-amber-200/60">Übe gegen den Computer</p>
                                </div>
                            </button>
                        </div>

                        {/* Multiplayer */}
                        <div className="p-4 rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-slate-800/60 to-slate-900/60 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 w-10 h-10 rounded-full flex items-center justify-center border border-emerald-600/40">
                                    <Globe className="text-emerald-300" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-emerald-100">Online spielen</h3>
                                    <p className="text-xs text-emerald-200/60">Fordere einen Freund heraus</p>
                                </div>
                            </div>

                            {status === 'idle' && (
                                <div className="space-y-2 pt-2 border-t border-slate-700/50">
                                    <div className="flex gap-2">
                                        <input
                                            value={peerIdInput}
                                            onChange={(e) => setPeerIdInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && peerIdInput.length >= 6) handleJoin(); }}
                                            placeholder="6-stelliger Code"
                                            className="bg-slate-900/60 border border-amber-700/40 rounded px-3 py-2 text-sm flex-1 text-amber-100 placeholder-amber-800/60 outline-none font-mono text-center tracking-widest"
                                            maxLength={6}
                                        />
                                        <button
                                            onClick={handleJoin}
                                            disabled={!peerIdInput || peerIdInput.length < 6}
                                            className="px-4 py-2 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 disabled:opacity-40 rounded font-semibold text-sm"
                                        >
                                            Beitreten
                                        </button>
                                    </div>
                                    {connectionError && (
                                        <div className="p-2 bg-red-900/50 border border-red-500/50 rounded text-red-300 text-xs text-center">
                                            {connectionError}
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <span className="text-amber-600/60 text-xs">- ODER -</span>
                                    </div>
                                    <button
                                        onClick={handleHost}
                                        className="w-full py-2 bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 rounded font-semibold text-sm"
                                    >
                                        Spiel hosten
                                    </button>
                                </div>
                            )}

                            {status === 'waiting' && (
                                <div className="space-y-3 pt-2">
                                    <div className="text-center">
                                        <p className="text-amber-300 font-semibold text-sm mb-2">Warte auf Gegner...</p>
                                        <div className="bg-slate-900/80 p-4 rounded-lg border border-amber-600/40 inline-block">
                                            <p className="text-xs text-amber-400/70 uppercase mb-1">Dein Code</p>
                                            <p className="text-3xl font-mono font-bold text-amber-100 tracking-widest">{myId || '...'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={copyToClipboard} className="p-2 bg-slate-700/60 hover:bg-slate-600/60 rounded text-xs flex items-center justify-center gap-1 border border-amber-700/30">
                                            <Copy size={12} className={copySuccess ? 'text-emerald-400' : 'text-amber-300'} />
                                            Code kopieren
                                        </button>
                                        <button onClick={copyLinkToClipboard} className="p-2 bg-slate-700/60 hover:bg-slate-600/60 rounded text-xs flex items-center justify-center gap-1 border border-amber-700/30">
                                            <Share2 size={12} className="text-blue-400" />
                                            Link teilen
                                        </button>
                                    </div>
                                    <button onClick={() => setShowQR(!showQR)} className="w-full p-2 bg-slate-700/60 hover:bg-slate-600/60 rounded text-xs flex items-center justify-center gap-1 border border-amber-700/30">
                                        <QrCode size={12} className="text-amber-300" />
                                        {showQR ? 'QR verbergen' : 'QR anzeigen'}
                                    </button>
                                    {showQR && myId && (
                                        <div className="flex justify-center p-3 bg-white rounded-lg">
                                            <QRCodeSVG value={`${window.location.origin}?join=${myId}`} size={120} />
                                        </div>
                                    )}
                                    <button onClick={() => setStatus('idle')} className="text-xs text-amber-500/60 hover:text-amber-400 underline block mx-auto">
                                        Abbrechen
                                    </button>
                                </div>
                            )}

                            {status === 'connecting' && (
                                <div className="text-center py-3">
                                    <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                                    <p className="text-emerald-300 font-semibold text-sm mt-2">Verbinde...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <DeckEditor isOpen={showDeckEditor} onClose={() => { refreshDeck(); setShowDeckEditor(false); }} />

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                onSettingChange={(key, value) => saveSettings({ [key]: value })}
                onReset={resetToDefaults}
            />

            {/* Settings Button - Fixed at bottom */}
            <button
                onClick={() => setShowSettings(true)}
                className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-lg text-gray-300 hover:text-white transition-all shadow-lg z-40"
            >
                <Settings size={18} />
                Einstellungen
            </button>
        </>
    );
};
