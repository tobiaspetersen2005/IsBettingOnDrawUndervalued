export interface League {
  id: string; // e.g., "EPL", "ESP_LALIGA", "GER_BUNDESLIGA", "ITA_SERIE_A", "FRA_LIGUE_1", "NED_EREDIVISIE", "ENG_CHAMPIONSHIP", "POR_PRIMEIRA_LIGA"
  name: string;
  country: string;
  enabled: boolean;
}

export type MatchStatus = 'SCHEDULED' | 'FINISHED' | 'CANCELLED';

export interface Match {
  id: string; // Internal UUID or DB id
  eventId: string; // API event ID
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string; // ISO Date String
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  isDraw?: boolean | null;
  drawOddsAmerican?: string | null; // e.g. "+260"
  drawOddsDecimal: number; // e.g. 3.60
  bookmakerId: string; // e.g. "bet365", "pinnacle", "draftkings"
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
  // Joined match fields for UI convenience
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
  winRate: number; // Percentage, e.g. 28.5
  roiPercentage: number; // Percentage, e.g. +14.2
}

export interface LeagueStats {
  leagueId: string;
  leagueName: string;
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
