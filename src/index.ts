import { Database } from 'sqlite-async';
import { RSSItem, fetchRSS } from './rss';
import { startServer } from './server';

require('dotenv').config();

interface Feed {
  url: string;
  refreshInterval?: number;
  lastRefresh?: number;
  filter?: (item: RSSItem) => boolean;
}

const twitterFeed = (username: string): Feed => ({
  url: `http://localhost:3000/?action=display&bridge=TwitterBridge&context=By+username&u=${username}&noretweet=on&format=Mrss`,
  refreshInterval: 3600,  // 1 hour
});

const twitterFollows = [
  "karpathy",
  "sama",
  "OpenAI",
  "FTX_Official",
  "intocryptoverse",
  "OskSta",
  "VitalikButerin"
];

const youtubeFeed = (username: string): Feed => ({
  url: `http://localhost:3000/?action=display&bridge=YoutubeBridge&context=By+custom+name&custom=%40${username}&duration_min=&duration_max=&format=Mrss`,
  refreshInterval: 3600,  // 1 hour
});

const youtubeFollows = ['AIDRIVR', 'ai-explained-', 'AlyxBailey', 'AndrejKarpathy', 'angethegreat', 'AntroporamaDivulgacion', 'AverageRob', 'BeauMiles', 'benjamin1563', 'bbacalhau', 'BMSculptures', 'BobbyBroccoli', 'BusinessCasual', 'c90adventures', 'CasuallyExplained', 'CGPGrey', 'CodeParade', 'ColdFusion', 'Connor01', 'crimsonhollowgame', 'dingsauce', 'majicDave', 'deepdive8755', 'dvgen', 'EmperorLemon', 'Extremities', 'frankenscience3802', 'GregMcCahon', 'jamieschannel4034', 'jannasmoments3379', 'jdh', 'JonasTyroller', 'kbitdev', 'KrisLucenDev', 'LastWeekTonight', 'Limpwurt', 'lukemuscat', 'MoneyMacro', 'neoexplains', 'NewMind', 'NotJustBikes', 'OBFYT', 'OverSimplified', 'PezzzasWork', 'Pikasprey', 'PolyMatter', 'Pontypants', 'PracticalEngineeringChannel', 'primitivetechnology9550', 'reubs', 'Rocketpoweredmohawk', 'SebastianLague', 'Settledrs', 'SZLindsaySD', 'smartereveryday', 'SolarSands', 'StuffMadeHere', 'SummoningSalt', 'Ter', 'ThinMatrix', 'TomScottGo', 'victoriacedillo_', 'Wendoverproductions', 'Wirtual', 'YannicKilcher'];

const feeds: Feed[] = [
  { url: "https://feeds.nos.nl/nosnieuwsalgemeen" },
  { url: "https://www.nu.nl/rss/Economie" },
  {
    url: "https://hnrss.org/frontpage", filter: (item) => {
      const pointsRegex = /Points: (\d+)/;
      const pointsMatch = item.description.match(pointsRegex);
      if (!pointsMatch) return false;

      item.date = new Date();

      const points = parseInt(pointsMatch[1]);
      return points > 100;
    }
  },
  ...twitterFollows.map(twitterFeed),
  ...youtubeFollows.map(youtubeFeed)
];

if (process.env.DISABLE_FETCH) {
  for (const feed of feeds) {
    feed.lastRefresh = Number.MAX_SAFE_INTEGER;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refresh(db: Database) {
  for (const feed of feeds) {
    const interval = feed.refreshInterval || 60 * 5;

    if (feed.lastRefresh && Date.now() - feed.lastRefresh < interval * 1000) {
      continue;
    }

    feed.lastRefresh = Date.now();

    try {
      let items = await fetchRSS(feed.url);

      if (feed.filter) {
        items = items.filter(feed.filter);
      }

      const stmt = await db.prepare("INSERT OR IGNORE INTO Items VALUES (?, ?, ?, ?, ?, ?)");
      for (const item of items) {
        await stmt.run(
          item.guid,
          item.title,
          item.link,
          item.description,
          item.date.getTime(),
          item.image
        );
      }
      await stmt.finalize();

      console.log(`Fetched ${items.length} items from ${feed.url} at ${new Date().toLocaleString()}`);
    } catch (e) {
      console.error("Error fetching feed", feed.url);
      console.error(e);
    }

    await sleep(5000);
  }
}

async function run() {
  const db = await Database.open('./data.db');

  await db.run(`CREATE TABLE IF NOT EXISTS Items (
    GUID        TEXT    PRIMARY KEY
                        UNIQUE
                        NOT NULL,
    Title       TEXT,
    Link        TEXT,
    Description TEXT,
    Date        INTEGER,
    Image       TEXT
  );`);

  startServer(db);

  while (true) {
    await refresh(db);

    await sleep(1000 * 60);
  }

  await db.close();
}

run().catch(console.error);