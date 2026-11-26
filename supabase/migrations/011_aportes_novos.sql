-- Nosso Bolso: investimento NOVO x investimento que você JÁ TINHA
--
-- Regra:
--   JÁ TINHA  -> entra no patrimônio, mas NÃO mexe no saldo, no histórico nem na meta do mês.
--   NOVO      -> entra no patrimônio, diminui o saldo, aparece no histórico e conta na meta do mês.
--
-- Este arquivo SÓ ADICIONA (colunas opcionais, índices, gatilhos e uma função).
-- Nada do que já existe é alterado ou apagado: tudo o que você já cadastrou continua
-- valendo como "já tinha" (is_new = false), então saldo e metas ficam como estão.
-- Rode ANTES de publicar o site novo: Supabase > SQL Editor > New query > cole tudo > Run.

-- 1) Marcas novas (todo registro antigo fica "false" = já tinha) ---------------------------------
alter table public.investments    add column if not exists is_new boolean not null default false;
alter table public.stock_purchases add column if not exists is_new boolean not null default false;

-- Liga o lançamento de dinheiro que saiu ao investimento / à compra que o gerou.
alter table public.transactions add column if not exists investment_id uuid
  references public.investments(id) on delete cascade;
alter table public.transactions add column if not exists purchase_id uuid
  references public.stock_purchases(id) on delete cascade;

-- Dólares comprados neste aporte (para poder desfazer certinho).
alter table public.transactions add column if not exists usd numeric(14,2);

create unique index if not exists transactions_purchase_uidx
  on public.transactions (purchase_id) where purchase_id is not null;
create index if not exists transactions_investment_idx
  on public.transactions (investment_id) where investment_id is not null;

-- 2) Compra NOVA de ação: cria sozinha o lançamento (tudo ou nada, na mesma operação) -----------
create or replace function public.stock_purchase_to_tx() returns trigger
language plpgsql security invoker set search_path = public as $$
declare v_name text;
begin
  if new.is_new then
    select coalesce(nullif(ticker, ''), name) into v_name from public.investments where id = new.investment_id;
    insert into public.transactions (user_id, type, amount, category, description, date, investment_id, purchase_id)
    values (new.user_id, 'saida',
            greatest(round(new.quantity * new.unit_price + coalesce(new.fees, 0), 2), 0.01),
            'investimento', 'Compra de ' || coalesce(v_name, 'ação'), new.date, new.investment_id, new.id)
    on conflict (purchase_id) where purchase_id is not null do nothing;
  end if;
  return new;
end $$;

drop trigger if exists stock_purchase_tx_ins on public.stock_purchases;
create trigger stock_purchase_tx_ins after insert on public.stock_purchases
  for each row execute function public.stock_purchase_to_tx();

-- Corrigir uma compra nova também corrige o lançamento dela.
create or replace function public.stock_purchase_sync_tx() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.is_new then
    update public.transactions
       set amount = greatest(round(new.quantity * new.unit_price + coalesce(new.fees, 0), 2), 0.01),
           date   = new.date
     where purchase_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists stock_purchase_tx_upd on public.stock_purchases;
create trigger stock_purchase_tx_upd after update of quantity, unit_price, fees, date on public.stock_purchases
  for each row execute function public.stock_purchase_sync_tx();

-- 3) Investimento NOVO (renda fixa, dólar, outros): cria sozinho o lançamento -------------------
create or replace function public.investment_to_tx() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.is_new and new.kind <> 'renda_variavel' and new.invested_brl > 0 then
    insert into public.transactions (user_id, type, amount, category, description, date, investment_id, usd)
    values (new.user_id, 'saida', new.invested_brl, 'investimento', 'Aporte em ' || new.name, new.date, new.id,
            case when new.kind = 'dolar' then new.usd_amount end);
  end if;
  return new;
end $$;

drop trigger if exists investment_tx_ins on public.investments;
create trigger investment_tx_ins after insert on public.investments
  for each row execute function public.investment_to_tx();

-- 4) Novo aporte em investimento que já existe (renda fixa, dólar, outros) ----------------------
-- p_id é gerado pelo app: se o clique se repetir (ou a internet falhar e tentar de novo),
-- o mesmo aporte NÃO é contado duas vezes. Tudo acontece na mesma operação (tudo ou nada).
create or replace function public.invest_contribution(
  p_id uuid, p_investment uuid, p_amount numeric, p_date date, p_today date, p_usd numeric default null
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_inv public.investments%rowtype;
  v_ins uuid;
  v_value numeric;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Digite um valor maior que zero.'; end if;

  select * into v_inv from public.investments where id = p_investment;  -- só enxerga os seus (RLS)
  if not found then raise exception 'Investimento não encontrado.'; end if;
  if v_inv.kind = 'renda_variavel' then raise exception 'Para ações, use "Adicionar compra".'; end if;

  insert into public.transactions (id, user_id, type, amount, category, description, date, investment_id, usd)
  values (p_id, v_inv.user_id, 'saida', p_amount, 'investimento', 'Aporte em ' || v_inv.name, p_date, p_investment,
          case when p_usd > 0 then p_usd end)
  on conflict (id) do nothing
  returning id into v_ins;

  if v_ins is null then return; end if;  -- já registrado antes: não conta de novo

  update public.investments
     set invested_brl      = invested_brl + p_amount,
         current_value_brl = current_value_brl + p_amount,
         usd_amount        = case when p_usd > 0 then coalesce(usd_amount, 0) + p_usd else usd_amount end
   where id = p_investment
   returning current_value_brl into v_value;

  delete from public.investment_history where investment_id = p_investment and recorded_at = p_today;
  insert into public.investment_history (user_id, investment_id, value_brl, recorded_at)
  values (v_inv.user_id, p_investment, v_value, p_today);
end $$;

revoke all on function public.invest_contribution(uuid, uuid, numeric, date, date, numeric) from public;
grant execute on function public.invest_contribution(uuid, uuid, numeric, date, date, numeric) to authenticated;

-- 5) Desfazer um aporte (renda fixa, dólar, outros) -------------------------------------------
-- Tira o valor do investimento, devolve o dinheiro ao saldo e diminui a meta do mês.
-- Para ações, exclua a compra (o lançamento some junto, por conta própria).
create or replace function public.undo_contribution(p_tx uuid, p_today date) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_tx    public.transactions%rowtype;
  v_value numeric;
begin
  select * into v_tx from public.transactions
   where id = p_tx and category = 'investimento' and purchase_id is null and investment_id is not null;
  if not found then raise exception 'Aporte não encontrado.'; end if;

  update public.investments
     set invested_brl      = greatest(invested_brl - v_tx.amount, 0),
         current_value_brl = greatest(current_value_brl - v_tx.amount, 0),
         usd_amount        = case when v_tx.usd > 0 then greatest(coalesce(usd_amount, 0) - v_tx.usd, 0) else usd_amount end
   where id = v_tx.investment_id
   returning current_value_brl into v_value;

  if v_value is not null then
    delete from public.investment_history where investment_id = v_tx.investment_id and recorded_at = p_today;
    insert into public.investment_history (user_id, investment_id, value_brl, recorded_at)
    values (v_tx.user_id, v_tx.investment_id, v_value, p_today);
  end if;

  delete from public.transactions where id = p_tx;
end $$;

revoke all on function public.undo_contribution(uuid, date) from public;
grant execute on function public.undo_contribution(uuid, date) to authenticated;
