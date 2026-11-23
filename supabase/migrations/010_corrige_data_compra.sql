-- Nosso Bolso: corrige a "data da compra" das parcelas no cartão.
-- Antes, da 2ª parcela em diante a data da compra andava um mês por parcela.
-- Agora todas as parcelas de uma mesma compra mostram o mesmo dia de compra (o da 1ª parcela).
-- Só mexe em parcelas de cartão. Pode rodar mais de uma vez sem problema.
update public.transactions t
set purchase_date = g.first_purchase
from (
  select installment_group, min(purchase_date) as first_purchase
  from public.transactions
  where card_id is not null and installment_group is not null and purchase_date is not null
  group by installment_group
) g
where t.installment_group = g.installment_group
  and t.card_id is not null
  and t.purchase_date is distinct from g.first_purchase;
