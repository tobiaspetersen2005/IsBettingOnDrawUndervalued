import React, { useState, useEffect } from 'react';
import { OverviewCards } from './components/OverviewCards.js';
import { BankrollChart } from './components/BankrollChart.js';
import { LeagueBreakdown } from './components/LeagueBreakdown.js';
import { BetsTable } from './components/BetsTable.js';
import { SettingsModal } from './components/SettingsModal.js';
import { AppSettings, League, LeagueStats, Bet, BankrollSnapshot } from '../types.js';
import { RefreshCw, Play, CheckCircle2, Settings, Zap, ShieldCheck } from 'lucide-react';

interface DashboardResponse {
  success: boolean;
  summary: {
    currentBalance: number;
    startingBalance: number;
    netProfit: number;
    totalBets: number;
    wonBets: number;
    lostBets: number;
    pendingBets: number;
    winRate: number;
    roiPercentage: number;
    stakePerBet: number;
  };
  bankrollHistory: BankrollSnapshot[];
  leagues: League[];
  leagueStats: LeagueStats[];
  bets: Bet[];
  settings: AppSettings;
}

export default function App() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRunScan = async () => {
    setActionMessage('Scanning 8 leagues & fetching daily draw odds...');
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setActionMessage(`Scan complete! Scanned ${json.matchesScanned} matches, placed ${json.newBetsPlaced} new 100u draw bets.`);
        fetchDashboard();
      }
    } catch (err) {
      setActionMessage('Failed to complete scan.');
    }
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleSettle = async () => {
    setActionMessage('Settling completed match outcomes...');
    try {
      const res = await fetch('/api/settle', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setActionMessage(`Settlement complete! Settled ${json.betsSettled} pending bets (${json.wonCount} WON, ${json.lostCount} LOST).`);
        fetchDashboard();
      }
    } catch (err) {
      setActionMessage('Failed to settle bets.');
    }
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleSimulate = async () => {
    setActionMessage('Generating 30-day historical simulation across 8 leagues...');
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 })
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(`Simulation complete! Generated ${json.matchesGenerated} matches & placed ${json.betsPlaced} paper draw bets.`);
        fetchDashboard();
      }
    } catch (err) {
      setActionMessage('Simulation failed.');
    }
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleToggleLeague = async (leagueId: string, enabled: boolean) => {
    try {
      await fetch(`/api/leagues/${leagueId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      fetchDashboard();
    } catch (err) {
      console.error('Failed to toggle league:', err);
    }
  };

  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      fetchDashboard();
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleResetData = async () => {
    if (confirm('Are you sure you want to reset all match and paper bet history?')) {
      try {
        await fetch('/api/reset', { method: 'POST' });
        fetchDashboard();
      } catch (err) {
        console.error('Failed to reset data:', err);
      }
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-emerald-400" size={32} />
          <p className="text-sm font-medium text-slate-400">Loading Draw Value Tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck size={12} /> Paper Trading Experiment (No Real Money)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Is Betting On Draw Undervalued?
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Automated scanning of 8 soccer leagues • 100 units per draw bet • Authentic SportsGameOdds market data
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunScan}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Play size={14} /> Scan Daily Matches
          </button>

          <button
            onClick={handleSettle}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 rounded-lg transition-all"
          >
            <CheckCircle2 size={14} className="text-emerald-400" /> Settle Outcomes
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-all"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-medium flex items-center justify-between animate-fade-in">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Metric Cards */}
      <OverviewCards summary={data.summary} />

      {/* Bankroll Chart */}
      <BankrollChart history={data.bankrollHistory} />

      {/* League Breakdown */}
      <LeagueBreakdown
        leagues={data.leagues}
        leagueStats={data.leagueStats}
        onToggleLeague={handleToggleLeague}
      />

      {/* Matches & Bets Table */}
      <BetsTable bets={data.bets} />

      {/* Settings Modal */}
      <SettingsModal
        settings={data.settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onResetData={handleResetData}
      />
    </div>
  );
}
