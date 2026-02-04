"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  UserCheck, 
  Zap, 
  Activity,
  History,
  LayoutDashboard
} from "lucide-react";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState({
    round: 1,
    t_score: 0,
    ct_score: 0,
    bomb: false,
    last_action: "Waiting for Match..."
  });
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    
    // Connect to Backend WebSocket
    const engineUrl = process.env.NEXT_PUBLIC_ENGINE_URL || "ws://localhost:8080";
    const ws = new WebSocket(`${engineUrl}/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "game_event") {
        setGameState({
          round: data.payload.game_state.round,
          t_score: data.payload.game_state.terrorist_score,
          ct_score: data.payload.game_state.ct_score,
          bomb: data.payload.game_state.bomb_planted,
          last_action: data.payload.last_action
        });
      } else if (data.type === "match_occurred") {
        setMatches(prev => [data.payload, ...prev].slice(0, 5));
      }
    };

    return () => ws.close();
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-cyan-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-cyan-400 to-violet-600 rounded-xl shadow-lg shadow-cyan-500/20">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                Information Finance
              </h1>
            </div>
            <p className="text-zinc-500 font-medium">CS2 Real-time Infrastructure • GRID Telemetry v1</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-full group hover:border-cyan-500/50 transition-colors">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="text-sm font-semibold text-zinc-300">GeoComply Active</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-full group hover:border-violet-500/50 transition-colors">
              <div className="w-2 h-2 bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
              <span className="text-sm font-semibold text-zinc-300">Persona Verified</span>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Match State Card */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <section className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="w-32 h-32 text-cyan-500" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-widest uppercase rounded-lg border border-cyan-500/20">
                      Live Series
                    </span>
                    <span className="text-zinc-500 text-sm font-medium">ID: {gameState.last_action}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Round</div>
                    <div className="text-2xl font-black text-white">{gameState.round}</div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-16 mb-12">
                  <div className="text-center group/team">
                    <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 border border-zinc-700 group-hover/team:border-cyan-500/50 transition-colors">
                      <span className="text-3xl font-black text-cyan-400">T</span>
                    </div>
                    <div className="text-5xl font-black text-white mb-2">{gameState.t_score}</div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Terrorists</div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                    <div className="px-6 py-2 bg-zinc-800/50 rounded-full border border-zinc-700">
                      <span className="text-lg font-bold text-zinc-300">VS</span>
                    </div>
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                  </div>

                  <div className="text-center group/team">
                    <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 border border-zinc-700 group-hover/team:border-violet-500/50 transition-colors">
                      <span className="text-3xl font-black text-violet-400">CT</span>
                    </div>
                    <div className="text-5xl font-black text-white mb-2">{gameState.ct_score}</div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Counter-Ts</div>
                  </div>
                </div>

                {/* Kinetic Progress Bar */}
                <div className="relative h-4 bg-zinc-800/50 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-cyan-600 shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-1000 ease-out"
                    style={{ width: `${(gameState.t_score / (gameState.t_score + gameState.ct_score || 1)) * 100}%` }}
                  />
                  {gameState.bomb && (
                    <div className="absolute inset-0 bg-red-500/20 animate-pulse flex items-center justify-center">
                      <span className="text-[10px] font-black tracking-tighter text-red-500 uppercase">Bomb Planted</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Order Book Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-white">Market YES</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">
                    <span>Price</span>
                    <span>Liquidity</span>
                  </div>
                  {[64, 62, 59, 57].map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-cyan-500/20">
                      <span className="text-cyan-400 font-black">${p}</span>
                      <span className="text-zinc-400 font-medium">{(1.2 * (i+1)).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingDown className="w-5 h-5 text-violet-400" />
                  <h3 className="text-lg font-bold text-white">Market NO</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">
                    <span>Price</span>
                    <span>Liquidity</span>
                  </div>
                  {[36, 38, 41, 43].map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-violet-500/20">
                      <span className="text-violet-400 font-black">${p}</span>
                      <span className="text-zinc-400 font-medium">{(0.8 * (i+1)).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* Trade Execution Panel */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <section className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                <Zap className="w-20 h-20 text-yellow-400" />
              </div>

              <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Quick Trade
              </h3>

              <div className="space-y-6">
                <div className="flex p-1 bg-zinc-800/50 rounded-2xl border border-white/5">
                  <button className="flex-1 py-3 px-4 bg-cyan-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]">
                    YES
                  </button>
                  <button className="flex-1 py-3 px-4 text-zinc-500 font-black hover:text-white transition-colors">
                    NO
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2">Contract Size</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">USD</div>
                  </div>
                </div>

                <div className="p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Est. Payout</span>
                    <span className="text-cyan-400 font-bold">$100.00</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-medium">VCP Fee (0.1%)</span>
                    <span className="text-white font-bold">$0.10</span>
                  </div>
                </div>

                <button className="w-full py-4 bg-zinc-100 text-black font-black rounded-2xl transition-all hover:bg-white hover:scale-[0.98] active:scale-95 shadow-xl shadow-white/5">
                  Execute Settlement
                </button>
              </div>
            </section>

            {/* Audit Logs */}
            <section className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex-grow">
               <div className="flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-zinc-500" />
                <h3 className="text-lg font-bold text-white">VeritasChain Log</h3>
              </div>
              <div className="space-y-4">
                {matches.length === 0 ? (
                   <div className="text-center py-8">
                   <div className="text-zinc-600 text-xs font-medium italic">Scanning Merkle Trees...</div>
                 </div>
                ) : (
                  matches.map((m, idx) => (
                    <div key={idx} className="p-3 bg-zinc-800/20 rounded-xl border border-white/5 flex items-center justify-between group">
                      <div>
                        <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-tighter mb-0.5">MATCH: #{m.taker_order_id}</div>
                        <div className="text-[9px] font-medium text-zinc-500 font-mono tracking-tighter truncate max-w-[150px]">
                          0x{Math.random().toString(16).slice(2, 10)}...{Math.random().toString(16).slice(2, 6)}
                        </div>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
