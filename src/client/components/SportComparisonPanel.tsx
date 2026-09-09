import React from 'react';
import { SportStats, SportCategory } from '../../types.js';
import { Trophy, Scale } from 'lucide-react';

interface Props {
  sportStats: SportStats[];
  selectedCategory: SportCategory;
  onSelectCategory: (cat: SportCategory) => void;
}

export const SportComparisonPanel: React.FC<Props> = ({ sportStats, selectedCategory, onSelectCategory }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 shadow-lg">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scale className="text-emerald-400" size={20} /> Draw Market Comparison by Category
          </h2>
          <p className="text-xs text-slate-400">Comparing Champions League, MLS, and NHL 60-min regulation draw markets</p>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex flex-wrap bg-slate-900/80 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
          <button
            onClick={() => onSelectCategory('ALL')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={14} /> All Markets (Combined Account)
          </button>

          <button
            onClick={() => onSelectCategory('UEFA_CHAMPIONS_LEAGUE')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              selectedCategory === 'UEFA_CHAMPIONS_LEAGUE'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏆 Champions League
          </button>

          <button
            onClick={() => onSelectCategory('MLS')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              selectedCategory === 'MLS'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚽ MLS
          </button>

          <button
            onClick={() => onSelectCategory('NHL')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              selectedCategory === 'NHL'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏒 NHL Reg. Draws
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sportStats.map(stat => {
          const isProfitable = stat.totalProfitLoss >= 0;
          let icon = '🏆';
          let subtitle = 'Europe 90-Min 1X2';
          if (stat.sportId === 'MLS') {
            icon = '⚽';
            subtitle = 'USA 90-Min 1X2';
          } else if (stat.sportId === 'NHL') {
            icon = '🏒';
            subtitle = 'NHL 60-Min Regulation 3-Way';
          }

          return (
            <div
              key={stat.sportId}
              onClick={() => onSelectCategory(stat.sportId as SportCategory)}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${
                selectedCategory === stat.sportId
                  ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <h3 className="font-bold text-sm text-white">{stat.sportName}</h3>
                    <p className="text-[11px] text-slate-400">{subtitle}</p>
                  </div>
                </div>

                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${isProfitable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                  {isProfitable ? '+' : ''}{stat.roiPercentage.toFixed(1)}% ROI
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Bets</span>
                  <span className="font-bold text-white text-sm">{stat.totalBets}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Win Rate</span>
                  <span className="font-bold text-white text-sm">{stat.winRate.toFixed(1)}%</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Avg Draw Odds</span>
                  <span className="font-bold text-amber-400 text-sm">{stat.avgDrawOdds > 0 ? stat.avgDrawOdds.toFixed(2) : '-'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Net Return</span>
                  <span className={`font-bold text-sm ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfitable ? '+' : ''}${stat.totalProfitLoss.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
