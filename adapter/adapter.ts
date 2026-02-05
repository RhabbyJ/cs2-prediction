import axios from 'axios';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const GRID_API_KEY = process.env.GRID_API_KEY || ''; // Your Open Access Key
let ENGINE_URL = process.env.ENGINE_URL || 'ws://engine:8080/ws'; // Internal Docker URL by default
const MATCH_ID = process.env.MATCH_ID || '28'; // Default CS2 Loop ID
const POLL_INTERVAL = 2000; // 2 seconds

// Ensure engine URL always has /ws suffix if it's the trading endpoint
if (!ENGINE_URL.endsWith('/ws')) {
  ENGINE_URL = ENGINE_URL.replace(/\/$/, '') + '/ws';
}

// --- SCHEMA DEFINITIONS ---

// 1. The "Commercial" Schema (What the Engine Expects)
interface EngineSeriesEvent {
  type: 'series_state';
  payload: {
    series_id: string;
    timestamp: string;
    game_state: {
      map: string;
      round: number;
      terrorist_score: number;
      ct_score: number;
      bomb_planted: boolean;
      phase: 'live' | 'ended';
      last_action?: string;
    };
  };
}

// 2. The "Open Access" Schema (What GRID Gives Us)
const GRAPHQL_QUERY = `
  query GetMatchState($id: ID!) {
    series(id: $id) {
      id
      title {
        nameShort
      }
      games {
        id
        status
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

// --- STATE TRACKING ---
let engineSocket: WebSocket | null = null;
let lastRound = -1;
let isPolling = false;

// --- CONNECTION LOGIC ---

function connectToEngine() {
  console.log(`🔌 [ADAPTER] Connecting to Engine at ${ENGINE_URL}...`);
  engineSocket = new WebSocket(ENGINE_URL);

  engineSocket.on('open', () => {
    console.log("✅ [ADAPTER] CONNECTED TO ENGINE (Ready to Push)");
    // Start Polling only when engine is ready, and ensure only one interval exists
    if (!isPolling) {
      isPolling = true;
      startGridPolling();
    }
  });

  engineSocket.on('close', () => {
    console.log("❌ [ADAPTER] Engine Disconnected. Retrying in 5s...");
    setTimeout(connectToEngine, 5000);
  });

  engineSocket.on('error', (err) => {
    console.error("❌ [ADAPTER] Engine Socket Error:", err.message);
  });
}

// --- POLLING LOGIC ---

async function startGridPolling() {
  console.log(`📡 [ADAPTER] Starting GRID Polling for Match ${MATCH_ID}...`);

  setInterval(async () => {
    try {
      if (!engineSocket || engineSocket.readyState !== WebSocket.OPEN) {
        return;
      }

      // 1. POLL GRID (HTTP Request)
      const response = await axios.post(
        'https://api.grid.gg/central-data/graphql',
        {
          query: GRAPHQL_QUERY,
          variables: { id: MATCH_ID }
        },
        {
          headers: {
            'x-grid-api-key': GRID_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      // 2. PARSE DATA
      const series = response.data?.data?.series;
      if (!series || !series.games || series.games.length === 0) {
        return;
      }

      // Get the latest game and latest segment (round)
      const currentGame = series.games[series.games.length - 1];
      const segments = currentGame.segments;

      if (!segments || segments.length === 0) {
        return;
      }

      const currentSegment = segments[segments.length - 1];

      // 3. DETECT STATE CHANGE (Poll-based change detection)
      if (currentSegment.number > lastRound || currentSegment.team1Score !== 0 || currentSegment.team2Score !== 0) {
        // Map to standard internal logs
        if (currentSegment.number > lastRound) {
          console.log(`⚡ [ADAPTER] NEW ROUND DETECTED: ${currentSegment.number} | Score: ${currentSegment.team1Score}-${currentSegment.team2Score}`);
        }

        // 4. MAP TO COMMERCIAL SCHEMA
        const payload: EngineSeriesEvent = {
          type: 'series_state',
          payload: {
            series_id: series.id,
            timestamp: new Date().toISOString(),
            game_state: {
              map: series.title?.nameShort || "unknown",
              round: currentSegment.number,
              terrorist_score: currentSegment.team1Score,
              ct_score: currentSegment.team2Score,
              bomb_planted: false,
              phase: currentGame.status === 'Ended' || currentSegment.isMapFinished ? 'ended' : 'live',
              last_action: `Round ${currentSegment.number} Progress`
            }
          }
        };

        // 5. PUSH TO ENGINE
        engineSocket.send(JSON.stringify(payload));

        // Update local state
        lastRound = currentSegment.number;
      }

    } catch (error: any) {
      console.error("❌ [ADAPTER] Polling Error:", error.message);
      if (error.response?.data) {
        console.error("   GRID Payload Error:", JSON.stringify(error.response.data));
      }
    }
  }, POLL_INTERVAL);
}

// --- START ---
connectToEngine();
