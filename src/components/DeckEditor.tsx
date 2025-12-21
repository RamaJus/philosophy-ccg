import React, { useState, useMemo } from 'react';
import { X, Download, Upload, Trash2, Wand2, Plus, Minus, ChevronDown, BookOpen, Sparkles } from 'lucide-react';
import { cardDatabase as cards } from '../data/cards';
import { Card } from '../types';
import { useDeck } from '../hooks/useDeck';

// Get unique schools from all cards
const getAllSchools = (): string[] => {
    const schools = new Set<string>();
    cards.forEach(c => c.school?.forEach(s => schools.add(s)));
    return Array.from(schools).sort();
};

// School color mapping
const getSchoolColor = (school: string): string => {
    const colors: Record<string, string> = {
        'Empirismus': 'bg-blue-600',
        'Idealismus': 'bg-purple-600',
        'Rationalismus': 'bg-amber-600',
        'Logik': 'bg-cyan-600',
        'Existenzialismus': 'bg-red-600',
        'Skeptizismus': 'bg-gray-600',
        'Moralphilosophie': 'bg-green-600',
        'Phänomenologie': 'bg-pink-600',
        'Metaphysik': 'bg-indigo-600',
        'Stoizismus': 'bg-teal-600',
        'Hedonismus': 'bg-orange-600',
        'Pragmatismus': 'bg-lime-600',
    };
    return colors[school] || 'bg-slate-600';
};

// Type badge colors
const getTypeBadge = (type: string): { bg: string; text: string; emoji: string } => {
    switch (type) {
        case 'Philosoph': return { bg: 'bg-amber-900/60', text: 'text-amber-300', emoji: '👤' };
        case 'Zauber': return { bg: 'bg-purple-900/60', text: 'text-purple-300', emoji: '✨' };
        case 'Werk': return { bg: 'bg-blue-900/60', text: 'text-blue-300', emoji: '📚' };
        default: return { bg: 'bg-slate-700', text: 'text-slate-300', emoji: '' };
    }
};

interface DeckEditorProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DeckEditor: React.FC<DeckEditorProps> = ({ isOpen, onClose }) => {
    const {
        deck,
        cardCount,
        isValid,
        isCustom,
        addCard,
        removeCard,
        addCards,
        clearDeck,
        resetToDefault,
        autoFill,
        exportDeck,
        importDeck,
        DECK_SIZE
    } = useDeck();

    // Filter state
    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [costFilter, setCostFilter] = useState<string>('all');
    const [searchText, setSearchText] = useState('');

    const allSchools = useMemo(() => getAllSchools(), []);

    // Filter available cards
    const filteredCards = useMemo(() => {
        return cards.filter(card => {
            if (schoolFilter !== 'all' && !card.school?.includes(schoolFilter)) return false;
            if (typeFilter !== 'all' && card.type !== typeFilter) return false;
            if (costFilter !== 'all') {
                const cost = card.cost;
                switch (costFilter) {
                    case '0-2': if (cost > 2) return false; break;
                    case '3-4': if (cost < 3 || cost > 4) return false; break;
                    case '5-6': if (cost < 5 || cost > 6) return false; break;
                    case '7+': if (cost < 7) return false; break;
                }
            }
            if (searchText && !card.name.toLowerCase().includes(searchText.toLowerCase())) return false;
            return true;
        });
    }, [schoolFilter, typeFilter, costFilter, searchText]);

    // Cards not yet in deck
    const availableCards = useMemo(() => {
        return filteredCards.filter(c => !deck.cardIds.includes(c.id));
    }, [filteredCards, deck.cardIds]);

    // Cards in deck with card objects
    const deckCards = useMemo(() => {
        return deck.cardIds
            .map(id => cards.find(c => c.id === id))
            .filter((c): c is Card => c !== undefined)
            .sort((a, b) => a.cost - b.cost);
    }, [deck.cardIds]);

