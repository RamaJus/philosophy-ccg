import Peer, { DataConnection } from 'peerjs';
import { GameAction, GameState } from '../types';

type MessageType = 'HANDSHAKE' | 'GAME_STATE' | 'ACTION' | 'RESTART';

interface NetworkMessage {
    type: MessageType;
    payload: any;
}

export class MultiplayerManager {
    private peer: Peer | null = null;
    private conn: DataConnection | null = null;
    private onStateUpdate: ((state: GameState) => void) | null = null;
    private onActionReceived: ((action: GameAction) => void) | null = null;
    private onConnect: (() => void) | null = null;

    public isHost: boolean = false;
    public myId: string = '';

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
            console.log('Connected to: ' + conn.peer);
            if (this.onConnect) this.onConnect();
        });

        this.conn.on('data', (data: any) => {
            const msg = data as NetworkMessage;
            this.handleMessage(msg);
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
        }
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
        onConnect: () => void
    ) {
        this.onStateUpdate = onStateUpdate;
        this.onActionReceived = onActionReceived;
        this.onConnect = onConnect;
    }

    public cleanup() {
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
    }
}

export const multiplayer = new MultiplayerManager();
