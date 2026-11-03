-- Nosso Bolso: cartão de crédito e faturas
-- SÓ ADICIONA: uma tabela nova (cards) e duas colunas opcionais em transactions.
-- O que já existe não muda. Rode ANTES de publicar o site novo:
-- Supabase > SQL Editor > New query > cole tudo > Run.

create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  closing_day integer not null check (closing_day between 1 and 31),
  due_day     integer not null check (due_day between 1 and 31),
  created_at  timestamptz not null default now()
);
create index if not exists cards_user_idx on public.cards (user_id);

alter table public.cards enable row level security;
drop policy if exists "cards: só o dono" on public.cards;
create policy "cards: só o dono" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- card_id: em qual cartão foi a compra. purchase_date: o dia real da compra
-- (a coluna "date" passa a ser o vencimento da fatura, para os totais do mês baterem com o banco).
alter table public.transactions add column if not exists card_id uuid references public.cards(id) on delete set null;
alter table public.transactions add column if not exists purchase_date date;
create index if not exists transactions_card_idx on public.transactions (user_id, card_id);
