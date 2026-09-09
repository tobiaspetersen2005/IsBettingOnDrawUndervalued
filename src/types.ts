export type SportCategory = 'ALL' | 'SOCCER' | 'HOCKEY';

export interface League {
  id: string;
  name: string;
  country: string;
  sportId: string; // 'SOCCER' | 'HOCKEY'
  enabled: boolean;
}

export type MatchStatus = 'SCHEDULED' | 'FINISHED' | 'CANCELLED';

export interface Match {
  id: string; // Internal UUID or DB id
  eventId: string; // API event ID
  leagueId: string;
  sportId: string; // 'SOCCER' | 'HOCKEY'
  homeTeam: string;
  awayTeam: string;
  startsAt: string; // ISO Date String
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  isDraw?: boolean | null;
  drawOddsAmerican?: string | null; // e.g. "+260"
  drawOddsDecimal: number; // e.g. 3.60
  bookmakerId: string; // e.g. "fanduel", "unibet", "draftkings"
  updatedAt: string;
}

export type BetStatus = 'PENDING' | 'WON' | 'LOST';

export interface Bet {
  id: string;
  matchId: string;
  stake: number; // Default 100 units
  oddsDecimal: number;
  status: BetStatus;
  payout: number; // 0 if lost, stake * odds if won
  profitLoss: number; // -stake if lost, (stake * odds - stake) if won
  placedAt: string;
  settledAt?: string | null;
  match?: Match;
}

export interface BankrollSnapshot {
  id: number;
  timestamp: string;
  balance: number;
  netProfit: number;
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  winRate: number;
  roiPercentage: number;
}

export interface LeagueStats {
  leagueId: string;
  leagueName: string;
  sportId: string;
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  winRate: number;
  totalStaked: number;
  totalProfitLoss: number;
  roiPercentage: number;
  avgDrawOdds: number;
}

export interface SportStats {
  sportId: string;
  sportName: string;
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  winRate: number;
  totalStaked: number;
  totalProfitLoss: number;
  roiPercentage: number;
  avgDrawOdds: number;
}

export interface AppSettings {
  apiKey: string;
  startingBalance: number;
  stakePerBet: number;
  selectedBookmaker: string;
  autoScanEnabled: boolean;
}
