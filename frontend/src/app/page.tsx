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

  const [gridData, setGridData] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("CONNECTING");

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

          </div>


        </div>
      </div>
    </div>
  );
}
