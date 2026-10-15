# Pentagon

PWA de organização pessoal de João Pedro Souza: aulas, provas e entregas, estudos, estágio na Codevasf e rotina pessoal num lugar só. Cada lado do pentágono é uma área da vida, com uma cor.

Funciona no notebook, iPad e iPhone (instalável na Tela de Início), com dados na nuvem sincronizados entre os aparelhos.

## Estado

| Etapa                                                            | Situação |
| ---------------------------------------------------------------- | -------- |
| 1. Estrutura do site (frontend, API, banco, login, PWA, CI)      | Pronta   |
| 2. Rotina de estudos (trilha DevOps, avisos, feed de calendário) | Pronta   |
| 3. Rotina pessoal (estágio, academia, aulas, provas, lembretes)  | Pronta   |
| 4. Assistente de voz (`/voz`, API do Claude, atalho do iPhone)   | Pronta   |

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

## Trilha DevOps (etapa 2)

- **Fonte:** `trilha_devops.js` (fases, 50 semanas da semana 0 à 49, conteúdo de cada dia, marcos). Lido por `src/server/estudos/trilha.ts`, sem cópia do conteúdo.
- **Seed idempotente:** `npm run seed:trilha [email]` grava trilha, semanas e uma sessão por dia (inclusive a Reposição de sexta). Rodar de novo atualiza conteúdo e datas e preserva o status de cada sessão. Também roda no build da Vercel, depois das migrações, para todos os usuários.
- **Horários:** vêm de Ajustes (padrão: segunda a quinta 14:00 às 15:30, sábado 09:00 às 12:00, domingo 19:00 às 20:00, sexta desligada). O horário não fica gravado na sessão, então mudar em Ajustes não perde o progresso.
- **Onde aparece:** Hoje (cartão Agora, Linha do dia, Sessões pendentes, Próximos prazos com os marcos), Agenda (cor de Estudos, marcos na faixa de dia inteiro), Estudos e Equilíbrio da semana.

## Avisos

```
Ajustes: "Ativar avisos neste aparelho" ──► POST /api/push/inscricoes (inscrição Web Push no banco)
                                               │
mudança de sessão, horário ou antecedência ───►│ reconciliarAvisos(): calcula os avisos das próximas 48 h,
cron diário 03:00 (GET /api/cron/reconciliar) ─┘ agenda no QStash os que faltam e cancela os que mudaram
                                                          │
                     QStash no horário exato ──► POST /api/push/disparar (assinatura do QStash) ──► Web Push
```

- Regras puras em `src/server/avisos/planejar.ts` (testadas); QStash em `agendador.ts`; envio em `push.ts`.
- O QStash só é usado em produção (ou com `APP_URL` definida); em dev e preview os avisos são calculados mas não entregues.
- No iPhone, os avisos só chegam com o app instalado na Tela de Início (iOS 16.4 ou mais recente). Ajustes tem "Enviar aviso de teste".

## Feed de calendário

- `GET /api/calendario/<token>.ics`, gerado na hora a partir do banco, com alerta em cada evento (antecedência de Ajustes; marcos às 09:00 do dia).
- Os eventos da trilha saem idênticos aos do gerador original (`src/server/calendario/ics.test.ts` compara evento por evento).
- Em Ajustes: endereço `webcal://` com botão de copiar, gerar novo (revoga o anterior), revogar e o passo a passo do iPhone.

## Rotina pessoal (etapa 3)

- **Seed** (`npm run seed:rotina [email]`, também no build e no primeiro login): estágio na Codevasf (seg a sex, 07:30 às 12:00), academia (seg a sex, 16:00 às 17:30, sugestão) e as 5 aulas às 19:10 com as disciplinas (sala, professor e limite de faltas em branco). Roda **uma vez por usuário** (`settings.rotina_semeada_em`): o que você editar ou apagar não volta.
- **Editar pela agenda:** tocar num compromisso (Agenda, Hoje, Estágio, Aulas) abre a folha com mudar horário **só neste dia** (exceção) ou **todos os dias**, cancelar só neste dia, voltar ao horário normal, editar e apagar.
- **Período letivo** (Ajustes): aulas recorrentes só acontecem entre o início e o fim do semestre.
- **Feriados** (Ajustes): cancelam as ocorrências das áreas marcadas naquele dia (padrão: aulas e estágio). Há atalho para os feriados nacionais do ano.
- **Conflitos:** ao salvar um compromisso ou mudar um dia, o servidor compara com a agenda (8 semanas à frente para o que repete) e responde `409` com os choques; a interface mostra e oferece "Salvar mesmo assim".
- **Provas e entregas:** criar, editar (nota, peso), apagar, checklist e média parcial por disciplina. Avisos na véspera (24 h antes) e no "avisar também" (padrão 2 h antes).
- **Lembretes:** repetem (todo dia, semana ou mês); concluir um que repete o leva para a próxima vez. Aviso na hora marcada.
- **Feed e avisos** cobrem todas as áreas escolhidas em Ajustes. Regras puras em `src/server/agenda/regras.ts` e `src/server/avisos/planejar.ts`.

