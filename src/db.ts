import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { League, Match, Bet, BankrollSnapshot, AppSettings, LeagueStats, SportStats } from './types.js';

const DB_PATH = path.join(process.cwd(), 'draw_betting.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency and speed
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leagues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      sport_id TEXT NOT NULL DEFAULT 'SOCCER',
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      event_id TEXT UNIQUE NOT NULL,
      league_id TEXT NOT NULL,
      sport_id TEXT NOT NULL DEFAULT 'SOCCER',
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      home_score INTEGER,
      away_score INTEGER,
      is_draw INTEGER,
      draw_odds_american TEXT,
      draw_odds_decimal REAL NOT NULL,
      bookmaker_id TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(league_id) REFERENCES leagues(id)
    );

    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,
      match_id TEXT UNIQUE NOT NULL,
      stake REAL NOT NULL DEFAULT 100.0,
      odds_decimal REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      payout REAL NOT NULL DEFAULT 0.0,
      profit_loss REAL NOT NULL DEFAULT 0.0,
      placedAt TEXT NOT NULL,
      settledAt TEXT,
      FOREIGN KEY(match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS bankroll_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      balance REAL NOT NULL,
      net_profit REAL NOT NULL,
      total_bets INTEGER NOT NULL,
      won_bets INTEGER NOT NULL,
      lost_bets INTEGER NOT NULL,
      pending_bets INTEGER NOT NULL,
      win_rate REAL NOT NULL,
      roi_percentage REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migration: Ensure sport_id and bets columns exist
  try {
    db.exec(`ALTER TABLE leagues ADD COLUMN sport_id TEXT NOT NULL DEFAULT 'SOCCER'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE matches ADD COLUMN sport_id TEXT NOT NULL DEFAULT 'SOCCER'`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE bets ADD COLUMN placedAt TEXT NOT NULL DEFAULT ''`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE bets ADD COLUMN settledAt TEXT`);
  } catch (e) {}

  // Clean up any old tier-locked non-draw leagues safely by deleting dependent bets and matches first
  try {
    db.exec(`
      DELETE FROM bets WHERE match_id IN (SELECT id FROM matches WHERE league_id NOT IN ('UEFA_CHAMPIONS_LEAGUE', 'MLS', 'NHL'));
      DELETE FROM matches WHERE league_id NOT IN ('UEFA_CHAMPIONS_LEAGUE', 'MLS', 'NHL');
      DELETE FROM leagues WHERE id NOT IN ('UEFA_CHAMPIONS_LEAGUE', 'MLS', 'NHL');
    `);
  } catch (e) {
    console.error('Migration cleanup warning:', e);
  }

  // Seed 3 active draw leagues if empty
  const leagueCount = (db.prepare(`SELECT COUNT(*) as count FROM leagues`).get() as { count: number }).count;
  if (leagueCount === 0) {
    const defaultLeagues = [
      { id: 'UEFA_CHAMPIONS_LEAGUE', name: 'Champions League', country: 'Europe', sport_id: 'SOCCER', enabled: 1 },
      { id: 'MLS', name: 'Major League Soccer', country: 'USA', sport_id: 'SOCCER', enabled: 1 },
      { id: 'NHL', name: 'National Hockey League', country: 'USA/Canada', sport_id: 'HOCKEY', enabled: 1 }
    ];

    const insertLeague = db.prepare(`INSERT INTO leagues (id, name, country, sport_id, enabled) VALUES (?, ?, ?, ?, ?)`);
    for (const l of defaultLeagues) {
      insertLeague.run(l.id, l.name, l.country, l.sport_id, l.enabled);
    }
  }

  // Seed default settings if empty
  const settingsCount = (db.prepare(`SELECT COUNT(*) as count FROM app_settings`).get() as { count: number }).count;
  if (settingsCount === 0) {
    const defaultSettings: Record<string, string> = {
      apiKey: 'd08632452fa6a5c0c7a7163efb4095c8',
      startingBalance: '10000',
      stakePerBet: '100',
      selectedBookmaker: 'fanduel',
      autoScanEnabled: 'true'
    };

    const insertSetting = db.prepare(`INSERT INTO app_settings (key, value) VALUES (?, ?)`);
    for (const [k, v] of Object.entries(defaultSettings)) {
      insertSetting.run(k, v);
    }
  }

  // Initialize starting balance snapshot if no bankroll history
  const historyCount = (db.prepare(`SELECT COUNT(*) as count FROM bankroll_history`).get() as { count: number }).count;
  if (historyCount === 0) {
    const startingBal = parseFloat(getSetting('startingBalance') || '10000');
    db.prepare(`
      INSERT INTO bankroll_history (timestamp, balance, net_profit, total_bets, won_bets, lost_bets, pending_bets, win_rate, roi_percentage)
      VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0)
    `).run(new Date().toISOString(), startingBal);
  }
}

