-- MVP trading schema for room-based multiuser simulation
create extension if not exists pgcrypto;

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  display_name text not null,
  player_code text not null,
  cash numeric not null default 100000,
  created_at timestamptz not null default now(),
  unique (room_id, display_name)
);

create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references room_players(id) on delete cascade,
  market text not null check (market in ('historic', 'season')),
  coin text not null,
  qty numeric not null default 0,
  avg_cost numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (player_id, market, coin)
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references room_players(id) on delete cascade,
  market text not null check (market in ('historic', 'season')),
  coin text not null,
  side text not null check (side in ('buy', 'sell')),
  qty numeric not null,
  price_exec numeric not null,
  notional numeric not null,
  spread_pct numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_room_players_room on room_players(room_id);
create index if not exists idx_holdings_player_market on holdings(player_id, market);
create index if not exists idx_holdings_coin on holdings(coin);
create index if not exists idx_trades_player_created on trades(player_id, created_at desc);
create index if not exists idx_trades_room_created on trades(room_id, created_at desc);

-- Explicitly disable RLS for MVP service-role-only access
alter table rooms disable row level security;
alter table room_players disable row level security;
alter table holdings disable row level security;
alter table trades disable row level security;
