# Matrix Defense: Tactical Slow-Mo

A browser-based reflex game with a global leaderboard and live chat, backed by Supabase. No build step — plain HTML/CSS/JS.

## Running locally

Serve the folder with any static file server (opening `index.html` directly also works, but a server avoids browser file:// restrictions):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Project structure

- `index.html` — markup only
- `style.css` — all styling
- `config.js` — Supabase client setup
- `game.js` — canvas game loop, leaderboard, profanity filter, screen manager
- `chat.js` — global chat (Realtime + reconciliation poll, unread badges, admin purge)

## Supabase setup

The app expects two tables in your Supabase project:

```sql
create table leaderboard (
  player_token text primary key,
  nickname text not null unique,
  score integer not null default 0,
  level integer not null default 1
);

create table chat_messages (
  id bigint generated always as identity primary key,
  nickname text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table score_history (
  id bigint generated always as identity primary key,
  player_token text not null,
  nickname text not null,
  score integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now()
);
create index score_history_player_token_idx on score_history (player_token, created_at desc);
```

All three need RLS enabled with permissive anon read/write policies (the anon key is safe to expose client-side; it's scoped by these policies, not a secret):

```sql
alter table leaderboard enable row level security;
create policy "anon all" on leaderboard for all to anon, authenticated using (true) with check (true);

alter table chat_messages enable row level security;
create policy "anon read" on chat_messages for select to anon, authenticated using (true);
create policy "anon insert" on chat_messages for insert to anon, authenticated with check (true);

alter table score_history enable row level security;
create policy "anon read" on score_history for select to anon, authenticated using (true);
create policy "anon insert" on score_history for insert to anon, authenticated with check (true);
```

For chat messages to push live to other players instantly (instead of within ~15s via the fallback poll), enable Realtime on `chat_messages`:

```sql
alter publication supabase_realtime add table chat_messages;
```

## Environment

`.env` holds `SUPABASE_URL` / `SUPABASE_ANON_KEY` for reference. Since this is a static site with no build tool, the browser can't read `.env` at runtime — the same values are set directly in `config.js`, which is what the app actually uses. If you rotate the key, update both files.

## Features

- Tap-to-destroy reflex gameplay with combo scoring, bullet-time slow-mo, and escalating hazard types
- Global leaderboard (always shows each player's true best score, cross-checked against the DB on every submit)
- Tap an operator on the leaderboard to expand their file inline (right under their row): best score plus their 5 most recent runs with date & time
- Global chat with live updates, per-message timestamps, send rate-limiting, and a profanity filter (English + Hebrew) applied to both nicknames and messages
- Unread-message badge on the chat button
