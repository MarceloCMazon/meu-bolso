-- Nosso Bolso, etapa 1: Metas
-- Este arquivo SÓ ADICIONA uma tabela nova. Não altera nada do que já existe,
-- então pode ser rodado com a família usando o site.
-- Cole em Supabase > SQL Editor > New query > Run (antes de publicar o site novo).

create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('gasto_limite', 'investir_mensal')),
  amount     numeric(14,2) not null check (amount > 0),
  start_date date,
  end_date   date,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals (user_id);

alter table public.goals enable row level security;

drop policy if exists "goals: só o dono" on public.goals;
create policy "goals: só o dono" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
