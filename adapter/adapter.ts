// adapter.ts
// The "High-Fidelity" Bridge between GRID and Information Finance Engine

import axios from 'axios';
import { WebSocket } from 'ws';

/**
 * Official GRID Series Events Transaction Schema
 * Format: { actor }-{ action }-{ target }
 */
interface GridTransaction {
  id: string;
  type?: string;
  actor: {
    type: string;
    id: string;
    stateDelta?: any;
    state?: any;
  };
  action: string;
  target: {
    type: string;
    id: string;
    stateDelta?: any;
    state?: any;
  };
  seriesState?: {
    id: string;
    games: Array<{
      id: string;
      started?: boolean;
      team1Score?: number;
      team2Score?: number;
      state?: {
        round?: number;
        bombPlanted?: boolean;
        team1Score?: number;
        team2Score?: number;
      };
    }>;
  };
}

/**
 * Normalized Engine Event
 */
interface EngineSeriesEvent {
  type: 'series_state' | 'game_event';
  payload: {
    series_id: string;
    event_type?: string;
    game_state: {
      round: number;
      bomb_planted: boolean;
      terrorist_score: number;
      ct_score: number;
      last_action?: string;
    };
    markets?: Array<{
      id: string;
      title: string;
      yes: number;
      no: number;
      volume: string;
    }>;
  };
}

class HighFidelityAdapter {
  private engineWs: WebSocket | null = null;
  private gridWs: WebSocket | null = null;
  private lastState: any = { round: 1, t_score: 0, ct_score: 0, bomb: false };
  private isMock: boolean = false;

  constructor(
    private matchId: string,
    private engineUrl: string,
    private apiKey: string
  ) {
    // Robust detection: if key is empty or looks like one of my placeholders, treat as mock
    this.isMock = !apiKey ||
      apiKey.includes('REPLACE_WITH') ||
      apiKey.includes('YOUR_PASTED_GRID') ||
      apiKey.length < 10;

    // Ensure engine URL always has /ws suffix
    if (!this.engineUrl.endsWith('/ws')) {
      this.engineUrl = this.engineUrl.replace(/\/$/, '') + '/ws';
    }
  }

  public async start() {
    console.log(`🚀 [ADAPTER] Initializing in ${this.isMock ? 'MOCK' : 'LIVE'} mode`);
    console.log(`🔗 [ADAPTER] Engine URL: ${this.engineUrl}`);
    this.connectToEngine();

    if (this.isMock) {
      this.startMockReplay();
    } else {
      this.connectToGrid();
    }
  }

  private connectToEngine() {
    this.engineWs = new WebSocket(this.engineUrl);
    this.engineWs.on('open', () => console.log('✅ [ADAPTER] Connected to Matching Engine'));
    this.engineWs.on('error', (e) => console.error('❌ [ADAPTER] Engine WS Error:', e.message));
    this.engineWs.on('close', () => setTimeout(() => this.connectToEngine(), 5000));
  }

  private connectToGrid() {
    console.log(`📡 [ADAPTER] Connecting to GRID Live Data Feed for Series: ${this.matchId}`);
    // Official format: wss://api.grid.gg/live-data-feed/series/{seriesId}?key={apiKey}
    const gridUrl = `wss://api.grid.gg/live-data-feed/series/${this.matchId}?key=${this.apiKey}`;

    this.gridWs = new WebSocket(gridUrl);

    this.gridWs.on('open', () => {
      console.log('✅ [ADAPTER] Connected to GRID Live Data Feed');
    });

    this.gridWs.on('message', (data) => {
      const tx = JSON.parse(data.toString()) as GridTransaction;
      console.log(`📡 [ADAPTER] Incoming Transaction: ${tx.id} | Type: ${tx.type || tx.action}`);
      this.processTransaction(tx);
    });

    this.gridWs.on('close', (code, reason) => {
      console.log(`🔌 [ADAPTER] GRID Connection Closed (${code}): ${reason}`);
      setTimeout(() => this.connectToGrid(), 5000);
    });

    this.gridWs.on('error', (e) => {
      console.error('❌ [ADAPTER] GRID WS Error:', e.message);
      if (e.message.includes('404')) {
        console.log('⚠️ [ADAPTER] GRID Series Events API returned 404. This might be due to incorrect Match ID or restricted permissions.');
        console.log('🔄 [ADAPTER] Falling back to MOCK mode for testing safety...');
        this.isMock = true;
        this.startMockReplay();
      }
    });
  }

