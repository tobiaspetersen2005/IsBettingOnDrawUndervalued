import React from 'react';
import { LeagueStats, League } from '../../types.js';

interface Props {
  leagues: League[];
  leagueStats: LeagueStats[];
  onToggleLeague: (leagueId: string, enabled: boolean) => void;
}

export const LeagueBreakdown: React.FC<Props> = ({ leagues, leagueStats, onToggleLeague }) => {
  const statsMap = new Map(leagueStats.map(s => [s.leagueId, s]));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">3 Targeted Leagues - Draw Yield Analysis</h2>
          <p className="text-xs text-slate-400">Comparing profitability and draw frequency across active draw markets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {leagues.map(league => {
          const stats = statsMap.get(league.id) || {
            leagueId: league.id,
            leagueName: league.name,
            totalBets: 0,
            wonBets: 0,
            lostBets: 0,
            pendingBets: 0,
            winRate: 0,
            totalStaked: 0,
            totalProfitLoss: 0,
            roiPercentage: 0,
            avgDrawOdds: 3.50
          };

          const isProfitable = stats.totalProfitLoss >= 0;

          return (
            <div
              key={league.id}
              className={`p-4 rounded-xl border transition-all ${
                league.enabled
                  ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-900/40 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {league.country}
                  </span>
                  <h4 className="font-bold text-sm text-white truncate max-w-[130px]">{league.name}</h4>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={league.enabled}
                    onChange={e => onToggleLeague(league.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Total Bets:</span>
                  <div className="font-semibold text-slate-200">{stats.totalBets} matches</div>
                </div>
                <div>
                  <span className="text-slate-400">Win Rate:</span>
                  <div className="font-semibold text-slate-200">{stats.winRate.toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-slate-400">Avg Draw Odds:</span>
                  <div className="font-semibold text-amber-400">{stats.avgDrawOdds.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Net Return:</span>
                  <div className={`font-bold ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfitable ? '+' : ''}${stats.totalProfitLoss.toFixed(0)} ({stats.roiPercentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
