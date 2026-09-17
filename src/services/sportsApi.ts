import axios from 'axios';
import { Match, MatchStatus } from '../types.js';

export function americanToDecimal(american: string | number | null | undefined): number {
  if (!american) return 3.50;
  const str = String(american).trim();
  const val = parseFloat(str.replace('+', ''));
  if (isNaN(val)) return 3.50;

  if (val > 0) {
    return parseFloat(((val / 100) + 1).toFixed(2));
  } else if (val < 0) {
    return parseFloat(((100 / Math.abs(val)) + 1).toFixed(2));
  }
  return 3.50;
}

export async function fetchLiveLeagueMatches(leagueId: string, apiKey: string, preferredBookmaker: string = 'fanduel'): Promise<Omit<Match, 'id'>[]> {
  try {
    const url = `https://api.sportsgameodds.com/v2/events?leagueID=${encodeURIComponent(leagueId)}&limit=40`;
    const response = await axios.get(url, {
      headers: {
        'x-api-key': apiKey,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const events = response.data.data;
      const matches: Omit<Match, 'id'>[] = [];

      for (const event of events) {
        const eventId = event.eventID;
        if (!eventId) continue;

        const sportId = event.sportID || (leagueId === 'NHL' ? 'HOCKEY' : 'SOCCER');
        const homeTeam = event.teams?.home?.names?.medium || event.teams?.home?.names?.long || event.teams?.home?.teamID || 'Home Team';
        const awayTeam = event.teams?.away?.names?.medium || event.teams?.away?.names?.long || event.teams?.away?.teamID || 'Away Team';
        const startsAt = event.status?.startsAt || new Date().toISOString();
        
        // Status & Completion check
        const ended = Boolean(
          event.status?.ended ||
          event.status?.finalized ||
          event.status?.completed ||
          event.status?.displayShort === 'FT' ||
          event.status?.displayLong === 'Final'
        );
        const status: MatchStatus = ended ? 'FINISHED' : 'SCHEDULED';

        // Extract score if available (check teams.home.score / teams.away.score first, then scores)
        let homeScore: number | null = null;
        let awayScore: number | null = null;
        if (typeof event.teams?.home?.score === 'number' && typeof event.teams?.away?.score === 'number') {
          homeScore = event.teams.home.score;
          awayScore = event.teams.away.score;
        } else if (event.scores && typeof event.scores.home === 'number' && typeof event.scores.away === 'number') {
          homeScore = event.scores.home;
          awayScore = event.scores.away;
        }

        // Extract 3-way moneyline draw odds (excluding betmgm)
        let drawOddsAmerican: string | null = null;
        let drawOddsDecimal = 3.50; // Default estimate if market unquoted
        let bookmakerId = preferredBookmaker;

        if (event.odds) {
          const oddsKeys = Object.keys(event.odds);
          // Prefer full game 3-way moneyline draw market
          const drawKey = oddsKeys.find(k => k.includes('points-all-reg-ml3way-draw') || k.includes('points-all-game-ml3way-draw')) 
                       || oddsKeys.find(k => k.includes('ml3way-draw') || k.includes('draw'));

          if (drawKey && event.odds[drawKey]?.byBookmaker) {
            const byBookmaker = event.odds[drawKey].byBookmaker;
            const availableBookmakers = Object.keys(byBookmaker).filter(b => b.toLowerCase() !== 'betmgm');

            if (availableBookmakers.length > 0) {
              const priority = [preferredBookmaker.toLowerCase(), 'fanduel', 'unibet', 'draftkings', 'pinnacle', 'caesars', 'bovada', 'williamhill'];
              let chosenBm = priority.find(b => availableBookmakers.includes(b));
              if (!chosenBm) {
                chosenBm = availableBookmakers[0];
              }

              bookmakerId = chosenBm;
              const oddsObj = byBookmaker[chosenBm];
              if (oddsObj && oddsObj.odds) {
                drawOddsAmerican = String(oddsObj.odds);
                drawOddsDecimal = americanToDecimal(drawOddsAmerican);
              }
            }
          }
        }

        matches.push({
          eventId,
          leagueId,
          sportId,
          homeTeam,
          awayTeam,
          startsAt,
          status,
          homeScore,
          awayScore,
          isDraw: homeScore !== null && awayScore !== null ? homeScore === awayScore : null,
          drawOddsAmerican,
          drawOddsDecimal,
          bookmakerId,
          updatedAt: new Date().toISOString()
        });
      }

      return matches;
    }
  } catch (error: any) {
    console.warn(`SportsGameOdds API call for league ${leagueId} error: ${error.message}`);
  }

  return [];
}
