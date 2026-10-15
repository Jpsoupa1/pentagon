# Pentagon

PWA de organização pessoal de João Pedro Souza: aulas, provas e entregas, estudos, estágio na Codevasf e rotina pessoal num lugar só. Cada lado do pentágono é uma área da vida, com uma cor.

Funciona no notebook, iPad e iPhone (instalável na Tela de Início), com dados na nuvem sincronizados entre os aparelhos.

## Estado

| Etapa                                                            | Situação |
| ---------------------------------------------------------------- | -------- |
| 1. Estrutura do site (frontend, API, banco, login, PWA, CI)      | Pronta   |
| 2. Rotina de estudos (trilha DevOps, avisos, feed de calendário) | A fazer  |
| 3. Rotina pessoal (estágio, academia, aulas, provas, lembretes)  | A fazer  |

## Arquitetura

| Camada    | Escolha                                                                                 |
| --------- | --------------------------------------------------------------------------------------- |
| App       | Next.js 16 (App Router) + TypeScript, CSS Modules com tokens em `src/styles/tokens.css` |
| Backend   | Route Handlers em `src/app/api/` sobre a camada de serviço em `src/server/`             |
| Banco     | Postgres (Neon via Vercel Marketplace), Drizzle ORM, migrações em `drizzle/`            |
| Validação | Zod (`src/lib/validacao.ts`), o mesmo esquema no formulário e na API                    |
| Login     | Auth.js (GitHub), sessões no banco, só emails de `ALLOWED_EMAILS`                       |
| PWA       | Serwist (`src/app/sw.ts`), cache das páginas e fila offline em IndexedDB                |
| Testes    | Vitest (regras) e Playwright (fluxos, 4 larguras de tela, offline)                      |

```
src/
  app/
    (app)/            telas autenticadas: Hoje, Agenda, Aulas, Provas, Estudos, Estágio, Lembretes, Áreas, Ajustes
    (publico)/login   login com GitHub
    api/              API REST (cada rota passa por `rota()` em src/server/api.ts)
    sw.ts             service worker
  components/
    ui/               componentes base (Botão, Chip de área, Cartão, Contagem, Gráfico em pentágono...)
    shell/            barra lateral, trilho, abas, folha "Novo item", aviso da fila offline
    telas/            partes interativas das telas
  lib/                código compartilhado (datas no fuso, áreas, validação, cliente da API, fila offline)
  server/
    agenda/           regras puras: expansão de recorrência, cartão "Agora", média parcial
    servicos/         consultas e regras com banco (sempre filtradas pelo user_id da sessão)
    db/               esquema Drizzle e conexão
  proxy.ts            barra quem não tem cookie de sessão (a checagem real é por rota)
```

### Datas e fuso

Tudo é exibido em `America/Sao_Paulo`, 24 h. Instantes ficam em UTC no banco (`timestamptz`). Um compromisso recorrente guarda o instante da primeira ocorrência e os dias da semana; a hora local dela vale para todas as repetições. Exceções (`event_exceptions`) cancelam ou movem uma ocorrência específica. A expansão em ocorrências acontece só em `src/server/agenda/recorrencia.ts`.

### Navegação por tamanho

| Tamanho                                 | Navegação                                     |
| --------------------------------------- | --------------------------------------------- |
| iPhone (até 767 px)                     | Abas fixas: Hoje, Agenda, +, Áreas, Lembretes |
| iPad vertical (768 a 1023 px)           | Abas flutuantes centralizadas                 |
| iPad horizontal (1024 a 1366 px, toque) | Trilho de ícones de 76 px                     |
| Notebook (1024 px ou mais, mouse)       | Barra lateral de 220 px                       |

## API

Todas exigem sessão e respondem JSON. Erros de validação voltam com `400` e `campos`.

