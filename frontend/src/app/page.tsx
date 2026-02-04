"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Activity,
  History,
  LayoutDashboard,
  Timer,
  Info,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState({
    round: 14,
    t_score: 8,
    ct_score: 5,
    bomb: true,
    last_action: "Bomb Planted (Site A)"
  });
  
  const [markets, setMarkets] = useState([
    { id: "series_winner", title: "Match Winner", yes: 64, no: 36, volume: "128k" },
    { id: "r15_winner", title: "Round 15 Winner", yes: 52, no: 48, volume: "12k" },
    { id: "bomb_prop", title: "Bomb Planted in Round 15?", yes: 31, no: 69, volume: "5k" }
  ]);

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
        if (data.payload.markets) {
          setMarkets(data.payload.markets);
        }
      } else if (data.type === "match_occurred") {
        setMatches(prev => [data.payload, ...prev].slice(0, 5));
      }
    };

    return () => ws.close();
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#00D991] rounded-lg flex items-center justify-center font-black text-black">IF</div>
              <span className="text-xl font-bold tracking-tight">Information Finance</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
              <a href="#" className="text-white border-b-2 border-[#00D991] h-16 flex items-center">Markets</a>
              <a href="#" className="hover:text-white transition-colors h-16 flex items-center">Portfolio</a>
              <a href="#" className="hover:text-white transition-colors h-16 flex items-center">Activity</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-full text-[11px] font-bold text-zinc-400">
               <div className="w-2 h-2 bg-[#00D991] rounded-full animate-pulse" />
               GEOCOMPLY: OK
             </div>
             <div className="w-8 h-8 bg-zinc-800 rounded-full border border-white/10" />
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Main Content Area */}
          <main className="col-span-12 lg:col-span-8 space-y-8">
            
            {/* Live Score Strip (The 'Data-First' Hero) */}
            <section className="fintech-card p-6 flex flex-col md:flex-row items-center justify-between gap-8 border-l-4 border-l-[#00D991]">
               <div className="flex items-center gap-4">
                 <div className="bg-zinc-900 p-3 rounded-2xl border border-white/5">
                   <Activity className="w-6 h-6 text-[#00D991]" />
                 </div>
                 <div>
                   <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Live Match</h2>
                   <div className="text-xl font-black">NAVI vs. Team Liquid</div>
                 </div>
               </div>

               <div className="flex items-center gap-12">
                 <div className="text-center">
                   <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Score</div>
                   <div className="flex items-center gap-4">
                     <span className="text-3xl font-black text-[#265CFF]">{gameState.t_score}</span>
                     <span className="text-zinc-700 font-bold">:</span>
                     <span className="text-3xl font-black text-[#AA00FF]">{gameState.ct_score}</span>
                   </div>
                 </div>
                 <div className="text-center border-l border-white/5 pl-12">
                   <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Round</div>
                   <div className="text-2xl font-black">{gameState.round}</div>
                 </div>
                 <div className="text-center border-l border-white/5 pl-12">
                   <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Status</div>
                   <div className="flex items-center gap-2">
                     {gameState.bomb && <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                     <span className={`text-sm font-bold ${gameState.bomb ? 'text-red-500' : 'text-zinc-400'}`}>
                       {gameState.last_action}
                     </span>
                   </div>
                 </div>
               </div>
            </section>

            {/* Markets Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Open Forecasts</h3>
                <div className="text-xs text-zinc-500 font-medium">Updated 0ms ago</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {markets.map((m) => (
                  <motion.div 
                    key={m.id}
                    layoutId={m.id}
                    className="fintech-card overflow-hidden hover:bg-zinc-900/50 cursor-pointer"
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-white pr-4">{m.title}</h4>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 py-1 bg-white/5 rounded">Vol: {m.volume}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="text-[9px] font-bold text-zinc-500 uppercase ml-1">Predict Yes</div>
                          <button className="w-full py-3 bg-[#265CFF]/10 hover:bg-[#265CFF]/20 border border-[#265CFF]/30 rounded-xl flex items-center justify-between px-4 transition-all">
                            <span className="text-sm font-bold text-[#265CFF]">YES</span>
                            <span className="font-black text-white">${m.yes}</span>
                          </button>
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="text-[9px] font-bold text-zinc-500 uppercase ml-1">Predict No</div>
                          <button className="w-full py-3 bg-[#AA00FF]/10 hover:bg-[#AA00FF]/20 border border-[#AA00FF]/30 rounded-xl flex items-center justify-between px-4 transition-all">
                            <span className="text-sm font-bold text-[#AA00FF]">NO</span>
                            <span className="font-black text-white">${m.no}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Tiny Depth Indicator */}
                    <div className="h-1 bg-zinc-800 flex">
                      <div className="h-full bg-[#265CFF]" style={{ width: `${m.yes}%` }} />
                      <div className="h-full bg-[#AA00FF]" style={{ width: `${m.no}%` }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Verification & Logs Table */}
            <section className="space-y-4">
               <h3 className="text-lg font-bold flex items-center gap-2">
                 <ShieldCheck className="w-5 h-5 text-zinc-500" />
                 VeritasChain Audit Log
               </h3>
               <div className="fintech-card overflow-hidden">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-white/2 border-b border-white/5">
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase">Event ID</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase">Description</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase">Timestamp</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {[1, 2, 3, 4].map((i) => (
                       <tr key={i} className="hover:bg-white/2 transition-colors">
                         <td className="px-6 py-4 text-xs font-mono text-zinc-400">#IF-{(8420 + i)}</td>
                         <td className="px-6 py-4 text-xs font-medium text-white">Match Executed (Maker: 91, Taker: {100-i})</td>
                         <td className="px-6 py-4 text-xs text-zinc-500">{new Date().toLocaleTimeString()}</td>
                         <td className="px-6 py-4">
                           <span className="px-2 py-1 bg-[#00D991]/10 text-[#00D991] text-[9px] font-bold uppercase rounded border border-[#00D991]/20">Verified</span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </section>
          </main>

          {/* Right Sidebar - Execution & Activity */}
          <aside className="col-span-12 lg:col-span-4 space-y-8">
            
            {/* Terminal Style Execution Panel */}
            <section className="fintech-card p-6 bg-zinc-900/30">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#00D991]">Execution Panel</h3>
                <Timer className="w-4 h-4 text-zinc-500" />
              </div>

              <div className="space-y-6">
                 <div>
                   <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block px-1">Market Selection</label>
                   <div className="p-3 bg-zinc-800 rounded-xl border border-white/5 flex items-center justify-between">
                     <span className="text-sm font-bold">Match Winner</span>
                     <ChevronRight className="w-4 h-4 text-zinc-500" />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2">
                   <button className="py-3 bg-[#265CFF] text-white font-black rounded-xl shadow-lg shadow-blue-500/10">BUY YES</button>
                   <button className="py-3 bg-[#AA00FF] text-white font-black rounded-xl">BUY NO</button>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block px-1">Investment (USD)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        defaultValue="100.00"
                        className="w-full bg-zinc-800 border border-white/5 rounded-xl p-4 text-lg font-black focus:outline-none focus:ring-1 focus:ring-[#00D991] transition-all" 
                      />
                    </div>
                 </div>

                 <div className="p-4 bg-zinc-800/50 rounded-xl space-y-3 border border-white/5">
                   <div className="flex justify-between text-xs">
                     <span className="text-zinc-500 uppercase font-bold text-[9px]">Est. Payout</span>
                     <span className="text-[#00D991] font-black tracking-tight">$156.25</span>
                   </div>
                   <div className="flex justify-between text-xs">
                     <span className="text-zinc-500 uppercase font-bold text-[9px]">Implied Probability</span>
                     <span className="text-white font-bold">64.12%</span>
                   </div>
                 </div>

                 <button className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-zinc-200 transition-all uppercase tracking-tighter shadow-xl shadow-white/5">
                   Confirm Order
                 </button>
              </div>
            </section>

            {/* Global Activity Feed */}
            <section className="space-y-4 px-2">
               <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Live Activity</h3>
               <div className="space-y-6">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="flex gap-4 group cursor-help">
                     <div className="relative mt-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 border border-white/10" />
                       <div className="absolute top-1.5 left-[3px] w-px h-12 bg-zinc-900" />
                     </div>
                     <div>
                        <div className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                          <span className="text-[#265CFF]">User_842</span> predicted <span className="text-[#265CFF]">YES</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                          <span>$5.2k Contract</span>
                          <span>•</span>
                          <span>{i * 2}m ago</span>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
            </section>

          </aside>
        </div>
      </div>
    </div>
  );
}