  private processTransaction(tx: GridTransaction) {
    // Extract state from transaction
    const latestGame = tx.seriesState?.games?.[tx.seriesState.games.length - 1];

    // GRID CS2 Specific mapping: 
    // Scores and rounds are extracted from the seriesState.
    const currentRound = latestGame?.state?.round || this.lastState.round;
    const tScore = latestGame?.state?.team1Score || latestGame?.team1Score || this.lastState.t_score;
    const ctScore = latestGame?.state?.team2Score || latestGame?.team2Score || this.lastState.ct_score;
    const isPlanted = latestGame?.state?.bombPlanted || tx.action === 'planted' || this.lastState.bomb;

    const event: EngineSeriesEvent = {
      type: 'game_event',
      payload: {
        series_id: this.matchId,
        event_type: `${tx.actor?.type}-${tx.action}-${tx.target?.type}`,
        game_state: {
          round: currentRound,
          bomb_planted: isPlanted,
          terrorist_score: tScore,
          ct_score: ctScore,
          last_action: `${tx.actor?.type} ${tx.action} ${tx.target?.type}`
        }
      }
    };

    if (this.engineWs?.readyState === WebSocket.OPEN) {
      this.engineWs.send(JSON.stringify(event));
      this.lastState = { round: currentRound, t_score: tScore, ct_score: ctScore, bomb: isPlanted };
    }
  }

  private startMockReplay() {
    console.log('🎭 [ADAPTER] Starting "Tryhard" Mock Replay...');
    let round = 14;
    let tScore = 8;
    let ctScore = 5;

    const sequence = [
      { type: 'round-started', delay: 1000 },
      { type: 'player-killed-player', delay: 3000 },
      { type: 'player-planted-bomb', delay: 5000 },
      { type: 'bomb-exploded', delay: 10000 },
      { type: 'round-ended', delay: 2000 }
    ];

    let i = 0;
    const run = () => {
      const step = sequence[i % sequence.length];
      if (!step) return;

      if (step.type === 'round-ended') {
        tScore++;
        round++;
      }

      // Generate dynamic prop prices
      const markets = [
        { id: "series_winner", title: "Match Winner", yes: 60 + (Math.random() * 10), no: 30 + (Math.random() * 10), volume: "128k" },
        { id: "r15_winner", title: "Round 15 Winner", yes: 50 + (Math.random() * 5), no: 45 + (Math.random() * 5), volume: "12k" },
        { id: "bomb_prop", title: "Bomb Planted in Round 15?", yes: step.type === 'player-planted-bomb' ? 99 : 20 + (Math.random() * 20), no: step.type === 'player-planted-bomb' ? 1 : 60 + (Math.random() * 20), volume: "5k" }
      ];

      const event: EngineSeriesEvent = {
        type: 'game_event',
        payload: {
          series_id: this.matchId,
          event_type: step.type,
          game_state: {
            round: round,
            bomb_planted: step.type === 'player-planted-bomb',
            terrorist_score: tScore,
            ct_score: ctScore,
            last_action: step.type
          },
          markets: markets
        }
      };

      if (this.engineWs?.readyState === WebSocket.OPEN) {
        this.engineWs.send(JSON.stringify(event));
      }

      i++;
      setTimeout(run, step.delay);
    };

    run();
  }
}

const GRID_API_KEY = process.env.GRID_API_KEY || '';
const MATCH_ID = process.env.MATCH_ID || 'cs2-demo-match';
const ENGINE_URL = process.env.ENGINE_URL || 'ws://localhost:8080';

new HighFidelityAdapter(MATCH_ID, ENGINE_URL, GRID_API_KEY).start();
