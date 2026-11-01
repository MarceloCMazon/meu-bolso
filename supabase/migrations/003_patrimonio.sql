-- Nosso Bolso, etapas 2 e 3: Patrimônio (bens e dívidas)
-- Este arquivo SÓ ADICIONA duas tabelas novas. Não altera nada do que já existe,
-- então pode ser rodado com a família usando o site.
-- Cole em Supabase > SQL Editor > New query > Run (antes de publicar o site novo).

-- Bens (casa, carro, dinheiro guardado...) e dívidas (financiamento, cartão...)
create table if not exists public.assets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('bem', 'divida')),
  category   text not null default 'outros_bem',
  name       text not null,
  value      numeric(14,2) not null check (value >= 0),
  since      date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists assets_user_idx on public.assets (user_id);

-- Histórico de valores (para o gráfico de crescimento do patrimônio)
create table if not exists public.asset_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_id    uuid not null references public.assets(id) on delete cascade,
  value       numeric(14,2) not null,
  recorded_at date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists asset_history_user_idx on public.asset_history (user_id, recorded_at);

alter table public.assets        enable row level security;
alter table public.asset_history enable row level security;

drop policy if exists "assets: só o dono" on public.assets;
create policy "assets: só o dono" on public.assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "asset_history: só o dono" on public.asset_history;
create policy "asset_history: só o dono" on public.asset_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
