import { useState, useCallback, useEffect } from 'react';
import { cardDatabase as cards } from '../data/cards';
import { Card } from '../types';

const STORAGE_KEY = 'philosophy-ccg-deck';
const DECK_SIZE = 60;

export interface DeckState {
    cardIds: string[];
    isCustom: boolean;
}

interface StoredDeck {
    version: number;
    cardIds: string[];
    isCustom: boolean;
}

// Get all available card IDs (excluding duplicates)
const getAllCardIds = (): string[] => {
    return cards.map(c => c.id);
};

// Default deck: all cards
const getDefaultDeck = (): DeckState => ({
    cardIds: getAllCardIds(),
    isCustom: false
});

export const useDeck = () => {
    const [deck, setDeck] = useState<DeckState>(getDefaultDeck);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed: StoredDeck = JSON.parse(stored);
                if (parsed.version === 1 && Array.isArray(parsed.cardIds)) {
                    // Validate card IDs exist
                    const validIds = parsed.cardIds.filter(id =>
                        cards.some(c => c.id === id)
                    );
                    setDeck({
                        cardIds: validIds,
                        isCustom: parsed.isCustom ?? true
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load deck from storage:', e);
        }
    }, []);

    // Save to localStorage
    const saveDeck = useCallback((newDeck: DeckState) => {
        setDeck(newDeck);
        try {
            const toStore: StoredDeck = {
                version: 1,
                cardIds: newDeck.cardIds,
                isCustom: newDeck.isCustom
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
        } catch (e) {
            console.error('Failed to save deck:', e);
        }
    }, []);

    // Add card to deck
    const addCard = useCallback((cardId: string) => {
        setDeck(prev => {
            if (prev.cardIds.includes(cardId)) return prev; // Already in deck
            const newDeck = {
                cardIds: [...prev.cardIds, cardId],
                isCustom: true
            };
            saveDeck(newDeck);
            return newDeck;
        });
    }, [saveDeck]);

    // Remove card from deck
    const removeCard = useCallback((cardId: string) => {
        setDeck(prev => {
            const newDeck = {
                cardIds: prev.cardIds.filter(id => id !== cardId),
                isCustom: true
            };
            saveDeck(newDeck);
            return newDeck;
        });
    }, [saveDeck]);

    // Add multiple cards at once (for "add all filtered")
    const addCards = useCallback((cardIds: string[]) => {
        setDeck(prev => {
            const newIds = cardIds.filter(id => !prev.cardIds.includes(id));
            if (newIds.length === 0) return prev;
            const newDeck = {
                cardIds: [...prev.cardIds, ...newIds],
                isCustom: true
            };
            saveDeck(newDeck);
            return newDeck;
        });
    }, [saveDeck]);

    // Clear deck
    const clearDeck = useCallback(() => {
        const newDeck = { cardIds: [], isCustom: true };
        saveDeck(newDeck);
    }, [saveDeck]);

    // Reset to default (all cards)
    const resetToDefault = useCallback(() => {
        saveDeck(getDefaultDeck());
    }, [saveDeck]);

    // Auto-fill deck with balanced mana curve
    const autoFill = useCallback(() => {
        setDeck(prev => {
            const currentIds = new Set(prev.cardIds);
            const available = cards.filter(c => !currentIds.has(c.id));
            const needed = DECK_SIZE - prev.cardIds.length;

            if (needed <= 0 || available.length === 0) return prev;

            // Group by cost range
            const lowCost = available.filter(c => c.cost <= 2);
            const midCost = available.filter(c => c.cost >= 3 && c.cost <= 4);
            const highCost = available.filter(c => c.cost >= 5 && c.cost <= 6);
            const veryCost = available.filter(c => c.cost >= 7);
            const spells = available.filter(c => c.type === 'Zauber' || c.type === 'Werk');

            // Prefer schools already in deck for synergies
            const currentSchools = new Set<string>();
            prev.cardIds.forEach(id => {
                const card = cards.find(c => c.id === id);
                card?.school?.forEach(s => currentSchools.add(s));
            });

            const sortBySchoolMatch = (a: Card, b: Card) => {
                const aMatch = a.school?.some(s => currentSchools.has(s)) ? 1 : 0;
                const bMatch = b.school?.some(s => currentSchools.has(s)) ? 1 : 0;
                return bMatch - aMatch;
            };

            // Shuffle within groups, prioritizing school matches
            const shuffle = (arr: Card[]) => {
                const sorted = [...arr].sort(sortBySchoolMatch);
                // Add some randomness within school priority
                return sorted.sort(() => Math.random() - 0.5);
            };

            const toAdd: string[] = [];

            // Target distribution (scaled to needed)
            const targets = {
                low: Math.ceil(needed * 0.2),      // ~20%
                mid: Math.ceil(needed * 0.3),      // ~30%
                high: Math.ceil(needed * 0.25),    // ~25%
                very: Math.ceil(needed * 0.15),    // ~15%
                spell: Math.ceil(needed * 0.1)     // ~10%
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

            // Fill remaining with any cards
            if (toAdd.length < needed) {
                const remaining = shuffle(available.filter(c => !toAdd.includes(c.id)));
                for (const card of remaining) {
                    if (toAdd.length >= needed) break;
                    toAdd.push(card.id);
                }
            }

            const newDeck = {
                cardIds: [...prev.cardIds, ...toAdd.slice(0, needed)],
                isCustom: true
            };
            saveDeck(newDeck);
            return newDeck;
        });
    }, [saveDeck]);

    // Export deck as JSON string
    const exportDeck = useCallback((): string => {
        return JSON.stringify({
            version: 1,
            cardIds: deck.cardIds,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }, [deck]);

    // Import deck from JSON string
    const importDeck = useCallback((jsonString: string): boolean => {
        try {
            const parsed = JSON.parse(jsonString);
            if (!parsed.cardIds || !Array.isArray(parsed.cardIds)) {
                throw new Error('Invalid deck format');
            }

            // Validate card IDs
            const validIds = parsed.cardIds.filter((id: string) =>
                cards.some(c => c.id === id)
            );

            const newDeck = {
                cardIds: validIds,
                isCustom: true
            };
            saveDeck(newDeck);
            return true;
        } catch (e) {
            console.error('Failed to import deck:', e);
            return false;
        }
    }, [saveDeck]);

    // Validation
    const isValid = deck.isCustom ? deck.cardIds.length === DECK_SIZE : true;
    const cardCount = deck.cardIds.length;

    // Get actual Card objects for the deck
    const deckCards = deck.cardIds
        .map(id => cards.find(c => c.id === id))
        .filter((c): c is Card => c !== undefined);

    // Manually refresh from localStorage (e.g., after DeckEditor closes)
    const refreshDeck = useCallback(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed: StoredDeck = JSON.parse(stored);
                if (parsed.version === 1 && Array.isArray(parsed.cardIds)) {
                    const validIds = parsed.cardIds.filter(id =>
                        cards.some(c => c.id === id)
                    );
                    setDeck({
                        cardIds: validIds,
                        isCustom: parsed.isCustom ?? true
                    });
                    return;
                }
            }
            // If nothing stored or invalid, reset to default
            setDeck(getDefaultDeck());
        } catch (e) {
            console.error('Failed to refresh deck from storage:', e);
        }
    }, []);

    return {
        deck,
        deckCards,
        cardCount,
        isValid,
        isCustom: deck.isCustom,
        addCard,
        removeCard,
        addCards,
        clearDeck,
        resetToDefault,
        autoFill,
        exportDeck,
        importDeck,
        refreshDeck,
        DECK_SIZE
    };
};
