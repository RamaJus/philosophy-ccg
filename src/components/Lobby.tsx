import React, { useState, useEffect, useMemo, useRef } from 'react';
import { multiplayer } from '../network/MultiplayerManager';
import { Copy, QrCode, Share2, User, Settings, ChevronDown, Check, BookOpen } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DeckEditor } from './DeckEditor';
import { SettingsModal } from './SettingsModal';
import { TutorialModal } from './TutorialModal';
import { useDeck } from '../hooks/useDeck';
import { useSettings } from '../hooks/useSettings';
import { cardDatabase } from '../data/cards';
import { AvatarSelectionModal } from './AvatarSelectionModal';
import { getAvatarById, DEFAULT_AVATAR_ID } from '../data/avatars';
import { AI_DECK_IDS } from '../data/aiDeck';

interface LobbyProps {
    onStartGame: (mode: 'single' | 'multiplayer_host' | 'multiplayer_client', aiDeckIds?: string[]) => void;
    isDebugMode: boolean;
    setIsDebugMode: (value: boolean) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onStartGame, isDebugMode, setIsDebugMode }) => {
    const [myId, setMyId] = useState<string>('');
    const [peerIdInput, setPeerIdInput] = useState('');
    const [showTutorial, setShowTutorial] = useState(false);
    const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting'>('idle');
    const [copySuccess, setCopySuccess] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [showDeckEditor, setShowDeckEditor] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAvatarSelection, setShowAvatarSelection] = useState(false);
    const [showDeckDropdown, setShowDeckDropdown] = useState(false);
    const [showAiDeckDropdown, setShowAiDeckDropdown] = useState(false);
    const [selectedAiDeck, setSelectedAiDeck] = useState<'all' | 'ai_deck'>('all');
    const deckDropdownRef = useRef<HTMLDivElement>(null);
    const aiDeckDropdownRef = useRef<HTMLDivElement>(null);
    const [playerName, setPlayerName] = useState(() => {
        return localStorage.getItem('philosophy-ccg-player-name') || 'Spieler';
    });

    const { cardCount, isValid, isCustom, DECK_SIZE, refreshDeck, savedDecks, activeDeck, activeDeckId, selectDeck } = useDeck();
    const { settings, saveSettings, resetToDefaults, setAvatarId } = useSettings();

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

    // Close deck dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (deckDropdownRef.current && !deckDropdownRef.current.contains(event.target as Node)) {
                setShowDeckDropdown(false);
            }
        };
        if (showDeckDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showDeckDropdown]);

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
                // Read deck from new v2 format first, then fallback to v1
                let deckIds: string[] | undefined = undefined;
                if (isCustom && isValid) {
                    const storedV2 = localStorage.getItem('philosophy-ccg-decks-v2');
                    if (storedV2) {
                        try {
                            const parsedV2 = JSON.parse(storedV2);
                            if (parsedV2.version === 2 && parsedV2.activeDeckId) {
                                const activeDeck = parsedV2.decks?.find((d: any) => d.id === parsedV2.activeDeckId);
                                if (activeDeck?.cardIds?.length > 0) {
                                    deckIds = activeDeck.cardIds;
                                }
                            }
                        } catch (e) { /* ignore */ }
                    }
                    if (!deckIds) {
                        const deckStrV1 = localStorage.getItem('philosophy-ccg-deck');
                        if (deckStrV1) {
                            try {
                                const parsedV1 = JSON.parse(deckStrV1);
                                if (parsedV1.isCustom && parsedV1.cardIds?.length > 0) {
                                    deckIds = parsedV1.cardIds;
                                }
                            } catch (e) { /* ignore */ }
                        }
                    }
                }
                multiplayer.sendHandshake(deckIds, playerName, settings.avatarId);
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

                        {/* Deck Editor Button with Dropdown */}
                        <div className="relative" ref={deckDropdownRef}>
                            <div className={`w-full rounded-lg border-2 transition-all duration-300 flex items-stretch ${isCustom && isValid
                                ? 'border-green-600/60 bg-gradient-to-br from-green-900/30 to-slate-900/60'
                                : isCustom && !isValid
                                    ? 'border-red-600/60 bg-gradient-to-br from-red-900/30 to-slate-900/60'
                                    : 'border-purple-700/40 bg-gradient-to-br from-slate-800/60 to-slate-900/60'
                                }`}>
                                {/* Main Button - Opens Editor */}
                                <button
                                    onClick={() => setShowDeckEditor(true)}
                                    className={`group relative overflow-hidden flex-1 p-3 rounded-l-lg transition-all duration-300 flex items-center gap-3 ${isCustom && isValid
                                        ? 'hover:bg-green-800/30'
                                        : isCustom && !isValid
                                            ? 'hover:bg-red-800/30'
                                            : 'hover:bg-purple-900/30'
                                        }`}
                                >
                                    {/* Stacked Card Back Icon - Layer Effect */}
                                    <div className="relative w-12 h-12 flex-shrink-0">
                                        <div
                                            className="absolute w-8 h-11 rounded-sm border border-amber-700/50 shadow-md"
                                            style={{
                                                backgroundImage: 'url(/images/deck_icon.jpg)',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                transform: 'rotate(-8deg)',
                                                left: '0px',
                                                top: '2px'
                                            }}
                                        />
                                        <div
                                            className="absolute w-8 h-11 rounded-sm border border-amber-600/60 shadow-md"
                                            style={{
                                                backgroundImage: 'url(/images/deck_icon.jpg)',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                transform: 'rotate(-2deg)',
                                                left: '6px',
                                                top: '1px'
                                            }}
                                        />
                                        <div
                                            className="absolute w-8 h-11 rounded-sm border border-amber-500/70 shadow-lg"
                                            style={{
                                                backgroundImage: 'url(/images/deck_icon.jpg)',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                transform: 'rotate(4deg)',
                                                left: '12px',
                                                top: '0px'
                                            }}
                                        />
                                    </div>
                                    <div className="text-left flex-1">
                                        <h3 className={`text-base font-bold ${isCustom && isValid ? 'text-green-100' : isCustom && !isValid ? 'text-red-100' : 'text-purple-100'}`}>
                                            Deck zusammenstellen
                                        </h3>
                                        <p className={`text-xs ${isCustom && isValid ? 'text-green-200/70' : isCustom && !isValid ? 'text-red-200/70' : 'text-purple-200/50'}`}>
                                            Custom-Deck mit 60 Philosophen oder mit allen Karten spielen
                                        </p>
                                        <p className={`text-xs mt-1 font-semibold ${isCustom ? (isValid ? 'text-green-300' : 'text-red-300') : 'text-slate-400'}`}>
                                            Aktuell: {activeDeck ? activeDeck.name : 'Alle Karten'} ({cardCount}/{DECK_SIZE}) {isCustom && (isValid ? '✓' : '⚠')}
                                        </p>
                                    </div>
                                </button>

                                {/* Dropdown Toggle Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowDeckDropdown(!showDeckDropdown); }}
                                    className={`px-3 border-l transition-all duration-300 flex items-center justify-center ${isCustom && isValid
                                        ? 'border-green-600/40 hover:bg-green-800/40'
                                        : isCustom && !isValid
                                            ? 'border-red-600/40 hover:bg-red-800/40'
                                            : 'border-purple-700/30 hover:bg-purple-900/40'
                                        }`}
                                >
                                    <ChevronDown
                                        size={20}
                                        className={`transition-transform duration-200 ${showDeckDropdown ? 'rotate-180' : ''} ${isCustom && isValid ? 'text-green-300' : isCustom && !isValid ? 'text-red-300' : 'text-purple-300'}`}
                                    />
                                </button>
                            </div>

                            {/* Dropdown Menu */}
                            {showDeckDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800/95 border border-slate-600 rounded-lg shadow-xl overflow-hidden backdrop-blur-sm">
                                    {/* Saved Decks */}
                                    {savedDecks.map(deck => (
                                        <button
                                            key={deck.id}
                                            onClick={() => { selectDeck(deck.id); setShowDeckDropdown(false); }}
                                            className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors ${activeDeckId === deck.id ? 'bg-slate-700/30' : ''}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {activeDeckId === deck.id && <Check size={14} className="text-green-400" />}
                                                <span className={`text-sm ${activeDeckId === deck.id ? 'text-white font-semibold' : 'text-slate-300'}`}>
                                                    {deck.name}
                                                </span>
                                            </div>
                                            <span className={`text-xs ${deck.cardIds.length === DECK_SIZE ? 'text-green-400' : 'text-red-400'}`}>
                                                {deck.cardIds.length}/{DECK_SIZE}
                                            </span>
                                        </button>
                                    ))}

                                    {/* Divider if there are saved decks */}
                                    {savedDecks.length > 0 && (
                                        <div className="border-t border-slate-600 my-1" />
                                    )}

                                    {/* All Cards Option */}
                                    <button
                                        onClick={() => { selectDeck(null); setShowDeckDropdown(false); }}
                                        className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors ${activeDeckId === null ? 'bg-slate-700/30' : ''}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {activeDeckId === null && <Check size={14} className="text-green-400" />}
                                            <span className={`text-sm ${activeDeckId === null ? 'text-white font-semibold' : 'text-slate-400'}`}>
                                                ◆ Alle Karten (Standard)
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

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
                                        onClick={() => setShowAvatarSelection(true)}
                                        className="w-12 h-12 rounded-lg bg-cover bg-center border border-amber-500/50 hover:border-amber-400 transition-colors shadow-lg relative group overflow-hidden"
                                        style={{ backgroundImage: `url(${getAvatarById(settings.avatarId)?.image || getAvatarById(DEFAULT_AVATAR_ID)!.image})` }}
                                        title="Avatar ändern"
                                    >
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
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

                            {/* Single Player Section with AI Deck Selection */}
                            <div className="relative" ref={aiDeckDropdownRef}>
                                <div className="flex rounded-lg border-2 border-amber-700/40 hover:border-amber-500/60 transition-all bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden min-h-[76px]">
                                    {/* Main Button */}
                                    <button
                                        onClick={() => onStartGame('single', selectedAiDeck === 'ai_deck' ? AI_DECK_IDS : undefined)}
                                        className="group flex-1 p-3 text-left flex items-center gap-3 hover:from-amber-900/30 transition-all"
                                    >
                                        <div
                                            className="w-12 h-12 rounded-lg bg-cover bg-center border border-amber-500/50 shadow-lg flex-shrink-0"
                                            style={{ backgroundImage: 'url(/images/icon_ki.png)' }}
                                        />
                                        <div>
                                            <h3 className="text-base font-bold text-amber-100">Gegen KI</h3>
                                            <p className="text-xs text-amber-200/60">
                                                KI-Deck: {selectedAiDeck === 'ai_deck' ? 'KI-Deck (60)' : 'Alle Karten'}
                                            </p>
                                        </div>
                                    </button>

                                    {/* Dropdown Toggle */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowAiDeckDropdown(!showAiDeckDropdown); }}
                                        className="px-3 border-l border-amber-600/40 hover:bg-amber-800/40 transition-all flex items-center justify-center"
                                    >
                                        <ChevronDown
                                            size={20}
                                            className={`transition-transform duration-200 ${showAiDeckDropdown ? 'rotate-180' : ''} text-amber-300`}
                                        />
                                    </button>
                                </div>

                                {/* AI Deck Dropdown Menu */}
                                {showAiDeckDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-800/95 border border-slate-600 rounded-lg shadow-xl overflow-hidden backdrop-blur-sm">
                                        <button
                                            onClick={() => { setSelectedAiDeck('all'); setShowAiDeckDropdown(false); }}
                                            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors ${selectedAiDeck === 'all' ? 'bg-amber-900/30' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-amber-100 font-medium">Alle Karten</span>
                                                <span className="text-xs text-slate-400">KI spielt mit allen Karten</span>
                                            </div>
                                            {selectedAiDeck === 'all' && <Check size={16} className="text-amber-400" />}
                                        </button>
                                        <button
                                            onClick={() => { setSelectedAiDeck('ai_deck'); setShowAiDeckDropdown(false); }}
                                            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors border-t border-slate-700/50 ${selectedAiDeck === 'ai_deck' ? 'bg-amber-900/30' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-amber-100 font-medium">KI-Deck</span>
                                                <span className="text-xs text-slate-400">Optimiertes 60-Karten Deck</span>
                                            </div>
                                            {selectedAiDeck === 'ai_deck' && <Check size={16} className="text-amber-400" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Multiplayer */}
                        <div className="p-4 rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-slate-800/60 to-slate-900/60 space-y-3">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-lg bg-cover bg-center border border-emerald-500/50 shadow-lg flex-shrink-0"
                                    style={{ backgroundImage: 'url(/images/icon_online.png)' }}
                                />
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

            {/* Fixed Bottom Buttons */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-40">
                <button
                    onClick={() => setShowTutorial(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-700/50 rounded-lg text-emerald-100 transition-all shadow-lg"
                >
                    <BookOpen size={18} />
                    Anleitung
                </button>
                <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-lg text-gray-300 hover:text-white transition-all shadow-lg"
                >
                    <Settings size={18} />
                    Einstellungen
                </button>
            </div>
            {/* Avatars Modal */}
            <AvatarSelectionModal
                isOpen={showAvatarSelection}
                onClose={() => setShowAvatarSelection(false)}
                currentAvatarId={settings.avatarId}
                onSelectAvatar={setAvatarId}
            />

            {/* Tutorial Modal */}
            <TutorialModal
                isOpen={showTutorial}
                onClose={() => setShowTutorial(false)}
            />
        </>
    );
};
