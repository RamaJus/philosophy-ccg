import React, { useState, useMemo } from 'react';
import { X, Download, Upload, Trash2, Wand2, Plus, Minus, ChevronDown } from 'lucide-react';
import { cardDatabase as cards } from '../data/cards';
import { Card } from '../types';
import { useDeck } from '../hooks/useDeck';

// Get unique schools from all cards
const getAllSchools = (): string[] => {
    const schools = new Set<string>();
    cards.forEach(c => c.school?.forEach(s => schools.add(s)));
    return Array.from(schools).sort();
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
            // School filter
            if (schoolFilter !== 'all' && !card.school?.includes(schoolFilter)) {
                return false;
            }
            // Type filter
            if (typeFilter !== 'all' && card.type !== typeFilter) {
                return false;
            }
            // Cost filter
            if (costFilter !== 'all') {
                const cost = card.cost;
                switch (costFilter) {
                    case '0-2': if (cost > 2) return false; break;
                    case '3-4': if (cost < 3 || cost > 4) return false; break;
                    case '5-6': if (cost < 5 || cost > 6) return false; break;
                    case '7+': if (cost < 7) return false; break;
                }
            }
            // Search text
            if (searchText && !card.name.toLowerCase().includes(searchText.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [schoolFilter, typeFilter, costFilter, searchText]);

    // Cards not yet in deck (for left panel)
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-amber-600/30 w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-amber-400">Deck Editor</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${isValid
                            ? 'bg-green-900/50 text-green-400 border border-green-600'
                            : 'bg-red-900/50 text-red-400 border border-red-600'
                            }`}>
                            {cardCount}/{DECK_SIZE} Karten
                        </span>
                        {!isCustom && (
                            <span className="px-3 py-1 rounded-full text-sm bg-blue-900/50 text-blue-400 border border-blue-600">
                                Standard-Deck
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Available Cards */}
                    <div className="flex-1 flex flex-col border-r border-slate-700">
                        {/* Filters */}
                        <div className="p-4 border-b border-slate-700 space-y-3">
                            <div className="flex gap-2 flex-wrap">
                                {/* School Filter */}
                                <div className="relative">
                                    <select
                                        value={schoolFilter}
                                        onChange={(e) => setSchoolFilter(e.target.value)}
                                        className="appearance-none bg-slate-700 text-white px-3 py-2 pr-8 rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none text-sm"
                                    >
                                        <option value="all">Alle Schulen</option>
                                        {allSchools.map(school => (
                                            <option key={school} value={school}>{school}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>

                                {/* Type Filter */}
                                <div className="relative">
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="appearance-none bg-slate-700 text-white px-3 py-2 pr-8 rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none text-sm"
                                    >
                                        <option value="all">Alle Typen</option>
                                        <option value="Philosoph">Philosoph</option>
                                        <option value="Zauber">Zauber</option>
                                        <option value="Werk">Werk</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>

                                {/* Cost Filter */}
                                <div className="relative">
                                    <select
                                        value={costFilter}
                                        onChange={(e) => setCostFilter(e.target.value)}
                                        className="appearance-none bg-slate-700 text-white px-3 py-2 pr-8 rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none text-sm"
                                    >
                                        <option value="all">Alle Kosten</option>
                                        <option value="0-2">0-2</option>
                                        <option value="3-4">3-4</option>
                                        <option value="5-6">5-6</option>
                                        <option value="7+">7+</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Karte suchen..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-amber-500 focus:outline-none text-sm"
                            />

                            {/* Add All Button */}
                            {availableCards.length > 0 && (
                                <button
                                    onClick={handleAddAllFiltered}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Plus size={16} />
                                    Alle {availableCards.length} hinzufügen
                                </button>
                            )}
                        </div>

                        {/* Available Cards List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="text-sm text-gray-400 mb-2">
                                Verfügbar: {availableCards.length} Karten
                            </div>
                            <div className="space-y-1">
                                {availableCards.map(card => (
                                    <div
                                        key={card.id}
                                        onClick={() => addCard(card.id)}
                                        className="flex items-center gap-3 p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg cursor-pointer transition-colors group"
                                    >
                                        <span className="w-6 h-6 flex items-center justify-center bg-blue-900 text-blue-300 rounded text-xs font-bold">
                                            {card.cost}
                                        </span>
                                        <span className="flex-1 text-white text-sm">{card.name}</span>
                                        <span className="text-xs text-gray-500">{card.type}</span>
                                        <Plus size={16} className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Current Deck */}
                    <div className="w-80 flex flex-col">
                        {/* Deck Actions */}
                        <div className="p-4 border-b border-slate-700 space-y-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={autoFill}
                                    disabled={cardCount >= DECK_SIZE}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm"
                                >
                                    <Wand2 size={16} />
                                    Auto-Füllen
                                </button>
                                <button
                                    onClick={clearDeck}
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExport}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                                >
                                    <Download size={16} />
                                    Export
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                                >
                                    <Upload size={16} />
                                    Import
                                </button>
                            </div>
                            <button
                                onClick={resetToDefault}
                                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors text-sm"
                            >
                                Auf Standard zurücksetzen
                            </button>
                        </div>

                        {/* Deck Cards List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="text-sm text-gray-400 mb-2">
                                Dein Deck ({cardCount} Karten)
                            </div>
                            <div className="space-y-1">
                                {deckCards.map(card => (
                                    <div
                                        key={card.id}
                                        onClick={() => removeCard(card.id)}
                                        className="flex items-center gap-3 p-2 bg-amber-900/20 hover:bg-red-900/30 rounded-lg cursor-pointer transition-colors group border border-amber-700/30"
                                    >
                                        <span className="w-6 h-6 flex items-center justify-center bg-blue-900 text-blue-300 rounded text-xs font-bold">
                                            {card.cost}
                                        </span>
                                        <span className="flex-1 text-white text-sm">{card.name}</span>
                                        <Minus size={16} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Validation Message */}
                        {isCustom && !isValid && (
                            <div className="p-4 border-t border-slate-700 bg-red-900/20">
                                <p className="text-red-400 text-sm text-center">
                                    Dein Deck braucht genau {DECK_SIZE} Karten zum Spielen.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
