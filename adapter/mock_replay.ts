// mock_replay.ts
// Simulates live GRID telemetry events for CS2

import { WebSocket } from 'ws';

interface SeriesEvent {
    type: 'series_state';
    payload: {
        series_id: string;
        game_state: {
            round: number;
            bomb_planted: boolean;
            terrorist_score: number;
            ct_score: number;
        };
    };
}

class MockReplay {
    private ws: WebSocket | null = null;
    private currentRound: number = 1;
    private tScore: number = 0;
    private ctScore: number = 0;
    private interval: NodeJS.Timeout | null = null;

    constructor(private engineUrl: string, private matchId: string) { }

    public start() {
        console.log(`📡 Starting Mock Replay for Match: ${this.matchId}`);
        this.ws = new WebSocket(this.engineUrl);

        this.ws.on('open', () => {
            console.log('✅ Mock Replay connected to Engine');
            this.beginSim();
        });

        this.ws.on('error', (err) => {
            console.error('❌ Mock Replay Error:', err.message);
        });
    }

    private beginSim() {
        // Simulate a new round every 10 seconds
        this.interval = setInterval(() => {
            this.emitRound();
        }, 10000);

        // Emit initial state
        this.emitRound();
    }

    private emitRound() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const event: SeriesEvent = {
            type: 'series_state',
            payload: {
                series_id: this.matchId,
                game_state: {
                    round: this.currentRound,
                    bomb_planted: Math.random() > 0.5,
                    terrorist_score: this.tScore,
                    ct_score: this.ctScore
                }
            }
        };

        console.log(`📤 Emitting Mock Round ${this.currentRound}: T ${this.tScore} - CT ${this.ctScore}`);
        this.ws.send(JSON.stringify(event));

        // Prepare next round
        if (Math.random() > 0.5) {
            this.tScore++;
        } else {
            this.ctScore++;
        }
        this.currentRound++;

        if (this.currentRound > 30) {
            this.stop();
            console.log('🏁 Mock Replay Finished');
        }
    }

    public stop() {
        if (this.interval) clearInterval(this.interval);
        if (this.ws) this.ws.close();
    }
}

const ENGINE_URL = process.env.ENGINE_URL || 'ws://localhost:8080';
const MATCH_ID = 'mock-match-777';

const replay = new MockReplay(ENGINE_URL, MATCH_ID);
replay.start();
