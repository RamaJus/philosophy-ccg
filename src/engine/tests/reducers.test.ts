import { describe, it, expect } from 'vitest';
import { gameReducer, createInitialState } from '../reducers';
import { GameAction } from '../../types';

describe('gameReducer', () => {
    it('should initialize game state correctly', () => {
        const initialState = createInitialState(false);
        expect(initialState.turn).toBe(1);
        expect(initialState.player.health).toBe(80);
        expect(initialState.player.mana).toBe(1);
        expect(initialState.player.hand.length).toBeGreaterThan(0);
    });

    it('should end turn and switch active player', () => {
        let state = createInitialState(false);
        // Player starts
        expect(state.activePlayer).toBe('player');

        // End Turn
        state = gameReducer(state, { type: 'END_TURN' });

        expect(state.activePlayer).toBe('opponent');
        expect(state.turn).toBe(2);
        // Opponent should gain mana (Max 0 -> 1)
        expect(state.opponent.mana).toBe(1);
    });

    it('should play a card if mana checks out', () => {
        let state = createInitialState(false);

        // Create explicit Philosoph card for testing
        const mockCard = {
            id: 'test-minion',
            instanceId: 'test-card-1',
            name: 'Test Philosopher',
            type: 'Philosoph' as const,
            cost: 1,
            attack: 2,
            health: 3,
            maxHealth: 3,
            description: 'Test minion',
            rarity: 'Gewöhnlich' as const,
        };
        state.player.hand = [mockCard];
        state.player.mana = 1;

        const action: GameAction = { type: 'PLAY_CARD', cardId: 'test-card-1' };
        state = gameReducer(state, action);

        expect(state.player.mana).toBe(0);
        expect(state.player.hand.find(c => c.instanceId === 'test-card-1')).toBeUndefined();
        // Minion should be on board
        expect(state.player.board.length).toBe(1);
        expect(state.player.board[0].name).toBe('Test Philosopher');
    });

    it('should NOT play a card if mana is insufficient', () => {
        let state = createInitialState(false);
        const mockCard = { ...state.player.hand[0], cost: 10, instanceId: 'expensive-card' };
        state.player.hand = [mockCard];
        state.player.mana = 1;

        const action: GameAction = { type: 'PLAY_CARD', cardId: 'expensive-card' };
        const newState = gameReducer(state, action);

        // State remains mostly same (mana not spent)
        expect(newState.player.mana).toBe(1);
        expect(newState.player.hand.length).toBe(1);
    });

    describe('Card Effects', () => {
        it('should apply DAMAGE effect correctly', () => {
            let state = createInitialState(false);
            // Setup: Player has 2 mana, generic damage card in hand
            state.player.mana = 2;
            state.opponent.health = 30;

            const damageCard = {
                id: 'test-damage',
                instanceId: 'dmg-1',
                name: 'Feuerball',
                type: 'Zauber',
                cost: 2,
                rarity: 'Gewöhnlich',
                description: 'Deal 5 damage',
                effects: [
                    { type: 'DAMAGE', target: 'ENEMY', value: 5 }
                ]
            };
            // @ts-ignore - injecting mock card
            state.player.hand = [damageCard];

            const action: GameAction = { type: 'PLAY_CARD', cardId: 'dmg-1' };
            const newState = gameReducer(state, action);

            expect(newState.player.mana).toBe(0);
            expect(newState.opponent.health).toBe(25); // 30 - 5
            expect(newState.player.graveyard.length).toBe(1);
        });

        it('should apply HEAL effect correctly', () => {
            let state = createInitialState(false);
            state.player.mana = 2;
            state.player.health = 10;
            state.player.maxHealth = 30;

            const healCard = {
                id: 'test-heal',
                instanceId: 'heal-1',
                name: 'Heiltrank',
                type: 'Zauber',
                cost: 2,
                rarity: 'Gewöhnlich',
                description: 'Heal 5',
                effects: [
                    { type: 'HEAL', target: 'SELF', value: 5 }
                ]
            };
            // @ts-ignore
            state.player.hand = [healCard];

            const action: GameAction = { type: 'PLAY_CARD', cardId: 'heal-1' };
            const newState = gameReducer(state, action);

            expect(newState.player.health).toBe(15); // 10 + 5
        });
    });
});
