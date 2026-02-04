"use client";

import React, { useState, useEffect } from "react";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen p-8 bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[hsl(180,100%,50%)] to-[hsl(270,100%,60%)]">
            Information Finance
          </h1>
          <p className="text-gray-400 mt-2">Regulated P2P Prediction Market — CS2</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 glass-card border-[hsl(180,100%,50%)] border shadow-[0_0_10px_rgba(0,255,255,0.2)]">
            <div className="w-2 h-2 rounded-full bg-[hsl(180,100%,50%)] animate-pulse" />
            <span className="text-xs font-medium text-[hsl(180,100%,50%)]">GEOCOMPLY ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 glass-card border-[hsl(270,100%,60%)] border shadow-[0_0_10px_rgba(180,0,255,0.2)]">
            <div className="w-2 h-2 rounded-full bg-[hsl(270,100%,60%)] animate-pulse" />
            <span className="text-xs font-medium text-[hsl(270,100%,60%)]">PERSONA VERIFIED</span>
          </div>
        </div>
      </header>

      {/* Hero Match Info */}
      <section className="glass-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsl(180,100%,50%)] to-transparent opacity-50" />
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[hsl(180,100%,50%)] text-xs font-bold tracking-widest uppercase">Live CS2 Match</span>
            <h2 className="text-2xl font-bold mt-1">Team Alpha vs. Team Omega</h2>
            <p className="text-sm text-gray-500">Map 2: Dust II • Round 14</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-gray-300">14:12</div>
            <div className="text-xs text-gray-500 uppercase">Match Progress</div>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full mt-6 overflow-hidden">
          <div className="h-full w-[65%] bg-gradient-to-r from-[hsl(180,100%,50%)] to-[hsl(270,100%,60%)] shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Order Book */}
        <div className="col-span-8 grid grid-cols-2 gap-4">
          <div className="glass-card p-6 border-l-4 border-l-[hsl(180,100%,50%)]">
            <h3 className="text-[hsl(180,100%,50%)] text-lg font-bold mb-4">YES</h3>
            <div className="space-y-2 font-mono text-sm">
              {[62.5, 62.1, 61.8, 61.5, 61.2].map((price, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-gray-800/50">
                  <span className="text-gray-400">{(1000 - i * 150).toLocaleString()}</span>
                  <span className="text-[hsl(180,100%,50%)]">${price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-6 border-l-4 border-l-[hsl(270,100%,60%)]">
            <h3 className="text-[hsl(270,100%,60%)] text-lg font-bold mb-4">NO</h3>
            <div className="space-y-2 font-mono text-sm">
              {[38.5, 38.9, 39.2, 39.5, 39.8].map((price, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-gray-800/50">
                  <span className="text-gray-400">{(800 + i * 120).toLocaleString()}</span>
                  <span className="text-[hsl(270,100%,60%)]">${price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trade Execution */}
        <div className="col-span-4 space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold mb-6">Trade Execution</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">AMOUNT</label>
                <input type="text" defaultValue="1,000.00" className="w-full bg-black/40 border border-gray-800 rounded p-3 text-lg font-mono focus:border-[hsl(180,100%,50%)] outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">PRICE</label>
                <input type="text" defaultValue="$61.50" className="w-full bg-black/40 border border-gray-800 rounded p-3 text-lg font-mono focus:border-[hsl(180,100%,50%)] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button className="py-4 rounded font-bold bg-[hsl(180,100%,50%)] text-black hover:opacity-90 transition-opacity">BUY YES</button>
                <button className="py-4 rounded font-bold border border-[hsl(270,100%,60%)] text-[hsl(270,100%,60%)] hover:bg-[hsl(270,100%,60%)] hover:text-white transition-all">BUY NO</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