| Rota                                                                                                                     | Métodos                                              |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `/api/hoje`                                                                                                              | GET                                                  |
| `/api/agenda?de=AAAA-MM-DD&ate=AAAA-MM-DD`                                                                               | GET (ocorrências expandidas, prazos, horas por área) |
| `/api/eventos`, `/api/eventos/[id]`                                                                                      | GET, POST, PUT, DELETE                               |
| `/api/eventos/[id]/excecoes`, `/api/eventos/[id]/excecoes/[data]`                                                        | POST, DELETE                                         |
| `/api/disciplinas`, `/api/disciplinas/[id]`, `/api/disciplinas/[id]/faltas`, `/api/faltas/[id]`                          | GET, POST, PUT, DELETE                               |
| `/api/avaliacoes`, `/api/avaliacoes/[id]` (PATCH `{concluida}`), `/api/avaliacoes/[id]/checklist`, `/api/checklist/[id]` | GET, POST, PUT, PATCH, DELETE                        |
| `/api/lembretes`, `/api/lembretes/[id]` (PATCH `{concluido}`)                                                            | GET, POST, PUT, PATCH, DELETE                        |
| `/api/estudos`                                                                                                           | GET                                                  |
| `/api/ajustes`                                                                                                           | GET, PATCH                                           |
| `/api/exportar`                                                                                                          | GET (todos os dados em JSON)                         |
| `/api/cron/reconciliar`                                                                                                  | GET com `Authorization: Bearer $CRON_SECRET`         |

## Rodar localmente

Pré-requisitos: Node 22 ou mais novo e Docker.

```bash
npm install
docker compose up -d        # ou: docker run -d --name pentagon-db -e POSTGRES_USER=pentagon \
                            #   -e POSTGRES_PASSWORD=pentagon -e POSTGRES_DB=pentagon -p 5433:5432 postgres:17-alpine
cp .env.example .env.local  # preencha AUTH_SECRET, AUTH_GITHUB_ID/SECRET e ALLOWED_EMAILS
npm run db:migrate          # aplica as migrações e cria as 5 áreas
npm run dev
```

Para o login local, crie um OAuth App no GitHub com callback `http://localhost:3000/api/auth/callback/github`.

### Scripts

| Script                                | O que faz                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`     | Next.js                                                                   |
| `npm run lint`, `typecheck`, `format` | Qualidade                                                                 |
| `npm test`                            | Vitest (recorrência, exceções, contagem, cartão Agora, validação, acesso) |
| `npm run test:e2e`                    | Playwright contra `next start` (rode `npm run build` antes)               |
| `npm run db:generate`                 | Gera migração a partir de `src/server/db/schema.ts`                       |
| `npm run db:migrate`                  | Aplica migrações e o seed das áreas                                       |
| `npm run icons`                       | Regera os ícones do PWA a partir do logo                                  |

Os testes e2e criam um usuário e uma sessão direto no banco local (`e2e/sessao.ts`), sem passar pelo GitHub. O script se recusa a rodar contra um banco da Neon.

## Deploy (Vercel)

1. Projeto na Vercel ligado ao repositório do GitHub (deploy pela integração Git; produção = `main`, cada PR ganha preview).
2. Neon instalado pela Vercel Marketplace, com **branch do banco por preview**. A integração injeta `DATABASE_URL`.
3. Variáveis de ambiente (ver `.env.example`): `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `ALLOWED_EMAILS`, `CRON_SECRET`. As de push e QStash entram na etapa 2.
4. O build da Vercel usa `npm run vercel-build`: aplica as migrações (só quando `VERCEL_ENV` é `production` ou `preview`, cada um no seu banco) e depois roda `next build`.
5. Cron diário em `vercel.json` (06:00 UTC = 03:00 em São Paulo).

O OAuth App do GitHub aceita um único callback: `https://<domínio de produção>/api/auth/callback/github`. Para entrar nos previews, defina no ambiente Preview `AUTH_REDIRECT_PROXY_URL=https://<domínio de produção>/api/auth` (o Auth.js faz o login pela produção e devolve ao preview; o `AUTH_SECRET` precisa ser o mesmo nos dois ambientes).

## Instalar no iPhone

1. Abra o endereço de produção no Safari e entre com o GitHub.
2. Toque em Compartilhar e depois em **Adicionar à Tela de Início**.
3. Abra pelo ícone. Depois da primeira abertura, Hoje e Agenda abrem sem internet; o que você mudar offline fica numa fila e sincroniza quando a conexão voltar.
