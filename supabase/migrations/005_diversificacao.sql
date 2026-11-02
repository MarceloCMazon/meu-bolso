-- Nosso Bolso: meta de diversificação da carteira
-- Guarda, para cada pessoa, quantos % ela quer ter em cada tipo de investimento.
-- Este arquivo SÓ ADICIONA uma tabela nova. Não altera nada do que já existe.
-- Rode ANTES de publicar o site novo: Supabase > SQL Editor > New query > Run.

create table if not exists public.allocation_targets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('renda_fixa', 'renda_variavel', 'dolar', 'outros')),
  percent    numeric(5,2) not null check (percent >= 0 and percent <= 100),
  created_at timestamptz not null default now(),
  unique (user_id, kind)
);

alter table public.allocation_targets enable row level security;

drop policy if exists "allocation_targets: só o dono" on public.allocation_targets;
create policy "allocation_targets: só o dono" on public.allocation_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
