import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDatabase,
  getSettings,
  saveSetting,
  getLeagues,
  updateLeagueEnabled,
  getMatches,
  getBets,
  getBankrollHistory,
  getLeagueStats,
  clearDatabaseData
} from './db.js';
import { scanAndRegisterDailyBets, settlePendingBets } from './services/simulationEngine.js';

// Initialize Database
initDatabase();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// API Endpoints
app.get('/api/dashboard', (req, res) => {
  try {
    const settings = getSettings();
    const history = getBankrollHistory();
    const latestSnapshot = history[history.length - 1] || {
      balance: settings.startingBalance,
      netProfit: 0,
      totalBets: 0,
      wonBets: 0,
      lostBets: 0,
      pendingBets: 0,
      winRate: 0,
      roiPercentage: 0
    };

    const leagues = getLeagues();
    const leagueStats = getLeagueStats();
    const bets = getBets();
    const matches = getMatches();

    res.json({
      success: true,
      summary: {
        currentBalance: latestSnapshot.balance,
        startingBalance: settings.startingBalance,
        netProfit: latestSnapshot.netProfit,
        totalBets: latestSnapshot.totalBets,
        wonBets: latestSnapshot.wonBets,
        lostBets: latestSnapshot.lostBets,
        pendingBets: latestSnapshot.pendingBets,
        winRate: latestSnapshot.winRate,
        roiPercentage: latestSnapshot.roiPercentage,
        stakePerBet: settings.stakePerBet
      },
      bankrollHistory: history,
      leagues,
      leagueStats,
      bets: bets.slice(0, 100), // Limit top 100 recent bets
      totalMatchesCount: matches.length,
      settings
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/scan', async (req, res) => {
  try {
    const result = await scanAndRegisterDailyBets();
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settle', async (req, res) => {
  try {
    const result = await settlePendingBets();
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});



app.post('/api/settings', (req, res) => {
  try {
    const { apiKey, startingBalance, stakePerBet, selectedBookmaker } = req.body;
    if (apiKey !== undefined) saveSetting('apiKey', String(apiKey));
    if (startingBalance !== undefined) saveSetting('startingBalance', String(startingBalance));
    if (stakePerBet !== undefined) saveSetting('stakePerBet', String(stakePerBet));
    if (selectedBookmaker !== undefined) saveSetting('selectedBookmaker', String(selectedBookmaker));

    res.json({ success: true, settings: getSettings() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/leagues/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    updateLeagueEnabled(id, Boolean(enabled));
    res.json({ success: true, leagues: getLeagues() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/reset', (req, res) => {
  try {
    clearDatabaseData();
    res.json({ success: true, settings: getSettings() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve frontend static files in production if dist/client exists
const clientDist = path.join(process.cwd(), 'dist/client');
app.use(express.static(clientDist));
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  const indexHtml = path.join(clientDist, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) res.send('Backend Server is running. Frontend build pending.');
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Draw Betting Server running on http://localhost:${PORT}`);

  // Run initial scan and settlement on startup
  try {
    console.log('🔄 Running initial daily scan and bet settlement on startup...');
    await scanAndRegisterDailyBets();
  } catch (err: any) {
    console.error('Initial startup scan failed:', err.message);
  }

  // Schedule automated scan every 2 hours
  setInterval(async () => {
    try {
      console.log('⏰ Running scheduled 2-hour scan & settlement...');
      await scanAndRegisterDailyBets();
    } catch (err: any) {
      console.error('Scheduled background scan failed:', err.message);
    }
  }, 2 * 60 * 60 * 1000);
});
