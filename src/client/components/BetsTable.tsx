import React, { useState } from 'react';
import { Bet } from '../../types.js';
import { Search, CheckCircle, XCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export const BetsTable: React.FC<{ bets: Bet[] }> = ({ bets }) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'WON' | 'LOST'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'startsAt' | 'league' | 'odds' | 'profit'>('startsAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'startsAt' | 'league' | 'odds' | 'profit') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filteredBets = bets.filter(b => {
    if (filter !== 'ALL' && b.status !== filter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match = b.match;
      if (!match) return false;
      const home = match.homeTeam.toLowerCase();
      const away = match.awayTeam.toLowerCase();
      const league = match.leagueId.toLowerCase();
      return home.includes(term) || away.includes(term) || league.includes(term);
    }
    return true;
  });

  const sortedBets = [...filteredBets].sort((a, b) => {
    const mult = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'startsAt') {
      const dateA = a.match?.startsAt ? new Date(a.match.startsAt).getTime() : 0;
      const dateB = b.match?.startsAt ? new Date(b.match.startsAt).getTime() : 0;
      return (dateA - dateB) * mult;
    }
    if (sortField === 'league') {
      const legA = a.match?.leagueId || '';
      const legB = b.match?.leagueId || '';
      return legA.localeCompare(legB) * mult;
    }
    if (sortField === 'odds') {
      return (a.oddsDecimal - b.oddsDecimal) * mult;
    }
    if (sortField === 'profit') {
      return (a.profitLoss - b.profitLoss) * mult;
    }
    return 0;
  });

  const renderSortIcon = (field: 'startsAt' | 'league' | 'odds' | 'profit') => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-600 inline ml-1" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-emerald-400 inline ml-1" />
      : <ArrowDown size={12} className="text-emerald-400 inline ml-1" />;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Matches & Paper Bets Log</h2>
          <p className="text-xs text-slate-400">Sorted chronologically by match date (earliest upcoming first)</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex bg-slate-900/60 p-1 rounded-lg border border-slate-700 text-xs">
            {(['ALL', 'PENDING', 'WON', 'LOST'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  filter === tab
                    ? 'bg-emerald-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search team or league..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700 uppercase">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-white transition" onClick={() => handleSort('startsAt')}>
                Date / Time {renderSortIcon('startsAt')}
              </th>
              <th className="py-3 px-4 cursor-pointer hover:text-white transition" onClick={() => handleSort('league')}>
                League {renderSortIcon('league')}
              </th>
              <th className="py-3 px-4">Match</th>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Bookmaker</th>
              <th className="py-3 px-4 cursor-pointer hover:text-white transition" onClick={() => handleSort('odds')}>
                Draw Odds {renderSortIcon('odds')}
              </th>
              <th className="py-3 px-4">Stake</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition" onClick={() => handleSort('profit')}>
                Net Profit {renderSortIcon('profit')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 text-slate-300">
            {sortedBets.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No paper bets found matching criteria.
                </td>
              </tr>
            ) : (
              sortedBets.map(bet => {
                const match = bet.match;
                const isWon = bet.status === 'WON';
                const isLost = bet.status === 'LOST';
                const isPending = bet.status === 'PENDING';

                return (
                  <tr key={bet.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-medium">
                      {match?.startsAt ? new Date(match.startsAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-emerald-400">
                      {match?.leagueId || 'SOCCER'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {match ? `${match.homeTeam} vs ${match.awayTeam}` : 'Unknown Match'}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {match && match.homeScore !== null && match.awayScore !== null
                        ? `${match.homeScore} - ${match.awayScore}`
                        : '-'}
                    </td>
                    <td className="py-3 px-4 uppercase text-slate-400 font-medium">
                      {match?.bookmakerId || 'bet365'}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-400">
                      {bet.oddsDecimal.toFixed(2)} ({match?.drawOddsAmerican || `+${Math.round((bet.oddsDecimal - 1) * 100)}`})
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      ${bet.stake}
                    </td>
                    <td className="py-3 px-4">
                      {isWon && (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                          <CheckCircle size={12} /> WON
                        </span>
                      )}
                      {isLost && (
                        <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-semibold">
                          <XCircle size={12} /> LOST
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                          <Clock size={12} /> PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                      {isWon && <span className="text-emerald-400">+${bet.profitLoss.toFixed(2)}</span>}
                      {isLost && <span className="text-rose-400">-${Math.abs(bet.profitLoss).toFixed(2)}</span>}
                      {isPending && <span className="text-slate-500">$0.00</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
