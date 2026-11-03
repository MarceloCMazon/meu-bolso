-- Nosso Bolso: gastos fixos e fatura paga.
-- SÓ ADICIONA tabelas novas e duas colunas opcionais. O que já existe não muda.
-- Rode ANTES de publicar o site novo: Supabase > SQL Editor > New query > cole tudo > Run.

-- 1) Gastos fixos (aluguel, internet, assinaturas...)
create table if not exists public.recurring (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type            text not null check (type in ('entrada', 'saida')),
  amount          numeric(14,2) not null check (amount > 0),
  category        text not null,
  description     text not null check (char_length(description) between 1 and 80),
  day             integer not null check (day between 1 and 31),
  card_id         uuid references public.cards(id) on delete set null,
  start_month     text not null,
  generated_until text,
  created_at      timestamptz not null default now()
);
create index if not exists recurring_user_idx on public.recurring (user_id);
alter table public.recurring enable row level security;
drop policy if exists "recurring: só o dono" on public.recurring;
create policy "recurring: só o dono" on public.recurring
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.transactions add column if not exists recurring_id    uuid references public.recurring(id) on delete set null;
alter table public.transactions add column if not exists recurring_month text;
-- Impede lançar o mesmo gasto fixo duas vezes no mesmo mês (lançamentos comuns ficam de fora).
create unique index if not exists transactions_recurring_unique
  on public.transactions (recurring_id, recurring_month);

-- 2) Fatura paga
create table if not exists public.invoice_payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id    uuid not null references public.cards(id) on delete cascade,
  month      text not null,
  paid_at    date not null default current_date,
  unique (card_id, month)
);
alter table public.invoice_payments enable row level security;
drop policy if exists "invoice_payments: só o dono" on public.invoice_payments;
create policy "invoice_payments: só o dono" on public.invoice_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
