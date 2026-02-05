import axios from 'axios';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const GRID_API_KEY = process.env.GRID_API_KEY || '';
let ENGINE_URL = process.env.ENGINE_URL || 'ws://engine:8080/ws';
const MATCH_ID = process.env.MATCH_ID || '28';
const POLL_INTERVAL = 2000;

if (!ENGINE_URL.endsWith('/ws')) {
  ENGINE_URL = ENGINE_URL.replace(/\/$/, '') + '/ws';
}

// --- SCHEMA ---
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

// --- STATE ---
let engineSocket: WebSocket | null = null;
let isPolling = false;
let useMockMode = false;

// --- ENGINE CONNECTION ---
function connectToEngine() {
  console.log(`🔌 [ADAPTER] Connecting to Engine at ${ENGINE_URL}...`);
  engineSocket = new WebSocket(ENGINE_URL);

  engineSocket.on('open', () => {
    console.log("✅ [ADAPTER] CONNECTED TO ENGINE");
    if (!isPolling) {
      isPolling = true;
      attemptGridConnection();
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

// --- GRID CONNECTION ATTEMPT ---
async function attemptGridConnection() {
  console.log(`📡 [ADAPTER] Testing GRID API access for Match ${MATCH_ID}...`);

  try {
    // Try Central Data Feed first (Open Access)
    const response = await axios.post(
      'https://api.grid.gg/central-data/graphql',
      {
        query: `query { series(id: "${MATCH_ID}") { id } }`,
      },
      {
        headers: {
          'x-grid-api-key': GRID_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.data?.series) {
      console.log(`✅ [ADAPTER] GRID API Key Valid! Series ${MATCH_ID} exists.`);
      console.log(`⚠️ [ADAPTER] However, Open Access only provides static data.`);
      console.log(`⚠️ [ADAPTER] Live round-by-round data requires Commercial Tier.`);
      console.log(`🎭 [ADAPTER] Falling back to MOCK MODE for demo...`);
    } else {
      console.log(`⚠️ [ADAPTER] Series ${MATCH_ID} not found or API error.`);
      console.log(`🎭 [ADAPTER] Starting MOCK MODE...`);
    }
  } catch (error: any) {
    console.log(`⚠️ [ADAPTER] GRID API check failed: ${error.message}`);
    console.log(`🎭 [ADAPTER] Starting MOCK MODE...`);
  }

  // Always fall back to mock mode for now (until Commercial access)
  useMockMode = true;
  startMockReplay();
}

// --- MOCK REPLAY ---
function startMockReplay() {
  console.log('🎭 [ADAPTER] Mock Mode Active - Simulating CS2 Match...');

  let round = 1;
  let tScore = 0;
  let ctScore = 0;
  let bombPlanted = false;

  setInterval(() => {
    if (!engineSocket || engineSocket.readyState !== WebSocket.OPEN) return;

    // Simulate round progression
    const events = ['round_start', 'kill', 'kill', 'bomb_plant', 'round_end'];
    const randomEvent = events[Math.floor(Math.random() * events.length)];

    if (randomEvent === 'bomb_plant') {
      bombPlanted = true;
    } else if (randomEvent === 'round_end') {
      // Randomly award round to a team
      if (Math.random() > 0.5) {
        tScore++;
      } else {
        ctScore++;
      }
      round++;
      bombPlanted = false;
      console.log(`⚡ [MOCK] Round ${round} | Score: ${tScore}-${ctScore}`);
    }

    const payload: EngineSeriesEvent = {
      type: 'series_state',
      payload: {
        series_id: MATCH_ID,
        timestamp: new Date().toISOString(),
        game_state: {
          map: 'de_mirage',
          round: round,
          terrorist_score: tScore,
          ct_score: ctScore,
          bomb_planted: bombPlanted,
          phase: round > 30 ? 'ended' : 'live',
          last_action: randomEvent || 'unknown'
        }
      }
    };

    engineSocket.send(JSON.stringify(payload));
  }, 3000); // Every 3 seconds
}

// --- START ---
connectToEngine();