## Assistente de voz (etapa 4)

Em `/voz` você fala (ou digita) o que quer e a IA executa dentro do app. Antes de você sair, a tela mostra **exatamente** o que mudou, com desfazer.

- **Transcrição:** gratuita e sem áudio no servidor. No Safari e no notebook usa o reconhecimento de fala do navegador (tela "Ouvindo" com transcrição ao vivo). No **app instalado na Tela de Início do iPhone** a WebKit não oferece essa API, então o microfone abre o campo de texto para o **ditado do teclado do iOS**. O atalho da tela bloqueada usa o "Ditar Texto" do próprio iOS. Só o texto chega ao Pentagon.
- **Como a IA age:** `POST /api/assistente` monta o contexto (data e hora em `America/Sao_Paulo`, hoje e amanhã, próximos prazos, disciplinas) e chama o Claude (`ANTHROPIC_MODEL`, padrão `claude-sonnet-5-5`) com **só as ferramentas do Pentagon** (`src/server/assistente/ferramentas.ts`). Cada ferramenta chama a mesma camada de serviço das telas (mesmas validações e detecção de conflito) e grava `assistant_actions` **na mesma transação** da mudança (`naTransacao` em `src/server/db/index.ts`).
- **Tela "O que foi feito":** montada só a partir de `assistant_actions` (estado antes e depois), nunca do texto da IA. Desfazer usa o "antes"; "Desfazer tudo" vai na ordem inversa e, se um item mudou depois, avisa em vez de sobrescrever.
- **Conflitos:** a mudança pedida é aplicada e o outro item **não é mexido**; o cartão laranja oferece levar o outro item para o horário liberado (ex.: "Mover sessão para 16:00") ou "Deixar assim". Para isso, uma sessão de estudo pode ter horário próprio naquele dia (`study_sessions.hora_inicio`).
- **Apagar** nunca acontece direto: vira proposta com "Confirmar".
- **Escopo fechado:** instruções de sistema fixas, só ferramentas do app, fim obrigatório pela ferramenta `responder` (texto solto é rejeitado), recusa com texto fixo do app, consultas montadas com os dados do app (a IA só escolhe o período), dados do usuário marcados como dados, e `fora_do_escopo` nunca deixa mudança (o servidor desfaz o que houver).
- **Custos e limites:** 60 pedidos por hora por usuário (contando os recusados), teto de 4.096 tokens por resposta e 6 idas e voltas por pedido, cache de prompt nas instruções e ferramentas. Ajustes mostra o consumo do mês em dólares e em % dos US$ 100 (preços em `src/lib/assistente.ts`). Se os créditos acabarem, a tela mostra "O assistente volta quando os créditos renovarem" e o resto do app segue normal.
- **Fallback de recusa:** as chamadas usam `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): se o modelo recusar por segurança, a API tenta outro modelo na mesma chamada.

### Atalho na tela bloqueada (iPhone, iOS 18 ou mais novo)

O app Atalhos abre URLs **no Safari**, não no app instalado (e Safari e app instalado têm logins separados). Por isso:

1. **Entre no Pentagon pelo Safari uma vez** (o login dura 90 dias).
2. No app **Atalhos**, toque em **+** e dê o nome **Pentagon voz**.
3. Adicione a ação **Ditar Texto** (idioma: Português (Brasil); "Parar de Ouvir": Após Pausa).
4. Adicione **Codificar URL** (entrada: Texto Ditado).
5. Adicione **Abrir URLs** com `https://pentagon-mauve.vercel.app/voz?texto=` seguido da variável **Texto Codificado**.
6. Na tela bloqueada, toque e segure → **Personalizar** → **Tela Bloqueada** → toque no **−** de um dos controles de baixo (lanterna ou câmera) → **+** → **Atalhos** → escolha **Pentagon voz**. (Também dá para pôr na Central de Controle ou no botão de Ação.)

