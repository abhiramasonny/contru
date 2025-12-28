import express from "express";
import session from "express-session";
import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const CONSENTS_PATH = path.join(DATA_DIR, "consents.json");
const ANALYSIS_CACHE_PATH = path.join(DATA_DIR, "analysis-cache.json");

const app = express();
const PORT = process.env.PORT || 3000;

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  SESSION_SECRET,
  DATABASE_URL,
  NODE_ENV
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.warn("Missing Google OAuth env vars. See .env.example.");
}

const pool = DATABASE_URL
  ? new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    })
  : null;

const PgSession = connectPgSimple(session);

async function ensureDatabase() {
  if (!pool) return;
  await pool.query(
    "CREATE TABLE IF NOT EXISTS consents (person_name text primary key, display_name text, email text, updated_at timestamptz)"
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS analysis_cache (file_id text, year int, payload jsonb, updated_at timestamptz, PRIMARY KEY (file_id, year))"
  );
}

app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    store: pool ? new PgSession({ pool, createTableIfMissing: true }) : undefined
  })
);

app.use(express.static(path.join(__dirname, "..", "public")));

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive.activity.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email"
];

function getClient(req) {
  const token = req.session?.tokens;
  if (!token) return null;
  oauth2Client.setCredentials(token);
  return oauth2Client;
}

