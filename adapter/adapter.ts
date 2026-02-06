import axios from 'axios';
import WebSocket from 'ws';

const GRID_API_KEY = process.env.GRID_API_KEY || '';
let ENGINE_URL = process.env.ENGINE_URL || 'ws://engine:8080/ws';
const POLL_INTERVAL_MS = Number(process.env.GRID_POLL_INTERVAL_MS || '10000');
const SCENARIO_ID = process.env.SCENARIO_ID || 'balanced';

if (!ENGINE_URL.endsWith('/ws')) {
  ENGINE_URL = ENGINE_URL.replace(/\/$/, '') + '/ws';
}

type MatchPhase = 'live' | 'ended';

type SeriesSummary = {
  id: string;
  title: string;
  tournament: string;
  teams: string[];
  startTimeScheduled?: string | undefined;
};

type ScenarioFrame = {
  round: number;
  terrorist_score: number;
  ct_score: number;
  bomb_planted: boolean;
  last_action: string;
  phase?: MatchPhase;
};

type SeriesStateEvent = {
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
      phase: MatchPhase;
      last_action: string;
    };
  };
};

type MarketCreatedEvent = {
  type: 'market_created';
  payload: {
    series_id: string;
    market_id: string;
    title: string;
    tournament: string;
    teams: string[];
    start_time?: string | undefined;
  };
};

type CircuitBreakerEvent = {
  type: 'circuit_breaker';
  payload: {
    series_id: string;
    market_id: string;
    reason: string;
    action: 'suspend' | 'resume';
  };
};

type GameEvent = {
  type: 'game_event';
  payload: Record<string, unknown>;
};

interface SeriesDataProvider {
  discoverSeries(): Promise<SeriesSummary[]>;
}

interface InPlayProvider {
  start(series: SeriesSummary): void;
  stop(seriesID: string): void;
}