Ao tocar no controle, o iPhone pede o desbloqueio, você fala, e o Safari abre `/voz` já com o pedido enviado e o resultado na tela. Sem texto, `/voz` abre no "Pronto para ouvir".

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
| `/api/estudos`, `/api/estudos/sessoes/[id]` (PATCH `{feita}`)                                                            | GET, PATCH                                           |
| `/api/ajustes`                                                                                                           | GET, PATCH                                           |
| `/api/exportar`                                                                                                          | GET (todos os dados em JSON)                         |
| `/api/push/inscricoes`, `/api/push/teste`                                                                                | POST, DELETE                                         |
| `/api/push/disparar`                                                                                                     | POST, só com assinatura do QStash                    |
| `/api/calendario/token`, `/api/calendario/[token].ics`                                                                   | POST, DELETE / GET público com token                 |
| `/api/feriados`, `/api/feriados/[id]`, `/api/feriados/nacionais` (POST `{ano}`)                                          | GET, POST, DELETE                                    |
| `/api/cron/reconciliar`                                                                                                  | GET com `Authorization: Bearer $CRON_SECRET`         |
| `/api/assistente` (POST `{texto}`), `/api/assistente/execucoes/[id]`, `.../execucoes/[id]/desfazer`                      | POST, GET                                            |
| `/api/assistente/acoes/[id]/desfazer`, `/confirmar`, `/conflito` (POST `{decisao: "mover" \| "manter"}`)                 | POST                                                 |

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

| Script                                       | O que faz                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`            | Next.js                                                                   |
| `npm run lint`, `typecheck`, `format`        | Qualidade                                                                 |
| `npm test`                                   | Vitest (recorrência, exceções, contagem, cartão Agora, validação, acesso) |
| `npm run seed:trilha`, `npm run seed:rotina` | Seeds idempotentes (trilha DevOps; rotina pessoal uma vez por usuário)    |
| `npm run test:integracao`                    | Vitest com banco de verdade e API do Claude simulada (assistente)         |
| `npm run test:e2e`                           | Playwright contra `next start` (rode `npm run build` antes)               |
| `npm run assistente:real`                    | Teste manual que chama a API do Claude **de verdade** (gasta créditos)    |
| `npm run db:generate`                        | Gera migração a partir de `src/server/db/schema.ts`                       |
| `npm run db:migrate`                         | Aplica migrações e o seed das áreas                                       |
| `npm run icons`                              | Regera os ícones do PWA a partir do logo                                  |

Os testes e2e criam um usuário e uma sessão direto no banco local (`e2e/sessao.ts`), sem passar pelo GitHub. O script se recusa a rodar contra um banco da Neon.

## Deploy (Vercel)

1. Projeto na Vercel ligado ao repositório do GitHub (deploy pela integração Git; produção = `main`, cada PR ganha preview).
2. Neon instalado pela Vercel Marketplace, com **branch do banco por preview**. A integração injeta `DATABASE_URL`.
3. Variáveis de ambiente (ver `.env.example`): `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `ALLOWED_EMAILS`, `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `ANTHROPIC_API_KEY` (chave de um workspace do Console só do Pentagon, com limite de gasto) e `ANTHROPIC_MODEL`. As do QStash vêm da integração Upstash da Vercel Marketplace.
4. O build da Vercel usa `npm run vercel-build`: aplica as migrações (só quando `VERCEL_ENV` é `production` ou `preview`, cada um no seu banco) e depois roda `next build`.
5. Cron diário em `vercel.json` (06:00 UTC = 03:00 em São Paulo).

O OAuth App do GitHub aceita um único callback: `https://<domínio de produção>/api/auth/callback/github`. Para entrar nos previews, defina no ambiente Preview `AUTH_REDIRECT_PROXY_URL=https://<domínio de produção>/api/auth` (o Auth.js faz o login pela produção e devolve ao preview; o `AUTH_SECRET` precisa ser o mesmo nos dois ambientes).

## Instalar no iPhone

1. Abra o endereço de produção no Safari e entre com o GitHub.
2. Toque em Compartilhar e depois em **Adicionar à Tela de Início**.
3. Abra pelo ícone. Depois da primeira abertura, Hoje e Agenda abrem sem internet; o que você mudar offline fica numa fila e sincroniza quando a conexão voltar.
