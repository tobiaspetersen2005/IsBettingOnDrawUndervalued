import {
  getLeagues,
  getSettings,
  getMatches,
  getBets,
  getPendingBets,
  insertOrUpdateMatch,
  insertBet,
  updateBetSettlement,
  recordBankrollSnapshot,
  clearDatabaseData
} from '../db.js';
import { fetchLiveLeagueMatches } from './sportsApi.js';
import { Match, Bet } from '../types.js';

export async function scanAndRegisterDailyBets(): Promise<{ matchesScanned: number; newBetsPlaced: number }> {
  const settings = getSettings();
  const leagues = getLeagues().filter(l => l.enabled);
  const existingBets = getBets();
  const existingMatchIdsWithBets = new Set(existingBets.map(b => b.matchId));

  let matchesScanned = 0;
  let newBetsPlaced = 0;

  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(now.getDate() + 10); // 10 days into the future

  for (const league of leagues) {
    // Fetch authentic live/upcoming events directly from API
    const matches = await fetchLiveLeagueMatches(league.id, settings.apiKey, settings.selectedBookmaker);
    
    // Filter matches occurring within the next 10 days
    const next10DaysMatches = matches.filter(m => {
      const d = new Date(m.startsAt);
      return d <= maxDate;
    });

    matchesScanned += next10DaysMatches.length;

    for (const m of next10DaysMatches) {
      const savedMatch = insertOrUpdateMatch(m);

      // Register 100 unit paper bet if no bet exists for this match yet
      if (!existingMatchIdsWithBets.has(savedMatch.id)) {
        insertBet({
          matchId: savedMatch.id,
          stake: settings.stakePerBet,
          oddsDecimal: savedMatch.drawOddsDecimal,
          status: 'PENDING',
          payout: 0,
          profitLoss: 0,
          placedAt: new Date().toISOString()
        });
        existingMatchIdsWithBets.add(savedMatch.id);
        newBetsPlaced++;
      }
    }

    // Delay 1.2s between leagues to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1200));
  }

  // Settle any bets whose matches are finished
  await settlePendingBets();

  return { matchesScanned, newBetsPlaced };
}

export async function settlePendingBets(): Promise<{ betsSettled: number; wonCount: number; lostCount: number }> {
  const pendingBets = getPendingBets();
  let betsSettled = 0;
  let wonCount = 0;
  let lostCount = 0;

  for (const bet of pendingBets) {
    if (!bet.match) continue;

    const m = bet.match;
    // Check if match is finished
    if (m.status === 'FINISHED' && m.homeScore !== null && m.awayScore !== null) {
      const isDraw = m.homeScore === m.awayScore;
      let status: 'WON' | 'LOST' = 'LOST';
      let payout = 0;
      let profitLoss = -bet.stake;

      if (isDraw) {
        status = 'WON';
        payout = parseFloat((bet.stake * bet.oddsDecimal).toFixed(2));
        profitLoss = parseFloat((payout - bet.stake).toFixed(2));
        wonCount++;
      } else {
        lostCount++;
      }

      updateBetSettlement(bet.id, status, payout, profitLoss);
      betsSettled++;
    }
  }

  if (betsSettled > 0 || pendingBets.length === 0) {
    recordBankrollSnapshot();
  }

  return { betsSettled, wonCount, lostCount };
}

export async function resetExperiment(): Promise<void> {
  clearDatabaseData();
}