export function getSettings(): AppSettings {
  const rows = db.prepare(`SELECT key, value FROM app_settings`).all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return {
    apiKey: map.apiKey || '',
    startingBalance: parseFloat(map.startingBalance || '10000'),
    stakePerBet: parseFloat(map.stakePerBet || '100'),
    selectedBookmaker: map.selectedBookmaker || 'fanduel',
    autoScanEnabled: map.autoScanEnabled === 'true'
  };
}

export function getSetting(key: string): string | null {
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function saveSetting(key: string, value: string) {
  db.prepare(`INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?`).run(key, value, value);
}

export function getLeagues(): League[] {
  const rows = db.prepare(`SELECT id, name, country, sport_id, enabled FROM leagues WHERE id IN ('UEFA_CHAMPIONS_LEAGUE', 'MLS', 'NHL')`).all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    country: r.country,
    sportId: r.sport_id || 'SOCCER',
    enabled: Boolean(r.enabled)
  }));
}

export function updateLeagueEnabled(id: string, enabled: boolean) {
  db.prepare(`UPDATE leagues SET enabled = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}

export function insertOrUpdateMatch(m: Omit<Match, 'id'>): Match {
  const existing = db.prepare(`SELECT id FROM matches WHERE event_id = ?`).get(m.eventId) as { id: string } | undefined;
  const matchId = existing ? existing.id : `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO matches (id, event_id, league_id, sport_id, home_team, away_team, starts_at, status, home_score, away_score, is_draw, draw_odds_american, draw_odds_decimal, bookmaker_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id) DO UPDATE SET
      status = excluded.status,
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      is_draw = excluded.is_draw,
      draw_odds_american = excluded.draw_odds_american,
      draw_odds_decimal = excluded.draw_odds_decimal,
      bookmaker_id = excluded.bookmaker_id,
      updated_at = excluded.updated_at
  `).run(
    matchId,
    m.eventId,
    m.leagueId,
    m.sportId || 'SOCCER',
    m.homeTeam,
    m.awayTeam,
    m.startsAt,
    m.status,
    m.homeScore ?? null,
    m.awayScore ?? null,
    m.isDraw !== undefined && m.isDraw !== null ? (m.isDraw ? 1 : 0) : null,
    m.drawOddsAmerican ?? null,
    m.drawOddsDecimal,
    m.bookmakerId,
    now
  );

  return { ...m, id: matchId, updatedAt: now };
}

export function getMatches(): Match[] {
  const rows = db.prepare(`SELECT * FROM matches WHERE league_id IN ('UEFA_CHAMPIONS_LEAGUE', 'MLS', 'NHL') ORDER BY starts_at ASC`).all() as any[];
  return rows.map(r => ({
    id: r.id,
    eventId: r.event_id,
    leagueId: r.league_id,
    sportId: r.sport_id || 'SOCCER',
    homeTeam: r.home_team,
    awayTeam: r.away_team,
    startsAt: r.starts_at,
    status: r.status,
    homeScore: r.home_score,
    awayScore: r.away_score,
    isDraw: r.is_draw !== null ? Boolean(r.is_draw) : null,
    drawOddsAmerican: r.draw_odds_american,
    drawOddsDecimal: r.draw_odds_decimal,
    bookmakerId: r.bookmaker_id,
    updatedAt: r.updated_at
  }));
}

export function insertBet(b: Omit<Bet, 'id'>): Bet {
  const id = `bet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  db.prepare(`
    INSERT INTO bets (id, match_id, stake, odds_decimal, status, payout, profit_loss, placedAt, settledAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, b.matchId, b.stake, b.oddsDecimal, b.status, b.payout, b.profitLoss, b.placedAt, b.settledAt ?? null);

  return { ...b, id };
}

export function updateBetSettlement(id: string, status: 'WON' | 'LOST', payout: number, profitLoss: number) {
  const settledAt = new Date().toISOString();
  db.prepare(`
    UPDATE bets SET status = ?, payout = ?, profit_loss = ?, settledAt = ? WHERE id = ?
  `).run(status, payout, profitLoss, settledAt, id);
}

export function getBets(): Bet[] {
  const rows = db.prepare(`
    SELECT b.*, m.home_team, m.away_team, m.league_id, m.sport_id, m.starts_at, m.status as match_status, m.home_score, m.away_score, m.is_draw, m.draw_odds_american, m.bookmaker_id
    FROM bets b
    JOIN matches m ON b.match_id = m.id
    WHERE m.league_id IN ('UEFA_CHAMPIONS_LEAGUE', 'MLS', 'NHL')
    ORDER BY m.starts_at ASC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    matchId: r.match_id,
    stake: r.stake,
    oddsDecimal: r.odds_decimal,
    status: r.status,
    payout: r.payout,
    profitLoss: r.profit_loss,
    placedAt: r.placedAt,
    settledAt: r.settledAt,
    match: {
      id: r.match_id,
      eventId: r.match_id,
      leagueId: r.league_id,
      sportId: r.sport_id || 'SOCCER',
      homeTeam: r.home_team,
      awayTeam: r.away_team,
      startsAt: r.starts_at,
      status: r.match_status,
      homeScore: r.home_score,
      awayScore: r.away_score,
      isDraw: r.is_draw !== null ? Boolean(r.is_draw) : null,
      drawOddsAmerican: r.draw_odds_american,
      drawOddsDecimal: r.odds_decimal,
      bookmakerId: r.bookmaker_id,
      updatedAt: r.placedAt
    }
  }));
}

