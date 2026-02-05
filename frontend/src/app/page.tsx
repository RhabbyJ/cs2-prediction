"use client";

import { useEffect, useState } from "react";
import { 
  Activity, 
  ShieldCheck, 
  Globe, 
  Zap,
  Shield,
  Clock
} from "lucide-react";

export default function CS2Dashboard() {
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
  const [selectedMarket, setSelectedMarket] = useState(markets[0]);
  const [gridData, setGridData] = useState<any[]>([]);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_ENGINE_URL || "ws://localhost:8080/ws");
    
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
        if (data.payload.discovery) {
          setGridData(data.payload.discovery);
        }
      } else if (data.type === "match_occurred") {
        setMatches(prev => [data.payload, ...prev].slice(0, 10));
      }
    };

    return () => ws.close();
  }, []);

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
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-400">CONNECTIVITY: OPTIMAL</span>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          
          {/* Main Info (Left) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* Match State */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Live Series</p>
                <h2 className="text-3xl font-black">NAVI vs. LIQUID</h2>
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

            {/* Markets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {markets.map((market) => (
                <div 
                  key={market.id}
                  onClick={() => setSelectedMarket(market)}
                  className={`p-6 rounded-xl border transition-all cursor-pointer ${selectedMarket.id === market.id ? 'bg-[#1e1e1e] border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-[#141414] border-[#262626] hover:border-zinc-700'}`}
                >
                  <div className="flex justify-between mb-6">
                    <h4 className="font-bold text-base">{market.title}</h4>
                    <span className="text-[10px] font-mono text-zinc-500 bg-black px-2 py-1 rounded">V: {market.volume}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="bg-black/50 p-3 rounded-lg border border-zinc-800 flex justify-between items-center group">
                      <span className="text-xs font-bold text-blue-500">YES</span>
                      <span className="text-lg font-black">${market.yes}</span>
                    </div>
                    <div className="bg-black/50 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-500">NO</span>
                      <span className="text-lg font-black">${market.no}</span>
                    </div>
                  </div>
                </div>
              ))}
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
                {gridData && gridData.length > 0 ? gridData.map((item, idx) => (
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

            {/* Audit Log (Bottom) */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
              <div className="p-4 bg-zinc-900/50 border-b border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">VeritasChain Audit Feed</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-600">CRYPTO-PROVED</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-black/20 text-zinc-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Event Hash</th>
                      <th className="px-6 py-3">Settlement Detail</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {matches.length > 0 ? matches.map((m, i) => (
                      <tr key={i} className="hover:bg-zinc-800/20">
                        <td className="px-6 py-4 font-mono text-zinc-500">#IF-{9420 + i}</td>
                        <td className="px-6 py-4 font-medium text-zinc-300">Execution @ ${m.price} | Qty: {m.quantity}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[9px] font-black text-green-500 bg-green-500/10 px-2 py-1 rounded-sm border border-green-500/20">VERIFIED</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-zinc-600 font-mono italic">Listening for on-chain events...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Controls (Right) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 shadow-2xl sticky top-24">
              <div className="flex items-center gap-2 mb-8">
                <Zap className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-xs uppercase tracking-widest">Trade Execution</h3>
              </div>

              <div className="space-y-6">
                <div className="bg-black p-4 rounded-lg border border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">Active Market</span>
                  <span className="font-bold text-sm block truncate">{selectedMarket.title}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-xs transition-all shadow-lg shadow-blue-900/20">
                    BUY YES (${selectedMarket.yes})
                  </button>
                  <button className="py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-black text-xs transition-all shadow-lg shadow-purple-900/20">
                    BUY NO (${selectedMarket.no})
                  </button>
                </div>

                <div className="p-4 bg-zinc-900/50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-zinc-500 uppercase">Input Amount</span>
                    <span className="text-blue-500">$100.00</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-zinc-500 uppercase">Est. Return</span>
                    <span className="text-green-500">$156.25</span>
                  </div>
                </div>

                <button className="w-full py-5 bg-white text-black font-black text-xs rounded-xl hover:bg-zinc-200 transition-all uppercase tracking-[0.2em] shadow-2xl">
                  Confirm Trade
                </button>
              </div>

              {/* Feed Preview */}
              <div className="mt-8 space-y-4">
                 <div className="flex items-center gap-2">
                   <Clock className="w-3 h-3 text-zinc-500" />
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Activity</span>
                 </div>
                 <div className="space-y-4">
                   {[1, 2].map((i) => (
                     <div key={i} className="border-l-2 border-zinc-800 pl-4 py-1">
                       <p className="text-[11px] font-bold text-zinc-200">
                         <span className="text-blue-400">User_921</span> predicted YES
                       </p>
                       <p className="text-[10px] text-zinc-500 mt-0.5">$1.2k Contract • {i*3}m ago</p>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
