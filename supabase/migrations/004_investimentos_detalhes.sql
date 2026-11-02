-- Nosso Bolso: detalhes dos investimentos
--   maturity_date : vencimento (renda fixa)
--   quantity      : quantidade de cotas ou ações compradas (renda variável)
--   unit_price    : preço pago por cota (renda variável)
-- Este arquivo SÓ ADICIONA colunas opcionais. Os investimentos que já existem
-- continuam exatamente como estão (as colunas novas ficam vazias neles).
-- Rode ANTES de publicar o site novo: Supabase > SQL Editor > New query > Run.

alter table public.investments add column if not exists maturity_date date;
alter table public.investments add column if not exists quantity      numeric(18,6);
alter table public.investments add column if not exists unit_price    numeric(14,4);