export function getPendingBets(): Bet[] {
  return getBets().filter(b => b.status === 'PENDING');
}

export function rebuildBankrollHistory() {
  const settings = getSettings();
  const bets = getBets();
  const settledBets = bets.filter(b => b.status === 'WON' || b.status === 'LOST');

  // Sort settled bets chronologically by match start date
  settledBets.sort((a, b) => {
    const timeA = a.match?.startsAt ? new Date(a.match.startsAt).getTime() : new Date(a.placedAt).getTime();
    const timeB = b.match?.startsAt ? new Date(b.match.startsAt).getTime() : new Date(b.placedAt).getTime();
    return timeA - timeB;
  });

  // Clear existing history to rebuild cleanly
  db.exec(`DELETE FROM bankroll_history`);

  let currentBalance = settings.startingBalance;
  let cumulativeProfit = 0;
  let wonCount = 0;
  let lostCount = 0;

  // Initial snapshot at start of experiment
  const initialTime = settledBets.length > 0 && settledBets[0].match?.startsAt
    ? new Date(new Date(settledBets[0].match.startsAt).getTime() - 24 * 60 * 60 * 1000).toISOString()
    : new Date().toISOString();

  db.prepare(`
    INSERT INTO bankroll_history (timestamp, balance, net_profit, total_bets, won_bets, lost_bets, pending_bets, win_rate, roi_percentage)
    VALUES (?, ?, 0, 0, 0, 0, ?, 0, 0)
  `).run(initialTime, currentBalance, bets.filter(b => b.status === 'PENDING').length);

  for (let i = 0; i < settledBets.length; i++) {
    const bet = settledBets[i];
    if (bet.status === 'WON') wonCount++;
    if (bet.status === 'LOST') lostCount++;

    cumulativeProfit += bet.profitLoss;
    currentBalance = settings.startingBalance + cumulativeProfit;

    const totalSettled = wonCount + lostCount;
    const winRate = totalSettled > 0 ? (wonCount / totalSettled) * 100 : 0;
    const totalStaked = totalSettled * settings.stakePerBet;
    const roiPercentage = totalStaked > 0 ? (cumulativeProfit / totalStaked) * 100 : 0;
    const timestamp = bet.match?.startsAt || bet.settledAt || bet.placedAt;

    db.prepare(`
      INSERT INTO bankroll_history (timestamp, balance, net_profit, total_bets, won_bets, lost_bets, pending_bets, win_rate, roi_percentage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      timestamp,
      currentBalance,
      cumulativeProfit,
      totalSettled,
      wonCount,
      lostCount,
      bets.length - totalSettled,
      winRate,
      roiPercentage
    );
  }
}

export function recordBankrollSnapshot() {
  rebuildBankrollHistory();
}

export function getBankrollHistory(): BankrollSnapshot[] {
  const rows = db.prepare(`SELECT * FROM bankroll_history ORDER BY id ASC`).all() as any[];
  return rows.map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    balance: r.balance,
    netProfit: r.net_profit,
    totalBets: r.total_bets,
    wonBets: r.won_bets,
    lostBets: r.lost_bets,
    pendingBets: r.pending_bets,
    winRate: r.win_rate,
    roiPercentage: r.roi_percentage
  }));
}

export function getLeagueStats(): LeagueStats[] {
  const leagues = getLeagues();
  const bets = getBets();

  return leagues.map(l => {
    const leagueBets = bets.filter(b => b.match?.leagueId === l.id);
    const wonBets = leagueBets.filter(b => b.status === 'WON');
    const lostBets = leagueBets.filter(b => b.status === 'LOST');
    const pendingBets = leagueBets.filter(b => b.status === 'PENDING');
    const settledBets = wonBets.length + lostBets.length;

    const totalStaked = settledBets * 100;
    const totalProfitLoss = leagueBets.reduce((sum, b) => sum + (b.status !== 'PENDING' ? b.profitLoss : 0), 0);
    const winRate = settledBets > 0 ? (wonBets.length / settledBets) * 100 : 0;
    const roiPercentage = totalStaked > 0 ? (totalProfitLoss / totalStaked) * 100 : 0;
    const avgDrawOdds = leagueBets.length > 0 ? leagueBets.reduce((sum, b) => sum + b.oddsDecimal, 0) / leagueBets.length : 0;

    return {
      leagueId: l.id,
      leagueName: l.name,
      sportId: l.sportId,
      totalBets: leagueBets.length,
      wonBets: wonBets.length,
      lostBets: lostBets.length,
      pendingBets: pendingBets.length,
      winRate,
      totalStaked,
      totalProfitLoss,
      roiPercentage,
      avgDrawOdds
    };
  });
}

export function getSportStats(): SportStats[] {
  const bets = getBets();
  const markets = [
    { id: 'UEFA_CHAMPIONS_LEAGUE', name: 'Champions League Draw Market' },
    { id: 'MLS', name: 'MLS Draw Market' },
    { id: 'NHL', name: 'NHL 60-Min Reg. Draw Market' }
  ];

  return markets.map(m => {
    const marketBets = bets.filter(b => b.match?.leagueId === m.id);
    const wonBets = marketBets.filter(b => b.status === 'WON');
    const lostBets = marketBets.filter(b => b.status === 'LOST');
    const pendingBets = marketBets.filter(b => b.status === 'PENDING');
    const settledBets = wonBets.length + lostBets.length;

    const totalStaked = settledBets * 100;
    const totalProfitLoss = marketBets.reduce((sum, b) => sum + (b.status !== 'PENDING' ? b.profitLoss : 0), 0);
    const winRate = settledBets > 0 ? (wonBets.length / settledBets) * 100 : 0;
    const roiPercentage = totalStaked > 0 ? (totalProfitLoss / totalStaked) * 100 : 0;
    const avgDrawOdds = marketBets.length > 0 ? marketBets.reduce((sum, b) => sum + b.oddsDecimal, 0) / marketBets.length : 0;

    return {
      sportId: m.id,
      sportName: m.name,
      totalBets: marketBets.length,
      wonBets: wonBets.length,
      lostBets: lostBets.length,
      pendingBets: pendingBets.length,
      winRate,
      totalStaked,
      totalProfitLoss,
      roiPercentage,
      avgDrawOdds
    };
  });
}

export function clearDatabaseData() {
  db.exec(`
    DELETE FROM bets;
    DELETE FROM matches;
    DELETE FROM bankroll_history;
  `);

  const settings = getSettings();
  db.prepare(`
    INSERT INTO bankroll_history (timestamp, balance, net_profit, total_bets, won_bets, lost_bets, pending_bets, win_rate, roi_percentage)
    VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0)
  `).run(new Date().toISOString(), settings.startingBalance);
}

export { db };
