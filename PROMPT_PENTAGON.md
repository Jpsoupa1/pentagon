# Pentagon: prompt de desenvolvimento

Você vai construir o **Pentagon**, um PWA de organização pessoal para **João Pedro Souza**, estudante de Ciência da Computação e estagiário na Codevasf. O app junta, num lugar só, aulas, provas e entregas, estudos, estágio, academia e lembretes. Precisa funcionar bem em **notebook, iPad e iPhone**, ter um **backend de verdade** (dados na nuvem, sincronizados entre os aparelhos, com notificações) e ser publicado na **Vercel**.

O design já está aprovado. Seu trabalho é implementar com fidelidade, em três etapas, **nesta ordem**:

1. **Estrutura do site** (frontend, backend, banco, login, PWA e deploy).
2. **Rotina de estudos** (a trilha DevOps de 49 semanas, com notificações).
3. **Rotina pessoal** (estágio, academia, aulas da faculdade, provas e lembretes).

Ao terminar cada etapa, **pare**, mostre o que foi feito, diga como testar e espere minha aprovação antes de começar a próxima. Não adiante trabalho de etapas futuras.

---

## Arquitetura

| Camada | Escolha | Por quê |
| --- | --- | --- |
| App | Next.js (App Router) com TypeScript | Frontend e backend no mesmo projeto, deploy nativo na Vercel |
| Backend | Route Handlers em `app/api/` e Server Actions | API tipada, rodando como Vercel Functions |
| Banco | Postgres na **Neon**, instalado pela Vercel Marketplace | A Vercel não oferece mais Postgres próprio; a integração injeta as variáveis de ambiente |
| ORM | Drizzle ORM com migrações versionadas no repositório | Esquema em TypeScript, SQL previsível |
| Validação | Zod em toda entrada da API e dos formulários | Um esquema só para cliente e servidor |
| Login | Auth.js com login pelo GitHub, restrito aos emails da variável `ALLOWED_EMAILS` | App pessoal: ninguém além do dono entra |
| PWA | Serwist (service worker para Next.js) | Instalável no iPhone, abre offline |
| Notificações | Web Push com chaves VAPID | No iPhone funciona com o app instalado na Tela de Início (iOS 16.4 ou mais recente) |
| Agendamento | Upstash QStash para disparar cada lembrete no horário exato | Ver "Limite do plano Hobby" abaixo |
| Testes | Vitest (regras e API) e Playwright (fluxos principais) | |
| CI | GitHub Actions: lint, checagem de tipos, testes e verificação das migrações em todo PR | Deploy fica com a integração Git da Vercel |

### Limite do plano Hobby da Vercel

No plano gratuito, o Cron da Vercel roda **no máximo uma vez por dia** e com precisão de até 59 minutos. Isso não serve para avisar "sua aula começa em 10 minutos". Por isso:

* Cada lembrete, ao ser criado ou alterado, agenda uma mensagem no **QStash** para o horário exato, apontando para `POST /api/push/disparar`. Ao editar ou apagar, cancele a mensagem antiga.
* Um **Cron diário da Vercel** (por volta das 03:00) reconcilia tudo: agenda os avisos das próximas 48 horas que faltarem e limpa os que ficaram órfãos.
* O endpoint de disparo só aceita requisições com assinatura válida do QStash.
* Se um dia o projeto for para o plano Pro, o desenho continua valendo.

### Ambientes

