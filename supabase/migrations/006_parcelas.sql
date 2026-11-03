-- Nosso Bolso: compras parceladas
--   installment_group  : identifica as parcelas de uma mesma compra
--   installment_number : número desta parcela (1, 2, 3...)
--   installment_total  : quantas parcelas a compra tem
-- Este arquivo SÓ ADICIONA colunas opcionais. Os lançamentos que já existem
-- continuam exatamente como estão (as colunas novas ficam vazias neles).
-- Rode ANTES de publicar o site novo: Supabase > SQL Editor > New query > Run.

alter table public.transactions add column if not exists installment_group  uuid;
alter table public.transactions add column if not exists installment_number integer;
alter table public.transactions add column if not exists installment_total  integer;

-- Limites de segurança: de 2 a 60 parcelas.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_installment_total_check'
  ) then
    alter table public.transactions
      add constraint transactions_installment_total_check
      check (installment_total is null or (installment_total between 2 and 60));
  end if;
end $$;

create index if not exists transactions_installment_group_idx
  on public.transactions (user_id, installment_group);
