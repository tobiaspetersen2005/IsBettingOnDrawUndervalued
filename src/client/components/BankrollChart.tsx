import React from 'react';
import { BankrollSnapshot } from '../../types.js';

export const BankrollChart: React.FC<{ history: BankrollSnapshot[] }> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 text-center text-slate-400">
        No bankroll history data available. Run a daily scan or historical simulation.
      </div>
    );
  }

  const balances = history.map(h => h.balance);
  const minBal = Math.min(...balances);
  const maxBal = Math.max(...balances);
  const range = maxBal - minBal || 1;

  const width = 800;
  const height = 220;
  const padding = 30;

  const points = history.map((h, i) => {
    const x = padding + (i / Math.max(history.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((h.balance - minBal) / range) * (height - padding * 2);
    return { x, y, balance: h.balance, timestamp: h.timestamp };
  });

  const pathD = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  const isNetProfitPositive = history[history.length - 1].balance >= history[0].balance;
  const strokeColor = isNetProfitPositive ? '#10b981' : '#f43f5e';
  const fillColor = isNetProfitPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Bankroll Trajectory Over Time</h2>
          <p className="text-xs text-slate-400">Tracking balance growth from 100-unit draw bets</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Min: ${minBal.toLocaleString()}</span>
          <span className="mx-2 text-slate-600">|</span>
          <span className="text-xs text-slate-400">Max: ${maxBal.toLocaleString()}</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-64 overflow-visible">
          <defs>
            <linearGradient id="bankrollGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#bankrollGrad)" />}

          {/* Line */}
          {pathD && <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Data Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill={strokeColor}
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>{`${new Date(p.timestamp).toLocaleDateString()}: $${p.balance.toLocaleString()}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </div>
  );
};