* **Produção:** branch `main`, domínio da Vercel.
* **Preview:** cada PR ganha um deploy próprio. Use a integração da Neon com a Vercel para criar um **branch do banco por preview**, assim testes nunca tocam dados reais.
* **Migrações:** rodam no build de produção (`drizzle migrate` antes do `next build`), só quando `VERCEL_ENV` for `production`. Em preview, rodam no branch do banco do preview.
* **Variáveis:** documente todas num `.env.example` (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `ALLOWED_EMAILS`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`, `CRON_SECRET`). Nenhum segredo no código.

### Segurança

* Toda rota da API e toda página exigem sessão, exceto login, o disparo do QStash (assinatura) e o feed de calendário (token).
* Toda consulta filtra pelo `user_id` da sessão, mesmo sendo um app de uma pessoa só.
* O endpoint do Cron confere `CRON_SECRET`.
* O feed `.ics` usa um token longo e aleatório na URL, que o usuário pode revogar e gerar de novo em Ajustes.

---

## Regras gerais

* **Idioma e fuso:** interface em português do Brasil. Datas e horas no fuso `America/Sao_Paulo`, guardadas em UTC no banco. Hora em formato 24 h (`19:10`).
* **Offline:** o app abre sem internet mostrando a semana atual (cache no aparelho). Alterações feitas offline entram numa fila e sincronizam quando a conexão volta; mostre um aviso discreto enquanto houver itens na fila.
* **Qualidade:** botões e links reais, foco visível no teclado, contraste mínimo de 4.5:1, alvos de toque com pelo menos 44 px, nada de erro no console.
* **Testes obrigatórios:** expansão de recorrência, exceções (feriado, mudança de um dia só), semana da trilha, conflito de horários, contagem regressiva, geração do `.ics`, agendamento e cancelamento de avisos.
* **Git:** commits pequenos com mensagens claras em português, um PR por bloco de trabalho. README atualizado ao fim de cada etapa.
* **Escrita na interface:** frases curtas e diretas. Botões dizem o que fazem ("Salvar na agenda", "Concluir").

---

## Design aprovado

Referência visual: canvas "Pentagon" no Claude (identidade, 3 telas de notebook, 2 de iPad, 3 de iPhone). Se você não conseguir abrir, tudo o que precisa está aqui.

### Conceito

Cada lado do pentágono é uma área da vida, com uma cor. A interface é neutra (cinzas e preto) e as cores aparecem só para identificar áreas. O logo é um pentágono com cada lado de uma cor.

### Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#F3F4F6` | Fundo da página |
| `--surface` | `#FFFFFF` | Cartões |
| `--sidebar` | `#FAFAFB` | Barra lateral e trilho |
| `--line` | `#E6E8EC` | Bordas de cartão |
| `--line-soft` | `#F0F1F4` | Divisórias dentro de cartões |
| `--ink` | `#15171C` | Texto principal, botão primário, cartão "Agora" |
| `--text-2` | `#4A4F5C` | Texto secundário |
| `--muted` | `#6B7080` | Legendas e metadados |
| `--faint` | `#9AA0AD` | Rótulos de hora na grade |
| `--active` | `#ECEDF1` | Item ativo do menu |

| Área | Cor | Fundo claro | Texto sobre o fundo claro |
| --- | --- | --- | --- |
| Aulas | `#4361EE` | `#EBEFFE` | `#2F4AD0` |
| Provas e entregas | `#F2643D` | `#FEEDE7` | `#B8400F` |
| Estudos | `#12A37A` | `#E3F5EF` | `#0B7A5B` |
| Estágio | `#8E4FD6` | `#F2EAFB` | `#7039B8` |
| Pessoal | `#E0A100` | `#FBF3DC` | `#8A6300` |

* **Fontes:** Geist (texto e títulos, pesos 400 a 700) e Geist Mono (horários, datas, contagens, rótulos em caixa alta), carregadas com `next/font`.
* **Estilos:** CSS Modules com os tokens como variáveis CSS em `tokens.css`. Sem biblioteca de componentes pronta.
* **Escala de texto:** 32 título de página, 20 a 22 título de cartão, 15 texto, 13 apoio, 11 a 12 rótulos.
* **Raios:** 22 px cartões grandes, 14 a 18 px cartões médios, 12 px botões e campos, 99 px chips.
* **Botão primário:** fundo `--ink`, texto branco, altura 44 px. **Secundário:** fundo branco com borda `#E1E3E8`.
* **Chip de área:** fundo claro da área, ponto de 7 px na cor da área, texto na cor de texto da área.
* **Contagem regressiva:** etiqueta em Geist Mono ("3 dias"). Preta quando faltam até 3 dias, no fundo claro de Provas até 7 dias, cinza depois disso.
* **Tema:** só claro por enquanto, mas use apenas variáveis para o tema escuro entrar depois sem retrabalho.

### Layout por tamanho

| Tamanho | Navegação | Observações |
| --- | --- | --- |
| Notebook (a partir de 1024 px) | Barra lateral de 220 px: logo, menu (Hoje, Agenda, Aulas, Provas e entregas, Estudos, Estágio, Lembretes, com contadores), horas da semana por área, cartão do usuário embaixo | Conteúdo com largura máxima e colunas que quebram |
| iPad horizontal (1024 a 1366 px, toque) | Trilho de ícones de 76 px à esquerda, botão "Novo" no pé do trilho | Lista e detalhe lado a lado |
| iPad vertical (768 a 1023 px) | Barra de abas flutuante centralizada no rodapé | Uma coluna com grades de duas colunas dentro |
| iPhone (até 767 px) | Barra de abas fixa: Hoje, Agenda, botão central "+", Áreas, Lembretes | "Novo item" abre como folha que sobe do rodapé. Respeite as áreas seguras do iPhone |

### Telas

* **Hoje:** saudação com a data; cartão escuro "Agora" com o compromisso em andamento (área, horário, título, barra de progresso, "termina em", botões Adiar e Concluir) ou o próximo; "Linha do dia" em lista com hora, ponto colorido e título; "Equilíbrio da semana" (gráfico em pentágono com as horas planejadas por área); "Próximos prazos" com contagem; "Lembretes" com caixas de seleção.
* **Agenda:** visão Semana (grade de 07:00 a 23:00, coluna por dia, blocos com o fundo claro da área, linha laranja na hora atual, faixa de dia inteiro para feriados e entregas) e visão Dia (no iPhone: faixa com os 7 dias e pontos coloridos, linha do tempo vertical). Filtro por área.
* **Aulas:** lista de disciplinas com iniciais e horário; detalhe com faltas (usadas e permitidas), média parcial, próxima avaliação, próximas aulas com tópico e grade da semana.
* **Provas e entregas:** grupos "Próximos 7 dias", "Mais adiante", "Concluídas"; cada linha com tipo, disciplina, peso, data e contagem; painel de detalhe com checklist de preparação, lembretes e anotações.
* **Estudos:** cartão verde "Sessão de hoje" com botão Começar; progresso da trilha por fase; sessões da semana com caixas de seleção; certificações com contagem.
* **Estágio, Lembretes, Áreas e Ajustes:** mesma linguagem (listas em cartões brancos, chips de área, Geist Mono para horas).
* **Novo item:** título, área (5 chips), disciplina quando for Aula ou Prova, data, horário, repetir, lembrar antes, notas, botão "Salvar na agenda".

---

## Etapa 1: estrutura do site

Objetivo: o app inteiro navegável, com login, banco, PWA e deploy funcionando, ainda sem a rotina real.

1. Criar o projeto Next.js com TypeScript, ESLint, Prettier, Vitest e Playwright.
2. `tokens.css`, fontes e componentes base: Botão, Chip de área, Cartão, Linha de agenda, Caixa de seleção, Contagem regressiva, Barra de progresso, Controle segmentado, Folha inferior (bottom sheet), Gráfico em pentágono (SVG, 5 eixos), Logo.
3. Layout com as três navegações (barra lateral, trilho e abas) trocando pelo tamanho da tela, e páginas para Hoje, Agenda, Aulas, Provas e entregas, Estudos, Estágio, Lembretes, Áreas e Ajustes.
4. Banco com Drizzle e primeira migração:
   * `users`, `accounts`, `sessions` (Auth.js).
   * `areas`: as 5 fixas, criadas por seed.
   * `events`: título, área, local, notas, data e hora de início, duração, e regra de recorrência semanal (dias da semana, data de início e data de fim).
   * `event_exceptions`: ocorrência cancelada ou movida num dia específico (feriado, academia trocada de horário num dia só).
   * `subjects`: nome, sigla, professor, sala, limite de faltas.
   * `absences`: falta por disciplina e data.
   * `assessments`: tipo (prova, entrega, trabalho, apresentação), disciplina, data e hora, peso, nota, anotações.
   * `checklist_items`: itens de preparação de uma avaliação.
   * `study_tracks`, `study_weeks`, `study_sessions`: trilha, semanas e sessões com status (pendente, feita).
   * `reminders`: texto, data e hora, repetição, concluído.
   * `notifications`: aviso agendado (alvo, horário, id da mensagem no QStash, status).
   * `push_subscriptions`: inscrições Web Push por aparelho.
   * `settings`: horários padrão, período letivo, minutos de antecedência dos avisos.
   * `calendar_tokens`: token do feed `.ics`.
5. Camada de serviço em `src/server/` (regras e consultas) separada das rotas, e API REST em `app/api/` com validação Zod para cada recurso. A expansão de recorrências em ocorrências de um intervalo de datas fica no servidor, num só lugar.
6. Login com GitHub restrito a `ALLOWED_EMAILS`.
7. PWA com Serwist: manifest "Pentagon", ícones do logo, meta tags do iOS, cache da semana atual e fila de alterações offline.
8. Deploy: projeto na Vercel ligado ao GitHub, Neon pela Marketplace com branch por preview, migrações no build, CI no GitHub Actions.
9. Estados vazios em todas as telas ("Nenhuma aula cadastrada. Adicione a primeira.").
10. Exportar todos os dados em JSON (Ajustes).

**Pronto quando:** produção no ar na Vercel com login funcionando; um PR gera preview com banco separado; navega em 390 px, 820 px, 1180 px e 1440 px sem rolagem lateral; instala no iPhone e abre offline; CI verde.

---

## Etapa 2: rotina de estudos (trilha DevOps)

Fonte de dados: o arquivo **`trilha_devops.js`** na raiz do repositório. Ele traz as fases, as 49 semanas com o conteúdo de cada dia, os marcos e um gerador de `.ics` já testado. Converta para um **seed idempotente** (`npm run seed:trilha`) que grava a trilha no banco sem duplicar ao rodar de novo. Conteúdo e datas devem ficar exatamente iguais.

Regras da trilha:

* Semana zero começa em 12/10/2026 e a semana 1 em 19/10/2026; a trilha termina em 26/09/2027.
* Quatro fases: Kubernetes e fundamentos (fecha com a CKA), AWS e CI/CD (AWS SAA), Infraestrutura como Código (Terraform Associate), Observabilidade, GitOps e segurança (projeto principal).
* Tipo de sessão por dia: segunda Aula, terça Lab, quarta Aprofundar, quinta Base, sábado Projeto, domingo Revisão, sexta Reposição (desligada por padrão).
* **Horários padrão das sessões** (as noites estão ocupadas pela faculdade): segunda a quinta das 14:00 às 15:30, sábado das 09:00 às 12:00, domingo das 19:00 às 20:00. Editáveis em Ajustes; mudar o horário não perde o progresso.
* Marcos: Black Friday para comprar o voucher da CKA (27/11/2026), prova CKA (26/02/2027), início das candidaturas (01/03/2027), Cloud Practitioner (19/03/2027), AWS SAA (28/05/2027), Terraform Associate (23/07/2027), projeto principal publicado (24/09/2027).

O que implementar:

1. Tela **Estudos** completa: sessão de hoje, progresso por fase, sessões da semana, certificações com contagem.
2. Sessões aparecem em **Hoje** e na **Agenda** com a cor de Estudos; marcos como itens de dia inteiro e em "Próximos prazos".
3. Marcar sessão como feita, sincronizado entre os aparelhos; sessões passadas não feitas aparecem como pendentes em Hoje.
4. **Notificações:** botão "Ativar avisos neste aparelho" em Ajustes (o pedido de permissão só pode sair de um toque do usuário), inscrição Web Push salva no banco, aviso N minutos antes de cada sessão via QStash, Cron diário de reconciliação. No iPhone, explique na tela que os avisos só funcionam com o app instalado na Tela de Início.
5. **Feed de calendário** em `/api/calendario/[token].ics`, gerado na hora a partir do banco, com alerta em cada evento. Em Ajustes, mostre o endereço `webcal://` com botão de copiar e o passo a passo para assinar no iPhone (lembrando de desligar "Remover Alertas") e adicionar o widget "Próximo evento" na tela bloqueada.

**Pronto quando:** a semana atual mostra as sessões certas à tarde; marcar no iPhone aparece no notebook; o aviso chega no iPhone instalado no horário certo; o feed assinado atualiza depois de mudar um horário.

---

## Etapa 3: rotina pessoal

Cadastre por seed como compromissos recorrentes (editáveis, nunca fixos no código):

| Compromisso | Área | Dias | Horário |
| --- | --- | --- | --- |
| Estágio na Codevasf | Estágio | Segunda a sexta | 07:30 às 12:00 |
| Academia | Pessoal | Segunda a sexta | 1 h 30, padrão 16:00 às 17:30 |
| Algoritmos e Estrutura de Dados | Aulas | Segunda | 19:10 às 22:00 |
| Análise e Projeto de Sistemas | Aulas | Terça | 19:10 às 22:00 |
| Cálculo | Aulas | Quarta | 19:10 às 22:00 |
| Desenvolvimento Web | Aulas | Quinta | 19:10 às 22:00 |
| Integração DevOps | Aulas | Sexta | 19:10 às 22:00 |

Sobre a academia: o usuário só definiu a duração. Deixe 16:00 às 17:30 como sugestão (sobra tempo para o deslocamento antes da aula das 19:10), permita mudar o horário de um dia só (exceção) ou de todos, e avise se cair em cima de outro compromisso.

O que implementar:

1. As 5 disciplinas criadas em **Aulas**, com sala e professor em branco para o usuário preencher, registro de faltas e grade da semana.
2. **Período letivo** em Ajustes (início e fim do semestre) limitando a recorrência das aulas, e **feriados** que cancelam as ocorrências daquele dia.
3. **Provas e entregas** completas: criar, editar, checklist de preparação, peso, nota e média parcial por disciplina, com avisos na véspera e horas antes.
4. **Lembretes**: criar, repetir, concluir, com aviso por push; os de hoje aparecem em Hoje.
5. **Detecção de conflito** no servidor ao salvar qualquer compromisso, mostrando o que está em choque.
6. **Equilíbrio da semana** calculado com as horas reais planejadas por área.
7. Tela **Hoje** usando tudo isso: o cartão "Agora" mostra o estágio de manhã, a sessão de estudo ou a academia à tarde e a aula à noite.
8. Feed de calendário e avisos passam a cobrir todas as áreas, com escolha em Ajustes de quais áreas entram.
9. Os nomes de exemplo do design (outra pessoa, outro estágio, outras disciplinas) não entram no app: o usuário é João Pedro Souza, estagiário na Codevasf.

**Pronto quando:** uma semana típica aparece completa na Agenda sem conflitos; o "Agora" acerta em qualquer horário do dia; um feriado cadastrado tira a aula daquele dia; os avisos de aula e de prova chegam no iPhone.

---

## Ao terminar cada etapa, entregue

* Um resumo curto do que foi feito.
* Como testar, passo a passo, incluindo no iPhone.
* O que ficou pendente ou foi decidido por você, com o motivo.
* Link do deploy de produção e de um preview.
