// adapter.ts
// The "Bridge" between Free GraphQL and Your Engine

import axios from 'axios';
import { WebSocket } from 'ws';

// 1. The Schema (Commercial Format)
// Your Engine expects this, but the Free API doesn't give it.
// We must construct it manually.
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

// 2. The Free API Query
// We only get basic stats from Open Access
const GRAPHQL_QUERY = `
  query GetMatch($id: ID!) {
    series(id: $id) {
      games {
        segments {
          number
          team1Score
          team2Score
          isMapFinished
        }
      }
    }
  }
`;

/**
 * Adapter class to poll GRID GraphQL and push to the matching engine
 */
class GridAdapter {
  private lastRound: number = 0;
  private engineWs: WebSocket | null = null;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(
    private matchId: string, 
    private engineUrl: string, 
    private apiKey: string
  ) {}

  public async start() {
    console.log(`🚀 Starting Adapter for Match: ${this.matchId}`);
    this.connectToEngine();
    
    // Poll every 2 seconds
    this.pollInterval = setInterval(() => this.poll(), 2000);
  }

  private connectToEngine() {
    this.engineWs = new WebSocket(this.engineUrl);
    
    this.engineWs.on('open', () => {
      console.log('✅ Connected to Matching Engine');
    });

    this.engineWs.on('error', (err) => {
      console.error('❌ Engine WebSocket Error:', err.message);
      // Reconnect logic would go here
    });
  }

  private async poll() {
    try {
      // A. PULL from Free API
      const response = await axios.post('https://api.grid.gg/central-data/graphql', {
        query: GRAPHQL_QUERY,
        variables: { id: this.matchId }
      }, { 
        headers: { 
          'x-grid-api-key': this.apiKey,
          'Content-Type': 'application/json'
        } 
      });

      const games = response.data?.data?.series?.games;
      if (!games || games.length === 0) return;

      const latestGame = games[0]; 
      const segments = latestGame.segments;
      const currentSegment = segments[segments.length - 1]; // Latest round

      // B. DETECT CHANGE (Simulate Push)
      if (currentSegment && currentSegment.number > this.lastRound) {
        console.log(`⚡ New Round Detected: ${currentSegment.number}`);
        
        // C. TRANSFORM to "Commercial Schema"
        const event: SeriesEvent = {
          type: 'series_state',
          payload: {
            series_id: this.matchId,
            game_state: {
              round: currentSegment.number,
              bomb_planted: false, // Open Access doesn't have this! We assume False.
              terrorist_score: currentSegment.team1Score,
              ct_score: currentSegment.team2Score
            }
          }
        };

        // D. PUSH to Engine
        if (this.engineWs && this.engineWs.readyState === WebSocket.OPEN) {
          this.engineWs.send(JSON.stringify(event));
          this.lastRound = currentSegment.number;
        } else {
          console.warn('⚠️ Engine not connected. Skipping emission.');
        }
      }

    } catch (err: any) {
      console.error("❌ Adapter Poll Error:", err.response?.data || err.message);
    }
  }

  public stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.engineWs) this.engineWs.close();
  }
}

// Configuration from Environment or Constants
const GRID_API_KEY = process.env.GRID_API_KEY || 'REPLACE_WITH_YOUR_KEY';
const MATCH_ID = process.env.MATCH_ID || '12345';
const ENGINE_URL = process.env.ENGINE_URL || 'ws://localhost:8080';

const adapter = new GridAdapter(MATCH_ID, ENGINE_URL, GRID_API_KEY);
adapter.start();
