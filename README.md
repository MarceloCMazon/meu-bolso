# Nosso Bolso

Site de controle financeiro para a família: gastos, entradas e investimentos (renda fixa, renda variável, dólar e outros). Cada pessoa tem a própria conta e só vê os próprios dados. Funciona no celular e no computador, tem letras ajustáveis e modo escuro.

Feito com React + Vite, banco de dados e login no Supabase, publicação no Vercel.

## Como colocar no ar (cerca de 20 minutos)

### 1. Criar o banco de dados (Supabase, grátis)

1. Entre em https://supabase.com e crie uma conta.
2. Clique em **New project**, escolha um nome (ex.: `nosso-bolso`), crie uma senha do banco (guarde-a) e escolha a região **South America (São Paulo)**.
3. Quando o projeto terminar de ser criado, abra **SQL Editor > New query**.
4. Abra o arquivo `supabase/schema.sql` deste projeto, copie **tudo**, cole no editor e clique em **Run**. Deve aparecer "Success".
5. Vá em **Project Settings > API** e copie dois valores:
   - **Project URL**
   - **anon public key** (a chave pública)

### 2. Ajustar o login (Supabase)

Em **Authentication > Providers > Email**:

- Para a família entrar sem precisar confirmar e-mail, desligue **Confirm email**. (Se deixar ligado, cada pessoa recebe um e-mail e precisa tocar no link antes do primeiro acesso. Também funciona.)

Depois que o site estiver no ar, em **Authentication > URL Configuration**:

- Em **Site URL**, coloque o endereço do seu site no Vercel (ex.: `https://nosso-bolso.vercel.app`).
- Em **Redirect URLs**, adicione o mesmo endereço. Isso faz o link de "Esqueci minha senha" voltar para o seu site.

### 3. Publicar no Vercel (grátis)

1. Crie uma conta em https://vercel.com e outra em https://github.com, se ainda não tiver.
2. No GitHub, crie um repositório novo (pode ser privado) e envie os arquivos deste projeto. Pelo site do GitHub dá para arrastar os arquivos em **Add file > Upload files** (não envie a pasta `node_modules` nem o arquivo `.env`).
3. No Vercel, clique em **Add New > Project**, escolha o repositório e **Import**. O Vercel reconhece sozinho que é um projeto Vite.
4. Antes de clicar em Deploy, abra **Environment Variables** e adicione:

   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | o Project URL do passo 1 |
   | `VITE_SUPABASE_ANON_KEY` | a anon public key do passo 1 |

5. Clique em **Deploy**. Em um minuto o site estará no ar.

### 4. Cada pessoa da família

Abra o site, toque em **Criar conta** e use o próprio e-mail e uma senha. Os dados de cada pessoa ficam separados: ninguém vê os números do outro (isso é garantido pelo banco, não só pela tela).

No celular, abra o menu do navegador e escolha **Adicionar à tela inicial** para usar como aplicativo.

## Rodar no seu computador (opcional)

```bash
npm install
cp .env.example .env     # preencha com seus dados do Supabase
npm run dev
```

## O que o site tem

- **Início**: quanto sobrou no mês, régua de quanto do que entrou já foi gasto, gráfico dos últimos 6 meses, resumo dos investimentos.
- **Gastos**: lançamentos de entradas e saídas por categoria, gráfico de para onde foi o dinheiro, filtro por mês.
- **Investimentos**: renda fixa, renda variável, dólar e outros, com quanto foi investido, quanto vale hoje, rendimento e evolução em 6 meses. O dólar é atualizado sozinho pela cotação do dia (AwesomeAPI).
- **Ajustes**: tamanho da letra (3 níveis), tema claro/escuro, baixar planilha dos lançamentos, sair.

## Bom saber

- **Projeto gratuito do Supabase pausa depois de 1 semana sem uso.** Se a família ficar uma semana sem abrir o site, o projeto pausa. É só entrar em supabase.com e clicar em **Restore project** (os dados não se perdem). Quem usa o site com frequência não é afetado.
- **A chave "anon" é pública de propósito.** Quem protege os dados é a regra de segurança do banco (Row Level Security) criada pelo `schema.sql`. Nunca coloque a chave `service_role` no site.
- **Valores de renda fixa e ações são atualizados por você** (editando o investimento e informando quanto vale hoje). Só o dólar é automático.
- **Backup**: em **Ajustes > Baixar planilha** você salva todos os lançamentos dos últimos 2 anos.