const SCENARIOS: Record<string, ScenarioFrame[]> = {
  balanced: [
    { round: 1, terrorist_score: 0, ct_score: 0, bomb_planted: false, last_action: 'round_start' },
    { round: 2, terrorist_score: 1, ct_score: 0, bomb_planted: true, last_action: 'bomb_planted_A' },
    { round: 3, terrorist_score: 1, ct_score: 1, bomb_planted: false, last_action: 'ct_retakes' },
    { round: 4, terrorist_score: 2, ct_score: 1, bomb_planted: true, last_action: 'post_plant_hold' },
    { round: 5, terrorist_score: 2, ct_score: 2, bomb_planted: false, last_action: 'eco_upset' },
    { round: 6, terrorist_score: 3, ct_score: 2, bomb_planted: true, last_action: 'entry_frag_chain' },
    { round: 7, terrorist_score: 3, ct_score: 3, bomb_planted: false, last_action: 'clutch_1v2' },
    { round: 8, terrorist_score: 4, ct_score: 3, bomb_planted: true, last_action: 'mid_split_success' },
    { round: 9, terrorist_score: 4, ct_score: 4, bomb_planted: false, last_action: 'awp_pick_control' },
    { round: 10, terrorist_score: 5, ct_score: 4, bomb_planted: true, last_action: 'late_execute' },
    { round: 11, terrorist_score: 5, ct_score: 5, bomb_planted: false, last_action: 'double_entry_hold' },
    { round: 12, terrorist_score: 6, ct_score: 5, bomb_planted: true, last_action: 'trade_chain' },
    { round: 13, terrorist_score: 6, ct_score: 6, bomb_planted: false, last_action: 'save_call_success' },
    { round: 14, terrorist_score: 7, ct_score: 6, bomb_planted: true, last_action: 'site_hit_clean' },
    { round: 15, terrorist_score: 7, ct_score: 7, bomb_planted: false, last_action: 'timeout_reset' },
    { round: 16, terrorist_score: 8, ct_score: 7, bomb_planted: true, last_action: 'pistol_round_upset' },
    { round: 17, terrorist_score: 8, ct_score: 8, bomb_planted: false, last_action: 'force_buy_win' },
    { round: 18, terrorist_score: 9, ct_score: 8, bomb_planted: true, last_action: 'lurker_backstab' },
    { round: 19, terrorist_score: 9, ct_score: 9, bomb_planted: false, last_action: 'triple_stack_hold' },
    { round: 20, terrorist_score: 10, ct_score: 9, bomb_planted: true, last_action: 'fast_contact' },
    { round: 21, terrorist_score: 10, ct_score: 10, bomb_planted: false, last_action: 'retake_with_kit' },
    { round: 22, terrorist_score: 11, ct_score: 10, bomb_planted: true, last_action: 'entry_and_trade' },
    { round: 23, terrorist_score: 11, ct_score: 11, bomb_planted: false, last_action: 'late_flank_denied' },
    { round: 24, terrorist_score: 12, ct_score: 11, bomb_planted: true, last_action: 'post_plant_crossfire' },
    { round: 25, terrorist_score: 12, ct_score: 12, bomb_planted: false, last_action: '14_14_setup' },
    { round: 26, terrorist_score: 13, ct_score: 12, bomb_planted: true, last_action: 'match_point_pressure' },
    { round: 27, terrorist_score: 13, ct_score: 13, bomb_planted: false, last_action: 'composure_round' },
    { round: 28, terrorist_score: 14, ct_score: 13, bomb_planted: true, last_action: 'late_round_clutch' },
    { round: 29, terrorist_score: 14, ct_score: 14, bomb_planted: false, last_action: '14_14_tie' },
    { round: 30, terrorist_score: 16, ct_score: 14, bomb_planted: true, last_action: 'map_closed', phase: 'ended' },
  ],
  ct_comeback: [
    { round: 1, terrorist_score: 3, ct_score: 0, bomb_planted: true, last_action: 't_start_hot' },
    { round: 6, terrorist_score: 5, ct_score: 4, bomb_planted: false, last_action: 'ct_adjustments' },
    { round: 11, terrorist_score: 6, ct_score: 8, bomb_planted: false, last_action: 'ct_streak' },
    { round: 16, terrorist_score: 8, ct_score: 11, bomb_planted: true, last_action: 't_recovery_attempt' },
    { round: 21, terrorist_score: 9, ct_score: 14, bomb_planted: false, last_action: 'ct_lockdown' },
    { round: 24, terrorist_score: 10, ct_score: 16, bomb_planted: false, last_action: 'map_closed', phase: 'ended' },
  ],
};

class OpenAccessProvider implements SeriesDataProvider {
  private readonly endpoint = 'https://api-op.grid.gg/central-data/graphql';

