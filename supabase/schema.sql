-- Nosso Bolso: tabelas do banco de dados
-- Cole este arquivo inteiro em Supabase > SQL Editor > New query > Run.
-- Cada pessoa só enxerga os próprios dados (Row Level Security).

-- Lançamentos de entradas e saídas
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type        text not null check (type in ('entrada', 'saida')),
  amount      numeric(14,2) not null check (amount > 0),
  category    text not null,
  description text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

-- Investimentos
create table if not exists public.investments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind              text not null check (kind in ('renda_fixa', 'renda_variavel', 'dolar', 'outros')),
  name              text not null,
  invested_brl      numeric(14,2) not null check (invested_brl >= 0),
  current_value_brl numeric(14,2) not null check (current_value_brl >= 0),
  usd_amount        numeric(14,2),
  date              date not null default current_date,
  created_at        timestamptz not null default now()
);
create index if not exists investments_user_idx on public.investments (user_id);

-- Histórico de valores (para o gráfico de evolução)
create table if not exists public.investment_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  investment_id uuid not null references public.investments(id) on delete cascade,
  value_brl     numeric(14,2) not null,
  recorded_at   date not null default current_date,
  created_at    timestamptz not null default now()
);
create index if not exists history_user_idx on public.investment_history (user_id, recorded_at);

-- Segurança: cada usuário só vê e altera o que é dele
alter table public.transactions       enable row level security;
alter table public.investments        enable row level security;
alter table public.investment_history enable row level security;

drop policy if exists "transactions: só o dono" on public.transactions;
create policy "transactions: só o dono" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "investments: só o dono" on public.investments;
create policy "investments: só o dono" on public.investments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "history: só o dono" on public.investment_history;
create policy "history: só o dono" on public.investment_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
