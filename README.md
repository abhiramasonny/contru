# Rivisons

Simple web app that summarizes Google Docs or Slides activity like GitHub contributions.

## Setup

1. Create OAuth credentials in Google Cloud Console.
2. Enable Google Drive Activity API, Google Drive API, and Google People API (for emails).
3. Create a `.env` from `.env.example`.
4. (Optional) Add `DATABASE_URL` for Postgres to persist consents and sessions.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, connect Google, paste a Docs or Slides URL, and analyze.

## Notes

- Activity counts reflect Google Drive Activity logs, not a full edit diff.
- Limits: the app fetches up to 10,000 activities for speed; adjust in `server/index.js` if needed.
- Email visibility depends on People API permissions; some users may appear as display names only.
- The “People With Access” panel comes from Drive permissions and may still hide emails for privacy.
- For full identity resolution, each collaborator should click “Register My Identity” once while signed in.

## Heroku Postgres

Provision Postgres and set the config var:

```bash
heroku addons:create heroku-postgresql:essential-0
heroku config:set DATABASE_URL=your_heroku_database_url
```
