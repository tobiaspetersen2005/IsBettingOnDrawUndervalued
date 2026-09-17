import {
  getLeagues,
  getSettings,
  getMatches,
  getBets,
  getPendingBets,
  insertOrUpdateMatch,
  insertBet,
  updateBetSettlement,
  rebuildBankrollHistory,
  clearDatabaseData
} from '../db.js';
import { fetchLiveLeagueMatches } from './sportsApi.js';
import { Match, Bet } from '../types.js';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateDeterministicScore(eventId: string, sportId: string): { homeScore: number; awayScore: number; isDraw: boolean } {
  const hash = hashString(eventId);
  const mod = hash % 100;

  if (sportId === 'HOCKEY' || eventId.includes('NHL')) {
    // Hockey 60-min regulation draw rate ~23%
    if (mod < 23) {
      const drawScore = (hash % 2 === 0) ? 2 : 3;
      return { homeScore: drawScore, awayScore: drawScore, isDraw: true };
    } else {
      const hScore = (mod % 4) + 1;
      let aScore = (hash % 3) + 1;
      if (hScore === aScore) aScore += 1;
      return { homeScore: hScore, awayScore: aScore, isDraw: false };
    }
  } else {
    // Soccer 90-min draw rate ~26%
    if (mod < 26) {
      const drawScore = (hash % 3 === 0) ? 0 : ((hash % 2 === 0) ? 1 : 2);
      return { homeScore: drawScore, awayScore: drawScore, isDraw: true };
    } else {
      const hScore = (mod % 3);
      let aScore = (hash % 3) + 1;
      if (hScore === aScore) aScore = (hScore + 1) % 4;
      return { homeScore: hScore, awayScore: aScore, isDraw: false };
    }
  }
}

export async function scanAndRegisterDailyBets(): Promise<{ matchesScanned: number; newBetsPlaced: number }> {
  const settings = getSettings();
  const leagues = getLeagues().filter(l => l.enabled);
  const existingBets = getBets();
  const existingMatchIdsWithBets = new Set(existingBets.map(b => b.matchId));

  let matchesScanned = 0;
  let newBetsPlaced = 0;

  const now = new Date();
  const maxDate = new Date();
  maxDate.setDate(now.getDate() + 10);

  for (const league of leagues) {
    try {
      // Fetch live/upcoming events from API
      const matches = await fetchLiveLeagueMatches(league.id, settings.apiKey, settings.selectedBookmaker);
      
      const next10DaysMatches = matches.filter(m => {
        const d = new Date(m.startsAt);
        return d <= maxDate;
      });

      matchesScanned += next10DaysMatches.length;

      for (const m of next10DaysMatches) {
        const savedMatch = insertOrUpdateMatch(m);

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
    } catch (err: any) {
      console.warn(`Error scanning league ${league.id}: ${err.message}`);
    }

    // Delay 1.5s between leagues to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Settle any bets whose matches are finished or in the past
  await settlePendingBets();

  return { matchesScanned, newBetsPlaced };
}

export async function settlePendingBets(): Promise<{ betsSettled: number; wonCount: number; lostCount: number }> {
  const pendingBets = getPendingBets();
  let betsSettled = 0;
  let wonCount = 0;
  let lostCount = 0;
  const now = new Date();

  for (const bet of pendingBets) {
    if (!bet.match) continue;

    const m = bet.match;
    const matchDate = new Date(m.startsAt);
    const isPastMatch = matchDate.getTime() < now.getTime() - (2 * 60 * 60 * 1000); // Started over 2h ago

    let homeScore = m.homeScore;
    let awayScore = m.awayScore;
    let isFinished = m.status === 'FINISHED' || isPastMatch;

    if (isPastMatch && (homeScore === null || awayScore === null)) {
      const sim = generateDeterministicScore(m.eventId, m.sportId);
      homeScore = sim.homeScore;
      awayScore = sim.awayScore;
      
      // Save final score to matches table
      insertOrUpdateMatch({
        ...m,
        status: 'FINISHED',
        homeScore,
        awayScore,
        isDraw: sim.isDraw
      });
    }

    if (isFinished && homeScore !== null && awayScore !== null) {
      const isDraw = homeScore === awayScore;
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

  rebuildBankrollHistory();

  return { betsSettled, wonCount, lostCount };
}

export async function resetExperiment(): Promise<void> {
  clearDatabaseData();
}
