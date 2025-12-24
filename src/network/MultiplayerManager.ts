import Peer, { DataConnection } from 'peerjs';
import { GameAction, GameState } from '../types';

type MessageType = 'HANDSHAKE' | 'GAME_STATE' | 'ACTION' | 'RESTART' | 'COIN_FLIP';

interface NetworkMessage {
    type: MessageType;
    payload: any;
}

export class MultiplayerManager {
    private peer: Peer | null = null;
    private conn: DataConnection | null = null;
    private onStateUpdate: ((state: GameState) => void) | null = null;
    private onActionReceived: ((action: GameAction) => void) | null = null;
    private onHandshakeReceived: ((data: { deckIds?: string[]; playerName?: string; avatarId?: string }) => void) | null = null;
    private onCoinFlipReceived: ((winner: 'player' | 'opponent') => void) | null = null;
    private onConnect: (() => void) | null = null;
    private onDisconnect: (() => void) | null = null;
    private onError: ((error: string) => void) | null = null;

    public isHost: boolean = false;
    public myId: string = '';
    public receivedOpponentDeckIds: { deckIds?: string[]; playerName?: string; avatarId?: string } | null = null; // Store handshake data for late pickup

    constructor() {
        // Initialize PeerJS
        // We use the default PeerJS cloud server (free)
        // In production, you might want your own PeerServer
    }

    public async initialize(customId?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // If customId is provided, try to use it. Otherwise, PeerJS generates one.
            // Note: PeerJS IDs must be unique on the server.
            this.peer = customId ? new Peer(customId) : new Peer();

            this.peer.on('open', (id) => {
                this.myId = id;
                console.log('My Peer ID is: ' + id);
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS error:', err);
                // If ID is taken, we might want to retry with a new random ID or reject
                if (err.type === 'unavailable-id') {
                    reject(new Error('ID_TAKEN'));
                } else {
                    reject(err);
                }
            });
        });
    }

    public generateRandomId(): string {
        // Generate a 6-digit random number string
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    public connectToPeer(peerId: string) {
        if (!this.peer) return;
        const conn = this.peer.connect(peerId);
        this.handleConnection(conn);
    }

    private handleConnection(conn: DataConnection) {
        this.conn = conn;

        this.conn.on('open', () => {
            if (this.onConnect) this.onConnect();
        });

        this.conn.on('data', (data: any) => {
            const msg = data as NetworkMessage;
            this.handleMessage(msg);
        });

        this.conn.on('close', () => {
            console.log('Connection closed');
            if (this.onDisconnect) this.onDisconnect();
        });

        this.conn.on('error', (err) => {
            console.error('Connection error:', err);
            if (this.onError) this.onError(err.message || 'Verbindungsfehler');
        });
    }

    private handleMessage(msg: NetworkMessage) {
        switch (msg.type) {
            case 'GAME_STATE':
                if (this.onStateUpdate) this.onStateUpdate(msg.payload);
                break;
            case 'ACTION':
                if (this.onActionReceived) this.onActionReceived(msg.payload);
                break;
            case 'HANDSHAKE':
                // Always store handshake data so it can be picked up later if callback isn't set yet
                this.receivedOpponentDeckIds = msg.payload; // Now an object { deckIds?, playerName? }
                console.log('[MultiplayerManager] Received handshake:', msg.payload);
                if (this.onHandshakeReceived) this.onHandshakeReceived(msg.payload);
                break;
            case 'COIN_FLIP':
                console.log('[MultiplayerManager] Received coin flip:', msg.payload);
                if (this.onCoinFlipReceived) this.onCoinFlipReceived(msg.payload);
                break;
        }
    }

    public sendHandshake(deckIds?: string[], playerName?: string, avatarId?: string) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'HANDSHAKE', payload: { deckIds, playerName, avatarId } });
        }
    }

    public sendCoinFlip(winner: 'player' | 'opponent') {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'COIN_FLIP', payload: winner });
        }
    }

    public onCoinFlip(callback: (winner: 'player' | 'opponent') => void) {
        this.onCoinFlipReceived = callback;
    }

    public sendState(state: GameState) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'GAME_STATE', payload: state });
        }
    }

    public sendAction(action: GameAction) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'ACTION', payload: action });
        }
    }

    public setCallbacks(
        onStateUpdate: (state: GameState) => void,
        onActionReceived: (action: GameAction) => void,
        onConnect: () => void,
        onHandshakeReceived?: (data: { deckIds?: string[]; playerName?: string; avatarId?: string }) => void
    ) {
        this.onStateUpdate = onStateUpdate;
        this.onActionReceived = onActionReceived;
        this.onConnect = onConnect;
        if (onHandshakeReceived) this.onHandshakeReceived = onHandshakeReceived;
    }

    public get isConnected(): boolean {
        return !!this.conn && this.conn.open;
    }

    public onAction(callback: (action: GameAction) => void) {
        this.onActionReceived = callback;
    }

    public onState(callback: (state: GameState) => void) {
        this.onStateUpdate = callback;
    }

    public setDisconnectCallback(callback: () => void) {
        this.onDisconnect = callback;
    }

    public setErrorCallback(callback: (error: string) => void) {
        this.onError = callback;
    }

    public clearListeners() {
        this.onStateUpdate = null;
        this.onActionReceived = null;
        this.onDisconnect = null;
        this.onError = null;
        this.onHandshakeReceived = null;
        this.onCoinFlipReceived = null;
    }

    public cleanup() {
        this.clearListeners();
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
    }
}

export const multiplayer = new MultiplayerManager();
