import React, { useState, useMemo } from 'react';
import { X, Download, Upload, Trash2, Wand2, Plus, Minus, ChevronDown, ChevronUp, BookOpen, Sparkles, Eye, BarChart3, Save, Edit2, Check } from 'lucide-react';
import { cardDatabase as cards } from '../data/cards';
import { Card } from '../types';
import { useDeck } from '../hooks/useDeck';
import { Card as CardComponent, CARD_HEIGHT, PREVIEW_SCALE, TOOLTIP_WIDTH, getDisplayName } from './Card';

// Valid schools in the game (only these should be shown)
const VALID_SCHOOLS = [
    'Empirismus',
    'Existentialismus',
    'Idealismus',
    'Logik',
    'Metaphysik',
    'Moralphilosophie',
    'Politik',
    'Rationalismus',
    'Religion',
    'Skeptizismus',
    'Stoizismus',
    'Vorsokratiker'
];

// Get unique schools from all cards (filtered to valid ones)
const getAllSchools = (): string[] => {
    const schools = new Set<string>();
    cards.forEach(c => c.school?.forEach(s => {
        if (VALID_SCHOOLS.includes(s)) schools.add(s);
    }));
    return Array.from(schools).sort();
};

// School color mapping - unique color for each school
const getSchoolColor = (school: string): string => {
    const colors: Record<string, string> = {
        'Empirismus': 'bg-blue-500',
        'Existentialismus': 'bg-rose-600',
        'Idealismus': 'bg-violet-500',
        'Logik': 'bg-cyan-500',
        'Metaphysik': 'bg-indigo-500',
        'Moralphilosophie': 'bg-emerald-500',
        'Politik': 'bg-orange-500',
        'Rationalismus': 'bg-amber-500',
        'Religion': 'bg-purple-600',
        'Skeptizismus': 'bg-slate-500',
        'Stoizismus': 'bg-stone-500',
        'Vorsokratiker': 'bg-teal-500',
    };
    return colors[school] || 'bg-gray-500';
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

// Sort options
type SortOption = 'cost-asc' | 'cost-desc' | 'name-asc' | 'name-desc' | 'type';

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
        DECK_SIZE,
        // Multi-deck functions
        savedDecks,
        activeDeck,
        activeDeckId,
        canCreateNewDeck,
        selectDeck,
        saveAsNewDeck,
        saveDeck,
        renameDeck,
        deleteDeck,
        hasUnsavedChanges
    } = useDeck();

    // Filter state for available cards
    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [costFilter, setCostFilter] = useState<string>('all');
    const [searchText, setSearchText] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('cost-asc');

    // Filter state for deck
    const [deckSchoolFilter, setDeckSchoolFilter] = useState<string>('all');
    const [deckTypeFilter, setDeckTypeFilter] = useState<string>('all');
    const [deckSortBy, setDeckSortBy] = useState<SortOption>('cost-asc');

    // Tooltip state
    const [previewCard, setPreviewCard] = useState<Card | null>(null);

    // Statistics panel state
    const [showStats, setShowStats] = useState(false);

    // Deck management state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const allSchools = useMemo(() => getAllSchools(), []);

    // Sort function
    const sortCards = (cardsToSort: Card[], sort: SortOption): Card[] => {
        return [...cardsToSort].sort((a, b) => {
            switch (sort) {
                case 'cost-asc': return a.cost - b.cost;
                case 'cost-desc': return b.cost - a.cost;
                case 'name-asc': return getDisplayName(a).localeCompare(getDisplayName(b), 'de');
                case 'name-desc': return getDisplayName(b).localeCompare(getDisplayName(a), 'de');
                case 'type': return a.type.localeCompare(b.type, 'de');
                default: return 0;
            }
        });
    };

    // Filter available cards
    const filteredCards = useMemo(() => {
        let result = cards.filter(card => {
            // Hide transformation cards (created dynamically in-game, not for deck building)
            if (card.isTransformation) return false;
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
        return sortCards(result, sortBy);
    }, [schoolFilter, typeFilter, costFilter, searchText, sortBy]);

    // Cards not yet in deck
    const availableCards = useMemo(() => {
        return filteredCards.filter(c => !deck.cardIds.includes(c.id));
    }, [filteredCards, deck.cardIds]);

    // Cards in deck with filters
    const deckCards = useMemo(() => {
        let result = deck.cardIds
            .map(id => cards.find(c => c.id === id))
            .filter((c): c is Card => c !== undefined);

        // Apply deck filters
        if (deckSchoolFilter !== 'all') {
            result = result.filter(c => c.school?.includes(deckSchoolFilter));
        }
        if (deckTypeFilter !== 'all') {
            result = result.filter(c => c.type === deckTypeFilter);
        }

        return sortCards(result, deckSortBy);
    }, [deck.cardIds, deckSchoolFilter, deckTypeFilter, deckSortBy]);

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

    // Get valid schools for a card (only show if Philosoph)
    const getDisplaySchools = (card: Card): string[] => {
        if (card.type !== 'Philosoph') return [];
        return (card.school || []).filter(s => VALID_SCHOOLS.includes(s));
    };

    // Card Row Component
    const CardRow: React.FC<{ card: Card; isInDeck: boolean; onClick: () => void }> = ({ card, isInDeck, onClick }) => {
        const typeBadge = getTypeBadge(card.type);
        const displaySchools = getDisplaySchools(card);

        return (
            <div
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

                {/* Name and Schools */}
                <div className="flex-1 min-w-0" onClick={onClick}>
                    <div className="text-white font-medium text-sm truncate">{card.name}</div>
                    {displaySchools.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                            {displaySchools.slice(0, 2).map(school => (
                                <span
                                    key={school}
                                    className={`${getSchoolColor(school)} text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium`}
                                >
                                    {school.slice(0, 4)}
                                </span>
                            ))}
                            {displaySchools.length > 2 && (
                                <span className="text-slate-500 text-[10px]">+{displaySchools.length - 2}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Preview Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); setPreviewCard(card); }}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-600/50 hover:bg-slate-500 transition-all flex-shrink-0"
                    title="Karte anzeigen"
                >
                    <Eye size={12} className="text-white" />
                </button>

                {/* Add/Remove Icon */}
                <div
                    onClick={onClick}
                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${isInDeck
                        ? 'bg-red-700/50 group-hover:bg-red-600'
                        : 'bg-green-700/50 opacity-0 group-hover:opacity-100'
                        }`}
                >
                    {isInDeck ? <Minus size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
                </div>
            </div>
        );
    };

    // Filter Select Component
    const FilterSelect: React.FC<{ value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }> =
        ({ value, onChange, options }) => (
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="appearance-none bg-slate-700 text-white px-3 py-1.5 pr-7 rounded-lg border border-slate-500 focus:border-amber-500 focus:outline-none text-xs"
                >
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
        );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 border-amber-600/40 w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl">
                {/* Simple Header - Just Title and Close */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-amber-400" size={24} />
                        <h2 className="text-2xl font-bold text-amber-400">Deck Editor</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                {/* Main Content - Sidebar + Two Card Panels */}
                <div className="flex flex-1 overflow-hidden">

                    {/* LEFT SIDEBAR - Deck Management */}
                    <div className="w-56 flex flex-col border-r-2 border-slate-600 bg-slate-900/60">
                        {/* Sidebar Header */}
                        <div className="p-3 border-b border-slate-700">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Meine Decks</h3>
                        </div>

                        {/* Deck List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {/* "All Cards" Option */}
                            <button
                                onClick={() => selectDeck(null)}
                                className={`w-full text-left p-2 rounded-lg transition-all ${!activeDeckId
                                    ? 'bg-amber-600/30 border border-amber-500 text-amber-200'
                                    : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">◆</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">Alle Karten</div>
                                        <div className="text-xs text-slate-500">Standard</div>
                                    </div>
                                </div>
                            </button>

                            {/* Saved Decks */}
                            {savedDecks.map(deckItem => {
                                const isActive = activeDeckId === deckItem.id;
                                const deckValid = deckItem.cardIds.length === DECK_SIZE;
                                return (
                                    <button
                                        key={deckItem.id}
                                        onClick={() => selectDeck(deckItem.id)}
                                        className={`w-full text-left p-2 rounded-lg transition-all ${isActive
                                            ? 'bg-green-900/40 border border-green-600 text-green-200'
                                            : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`text-lg ${deckValid ? 'text-green-400' : 'text-amber-400'}`}>
                                                {deckValid ? '✓' : '○'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm truncate">{deckItem.name}</div>
                                                <div className={`text-xs ${deckValid ? 'text-green-500' : 'text-amber-500'}`}>
                                                    {deckItem.cardIds.length}/{DECK_SIZE} Karten
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Create New Deck Button */}
                        <div className="p-2 border-t border-slate-700">
                            <button
                                onClick={() => saveAsNewDeck()}
                                disabled={!canCreateNewDeck}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-700 hover:bg-amber-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors text-sm font-medium"
                                title={canCreateNewDeck ? 'Neues Deck erstellen' : `Maximum ${savedDecks.length} Decks erreicht`}
                            >
                                <Plus size={16} />
                                Neues Deck ({savedDecks.length}/5)
                            </button>
                        </div>

                        {/* Active Deck Actions (only when a custom deck is selected) */}
                        {activeDeck && (
                            <div className="p-2 border-t border-slate-700 space-y-2">
                                <div className="text-xs text-slate-400 uppercase tracking-wider px-1">Aktives Deck</div>

                                {/* Deck Name Display/Edit */}
                                <div className="bg-slate-800/60 rounded-lg p-2">
                                    {isEditingName ? (
                                        <div className="flex gap-1">
                                            <input
                                                type="text"
                                                value={editedName}
                                                onChange={(e) => setEditedName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        renameDeck(activeDeck.id, editedName);
                                                        setIsEditingName(false);
                                                    } else if (e.key === 'Escape') {
                                                        setIsEditingName(false);
                                                    }
                                                }}
                                                className="flex-1 bg-slate-700 text-white px-2 py-1 rounded border border-amber-500 focus:outline-none text-sm min-w-0"
                                                autoFocus
                                                maxLength={20}
                                            />
                                            <button
                                                onClick={() => { renameDeck(activeDeck.id, editedName); setIsEditingName(false); }}
                                                className="p-1 bg-green-600 hover:bg-green-500 rounded"
                                            >
                                                <Check size={14} className="text-white" />
                                            </button>
                                            <button
                                                onClick={() => setIsEditingName(false)}
                                                className="p-1 bg-slate-600 hover:bg-slate-500 rounded"
                                            >
                                                <X size={14} className="text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => { setEditedName(activeDeck.name); setIsEditingName(true); }}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 rounded px-1 py-0.5 -mx-1"
                                            title="Klicken zum Umbenennen"
                                        >
                                            <span className="font-medium text-sm text-white truncate flex-1">{activeDeck.name}</span>
                                            <Edit2 size={12} className="text-slate-400 flex-shrink-0" />
                                        </div>
                                    )}

                                    {/* Deck Card Count */}
                                    <div className={`text-xs mt-1 ${isValid ? 'text-green-400' : 'text-amber-400'}`}>
                                        {cardCount}/{DECK_SIZE} Karten {isValid && '✓'}
                                        {hasUnsavedChanges && <span className="text-amber-400 ml-1">●</span>}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => saveDeck(activeDeck.id)}
                                        disabled={!hasUnsavedChanges}
                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors text-xs font-medium"
                                        title="Änderungen speichern"
                                    >
                                        <Save size={12} />
                                        Speichern
                                    </button>

                                    {showDeleteConfirm ? (
                                        <div className="flex items-center gap-1 bg-red-900/50 px-2 py-1 rounded-lg border border-red-600">
                                            <button
                                                onClick={() => { deleteDeck(activeDeck.id); setShowDeleteConfirm(false); }}
                                                className="p-1 bg-red-600 hover:bg-red-500 rounded"
                                                title="Bestätigen"
                                            >
                                                <Check size={12} className="text-white" />
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="p-1 bg-slate-600 hover:bg-slate-500 rounded"
                                                title="Abbrechen"
                                            >
                                                <X size={12} className="text-white" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="p-1.5 bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded-lg transition-colors border border-red-700/50"
                                            title="Deck löschen"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MAIN CONTENT - Two Card Panels */}
                    <div className="flex flex-1 overflow-hidden">
                        {/* Left Panel - Available Cards */}
                        <div className="flex-1 flex flex-col border-r-2 border-slate-600">
                            {/* Panel Header */}
                            <div className="p-3 bg-slate-800/80 border-b border-slate-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="text-slate-300" size={18} />
                                        <h3 className="text-lg font-bold text-white">Verfügbare Karten</h3>
                                        <span className="text-slate-400 text-sm">({availableCards.length})</span>
                                    </div>
                                </div>

                                {/* Filters Row 1 */}
                                <div className="flex gap-2 flex-wrap mb-2">
                                    <FilterSelect
                                        value={schoolFilter}
                                        onChange={setSchoolFilter}
                                        options={[{ value: 'all', label: 'Alle Schulen' }, ...allSchools.map(s => ({ value: s, label: s }))]}
                                    />
                                    <FilterSelect
                                        value={typeFilter}
                                        onChange={setTypeFilter}
                                        options={[
                                            { value: 'all', label: 'Alle Typen' },
                                            { value: 'Philosoph', label: '👤 Philosoph' },
                                            { value: 'Zauber', label: '✨ Zauber' },
                                            { value: 'Werk', label: '📚 Werk' }
                                        ]}
                                    />
                                    <FilterSelect
                                        value={costFilter}
                                        onChange={setCostFilter}
                                        options={[
                                            { value: 'all', label: 'Kosten' },
                                            { value: '0-2', label: '0-2' },
                                            { value: '3-4', label: '3-4' },
                                            { value: '5-6', label: '5-6' },
                                            { value: '7+', label: '7+' }
                                        ]}
                                    />
                                    <FilterSelect
                                        value={sortBy}
                                        onChange={(v) => setSortBy(v as SortOption)}
                                        options={[
                                            { value: 'cost-asc', label: '↑ Kosten' },
                                            { value: 'cost-desc', label: '↓ Kosten' },
                                            { value: 'name-asc', label: 'A-Z' },
                                            { value: 'name-desc', label: 'Z-A' },
                                            { value: 'type', label: 'Typ' }
                                        ]}
                                    />
                                </div>

                                {/* Search + Add All */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="🔍 Suchen..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-500 focus:border-amber-500 focus:outline-none text-sm"
                                    />
                                    {availableCards.length > 0 && (
                                        <button
                                            onClick={handleAddAllFiltered}
                                            className="flex items-center gap-1 px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition-colors font-medium text-sm"
                                        >
                                            <Plus size={16} />
                                            Alle ({availableCards.length})
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Available Cards List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                {availableCards.map(card => (
                                    <CardRow key={card.id} card={card} isInDeck={false} onClick={() => addCard(card.id)} />
                                ))}
                            </div>
                        </div>

                        {/* Right Panel - Your Deck */}
                        <div className="flex-1 flex flex-col bg-green-950/20">
                            {/* Panel Header */}
                            <div className="p-3 bg-green-900/30 border-b border-green-700/40">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className={isValid ? 'text-green-400' : 'text-red-400'} size={18} />
                                        <h3 className="text-lg font-bold text-green-100">Dein Deck</h3>
                                        <span className={`text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                                            ({cardCount}/{DECK_SIZE})
                                        </span>
                                    </div>
                                </div>

                                {/* Deck Filters */}
                                <div className="flex gap-2 flex-wrap mb-2">
                                    <FilterSelect
                                        value={deckSchoolFilter}
                                        onChange={setDeckSchoolFilter}
                                        options={[{ value: 'all', label: 'Alle Schulen' }, ...allSchools.map(s => ({ value: s, label: s }))]}
                                    />
                                    <FilterSelect
                                        value={deckTypeFilter}
                                        onChange={setDeckTypeFilter}
                                        options={[
                                            { value: 'all', label: 'Alle Typen' },
                                            { value: 'Philosoph', label: '👤 Philosoph' },
                                            { value: 'Zauber', label: '✨ Zauber' },
                                            { value: 'Werk', label: '📚 Werk' }
                                        ]}
                                    />
                                    <FilterSelect
                                        value={deckSortBy}
                                        onChange={(v) => setDeckSortBy(v as SortOption)}
                                        options={[
                                            { value: 'cost-asc', label: '↑ Kosten' },
                                            { value: 'cost-desc', label: '↓ Kosten' },
                                            { value: 'name-asc', label: 'A-Z' },
                                            { value: 'name-desc', label: 'Z-A' },
                                            { value: 'type', label: 'Typ' }
                                        ]}
                                    />
                                </div>

                                {/* Deck Actions */}
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={autoFill}
                                        disabled={cardCount >= DECK_SIZE}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg transition-colors text-xs font-medium"
                                    >
                                        <Wand2 size={14} />
                                        Auto
                                    </button>
                                    <button
                                        onClick={clearDeck}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors text-xs"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-xs"
                                    >
                                        <Download size={14} />
                                        Deck exportieren
                                    </button>
                                    <button
                                        onClick={handleImport}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-xs"
                                    >
                                        <Upload size={14} />
                                        Deck importieren
                                    </button>
                                    <button
                                        onClick={resetToDefault}
                                        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors text-xs border border-slate-600"
                                    >
                                        Reset
                                    </button>
                                </div>

                                {/* Statistics Toggle Button */}
                                <button
                                    onClick={() => setShowStats(!showStats)}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors mt-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <BarChart3 size={16} className="text-amber-400" />
                                        <span className="text-sm font-medium text-white">Deck-Statistiken</span>
                                    </div>
                                    {showStats ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                </button>

                                {/* Collapsible Statistics Panel */}
                                {showStats && cardCount > 0 && (() => {
                                    // Calculate statistics from deck cards
                                    const allDeckCards = deck.cardIds.map(id => cards.find(c => c.id === id)).filter((c): c is Card => c !== undefined);

                                    // Type counts
                                    const philosophCount = allDeckCards.filter(c => c.type === 'Philosoph').length;
                                    const spellCount = allDeckCards.filter(c => c.type === 'Zauber').length;
                                    const workCount = allDeckCards.filter(c => c.type === 'Werk').length;

                                    // School distribution
                                    const schoolCounts: Record<string, number> = {};
                                    allDeckCards.forEach(c => {
                                        c.school?.forEach(s => {
                                            if (VALID_SCHOOLS.includes(s)) {
                                                schoolCounts[s] = (schoolCounts[s] || 0) + 1;
                                            }
                                        });
                                    });
                                    const sortedSchools = Object.entries(schoolCounts).sort((a, b) => b[1] - a[1]);

                                    // Mana curve (how many cards at each cost)
                                    const manaCurve: Record<number, number> = {};
                                    allDeckCards.forEach(c => {
                                        const cost = Math.min(c.cost, 10); // Cap display at 10+
                                        manaCurve[cost] = (manaCurve[cost] || 0) + 1;
                                    });
                                    const maxManaCount = Math.max(...Object.values(manaCurve), 1);

                                    // Average cost
                                    const avgCost = allDeckCards.reduce((sum, c) => sum + c.cost, 0) / allDeckCards.length;

                                    // Rarity distribution (only 2 categories now)
                                    const rarityCount = {
                                        'Gewöhnlich': allDeckCards.filter(c => c.rarity === 'Gewöhnlich').length,
                                        'Legendär': allDeckCards.filter(c => c.rarity === 'Legendär').length,
                                    };

                                    // Get max school count for bar chart scaling
                                    const maxSchoolCount = sortedSchools.length > 0 ? Math.max(...sortedSchools.map(([, count]) => count)) : 1;

                                    return (
                                        <div className="mt-2 bg-slate-800/60 rounded-lg p-3 space-y-4 border border-slate-600/50 max-h-80 overflow-y-auto">
                                            {/* Card Type Distribution */}
                                            <div>
                                                <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Karten nach Typ</h4>
                                                <div className="flex gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-amber-400">👤</span>
                                                        <span className="text-white font-bold">{philosophCount}</span>
                                                        <span className="text-gray-400 text-xs">Philosophen</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-purple-400">✨</span>
                                                        <span className="text-white font-bold">{spellCount}</span>
                                                        <span className="text-gray-400 text-xs">Zauber</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-blue-400">📚</span>
                                                        <span className="text-white font-bold">{workCount}</span>
                                                        <span className="text-gray-400 text-xs">Werke</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Rarity Distribution */}
                                            <div>
                                                <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Seltenheit</h4>
                                                <div className="flex gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-300 font-bold">{rarityCount['Gewöhnlich']}</span>
                                                        <span className="text-gray-400 text-xs">Gewöhnlich</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-yellow-400 font-bold">{rarityCount['Legendär']}</span>
                                                        <span className="text-gray-400 text-xs">Legendär</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Average Cost */}
                                            <div>
                                                <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-1">Durchschnittliche Kosten</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl font-bold text-blue-400">{avgCost.toFixed(1)}</span>
                                                    <span className="text-gray-400 text-xs">Dialektik</span>
                                                </div>
                                            </div>

                                            {/* Mana Curve - Fixed with explicit pixel heights */}
                                            <div>
                                                <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Dialektik-Kurve</h4>
                                                <div className="flex items-end gap-1" style={{ height: '64px' }}>
                                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cost => {
                                                        const count = manaCurve[cost] || 0;
                                                        const heightPx = count > 0 ? Math.max((count / maxManaCount) * 48, 4) : 0;
                                                        return (
                                                            <div key={cost} className="flex flex-col items-center flex-1">
                                                                <div
                                                                    className="w-full bg-blue-500 rounded-t"
                                                                    style={{ height: `${heightPx}px`, minWidth: '8px' }}
                                                                    title={`${count} Karte(n) mit Kosten ${cost}${cost === 10 ? '+' : ''}`}
                                                                />
                                                                <span className="text-[10px] text-gray-500 mt-1">{cost}{cost === 10 ? '+' : ''}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* School Distribution - Bar Chart */}
                                            <div>
                                                <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Schulen</h4>
                                                {sortedSchools.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {sortedSchools.map(([school, count]) => {
                                                            const widthPercent = (count / maxSchoolCount) * 100;
                                                            return (
                                                                <div key={school} className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-300 w-24 truncate">{school}</span>
                                                                    <div className="flex-1 bg-slate-700 rounded h-4 overflow-hidden">
                                                                        <div
                                                                            className={`h-full ${getSchoolColor(school)} transition-all`}
                                                                            style={{ width: `${widthPercent}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs text-white font-bold w-6 text-right">{count}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 text-xs italic">Keine Schulen im Deck</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Deck Cards List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                {deckCards.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <BookOpen size={36} className="mx-auto mb-3 opacity-50" />
                                        <p className="text-base">Deck ist leer</p>
                                        <p className="text-xs">Klicke links auf Karten</p>
                                    </div>
                                ) : (
                                    deckCards.map(card => (
                                        <CardRow key={card.id} card={card} isInDeck={true} onClick={() => removeCard(card.id)} />
                                    ))
                                )}
                            </div>

                            {/* Validation Message */}
                            {isCustom && !isValid && (
                                <div className="p-3 border-t-2 border-red-600 bg-red-900/30">
                                    <p className="text-red-300 text-sm text-center font-medium">
                                        ⚠️ Noch {DECK_SIZE - cardCount} Karten benötigt
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* End MAIN CONTENT - Two Card Panels */}
                </div>
            </div>

            {/* Card Preview Modal - Same as game right-click */}
            {previewCard && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setPreviewCard(null)}
                >
                    <div className="flex gap-8 items-center" onClick={e => e.stopPropagation()}>
                        {/* Card */}
                        <div style={{ transform: `scale(${PREVIEW_SCALE})` }} className="shadow-2xl">
                            <CardComponent card={previewCard} />
                        </div>

                        {/* Tooltip Panel - Height matches scaled card */}
                        <div
                            className="bg-slate-900/95 border border-slate-600 rounded-xl p-4 text-white shadow-2xl flex flex-col gap-3 overflow-y-auto"
                            style={{ width: `${TOOLTIP_WIDTH}px`, height: `${CARD_HEIGHT * PREVIEW_SCALE}px` }}
                        >
                            <h3 className="text-xl font-bold text-amber-400 border-b border-slate-700 pb-2">{previewCard.name}</h3>

                            {/* Schools */}
                            {previewCard.school && previewCard.school.length > 0 && previewCard.type === 'Philosoph' && (
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Schulen</span>
                                    <div className="flex flex-wrap gap-1">
                                        {previewCard.school.map(s => (
                                            <span key={s} className={`text-xs px-2 py-1 ${getSchoolColor(s)} rounded-full text-white font-medium`}>
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            {previewCard.description && (
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Beschreibung</span>
                                    <p className="text-sm text-gray-200 italic">"{previewCard.description}"</p>
                                </div>
                            )}

                            {/* Effect / Special Ability */}
                            {(previewCard.effect || previewCard.special || previewCard.workBonus) && (
                                <div className="space-y-1 bg-purple-900/30 border border-purple-700/50 rounded-lg p-2">
                                    <span className="text-xs text-purple-400 uppercase tracking-wider">⚡ Effekt</span>
                                    {previewCard.effect && (
                                        <p className="text-sm font-medium text-purple-200">{previewCard.effect}</p>
                                    )}
                                    {previewCard.special && (
                                        <p className="text-sm font-medium text-purple-200">{previewCard.special.name}: {previewCard.special.description}</p>
                                    )}
                                    {previewCard.workBonus && (
                                        <p className="text-sm font-medium text-green-200">Bonus: +{previewCard.workBonus.health} Leben für {previewCard.workBonus.school}</p>
                                    )}
                                </div>
                            )}

                            {/* Type */}
                            <div className="space-y-1 mt-auto pt-2 border-t border-slate-700">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Typ</span>
                                <p className="text-sm font-medium">{previewCard.type} • {previewCard.rarity}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setPreviewCard(null)}
                        className="absolute top-4 right-4 p-3 bg-slate-800 hover:bg-slate-700 rounded-full"
                    >
                        <X size={24} className="text-white" />
                    </button>
                </div>
            )}
        </div>
    );
};
