-- Nosso Bolso: várias compras da mesma ação, com histórico e preço médio.
-- SÓ ADICIONA: uma tabela nova (stock_purchases) e uma coluna opcional (ticker).
-- As ações que você já cadastrou ganham automaticamente a "1ª compra" no histórico,
-- com os mesmos valores de hoje. Nada muda nos números da carteira.
-- Rode ANTES de publicar o site novo: Supabase > SQL Editor > New query > cole tudo > Run.

alter table public.investments add column if not exists ticker text;

create table if not exists public.stock_purchases (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  investment_id uuid not null references public.investments(id) on delete cascade,
  date          date not null default current_date,
  quantity      numeric(18,6) not null check (quantity > 0),
  unit_price    numeric(14,4) not null check (unit_price >= 0),
  fees          numeric(14,2) not null default 0 check (fees >= 0),
  created_at    timestamptz not null default now()
);
create index if not exists stock_purchases_user_idx on public.stock_purchases (user_id, investment_id, date);

alter table public.stock_purchases enable row level security;
drop policy if exists "stock_purchases: só o dono" on public.stock_purchases;
create policy "stock_purchases: só o dono" on public.stock_purchases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Ações que já existem (com quantidade) viram a primeira compra. Roda uma vez só por ativo.
insert into public.stock_purchases (user_id, investment_id, date, quantity, unit_price, fees)
select i.user_id, i.id, i.date, i.quantity,
       coalesce(i.unit_price, i.invested_brl / nullif(i.quantity, 0)), 0
from public.investments i
where i.kind = 'renda_variavel'
  and i.quantity is not null and i.quantity > 0
  and not exists (select 1 from public.stock_purchases p where p.investment_id = i.id);
