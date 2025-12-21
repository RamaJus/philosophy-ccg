import { useReducer, useEffect, useCallback, useRef } from 'react';
import { GameState, GameAction } from '../types';
import { gameReducer, createInitialState } from '../engine/reducers';
import { multiplayer } from '../network/MultiplayerManager';

export const useGameLogic = (gameMode: 'single' | 'host' | 'client', isDebugMode: boolean = false, customDeckIds?: string[]) => {
    // Track if we've initialized with the correct deck
    const initializedRef = useRef(false);

    console.log('[useGameLogic] Called with customDeckIds:', customDeckIds?.length, 'cards');

    // 1. Initialize Reducer - start with empty state, will dispatch START_GAME with correct deck
    const [gameState, dispatch] = useReducer(gameReducer, { isDebugMode, customDeckIds }, (args) => {
        console.log('[useGameLogic] Initializer called with:', args.customDeckIds?.length, 'cards');
        return createInitialState(args.isDebugMode, args.customDeckIds);
    });

    // 2. Re-initialize if customDeckIds wasn't available at mount
    useEffect(() => {
        if (customDeckIds && customDeckIds.length > 0 && !initializedRef.current) {
            console.log('[useGameLogic] Dispatching START_GAME with custom deck:', customDeckIds.length, 'cards');
            dispatch({ type: 'START_GAME', isDebugMode, customDeckIds });
            initializedRef.current = true;
        }
    }, [customDeckIds, isDebugMode]);

    // 3. Multiplayer Helpers
    const isHost = gameMode === 'host';
    const isClient = gameMode === 'client';

    // 3. Sync State (Host -> Client)
    useEffect(() => {
        if (isHost && multiplayer.isConnected) {
            multiplayer.sendState(gameState);
        }
    }, [gameState, isHost]);

    // 3.5 Check for pending opponent handshake data (race condition fix)
    useEffect(() => {
        if (isHost && multiplayer.receivedOpponentDeckIds) {
            const { deckIds, playerName } = multiplayer.receivedOpponentDeckIds;
            console.log('[useGameLogic] Found pending opponent data:', { deckIds: deckIds?.length, playerName });
            dispatch({ type: 'SET_OPPONENT_DECK', deckIds, playerName });
            multiplayer.receivedOpponentDeckIds = null; // Clear after processing
        }
    }, [isHost]); // Run once on mount when host

    // 4. Handle Incoming Data
    useEffect(() => {
        // Handle Actions from Peer (Host receives actions from Client)
        const handleAction = (action: GameAction) => {
            if (isHost) {
                // Host executes the action
                // Special check for Client-side 'view' actions if any?
                // For now, trust the action.
                dispatch(action);
            }
        };

        // Handle State from Host (Client receives state)
        const handleState = (newState: GameState) => {
            if (isClient) {
                dispatch({ type: 'SYNC_STATE', newState });
            }
        };

        // Handle Handshake from Client (Host receives client's data)
        const handleHandshake = (data: { deckIds?: string[]; playerName?: string }) => {
            if (isHost && data) {
                console.log('[useGameLogic] Host received handshake:', data);
                dispatch({ type: 'SET_OPPONENT_DECK', deckIds: data.deckIds, playerName: data.playerName });
            }
        };

        multiplayer.onAction(handleAction);
        multiplayer.onState(handleState);

        // Set up handshake callback for host
        if (isHost) {
            multiplayer.setCallbacks(
                handleState,
                handleAction,
                () => { },
                handleHandshake
            );
        }

        return () => {
            // Cleanup listeners if MultiplayerManager supported removal
            // multiplayer.clearListeners(); // Hypothetical
        };
    }, [isHost, isClient]);

    // 5. Wrappers (Adapter Pattern)
    // These functions match the signature expected by GameArea.tsx

    const playCard = useCallback((cardId: string) => {
        if (isClient) {
            multiplayer.sendAction({ type: 'PLAY_CARD', cardId });
        } else {
            dispatch({ type: 'PLAY_CARD', cardId });
        }
    }, [isClient]);

    const attack = useCallback((attackerIds: string[], targetId?: string) => {
        const action: GameAction = { type: 'ATTACK', attackerIds, targetId };
        if (isClient) {
            multiplayer.sendAction(action);
        } else {
            dispatch(action);
        }
    }, [isClient]);

    const endTurn = useCallback(() => {
        if (isClient) {
            multiplayer.sendAction({ type: 'END_TURN' });
        } else {
            dispatch({ type: 'END_TURN' });
        }
    }, [isClient]);

    const selectCard = useCallback((cardId?: string) => {
        // Selection is local UI state usually, but for now we keep it in Reducer for simplicity
        // If it's pure UI (highlighting), it shouldn't trigger network sync necessarily,
        // unless we want opponent to see what we select (usually not).
        // BUT, existing logic might put it in GameState.
        // Let's dispatch locally.
        dispatch({ type: 'SELECT_CARD', cardId: cardId || '' });
    }, []);

    const selectMinion = useCallback((minionId: string, toggle: boolean = false) => {
        dispatch({ type: 'SELECT_MINION', minionId, toggle });
    }, []);

    const useSpecial = useCallback((minionId: string, targetId?: string) => {
        const action: GameAction = { type: 'USE_SPECIAL', minionId, targetId };
        if (isClient) {
            multiplayer.sendAction(action);
        } else {
            dispatch(action);
        }
    }, [isClient]);

    const cancelCast = useCallback(() => {
        if (isClient) {
            multiplayer.sendAction({ type: 'CANCEL_CAST' });
        } else {
            dispatch({ type: 'CANCEL_CAST' });
        }
    }, [isClient]);

    // Legacy/Targeting Resolvers (Adapter to Actions)
    const resolveTrolley = useCallback((minionId: string) => {
        const action: GameAction = { type: 'TROLLEY_SACRIFICE', minionId };
        if (isClient) multiplayer.sendAction(action);
        else dispatch(action);
    }, [isClient]);

    const resolveFoucault = useCallback(() => {
        const action: GameAction = { type: 'FOUCAULT_CLOSE' };
        if (isClient) multiplayer.sendAction(action);
        else dispatch(action);
    }, [isClient]);

    const resolveGottesbeweis = useCallback((minionId: string) => {
        const action: GameAction = { type: 'GOTTESBEWEIS_TARGET', minionId };
        if (isClient) multiplayer.sendAction(action);
        else dispatch(action);
    }, [isClient]);

    const resolveNietzsche = useCallback((minionId: string) => {
        const action: GameAction = { type: 'NIETZSCHE_TARGET', minionId };
        if (isClient) multiplayer.sendAction(action);
        else dispatch(action);
    }, [isClient]);

    const resolveVanInwagen = useCallback((minionId: string) => {
        const action: GameAction = { type: 'VAN_INWAGEN_TARGET', minionId };
        if (isClient) multiplayer.sendAction(action);
        else dispatch(action);
    }, [isClient]);

    const resolveArete = useCallback((minionId: string) => {
        const action: GameAction = { type: 'ARETE_TARGET', minionId };
        if (isClient) multiplayer.sendAction(action);
        else dispatch(action);
    }, [isClient]);

    const resolveCaveAscent = useCallback((minionId: string) => {
        const action: GameAction = { type: 'CAVE_ASCENT_TARGET', minionId };
        if (isClient) multiplayer.sendAction(action);
        else dispatch(action);
    }, [isClient]);

    const resolveRecurrence = useCallback((cardId: string) => {
        const action: GameAction = { type: 'RECURRENCE_SELECT', cardId };
        if (isClient) multiplayer.sendAction(action);
        else dispatch(action);
    }, [isClient]);

    const searchDeck = useCallback((filter: (c: any) => boolean, amount: number) => {
        // Search Deck is likely initiated by specific cards (Marx)
        // We might trigger this via UI or Effect.
        // For direct call:
        dispatch({ type: 'AUTO_SEARCH_DECK', filter, amount });
    }, []);


    return {
        gameState,
        dispatch, // Expose dispatch for raw access if needed
        isHost,
        isClient,
        // Exposed Helpers
        playCard,
        attack,
        endTurn,
        selectCard,
        selectMinion,
        useSpecial,
        cancelCast,
        // Resolvers
        resolveTrolley,
        resolveFoucault,
        resolveGottesbeweis,
        resolveNietzsche,
        resolveVanInwagen,
        resolveArete,
        resolveCaveAscent,
        resolveRecurrence,
        searchDeck
    };
};
