"use client";

import { useEffect, useState } from "react";
import { Globe, Shield } from "lucide-react";
import {
  getTournamentQuery,
  getSeriesQuery,
  getAllSeriesNext24hQuery,
  getSeriesFormatsQuery,
  getTeamQuery,
  getPersonQuery,
  getOrganizationQuery,
  getSeriesStateCDFQuery,
  getSeriesStatsCDFQuery,
} from "@/lib/grid/queries";
import type { Tournament } from "@/lib/grid/types";

type EngineMarket = {
  market_id: string;
  series_id: string;
  title: string;
  tournament: string;
  teams: string[];
  start_time?: string;
  status: "active" | "suspended" | "settled";
};

export default function CS2Dashboard() {
  const [gameState, setGameState] = useState({
    round: 14,
    t_score: 8,
    ct_score: 5,
    bomb: true,
    last_action: "Bomb Planted (Site A)"
  });

  const [gridData, setGridData] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("CONNECTING");
  const [gridTournament, setGridTournament] = useState<Tournament | null>(null);
  const [gridError, setGridError] = useState<string | null>(null);
  const [explorerEntity, setExplorerEntity] = useState("tournaments");
  const [explorerId, setExplorerId] = useState("1");
  const [explorerResult, setExplorerResult] = useState<string>("");
  const [explorerError, setExplorerError] = useState<string | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [engineMarkets, setEngineMarkets] = useState<EngineMarket[]>([]);
  const [engineMarketsError, setEngineMarketsError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any;

    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || "ws://localhost:8080/ws";
        
        // Ensure we use WSS if the page is HTTPS
        const secureUrl = engineUrl.startsWith("ws:") && protocol === "wss:" 
          ? engineUrl.replace("ws:", "wss:") 
          : engineUrl;

        ws = new WebSocket(secureUrl);
        
        ws.onopen = () => setConnectionStatus("OPTIMAL");
        ws.onerror = () => setConnectionStatus("FAILED");
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "game_event") {
            if (data.payload.game_state) {
              setGameState({
                round: data.payload.game_state.round,
                t_score: data.payload.game_state.terrorist_score,
                ct_score: data.payload.game_state.ct_score,
                bomb: data.payload.game_state.bomb_planted,
                last_action: data.payload.last_action
              });
            }
            if (data.payload.discovery) {
              setGridData(data.payload.discovery);
            }
          }
        };

        ws.onclose = () => {
          setConnectionStatus("DISCONNECTED");
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (err) {
        console.error("WS Connection Error:", err);
        setConnectionStatus("INSECURE");
      }
    };

    connect();

    return () => {
      ws?.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEngineMarkets = async () => {
      try {
        const res = await fetch("/api/engine/markets", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Engine markets request failed");
        }
        if (!cancelled) {
          setEngineMarkets((data?.markets || []) as EngineMarket[]);
          setEngineMarketsError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setEngineMarketsError(err instanceof Error ? err.message : "Failed to load engine markets");
        }
      }
    };

    void loadEngineMarkets();
    const interval = setInterval(loadEngineMarkets, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const activeMarket = engineMarkets.find((m) => m.status === "active") || engineMarkets[0];
  const activeMarketTeams =
    activeMarket?.teams?.length && activeMarket.teams.length >= 2
      ? `${activeMarket.teams[0]} vs. ${activeMarket.teams[1]}`
      : activeMarket?.title || "Waiting for market feed...";

  useEffect(() => {
    let cancelled = false;
    const loadGridStatic = async () => {
      try {
        const res = await fetch("/api/grid/tournaments?id=1");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "GRID API error");
        }
        if (!cancelled) {
          setGridTournament(data?.data?.tournament || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setGridError(err?.message || "Failed to load GRID data");
        }
      }
    };
    loadGridStatic();
    return () => {
      cancelled = true;
    };
  }, []);

  const queryMap: Record<string, string> = {
    tournaments: getTournamentQuery,
    series: getSeriesQuery,
    seriesNext24h: getAllSeriesNext24hQuery,
    seriesFormats: getSeriesFormatsQuery,
    teams: getTeamQuery,
    players: getPersonQuery,
    orgs: getOrganizationQuery,
    seriesState: getSeriesStateCDFQuery,
    stats: getSeriesStatsCDFQuery,
  };

  const runExplorerQuery = async () => {
    setExplorerLoading(true);
    setExplorerError(null);
    setExplorerResult("");
    try {
      const res = await fetch("/api/grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryMap[explorerEntity],
          variables:
            explorerEntity === "seriesNext24h"
              ? {
                  start: new Date().toISOString(),
                  end: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                }
              : explorerEntity === "seriesFormats"
                ? undefined
                : { id: explorerId },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "GRID API error");
      }
      setExplorerResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setExplorerError(err?.message || "Query failed");
    } finally {
      setExplorerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Simple Header */}
        <header className="flex justify-between items-center bg-[#141414] border border-[#262626] p-4 rounded-lg shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded">
              <Shield className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">IF TRADING HUB</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">TEST MODE ACTIVE</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#0a0a0a] px-3 py-1.5 rounded-full border border-zinc-800">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              connectionStatus === "OPTIMAL" ? "bg-green-500" : 
              connectionStatus === "FAILED" || connectionStatus === "INSECURE" ? "bg-red-500" : "bg-zinc-600"
            }`} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
              CONNECTIVITY: {connectionStatus}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          
          {/* Main Info (Left) */}
          {/* Main Info (Centered) */}
          <div className="col-span-12 space-y-6">
            
            {/* Match State */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Live Series</p>
                <h2 className="text-3xl font-black">{activeMarketTeams}</h2>
                <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">
                  {activeMarket ? `${activeMarket.tournament} - ${activeMarket.status}` : "No active market"}
                </p>
                <div className="mt-4 flex items-center gap-3 text-sm text-zinc-400">
                  <span className={`status-badge ${gameState.bomb ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                    {gameState.bomb ? 'BOMB PLANTED' : 'IN PLAY'}
                  </span>
                  <span className="font-medium">{gameState.last_action}</span>
                </div>
              </div>
              
              <div className="flex gap-12 text-center">
                <div>
                  <div className="text-5xl font-black tabular-nums tracking-tighter">
                    <span className="text-blue-500">{gameState.t_score}</span>
                    <span className="mx-2 text-zinc-800">:</span>
                    <span className="text-purple-500">{gameState.ct_score}</span>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Match Score</p>
                </div>
                <div>
                  <div className="text-5xl font-black tabular-nums tracking-tighter text-zinc-200">
                    {gameState.round}
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Round</p>
                </div>
              </div>
            </div>


            {/* GRID EXPLORER (REAL DATA) */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden mt-6 mb-6">
              <div className="p-4 bg-blue-900/10 border-b border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">GRID REAL-TIME EXPLORER (OPEN ACCESS)</span>
                </div>
                <span className="text-[9px] font-mono text-blue-500/50">MATCH DISCOVERY FEED</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-black/40 p-3 rounded border border-zinc-800/50">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase">Static Data (Tournament)</div>
                  {gridError ? (
                    <div className="text-xs text-red-400 mt-1">{gridError}</div>
                  ) : gridTournament ? (
                    <div className="text-sm font-bold mt-1">
                      {gridTournament.name}{" "}
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ({gridTournament.id}{gridTournament.nameShortened ? ` - ${gridTournament.nameShortened}` : ""})
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-600 mt-1">Loading GRID static data...</div>
                  )}
                </div>

                {engineMarketsError ? (
                  <div className="text-xs text-red-400">{engineMarketsError}</div>
                ) : engineMarkets.length > 0 ? engineMarkets.map((item) => (
                  <div key={item.market_id} className="flex justify-between items-center bg-black/40 p-3 rounded border border-zinc-800/50">
                    <div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase">{item.tournament}</div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <span>{item.teams?.[0] || "TBD"}</span>
                        <span className="text-zinc-600 text-[10px]">vs</span>
                        <span>{item.teams?.[1] || "TBD"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-mono text-zinc-600">MARKET: {item.market_id}</div>
                      <div className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter mt-1">
                        STATUS: {item.status}
                      </div>
                    </div>
                  </div>
                )) : gridData && gridData.length > 0 ? gridData.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black/40 p-3 rounded border border-zinc-800/50">
                    <div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase">{item.tournament}</div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <span>{item.teams[0]}</span>
                        <span className="text-zinc-600 text-[10px]">vs</span>
                        <span>{item.teams[1]}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-mono text-zinc-600">ID: {item.id}</div>
                      <div className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter mt-1">CONNECTIVITY VERIFIED</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-zinc-600 text-xs italic font-mono">
                    Waiting for real GRID telemetry...
                  </div>
                )}
              </div>
            </div>

            {/* GRID QUERY EXPLORER */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
              <div className="p-4 bg-zinc-900/40 border-b border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">GRID QUERY EXPLORER</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500">/api/grid</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500">Entity</label>
                    <select
                      className="mt-1 w-full bg-black/40 border border-zinc-800 rounded px-3 py-2 text-sm"
                      value={explorerEntity}
                      onChange={(e) => setExplorerEntity(e.target.value)}
                    >
                      <option value="tournaments">Tournaments</option>
                      <option value="series">Series</option>
                      <option value="seriesNext24h">All Series Next 24h</option>
                      <option value="seriesFormats">Series Formats</option>
                      <option value="orgs">Esports Organizations</option>
                      <option value="teams">Teams</option>
                      <option value="players">Players</option>
                      <option value="seriesState">Series State</option>
                      <option value="stats">Stats</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500">ID</label>
                    <input
                      className="mt-1 w-full bg-black/40 border border-zinc-800 rounded px-3 py-2 text-sm"
                      value={explorerId}
                      onChange={(e) => setExplorerId(e.target.value)}
                      placeholder={explorerEntity === "seriesNext24h" || explorerEntity === "seriesFormats" ? "N/A" : "1"}
                      disabled={explorerEntity === "seriesNext24h" || explorerEntity === "seriesFormats"}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-black uppercase tracking-widest"
                      onClick={runExplorerQuery}
                      disabled={explorerLoading}
                    >
                      {explorerLoading ? "Querying..." : "Run Query"}
                    </button>
                  </div>
                </div>

                {explorerError ? (
                  <div className="text-xs text-red-400">{explorerError}</div>
                ) : explorerResult ? (
                  <pre className="text-[10px] bg-black/40 border border-zinc-800 rounded p-3 overflow-x-auto">
{explorerResult}
                  </pre>
                ) : (
                  <div className="text-xs text-zinc-600">Pick an entity and ID, then run the query.</div>
                )}
              </div>
            </div>

          </div>


        </div>
      </div>
    </div>
  );
}