async function readConsents() {
  if (pool) {
    const { rows } = await pool.query(
      "SELECT person_name, display_name, email, updated_at FROM consents"
    );
    return new Map(
      rows.map((row) => [
        row.person_name,
        {
          personName: row.person_name,
          displayName: row.display_name,
          name: row.display_name,
          email: row.email,
          updatedAt: row.updated_at
        }
      ])
    );
  }

  try {
    const raw = await fs.readFile(CONSENTS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return new Map(parsed.map((entry) => [entry.personName, entry]));
  } catch (err) {
    if (err.code === "ENOENT") return new Map();
    throw err;
  }
}

async function writeConsents(consentMap) {
  if (pool) {
    const values = Array.from(consentMap.values());
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const entry of values) {
        await client.query(
          "INSERT INTO consents (person_name, display_name, email, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (person_name) DO UPDATE SET display_name = EXCLUDED.display_name, email = EXCLUDED.email, updated_at = EXCLUDED.updated_at",
          [entry.personName, entry.displayName, entry.email, entry.updatedAt]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = Array.from(consentMap.values());
  await fs.writeFile(CONSENTS_PATH, JSON.stringify(payload, null, 2));
}

async function readAnalysisCache() {
  if (pool) {
    const { rows } = await pool.query(
      "SELECT file_id, year, payload, updated_at FROM analysis_cache"
    );
    return new Map(
      rows.map((row) => [
        `${row.file_id}:${row.year}`,
        {
          fileId: row.file_id,
          year: row.year,
          payload: row.payload,
          updatedAt: row.updated_at
        }
      ])
    );
  }

  try {
    const raw = await fs.readFile(ANALYSIS_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return new Map(
      parsed.map((entry) => [
        `${entry.fileId}:${entry.year}`,
        entry
      ])
    );
  } catch (err) {
    if (err.code === "ENOENT") return new Map();
    throw err;
  }
}

async function writeAnalysisCache(cacheMap) {
  if (pool) {
    const values = Array.from(cacheMap.values());
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const entry of values) {
        await client.query(
          "INSERT INTO analysis_cache (file_id, year, payload, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (file_id, year) DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at",
          [entry.fileId, entry.year, entry.payload, entry.updatedAt]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = Array.from(cacheMap.values());
  await fs.writeFile(ANALYSIS_CACHE_PATH, JSON.stringify(payload, null, 2));
}

function parseFileId(input) {
  if (!input) return null;
  const docMatch = input.match(/\/document\/d\/(.+?)(?:\/|$)/);
  const slideMatch = input.match(/\/presentation\/d\/(.+?)(?:\/|$)/);
  const idMatch = input.match(/[-\w]{25,}/);
  return (docMatch && docMatch[1]) || (slideMatch && slideMatch[1]) || (idMatch && idMatch[0]) || null;
}

function isoDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function initHeatmap(year) {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const days = [];
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    days.push(isoDay(d));
  }
  return days.reduce((acc, day) => {
    acc[day] = 0;
    return acc;
  }, {});
}

function computeStreaks(heatmap) {
  const days = Object.keys(heatmap);
  let longest = 0;
  let current = 0;
  let streak = 0;

  for (const day of days) {
    if (heatmap[day] > 0) {
      streak += 1;
      if (streak > longest) longest = streak;
    } else {
      streak = 0;
    }
  }

  const today = isoDay(new Date());
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i] > today) continue;
    if (heatmap[days[i]] > 0) {
      current += 1;
    } else {
      break;
    }
  }

  return { longestStreak: longest, currentStreak: current };
}

function aggregateActivities(activities, year, peopleDirectory, permissionsDirectory, consentDirectory) {
  const totals = new Map();
  const heatmap = initHeatmap(year);
  const contributorHeatmaps = new Map();
  let activityCount = 0;

  for (const activity of activities) {
    const time = activity.timestamp || activity.timeRange?.endTime;
    if (!time) continue;
    const date = new Date(time);
    if (date.getFullYear() !== year) continue;

    activityCount += 1;
    const day = isoDay(date);
    if (heatmap[day] !== undefined) heatmap[day] += 1;

    const actors = activity.actors || [];
    for (const actor of actors) {
      const user = actor.user || {};
      const knownUser = user.knownUser || {};
      const personName = knownUser.personName || null;
      const resolved = (personName && peopleDirectory?.get(personName)) || {};
      const permResolved =
        (knownUser.displayName && permissionsDirectory?.get(knownUser.displayName)) || {};
      const consentResolved = (personName && consentDirectory?.get(personName)) || {};
      const displayName = resolved.displayName || knownUser.displayName || personName || "Unknown";
      const email = resolved.email || consentResolved.email || permResolved.email || null;
      const friendlyName =
        consentResolved.displayName || consentResolved.name || displayName || "Unknown";

      const key = personName || displayName;
      const entry = totals.get(key) || {
        id: key,
        name: friendlyName,
        email,
        count: 0
      };
      const userHeatmap = contributorHeatmaps.get(key) || initHeatmap(year);
      if (!entry.email && email) entry.email = email;
      if (entry.name === "Unknown" && friendlyName) entry.name = friendlyName;
      entry.count += 1;
      if (userHeatmap[day] !== undefined) userHeatmap[day] += 1;
      totals.set(key, entry);
      contributorHeatmaps.set(key, userHeatmap);
    }
  }

  const contributors = Array.from(totals.values()).sort((a, b) => b.count - a.count);
  const streaks = computeStreaks(heatmap);

  const contributorHeatmapPayload = Array.from(contributorHeatmaps.entries()).reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {}
  );

  return { contributors, heatmap, contributorHeatmaps: contributorHeatmapPayload, activityCount, streaks };
}

app.get("/auth/google", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: OAUTH_SCOPES,
    prompt: "consent"
  });
  res.redirect(url);
});

app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  try {
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens;
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("OAuth failed");
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/me", async (req, res) => {
  const client = getClient(req);
  if (!client) return res.status(401).json({ error: "Not authenticated" });

  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    res.json({ user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/api/consent", async (req, res) => {
  const client = getClient(req);
  if (!client) return res.status(401).json({ error: "Not authenticated" });

  try {
    const people = google.people({ version: "v1", auth: client });
    const { data } = await people.people.get({
      resourceName: "people/me",
      personFields: "names,emailAddresses"
    });

    const personName = data.resourceName;
    const displayName = data.names?.[0]?.displayName || null;
    const email = data.emailAddresses?.[0]?.value || null;

    if (!personName) return res.status(400).json({ error: "Missing person id" });

    const payload = {
      personName,
      displayName,
      name: displayName,
      email,
      updatedAt: new Date().toISOString()
    };

    if (pool) {
      await pool.query(
        "INSERT INTO consents (person_name, display_name, email, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (person_name) DO UPDATE SET display_name = EXCLUDED.display_name, email = EXCLUDED.email, updated_at = EXCLUDED.updated_at",
        [personName, displayName, email, payload.updatedAt]
      );
    } else {
      const consents = await readConsents();
      consents.set(personName, payload);
      await writeConsents(consents);
    }

    res.json({ ok: true, personName, displayName, email });
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ error: "Failed to register consent" });
  }
});