  async discoverSeries(): Promise<SeriesSummary[]> {
    const richQuery = `
      query GetUpcomingSeries {
        allSeries(first: 8, orderBy: StartTimeScheduled) {
          edges {
            node {
              id
              startTimeScheduled
              title { nameShortened }
              tournament { nameShortened }
              teams { baseInfo { name } }
            }
          }
        }
      }
    `;

    const minimalQuery = `
      query GetUpcomingSeriesMinimal {
        allSeries(first: 8, orderBy: StartTimeScheduled) {
          edges {
            node {
              id
              startTimeScheduled
            }
          }
        }
      }
    `;

    const makeRequest = async (query: string) =>
      axios.post(
        this.endpoint,
        { query },
        {
          headers: {
            'x-grid-api-key': GRID_API_KEY,
            'x-api-key': GRID_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

    let response = await makeRequest(richQuery);
    if (response.data?.errors?.length) {
      console.error('[ADAPTER] Rich discovery query returned GraphQL errors:', JSON.stringify(response.data.errors));
      response = await makeRequest(minimalQuery);
      if (response.data?.errors?.length) {
        console.error('[ADAPTER] Minimal discovery query returned GraphQL errors:', JSON.stringify(response.data.errors));
        throw new Error('OpenAccess discovery failed with GraphQL errors');
      }
    }

    const edges = (response.data?.data?.allSeries?.edges as Array<{ node: Record<string, unknown> }> | undefined) || [];
    return edges.map((edge) => {
      const node = edge.node;
      const title = (node.title as { nameShortened?: string } | undefined)?.nameShortened || 'Unknown Series';
      const tournament = (node.tournament as { nameShortened?: string } | undefined)?.nameShortened || 'Unknown Tournament';
      const teams = ((node.teams as Array<{ baseInfo?: { name?: string } }> | undefined) || []).map(
        (team) => team.baseInfo?.name || 'Unknown Team'
      );

      return {
        id: String(node.id || ''),
        title,
        tournament,
        teams,
        startTimeScheduled: typeof node.startTimeScheduled === 'string' ? node.startTimeScheduled : undefined,
      };
    });
  }
}

class MockInPlayProvider implements InPlayProvider {
  private readonly activeIntervals = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private readonly sendSeriesState: (event: SeriesStateEvent) => void,
    private readonly emitCircuitBreaker: (event: CircuitBreakerEvent) => void
  ) {}

  start(series: SeriesSummary): void {
    if (this.activeIntervals.has(series.id)) {
      return;
    }

    const scenario: ScenarioFrame[] = SCENARIOS[SCENARIO_ID] ?? SCENARIOS.balanced ?? [];
    if (scenario.length === 0) {
      console.error('[MOCK] No scenario configured; skipping replay');
      return;
    }
    let index = 0;

    const interval = setInterval(() => {
      const frame = scenario[Math.min(index, scenario.length - 1)];
      if (!frame) {
        this.stop(series.id);
        return;
      }
      const marketID = buildMarketID(series.id);

      const event: SeriesStateEvent = {
        type: 'series_state',
        payload: {
          series_id: series.id,
          timestamp: new Date().toISOString(),
          game_state: {
            map: 'de_mirage',
            round: frame.round,
            terrorist_score: frame.terrorist_score,
            ct_score: frame.ct_score,
            bomb_planted: frame.bomb_planted,
            phase: frame.phase || 'live',
            last_action: frame.last_action,
          },
        },
      };

      this.sendSeriesState(event);

      // Soft anomaly protection demo path for deterministic testing.
      if (Math.abs(frame.terrorist_score - frame.ct_score) >= 12 && frame.round < 10) {
        this.emitCircuitBreaker({
          type: 'circuit_breaker',
          payload: {
            action: 'suspend',
            reason: 'early_round_score_anomaly',
            market_id: marketID,
            series_id: series.id,
          },
        });
      }

      index += 1;
      if (index >= scenario.length) {
        this.stop(series.id);
      }
    }, 3000);

    this.activeIntervals.set(series.id, interval);
    console.log(`[MOCK] Started deterministic scenario '${SCENARIO_ID}' for series=${series.id}`);
  }

  stop(seriesID: string): void {
    const interval = this.activeIntervals.get(seriesID);
    if (!interval) {
      return;
    }
    clearInterval(interval);
    this.activeIntervals.delete(seriesID);
    console.log(`[MOCK] Stopped scenario for series=${seriesID}`);
  }
}

let engineSocket: WebSocket | null = null;
let orchestratorStarted = false;

const openAccessProvider = new OpenAccessProvider();
const mockInPlayProvider = new MockInPlayProvider(sendSeriesState, sendCircuitBreaker);
const knownSeries = new Set<string>();
const activeMarkets = new Set<string>();
let consecutiveProviderFailures = 0;
let feedsSuspended = false;

function buildMarketID(seriesID: string): string {
  return `series_${seriesID}_winner`;
}

function send(event: MarketCreatedEvent | SeriesStateEvent | CircuitBreakerEvent | GameEvent): void {
  if (!engineSocket || engineSocket.readyState !== WebSocket.OPEN) {
    return;
  }
  engineSocket.send(JSON.stringify(event));
}

function sendSeriesState(event: SeriesStateEvent): void {
  send(event);
}

function sendCircuitBreaker(event: CircuitBreakerEvent): void {
  send(event);
}

function sendMarketCreated(series: SeriesSummary): void {
  const payload: MarketCreatedEvent['payload'] = {
    series_id: series.id,
    market_id: buildMarketID(series.id),
    title: series.title,
    tournament: series.tournament,
    teams: series.teams,
  };
  if (series.startTimeScheduled) {
    payload.start_time = series.startTimeScheduled;
  }

  const event: MarketCreatedEvent = {
    type: 'market_created',
    payload,
  };
  send(event);
}

function sendDiscovery(seriesList: SeriesSummary[]): void {
  const event: GameEvent = {
    type: 'game_event',
    payload: {
      discovery: seriesList.map((series) => ({
        id: series.id,
        title: series.title,
        tournament: series.tournament,
        teams: series.teams,
      })),
    },
  };
  send(event);
}

function connectToEngine(): void {
  console.log(`[ADAPTER] Connecting to Engine at ${ENGINE_URL}...`);
  engineSocket = new WebSocket(ENGINE_URL);

  engineSocket.on('open', () => {
    console.log('[ADAPTER] Connected to engine');
    if (!orchestratorStarted) {
      orchestratorStarted = true;
      void runDiscoveryLoop();
    }
  });

  engineSocket.on('close', () => {
    console.log('[ADAPTER] Engine disconnected. Retrying in 5s...');
    setTimeout(connectToEngine, 5000);
  });

  engineSocket.on('error', (err) => {
    console.error('[ADAPTER] Engine socket error:', err.message);
  });
}

function hasSeriesStarted(startTimeScheduled?: string): boolean {
  if (!startTimeScheduled) {
    return true;
  }
  const start = new Date(startTimeScheduled).getTime();
  if (Number.isNaN(start)) {
    return true;
  }
  return start <= Date.now();
}

function setFeedSuspension(suspend: boolean, reason: string): void {
  if (suspend === feedsSuspended) {
    return;
  }
  feedsSuspended = suspend;

  for (const marketID of activeMarkets) {
    sendCircuitBreaker({
      type: 'circuit_breaker',
      payload: {
        action: suspend ? 'suspend' : 'resume',
        reason,
        series_id: marketID.replace(/^series_(.*)_winner$/, '$1'),
        market_id: marketID,
      },
    });
  }
}

async function runDiscoveryLoop(): Promise<void> {
  console.log('[ADAPTER] Starting Open Access discovery loop');

  while (true) {
    try {
      if (!GRID_API_KEY) {
        throw new Error('Missing GRID_API_KEY');
      }

      const discovered = await openAccessProvider.discoverSeries();
      consecutiveProviderFailures = 0;
      setFeedSuspension(false, 'provider_recovered');

      if (discovered.length > 0) {
        sendDiscovery(discovered);
      }

      for (const series of discovered) {
        const marketID = buildMarketID(series.id);
        activeMarkets.add(marketID);

        if (!knownSeries.has(series.id)) {
          knownSeries.add(series.id);
          sendMarketCreated(series);
          console.log(`[ADAPTER] Market created for series=${series.id} (${series.title})`);
        }

        if (hasSeriesStarted(series.startTimeScheduled)) {
          mockInPlayProvider.start(series);
        }
      }
    } catch (error: unknown) {
      consecutiveProviderFailures += 1;
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(`[ADAPTER] Discovery error (${consecutiveProviderFailures}): ${message}`);

      if (consecutiveProviderFailures >= 3) {
        setFeedSuspension(true, 'provider_heartbeat_missed');
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

connectToEngine();
