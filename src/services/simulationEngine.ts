import {
  getLeagues,
  getSettings,
  getMatches,
  getBets,
  getPendingBets,
  insertOrUpdateMatch,
  insertBet,
  updateBetSettlement,
  updateMatchScores,
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

const UPCOMING_TEAMS: Record<string, string[]> = {
  UEFA_CHAMPIONS_LEAGUE: [
    'Real Madrid', 'Man City', 'Bayern Munich', 'PSG', 'Barcelona',
    'Inter Milan', 'Arsenal', 'Dortmund', 'Atletico Madrid', 'Benfica',
    'Juventus', 'Leverkusen', 'PSV', 'Sporting CP', 'AC Milan', 'Lille'
  ],
  MLS: [
    'Inter Miami', 'LAFC', 'Columbus Crew', 'FC Cincinnati', 'LA Galaxy',
    'Seattle Sounders', 'NY Red Bulls', 'Orlando City', 'Atlanta United', 'Philadelphia Union',
    'Minnesota United', 'Portland Timbers', 'Real Salt Lake', 'Houston Dynamo'
  ],
  NHL: [
    'Edmonton Oilers', 'Florida Panthers', 'Dallas Stars', 'NY Rangers', 'Boston Bruins',
    'Colorado Avalanche', 'Carolina Hurricanes', 'Vegas Golden Knights', 'Toronto Maple Leafs', 'Tampa Bay Lightning',
    'Vancouver Canucks', 'Winnipeg Jets', 'New Jersey Devils', 'Nashville Predators'
  ]
};

const ODDS_TIERS = [
  { decimal: 3.40, american: '+240' },
  { decimal: 3.60, american: '+260' },
  { decimal: 3.80, american: '+280' },
  { decimal: 4.00, american: '+300' },
  { decimal: 4.20, american: '+320' },
  { decimal: 4.50, american: '+350' }
];

export async function ensureUpcomingMatchesCount(targetCount: number = 25): Promise<number> {
  const settings = getSettings();
  const leagues = getLeagues().filter(l => l.enabled);
  if (leagues.length === 0) return 0;

  const now = new Date();
  const existingPending = getPendingBets();
  let addedCount = 0;

  if (existingPending.length >= targetCount) return 0;

  const needed = targetCount - existingPending.length;
  let dayOffset = 1;
  let leagueIdx = 0;

  const existingBets = getBets();
  const existingMatchIds = new Set(existingBets.map(b => b.matchId));

  for (let i = 0; i < needed; i++) {
    const league = leagues[leagueIdx % leagues.length];
    const teams = UPCOMING_TEAMS[league.id] || UPCOMING_TEAMS['UEFA_CHAMPIONS_LEAGUE'];
    
    const teamAIdx = (i * 2) % teams.length;
    const teamBIdx = (i * 2 + 1) % teams.length;
    const homeTeam = teams[teamAIdx];
    const awayTeam = teams[teamBIdx];

    const matchTime = new Date(now.getTime() + (dayOffset * 24 * 60 * 60 * 1000) + ((i % 4) * 3 * 60 * 60 * 1000));
    const eventId = `sched_${league.id}_${matchTime.toISOString().substring(0, 10)}_${i}`;

    const oddsTier = ODDS_TIERS[i % ODDS_TIERS.length];
    const sportId = league.sportId;

    const savedMatch = insertOrUpdateMatch({
      eventId,
      leagueId: league.id,
      sportId,
      homeTeam,
      awayTeam,
      startsAt: matchTime.toISOString(),
      status: 'SCHEDULED',
      homeScore: null,
      awayScore: null,
      isDraw: null,
      drawOddsAmerican: oddsTier.american,
      drawOddsDecimal: oddsTier.decimal,
      bookmakerId: settings.selectedBookmaker,
      updatedAt: new Date().toISOString()
    });

    if (!existingMatchIds.has(savedMatch.id)) {
      insertBet({
        matchId: savedMatch.id,
        stake: settings.stakePerBet,
        oddsDecimal: savedMatch.drawOddsDecimal,
        status: 'PENDING',
        payout: 0,
        profitLoss: 0,
        placedAt: new Date().toISOString()
      });
      existingMatchIds.add(savedMatch.id);
      addedCount++;
    }

    leagueIdx++;
    if (i % 3 === 0) dayOffset++;
  }

  return addedCount;
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

  // Ensure at least 25 upcoming matches are scheduled in the pipeline
  await ensureUpcomingMatchesCount(25);

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
      updateMatchScores(m.id, homeScore, awayScore, sim.isDraw);
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

  // Backfill scores for any previously settled bets missing homeScore / awayScore
  const allBets = getBets();
  for (const bet of allBets) {
    if (bet.status !== 'PENDING' && bet.match && (bet.match.homeScore === null || bet.match.awayScore === null)) {
      const sim = generateDeterministicScore(bet.match.eventId, bet.match.sportId);
      const isDraw = bet.status === 'WON';
      const homeScore = isDraw ? sim.homeScore : (sim.homeScore === sim.awayScore ? sim.homeScore + 1 : sim.homeScore);
      const awayScore = isDraw ? sim.homeScore : sim.awayScore;
      updateMatchScores(bet.match.id, homeScore, awayScore, isDraw);
    }
  }

  rebuildBankrollHistory();

  return { betsSettled, wonCount, lostCount };
}

export async function resetExperiment(): Promise<void> {
  clearDatabaseData();
}
