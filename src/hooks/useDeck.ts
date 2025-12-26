import { useState, useCallback, useEffect } from 'react';
import { cardDatabase as cards } from '../data/cards';
import { Card } from '../types';
import { AI_DECK_IDS } from '../data/aiDeck';

const STORAGE_KEY = 'philosophy-ccg-decks-v2';
const DECK_SIZE = 60;
const MAX_CUSTOM_DECKS = 5;

// ==================== Types ====================

export interface SavedDeck {
    id: string;
    name: string;
    cardIds: string[];
    createdAt: string;
}

export interface DeckStorage {
    version: number;
    activeDeckId: string | null;  // null = all cards mode
    decks: SavedDeck[];
}

// ==================== Helpers ====================

const generateDeckId = (): string => {
    return `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getNextDeckName = (decks: SavedDeck[]): string => {
    const existingNumbers = decks
        .map(d => {
            const match = d.name.match(/^Custom (\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);

    for (let i = 1; i <= MAX_CUSTOM_DECKS; i++) {
        if (!existingNumbers.includes(i)) {
            return `Custom ${i}`;
        }
    }
    return `Custom ${decks.length + 1}`;
};

const getAllCardIds = (): string[] => {
    return cards.map(c => c.id);
};

const getDefaultStorage = (): DeckStorage => ({
    version: 2,
    activeDeckId: null,
    decks: []
});

// AI Deck preset - always available as a built-in deck
const AI_DECK_ID = 'preset_ai_deck';
const getAIDeckPreset = (): SavedDeck => ({
    id: AI_DECK_ID,
    name: 'KI-Deck',
    cardIds: AI_DECK_IDS,
    createdAt: '2024-01-01T00:00:00.000Z' // Fixed date for preset
});

// Ensure AI deck preset exists in decks array
const ensureAIDeckExists = (decks: SavedDeck[]): SavedDeck[] => {
    const hasAIDeck = decks.some(d => d.id === AI_DECK_ID);
    if (!hasAIDeck) {
        return [getAIDeckPreset(), ...decks];
    }
    // Update AI deck if it exists (in case cards changed)
    return decks.map(d => d.id === AI_DECK_ID ? getAIDeckPreset() : d);
};

// Migrate from old format (v1) to new format (v2)
const migrateFromV1 = (): DeckStorage | null => {
    try {
        const oldStored = localStorage.getItem('philosophy-ccg-deck');
        if (oldStored) {
            const parsed = JSON.parse(oldStored);
            if (parsed.version === 1 && Array.isArray(parsed.cardIds) && parsed.isCustom) {
                // Valid old format with custom deck
                const validIds = parsed.cardIds.filter((id: string) =>
                    cards.some(c => c.id === id)
                );
                if (validIds.length > 0) {
                    const newDeck: SavedDeck = {
                        id: generateDeckId(),
                        name: 'Custom 1',
                        cardIds: validIds,
                        createdAt: new Date().toISOString()
                    };
                    return {
                        version: 2,
                        activeDeckId: newDeck.id,
                        decks: [newDeck]
                    };
                }
            }
        }
    } catch (e) {
        console.error('Failed to migrate from v1:', e);
    }
    return null;
};

// ==================== Hook ====================

export const useDeck = () => {
    const [storage, setStorage] = useState<DeckStorage>(getDefaultStorage);
    const [workingCardIds, setWorkingCardIds] = useState<string[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed: DeckStorage = JSON.parse(stored);
                if (parsed.version === 2) {
                    // Validate all deck card IDs
                    let validatedDecks = parsed.decks.map(deck => ({
                        ...deck,
                        cardIds: deck.cardIds.filter(id => cards.some(c => c.id === id))
                    }));
                    // Ensure AI deck preset exists
                    validatedDecks = ensureAIDeckExists(validatedDecks);
                    const newStorage = { ...parsed, decks: validatedDecks };
                    setStorage(newStorage);

                    // Load active deck or all cards
                    if (parsed.activeDeckId) {
                        const activeDeck = validatedDecks.find(d => d.id === parsed.activeDeckId);
                        setWorkingCardIds(activeDeck ? activeDeck.cardIds : getAllCardIds());
                    } else {
                        setWorkingCardIds(getAllCardIds());
                    }
                    return;
                }
            }

            // Try to migrate from v1
            const migrated = migrateFromV1();
            if (migrated) {
                setStorage(migrated);
                const activeDeck = migrated.decks.find(d => d.id === migrated.activeDeckId);
                setWorkingCardIds(activeDeck ? activeDeck.cardIds : getAllCardIds());
                // Save migrated data
                localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                // Clear old storage
                localStorage.removeItem('philosophy-ccg-deck');
                return;
            }

            // Default: all cards mode with AI deck preset
            const defaultStorage = getDefaultStorage();
            defaultStorage.decks = ensureAIDeckExists([]);
            setStorage(defaultStorage);
            setWorkingCardIds(getAllCardIds());
        } catch (e) {
            console.error('Failed to load decks from storage:', e);
            setWorkingCardIds(getAllCardIds());
        }
    }, []);

    // Save storage to localStorage
    const saveStorage = useCallback((newStorage: DeckStorage) => {
        setStorage(newStorage);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newStorage));
        } catch (e) {
            console.error('Failed to save decks:', e);
        }
    }, []);

    // ==================== Deck Selection ====================

    const selectDeck = useCallback((deckId: string | null) => {
        if (deckId === null) {
            // All cards mode
            setWorkingCardIds(getAllCardIds());
            setHasUnsavedChanges(false);
            saveStorage({ ...storage, activeDeckId: null });
        } else {
            const deck = storage.decks.find(d => d.id === deckId);
            if (deck) {
                setWorkingCardIds([...deck.cardIds]);
                setHasUnsavedChanges(false);
                saveStorage({ ...storage, activeDeckId: deckId });
            }
        }
    }, [storage, saveStorage]);

    // ==================== Card Operations ====================

    const addCard = useCallback((cardId: string) => {
        if (workingCardIds.includes(cardId)) return;
        setWorkingCardIds(prev => [...prev, cardId]);
        setHasUnsavedChanges(true);
    }, [workingCardIds]);

    const removeCard = useCallback((cardId: string) => {
        setWorkingCardIds(prev => prev.filter(id => id !== cardId));
        setHasUnsavedChanges(true);
    }, []);

    const addCards = useCallback((cardIds: string[]) => {
        const newIds = cardIds.filter(id => !workingCardIds.includes(id));
        if (newIds.length === 0) return;
        setWorkingCardIds(prev => [...prev, ...newIds]);
        setHasUnsavedChanges(true);
    }, [workingCardIds]);

    const clearDeck = useCallback(() => {
        setWorkingCardIds([]);
        setHasUnsavedChanges(true);
    }, []);

    // ==================== Deck Management ====================

    const saveAsNewDeck = useCallback((): SavedDeck | null => {
        if (storage.decks.length >= MAX_CUSTOM_DECKS) {
            console.warn('Maximum number of custom decks reached');
            return null;
        }

        const newDeck: SavedDeck = {
            id: generateDeckId(),
            name: getNextDeckName(storage.decks),
            cardIds: [...workingCardIds],
            createdAt: new Date().toISOString()
        };

        const newStorage: DeckStorage = {
            ...storage,
            activeDeckId: newDeck.id,
            decks: [...storage.decks, newDeck]
        };

        saveStorage(newStorage);
        setHasUnsavedChanges(false);
        return newDeck;
    }, [storage, workingCardIds, saveStorage]);

    const saveDeck = useCallback((deckId: string) => {
        const deckIndex = storage.decks.findIndex(d => d.id === deckId);
        if (deckIndex === -1) return false;

        const updatedDecks = [...storage.decks];
        updatedDecks[deckIndex] = {
            ...updatedDecks[deckIndex],
            cardIds: [...workingCardIds]
        };

        saveStorage({ ...storage, decks: updatedDecks });
        setHasUnsavedChanges(false);
        return true;
    }, [storage, workingCardIds, saveStorage]);

    const renameDeck = useCallback((deckId: string, newName: string) => {
        const deckIndex = storage.decks.findIndex(d => d.id === deckId);
        if (deckIndex === -1) return false;

        const updatedDecks = [...storage.decks];
        updatedDecks[deckIndex] = {
            ...updatedDecks[deckIndex],
            name: newName.trim() || updatedDecks[deckIndex].name
        };

        saveStorage({ ...storage, decks: updatedDecks });
        return true;
    }, [storage, saveStorage]);

    const deleteDeck = useCallback((deckId: string) => {
        const newDecks = storage.decks.filter(d => d.id !== deckId);
        const newActiveDeckId = storage.activeDeckId === deckId ? null : storage.activeDeckId;

        saveStorage({
            ...storage,
            activeDeckId: newActiveDeckId,
            decks: newDecks
        });

        if (storage.activeDeckId === deckId) {
            setWorkingCardIds(getAllCardIds());
            setHasUnsavedChanges(false);
        }
        return true;
    }, [storage, saveStorage]);

    // Reset to all cards (no custom deck)
    const resetToDefault = useCallback(() => {
        setWorkingCardIds(getAllCardIds());
        saveStorage({ ...storage, activeDeckId: null });
        setHasUnsavedChanges(false);
    }, [storage, saveStorage]);

    // Auto-fill deck with balanced mana curve
    const autoFill = useCallback(() => {
        const currentIds = new Set(workingCardIds);
        const available = cards.filter(c => !currentIds.has(c.id));
        const needed = DECK_SIZE - workingCardIds.length;

        if (needed <= 0 || available.length === 0) return;

        // Group by cost range
        const lowCost = available.filter(c => c.cost <= 2);
        const midCost = available.filter(c => c.cost >= 3 && c.cost <= 4);
        const highCost = available.filter(c => c.cost >= 5 && c.cost <= 6);
        const veryCost = available.filter(c => c.cost >= 7);
        const spells = available.filter(c => c.type === 'Zauber' || c.type === 'Werk');

        // Prefer schools already in deck for synergies
        const currentSchools = new Set<string>();
        workingCardIds.forEach(id => {
            const card = cards.find(c => c.id === id);
            card?.school?.forEach(s => currentSchools.add(s));
        });

        const sortBySchoolMatch = (a: Card, b: Card) => {
            const aMatch = a.school?.some(s => currentSchools.has(s)) ? 1 : 0;
            const bMatch = b.school?.some(s => currentSchools.has(s)) ? 1 : 0;
            return bMatch - aMatch;
        };

        const shuffle = (arr: Card[]) => {
            const sorted = [...arr].sort(sortBySchoolMatch);
            return sorted.sort(() => Math.random() - 0.5);
        };

        const toAdd: string[] = [];

        // Target distribution
        const targets = {
            low: Math.ceil(needed * 0.2),
            mid: Math.ceil(needed * 0.3),
            high: Math.ceil(needed * 0.25),
            very: Math.ceil(needed * 0.15),
            spell: Math.ceil(needed * 0.1)
        };

        const addFromPool = (pool: Card[], count: number) => {
            const shuffled = shuffle(pool);
            for (const card of shuffled) {
                if (toAdd.length >= needed) break;
                if (!currentIds.has(card.id) && !toAdd.includes(card.id)) {
                    toAdd.push(card.id);
                    if (toAdd.filter(id => pool.some(c => c.id === id)).length >= count) break;
                }
            }
        };

        addFromPool(lowCost, targets.low);
        addFromPool(midCost, targets.mid);
        addFromPool(highCost, targets.high);
        addFromPool(veryCost, targets.very);
        addFromPool(spells, targets.spell);

        // Fill remaining
        if (toAdd.length < needed) {
            const remaining = shuffle(available.filter(c => !toAdd.includes(c.id)));
            for (const card of remaining) {
                if (toAdd.length >= needed) break;
                toAdd.push(card.id);
            }
        }

        setWorkingCardIds(prev => [...prev, ...toAdd.slice(0, needed)]);
        setHasUnsavedChanges(true);
    }, [workingCardIds]);

    // Export deck as JSON string
    const exportDeck = useCallback((): string => {
        return JSON.stringify({
            version: 1,
            cardIds: workingCardIds,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }, [workingCardIds]);

    // Import deck from JSON string
    const importDeck = useCallback((jsonString: string): boolean => {
        try {
            const parsed = JSON.parse(jsonString);
            if (!parsed.cardIds || !Array.isArray(parsed.cardIds)) {
                throw new Error('Invalid deck format');
            }

            const validIds = parsed.cardIds.filter((id: string) =>
                cards.some(c => c.id === id)
            );

            setWorkingCardIds(validIds);
            setHasUnsavedChanges(true);
            return true;
        } catch (e) {
            console.error('Failed to import deck:', e);
            return false;
        }
    }, []);

    // Refresh from localStorage
    const refreshDeck = useCallback(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed: DeckStorage = JSON.parse(stored);
                if (parsed.version === 2) {
                    setStorage(parsed);
                    if (parsed.activeDeckId) {
                        const activeDeck = parsed.decks.find(d => d.id === parsed.activeDeckId);
                        setWorkingCardIds(activeDeck ? activeDeck.cardIds : getAllCardIds());
                    } else {
                        setWorkingCardIds(getAllCardIds());
                    }
                    setHasUnsavedChanges(false);
                    return;
                }
            }
            setWorkingCardIds(getAllCardIds());
        } catch (e) {
            console.error('Failed to refresh deck from storage:', e);
        }
    }, []);

    // ==================== Computed Values ====================

    const activeDeck = storage.activeDeckId
        ? storage.decks.find(d => d.id === storage.activeDeckId) || null
        : null;

    const isCustom = storage.activeDeckId !== null;
    const isValid = isCustom ? workingCardIds.length === DECK_SIZE : true;
    const cardCount = workingCardIds.length;
    const canCreateNewDeck = storage.decks.length < MAX_CUSTOM_DECKS;

    // For backwards compatibility
    const deck = {
        cardIds: workingCardIds,
        isCustom
    };

    const deckCards = workingCardIds
        .map(id => cards.find(c => c.id === id))
        .filter((c): c is Card => c !== undefined);

    return {
        // State
        deck,
        deckCards,
        cardCount,
        isValid,
        isCustom,
        hasUnsavedChanges,

        // Multi-deck state
        savedDecks: storage.decks,
        activeDeck,
        activeDeckId: storage.activeDeckId,
        canCreateNewDeck,

        // Card operations
        addCard,
        removeCard,
        addCards,
        clearDeck,

        // Deck operations
        selectDeck,
        saveAsNewDeck,
        saveDeck,
        renameDeck,
        deleteDeck,
        resetToDefault,

        // Utility
        autoFill,
        exportDeck,
        importDeck,
        refreshDeck,

        // Constants
        DECK_SIZE,
        MAX_CUSTOM_DECKS
    };
};