app.post("/api/analyze", async (req, res) => {
  const client = getClient(req);
  if (!client) return res.status(401).json({ error: "Not authenticated" });

  const fileId = parseFileId(req.body?.url);
  if (!fileId) return res.status(400).json({ error: "Invalid Google Docs/Slides URL" });

  try {
    const drive = google.drive({ version: "v3", auth: client });
    const activity = google.driveactivity({ version: "v2", auth: client });
    const people = google.people({ version: "v1", auth: client });

    const file = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, owners(displayName,emailAddress), modifiedTime, createdTime"
    });

    const permissionsResp = await drive.permissions.list({
      fileId,
      fields: "permissions(id,displayName,emailAddress,role,type)"
    });

    const currentYear = new Date().getFullYear();
    const year = Number(req.body?.year) || currentYear;
    if (!Number.isInteger(year) || year < 2000 || year > currentYear + 1) {
      return res.status(400).json({ error: "Invalid year" });
    }

    const cacheKey = `${fileId}:${year}`;
    const analysisCache = await readAnalysisCache();
    const cached = analysisCache.get(cacheKey);
    const force = Boolean(req.body?.force);
    if (!force && cached?.payload) {
      return res.json(cached.payload);
    }

    const activities = [];
    let pageToken = undefined;

    do {
      const response = await activity.activity.query({
        requestBody: {
          itemName: `items/${fileId}`,
          pageToken,
          pageSize: 50
        }
      });

      const batch = response.data.activities || [];
      activities.push(...batch);
      pageToken = response.data.nextPageToken;
    } while (pageToken && activities.length < 10000);

    const peopleDirectory = new Map();
    const consentDirectory = await readConsents();
    const permissionsDirectory = new Map();
    const personNames = new Set();

    for (const activityItem of activities) {
      const actors = activityItem.actors || [];
      for (const actor of actors) {
        const personName = actor.user?.knownUser?.personName;
        if (personName) personNames.add(personName);
      }
    }

    for (const personName of personNames) {
      try {
        const { data } = await people.people.get({
          resourceName: personName,
          personFields: "names,emailAddresses"
        });
        const displayName = data.names?.[0]?.displayName || null;
        const email = data.emailAddresses?.[0]?.value || null;
        peopleDirectory.set(personName, { displayName, email });
      } catch (err) {
        const code = err?.code || err?.response?.status;
        if (code && code !== 404) {
          console.warn("People API lookup failed", personName, err?.message || err);
        }
      }
    }

    const permissions = permissionsResp.data.permissions || [];
    permissions.forEach((permission) => {
      if (permission.displayName && permission.emailAddress) {
        permissionsDirectory.set(permission.displayName, {
          email: permission.emailAddress
        });
      }
    });

    const { contributors, heatmap, contributorHeatmaps, activityCount, streaks } = aggregateActivities(
      activities,
      year,
      peopleDirectory,
      permissionsDirectory,
      consentDirectory
    );

    const payload = {
      file: file.data,
      permissions,
      year,
      contributors,
      heatmap,
      contributorHeatmaps,
      activityCount,
      streaks
    };

    analysisCache.set(cacheKey, {
      fileId,
      year,
      payload,
      updatedAt: new Date().toISOString()
    });
    await writeAnalysisCache(analysisCache);

    res.json(payload);
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ error: "Failed to analyze file" });
  }
});

ensureDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database", err);
    process.exit(1);
  });
