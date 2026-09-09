import React from 'react';
import { DollarSign, TrendingUp, Award, Layers, Target } from 'lucide-react';

interface SummaryData {
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
}

export const OverviewCards: React.FC<{ summary: SummaryData }> = ({ summary }) => {
  const isPositive = summary.netProfit >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Current Balance */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-400">Account Balance</span>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-bold text-white">${summary.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-slate-400 mt-1">Starting Balance: ${summary.startingBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* Net Profit / Loss */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-400">Net Profit / ROI</span>
          <div className={`p-2 rounded-lg ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className={`text-3xl font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}${summary.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              {summary.roiPercentage >= 0 ? '+' : ''}{summary.roiPercentage.toFixed(2)}% ROI
            </span>
            <span className="text-xs text-slate-400">({summary.stakePerBet}u / bet)</span>
          </div>
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-400">Draw Win Rate</span>
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <Target size={20} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-bold text-white">{summary.winRate.toFixed(1)}%</h3>
          <p className="text-xs text-slate-400 mt-1">
            Expected Draw Rate ~27%
          </p>
        </div>
      </div>

      {/* Total Bets */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-400">Paper Bets Record</span>
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
            <Layers size={20} />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-bold text-white">{summary.totalBets + summary.pendingBets}</h3>
          <div className="flex gap-2 text-xs font-medium mt-1">
            <span className="text-emerald-400">{summary.wonBets} W</span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-400">{summary.lostBets} L</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400">{summary.pendingBets} Pending</span>
          </div>
        </div>
      </div>
    </div>
  );
};