    // Handle export
    const handleExport = () => {
        const json = exportDeck();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'philosophy-deck.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Handle import
    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    if (importDeck(content)) {
                        alert('Deck erfolgreich importiert!');
                    } else {
                        alert('Fehler beim Importieren des Decks.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    // Add all filtered cards
    const handleAddAllFiltered = () => {
        const idsToAdd = availableCards.map(c => c.id);
        addCards(idsToAdd);
    };

    // Card Row Component
    const CardRow: React.FC<{ card: Card; isInDeck: boolean; onClick: () => void }> = ({ card, isInDeck, onClick }) => {
        const typeBadge = getTypeBadge(card.type);

        return (
            <div
                onClick={onClick}
                className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all group ${isInDeck
                        ? 'bg-green-900/30 hover:bg-red-900/40 border border-green-700/50'
                        : 'bg-slate-700/40 hover:bg-green-900/30 border border-slate-600/30'
                    }`}
            >
                {/* Cost */}
                <div className="w-8 h-8 flex items-center justify-center bg-blue-900 text-blue-200 rounded-lg text-sm font-bold shadow-md flex-shrink-0">
                    {card.cost}
                </div>

                {/* Type Badge */}
                <div className={`w-7 h-7 flex items-center justify-center ${typeBadge.bg} rounded-md flex-shrink-0`}>
                    <span className="text-sm">{typeBadge.emoji}</span>
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{card.name}</div>
                    {/* Schools */}
                    {card.school && card.school.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                            {card.school.slice(0, 2).map(school => (
                                <span
                                    key={school}
                                    className={`${getSchoolColor(school)} text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium`}
                                >
                                    {school.slice(0, 4)}
                                </span>
                            ))}
                            {card.school.length > 2 && (
                                <span className="text-slate-500 text-[10px]">+{card.school.length - 2}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Add/Remove Icon */}
                <div className={`w-6 h-6 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${isInDeck
                        ? 'bg-red-700/50 group-hover:bg-red-600'
                        : 'bg-green-700/50 opacity-0 group-hover:opacity-100'
                    }`}>
                    {isInDeck ? <Minus size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 border-amber-600/40 w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-amber-400" size={28} />
                            <h2 className="text-3xl font-bold text-amber-400">Deck Editor</h2>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-base font-bold ${isValid
                                ? 'bg-green-900/60 text-green-300 border-2 border-green-500'
                                : 'bg-red-900/60 text-red-300 border-2 border-red-500'
                            }`}>
                            {cardCount}/{DECK_SIZE} Karten
                        </div>
                        {!isCustom && (
                            <span className="px-4 py-2 rounded-full text-base bg-blue-900/50 text-blue-300 border-2 border-blue-500 font-bold">
                                Standard-Deck
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <X size={28} className="text-gray-400" />
                    </button>
                </div>

                {/* Main Content - Two Equal Columns */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Available Cards */}
                    <div className="flex-1 flex flex-col border-r-2 border-slate-600">
                        {/* Panel Header */}
                        <div className="p-4 bg-slate-800/80 border-b border-slate-700">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                    <BookOpen className="text-slate-300" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Verfügbare Karten</h3>
                                    <p className="text-slate-400 text-sm">{availableCards.length} Karten verfügbar</p>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 flex-wrap mb-3">
                                <div className="relative">
                                    <select
                                        value={schoolFilter}
                                        onChange={(e) => setSchoolFilter(e.target.value)}
                                        className="appearance-none bg-slate-700 text-white px-3 py-2 pr-8 rounded-lg border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                                    >
                                        <option value="all">Alle Schulen</option>
                                        {allSchools.map(school => (
                                            <option key={school} value={school}>{school}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>

                                <div className="relative">
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="appearance-none bg-slate-700 text-white px-3 py-2 pr-8 rounded-lg border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                                    >
                                        <option value="all">Alle Typen</option>
                                        <option value="Philosoph">👤 Philosoph</option>
                                        <option value="Zauber">✨ Zauber</option>
                                        <option value="Werk">📚 Werk</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>

                                <div className="relative">
                                    <select
                                        value={costFilter}
                                        onChange={(e) => setCostFilter(e.target.value)}
                                        className="appearance-none bg-slate-700 text-white px-3 py-2 pr-8 rounded-lg border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                                    >
                                        <option value="all">Alle Kosten</option>
                                        <option value="0-2">0-2 💧</option>
                                        <option value="3-4">3-4 💧</option>
                                        <option value="5-6">5-6 💧</option>
                                        <option value="7+">7+ 💧</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Search */}
                            <input
                                type="text"
                                placeholder="🔍 Karte suchen..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                            />

                            {/* Add All Button */}
                            {availableCards.length > 0 && (
                                <button
                                    onClick={handleAddAllFiltered}
                                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors font-bold text-base"
                                >
                                    <Plus size={20} />
                                    Alle {availableCards.length} hinzufügen
                                </button>
                            )}
                        </div>

                        {/* Available Cards List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                            {availableCards.map(card => (
                                <CardRow key={card.id} card={card} isInDeck={false} onClick={() => addCard(card.id)} />
                            ))}
                        </div>
                    </div>

                    {/* Right Panel - Your Deck */}
                    <div className="flex-1 flex flex-col bg-slate-900/30">
                        {/* Panel Header */}
                        <div className="p-4 bg-green-900/20 border-b border-green-700/40">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isValid ? 'bg-green-700' : 'bg-red-700'}`}>
                                    <Sparkles className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-green-100">Dein Deck</h3>
                                    <p className={`text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                                        {isValid ? '✓ Bereit zum Spielen' : `Noch ${DECK_SIZE - cardCount} Karten benötigt`}
                                    </p>
                                </div>
                            </div>

                            {/* Deck Actions */}
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <button
                                    onClick={autoFill}
                                    disabled={cardCount >= DECK_SIZE}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Wand2 size={16} />
                                    Auto-Füllen
                                </button>
                                <button
                                    onClick={clearDeck}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Trash2 size={16} />
                                    Leeren
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <button
                                    onClick={handleExport}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                                >
                                    <Download size={16} />
                                    Export
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                                >
                                    <Upload size={16} />
                                    Import
                                </button>
                            </div>
                            <button
                                onClick={resetToDefault}
                                className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors text-sm border border-slate-600"
                            >
                                Auf Standard zurücksetzen
                            </button>
                        </div>

                        {/* Deck Cards List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                            {deckCards.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Dein Deck ist leer</p>
                                    <p className="text-sm">Klicke links auf Karten, um sie hinzuzufügen</p>
                                </div>
                            ) : (
                                deckCards.map(card => (
                                    <CardRow key={card.id} card={card} isInDeck={true} onClick={() => removeCard(card.id)} />
                                ))
                            )}
                        </div>

                        {/* Validation Message */}
                        {isCustom && !isValid && (
                            <div className="p-4 border-t-2 border-red-600 bg-red-900/30">
                                <p className="text-red-300 text-base text-center font-medium">
                                    ⚠️ Dein Deck braucht genau {DECK_SIZE} Karten zum Spielen.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
