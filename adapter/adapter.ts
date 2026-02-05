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

// 2. The corrected "Open Access" Schema for Series State
const GRAPHQL_QUERY = `
  query GetSeriesState($id: ID!) {
    seriesState(id: $id) {
      id
      title {
        nameShortened
      }
      games {
        id
        finished
        teams {
          id
          name
          score
        }
        segments {
          id
          sequenceNumber
          finished
          teams {
            id
            name
            won
          }
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

      // 1. POLL GRID (HTTP Request) - Use Live Data Feed endpoint for seriesState
      const response = await axios.post(
        'https://api-op.grid.gg/live-data-feed/series-state/graphql',
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

      // 2. PARSE DATA - Add verbose logging
      const rawData = response.data;
      console.log(`🔍 [DEBUG] Raw GRID Response:`, JSON.stringify(rawData, null, 2).substring(0, 500));

      const seriesState = rawData?.data?.seriesState;
      if (!seriesState) {
        console.log(`⚠️ [DEBUG] No seriesState in response. Possible: match inactive or ID invalid.`);
        return;
      }

      if (!seriesState.games || seriesState.games.length === 0) {
        console.log(`⚠️ [DEBUG] seriesState found, but no games yet. Series may be scheduled but not started.`);
        return;
      }

      // Get the latest game and latest segment (round)
      const currentGame = seriesState.games[seriesState.games.length - 1];
      const segments = currentGame.segments;

      if (!segments || segments.length === 0) {
        console.log(`⚠️ [DEBUG] Game found, but no segments/rounds yet. Game may be in warmup.`);
        return;
      }

      const currentSegment = segments[segments.length - 1];
      const team1 = currentGame.teams[0];
      const team2 = currentGame.teams[1];

      // 3. DETECT STATE CHANGE (Using sequenceNumber from segments)
      const currentRound = currentSegment.sequenceNumber;
      const tScore = team1?.score || 0;
      const ctScore = team2?.score || 0;

      if (currentRound > lastRound || (currentRound === lastRound && (tScore !== lastTScore || ctScore !== lastCTScore))) {

        if (currentRound > lastRound) {
          console.log(`⚡ [ADAPTER] NEW ROUND DETECTED: ${currentRound} | Score: ${tScore}-${ctScore}`);
        }

        // 4. MAP TO COMMERCIAL SCHEMA
        const payload: EngineSeriesEvent = {
          type: 'series_state',
          payload: {
            series_id: seriesState.id,
            timestamp: new Date().toISOString(),
            game_state: {
              map: seriesState.title?.nameShortened || "unknown",
              round: currentRound,
              terrorist_score: tScore,
              ct_score: ctScore,
              bomb_planted: false,
              phase: currentGame.finished || currentSegment.finished ? 'ended' : 'live',
              last_action: `Round ${currentRound} in Progress`
            }
          }
        };

        // 5. PUSH TO ENGINE
        engineSocket.send(JSON.stringify(payload));

        // Update local state
        lastRound = currentRound;
        lastTScore = tScore;
        lastCTScore = ctScore;
      }

    } catch (error: any) {
      console.error("❌ [ADAPTER] Polling Error:", error.message);
      if (error.response?.data) {
        console.error("   GRID Payload Error:", JSON.stringify(error.response.data));
      }
    }
  }, POLL_INTERVAL);
}

// Track scores for change detection within the same round
let lastTScore = -1;
let lastCTScore = -1;

// --- START ---
connectToEngine();
