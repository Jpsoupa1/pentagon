# Prompt de implementação: Plano AI Engineer no Pentagon

Cole tudo abaixo da linha numa sessão do Claude Code aberta na pasta do Pentagon.

---

Você vai mudar o foco de estudos do Pentagon. Hoje o app tem trilhas com datas (DevOps, Segurança e SecOps, Roadmap). Elas saem de cena, arquivadas, e entra um plano único de AI Engineer com três trilhas e a regra "um conteúdo de cada vez". Leia este documento inteiro antes de começar. Ele é a especificação: o que estiver aqui vale mais que o que você deduzir do código.

## 0. Antes de tudo

1. Este é um Next.js 16 com mudanças grandes. Leia o guia em `node_modules/next/dist/docs/` antes de escrever rota, página ou server action (o `AGENTS.md` explica).
2. Parta da `origin/main` (ela tem o PR #22). A pasta local pode estar noutra branch com trabalho que não é seu, e outra sessão pode estar usando a mesma pasta: trabalhe numa worktree própria e rode `npm ci` nela (o Turbopack falha com `node_modules` em link simbólico).
3. Siga o meu fluxo: cada etapa da seção 12 começa pela `/triagem`, vira um PR próprio, passa no CI e no preview da Vercel e só entra com o meu sim. Nada vai para a produção antes da etapa 6 estar pronta; a produção sai em lote pelo `/publicar`.
4. Copie este arquivo para `docs/plano/PROMPT_PLANO_AI.md` no PR da etapa 1.

## 1. Objetivo

O Pentagon passa a me entregar estudo assim: cada bloco do dia está ligado a uma trilha, cada trilha mostra só o conteúdo atual, o próximo só é liberado quando eu concluo o atual, e um item só fica disponível quando os requisitos dele (de qualquer trilha) estão concluídos. Nada de datas nem prazos: o app mostra progresso e horas estimadas.

| Bloco   | Horário padrão                             | Trilha                 | Observação                                  |
| ------- | ------------------------------------------ | ---------------------- | ------------------------------------------- |
| Manhã   | durante o estágio (07:30 a 12:00), até 3 h | Cursos e Certificações | só nos dias em que respondo que tenho folga |
| Teoria  | 13:30 a 15:00                              | Teoria                 |                                             |
| Projeto | 17:20 a 18:40                              | Projetos               | a Academia passa a ir das 16:00 às 17:20    |

Fim de semana: sem blocos por padrão, configurável em Ajustes.

## 2. Regras de escrita (valem para todo texto que o app mostra)

Português do Brasil. Nenhum travessão, meia risca ou hífen usado como pontuação nos textos do app, do seed e das mensagens de push; use ponto, vírgula ou dois pontos. Sem datas e sem prazos: nunca "terminar até dia X", nunca previsão de data. A data de conclusão de um item pode aparecer no histórico ("concluído em 3 de dezembro"), porque é registro, não prazo.

## 3. Como o código funciona hoje (para você não procurar)

- Trilha DevOps com datas: `trilha_devops.js`, `src/server/estudos/trilha.ts` e `seed.ts` gravam `study_tracks`, `study_weeks` e `study_sessions` (uma sessão por dia e turno). Revisão de sexta (`study_reviews`), caderno de erros (`study_errors`) e revisão espaçada de domingo usam essas semanas. Tela: `src/app/(app)/estudos/page.tsx`.
- Segurança: `src/server/estudos/seguranca.ts` cria a trilha e um compromisso recorrente "Ciber e SecOps" de segunda a sexta às 17:30 (`events.track_id` aponta para a trilha), com a tarefa do dia vinda de `src/server/roadmap/trilhas/seguranca-diaria.json`.
- Roadmap: catálogo global em `roadmap_*`, regravado a cada deploy por `src/server/roadmap/seed.ts` a partir de `src/server/roadmap/trilhas/*.json`; progresso por usuário. Telas em `/trilhas` e `/trilhas/[slug]/roadmap`. Este é o padrão a copiar para o catálogo do plano.
- Seeds: `scripts/migrar.ts` roda as migrations e os seeds de trilha, rotina, segurança e roadmap em todo deploy (`scripts/migrar-no-build.ts`), e `src/server/auth.ts` roda trilha, rotina e segurança em todo login. Só o OWNER_EMAILS recebe (`src/server/permissao.ts`).
- Rotina: `src/server/rotina/seed.ts` cria Estágio (07:30, 270 min), Academia (16:00, 90 min) e as aulas (19:10).
- Ajustes de horário: `settings.horarios_estudo` com chaves `<dia>-<turno>` (`src/lib/estudos.ts`, `FormAjustes`, `HorariosEstudo`).
- Agenda e conflitos: `src/server/estudos/ocorrencias.ts`, `src/server/agenda/recorrencia.ts`, `src/server/agenda/regras.ts`, `src/server/servicos/agenda.ts`. A flag `permite_sobreposicao` já existe para estudo dentro do estágio. Feed ICS em `src/server/calendario/`.
- Avisos: `src/server/avisos/planejar.ts` (regras puras), `src/server/servicos/avisos.ts` (reconciliação, disparo), QStash numa janela de 48 h e cron diário `/api/cron/reconciliar`. O título e o corpo do aviso são gravados em `notifications` na hora do agendamento.
- Cards: `flashcards` com campo `trilha` (hoje CKA e SEG), sessão diária, acervo offline em IndexedDB.
- Assistente de voz: `src/server/assistente/` (ferramentas com esquemas Zod, `instrucoes.ts` com texto fixo para cache, `executar.ts`, `registro.ts` com desfazer). Ações viram cartões; `propor_exclusao` já é o padrão de "proposta que o usuário confirma". Consultas: a IA devolve uma janela e o app monta a resposta. Testes com `e2e/claude-falso.ts` e `tests/integracao/assistente.test.ts`.
- Testes locais: `docker start pentagon-db` antes dos testes de integração; e2e com `npx playwright test --project=chromium` (o WebKit não abre nesta máquina) e porta 3100 livre. Para telas que dependem de data, use `next start` com `NODE_OPTIONS=--require` de um shim de `Date` (FAKE_NOW). Não use `pkill -f` com um padrão que aparece na sua própria linha de comando.

## 4. O que sai do app: arquivar, não apagar

Saem das telas, da agenda, dos conflitos, do feed ICS, dos avisos, dos seeds e do assistente, mas ficam guardados com todo o progresso para eu reativar depois:

1. Trilha DevOps: `study_tracks` slug da DevOps, com semanas, sessões (feitas e pendentes), revisões de sexta e revisão espaçada de domingo.
2. Trilha Segurança e SecOps: a trilha, a tarefa diária e o compromisso recorrente "Ciber e SecOps" (e qualquer outro `events` com `track_id` de trilha arquivada).
3. Roadmaps DevOps e Segurança (catálogo continua global; o arquivamento é por usuário) e qualquer outro roadmap que exista.
4. Cards das trilhas CKA e SEG (e qualquer `trilha` de card existente na hora da migração).
5. Erros do caderno criados antes do arquivamento.

Ficam como ferramentas gerais do plano novo: o módulo Cards (novos cards entram com trilha `TEORIA`, `CURSOS` ou `PROJETOS`) e o caderno de erros (anotar erro a partir de um bloco; erros com `revisar_em` vencido aparecem no cartão do plano B "Cards e Cerebro").

Regras do arquivamento:

- Nenhum `DELETE` em dados do usuário. Arquivar é registrar, nunca apagar ou mudar `repete_ate`.
- Tabela `arquivamentos` (seção 5). Um helper único no servidor (`arquivados(userId)`) é usado por todas as consultas afetadas: ocorrências da agenda, conflitos, avisos, ICS, Hoje, Cards (sessão do dia e acervo), assistente (`listar_agenda`) e exportação (a exportação continua incluindo o arquivado, marcado como arquivado).
- `semearTrilha`, `semearSeguranca` e qualquer seed por usuário pulam o que estiver arquivado, tanto no deploy quanto no login. Em especial, `semearTrilha` não pode rodar a limpeza de sessões pendentes de uma trilha arquivada.
- A migração de dados roda uma vez só por usuário, marcada em `settings.plano_migrado_em`. Se eu reativar algo depois (apagando a linha de `arquivamentos`), o deploy seguinte não pode arquivar de novo.
- Reativar pela interface fica fora deste trabalho. Basta a tela Trilhas arquivadas listar o que está guardado, só leitura.
- O código das trilhas antigas fica no repositório (não apague módulos), só sem rota no menu. `/estudos`, `/trilhas` e `/trilhas/[slug]/roadmap` redirecionam para `/plano`.

## 5. Modelo de dados (migration 0010, Drizzle)

Catálogo global, regravado a cada deploy a partir do seed (seção 9), como o Roadmap:

- `plano_trilhas`: `slug` (teoria, cursos, projetos) único, `nome`, `bloco` (manha, teoria, projeto), `posicao`.
- `plano_fases`: `numero` único (0 a 9), `nome`, `posicao` (ordem de exibição, que não segue o número; veja a seção 9).
- `plano_itens`: `codigo` texto único (A0, C12a...), `trilha` (slug), `fase` (número, só na Teoria), `posicao` dentro da trilha, `titulo`, `estudar`, `recurso`, `criterio`, `horas` (numeric 4,1), `requisitos` text[] de códigos, `avaliacao` jsonb (nula, `{ "tipo": "nota", "minima": 80, "aprovacoes": 1 }` ou `{ "tipo": "aprovacao" }`), `antes_de_comecar` text[], `etapas` text[], `entrega` boolean, `opcional` boolean, `ativo` boolean. Item que sumir do seed fica com `ativo = false` e some das telas; o progresso dele continua guardado.
- `plano_padrao_entrega` e `plano_recrutamento` podem ser jsonb numa linha única `plano_catalogo` (versão, padrão de entrega, recrutamento). Escolha a forma mais simples e justifique no PR.

Progresso por usuário, sempre ligado ao `codigo` (texto), nunca ao id do catálogo, para que editar ou reordenar o seed não perca nada:

- `plano_progresso`: `user_id`, `codigo`, `concluido_em`, `nota_final` (nula), chave primária (`user_id`, `codigo`). Desfazer apaga a linha deste item (é o único delete permitido, e é do próprio registro de conclusão) e grava o evento em `plano_historico`.
- `plano_historico`: `id`, `user_id`, `codigo`, `acao` (concluido, desfeito, inicio_marcado), `em`, `origem` (tela, voz, inicio). Serve de trilha de auditoria e para o "desfazer".
- `plano_tentativas`: `id`, `user_id`, `codigo`, `nota` (0 a 100), `aprovada` boolean, `feita_em`.
- `plano_checks`: `user_id`, `codigo` (ou `recrutamento`), `grupo` (etapas, antes, entrega, recrutamento), `indice`, `feito`, `feito_em`. Chave primária nos quatro primeiros.
- `plano_contagens`: `user_id`, `chave` (ex.: questoes), `semana` (segunda da semana, só para agrupar, nunca exibida como data), `contagem`.
- `plano_blocos`: `id`, `user_id`, `data`, `bloco` (manha, teoria, projeto, e os de fim de semana), `escolha` (nula ou `item:<codigo>` ou `cards`), `codigo_estudado`, `minutos`, `feito_em`. Único em (`user_id`, `data`, `bloco`). É o registro "Fiz este bloco" e a troca manual do dia.
- `plano_folgas`: `user_id`, `data`, `minutos` (0, 60, 120 ou 180), `respondida_em`. Chave primária (`user_id`, `data`).
- `arquivamentos`: `user_id`, `tipo` (trilha_estudo, roadmap, cards, evento, erros), `chave` (slug, trilha do card, id do evento), `arquivado_em`. Único em (`user_id`, `tipo`, `chave`).
- `settings`: novos campos `plano_iniciado_em` (fim da primeira abertura), `plano_migrado_em`, `blocos_plano` jsonb (seção 7.5), `pergunta_folga` texto HH:MM (padrão 07:40), `aviso_blocos_min` (padrão 5).
- Enums: `notification_target` ganha `bloco` e `folga`; `assistant_entity` ganha `item_plano`.

Tudo com `user_id` vindo da sessão no servidor. Nenhuma rota aceita `user_id` do cliente.

## 6. Regras de liberação (funções puras em `src/lib/plano.ts`, sem dependência de servidor)

1. **Item atual da trilha:** o primeiro item ativo, na ordem da trilha, que não está concluído.
2. **Estado do item atual:** `disponivel` quando todos os requisitos estão concluídos; senão `aguardando`, com a lista dos requisitos pendentes (código e título). Os itens depois do atual são `bloqueado` e só mostram o título.
3. **Concluir (no servidor, nunca confiando no cliente):** só o item atual da trilha, só se `disponivel`, e só se:
   - `antes_de_comecar` estiver todo marcado;
   - nos itens de `entrega`, o checklist do padrão de entrega estiver todo marcado;
   - com `avaliacao.tipo = nota`: existirem `aprovacoes` tentativas com nota maior ou igual a `minima` (os simulados pedem 2). Uma tentativa abaixo da mínima é gravada e o item continua atual;
   - com `avaliacao.tipo = aprovacao`: eu confirmar que fui aprovado.

   As etapas são opcionais e não travam. Ao concluir: grava `concluido_em` e o histórico, e devolve o próximo item da trilha e qualquer item de outra trilha que tenha acabado de ficar disponível. A tela mostra "Próximo conteúdo liberado: A3. Cálculo de várias variáveis" e, se houver, "Também liberado: C3 na trilha Projetos".

4. **Desfazer:** só a conclusão mais recente de cada trilha, e só se nenhum item concluído (de qualquer trilha) tiver o item como requisito. Se não puder, a mensagem diz qual item impede. Depois de concluir, a tela oferece "Desfazer" por alguns segundos, e o histórico de concluídos mostra o botão no item que ainda pode ser desfeito.
5. **Conteúdo do bloco num dia** (`conteudoDoBloco`):
   1. se houver troca manual gravada para aquele dia e bloco, ela vale;
   2. senão, o item atual da trilha do bloco, se `disponivel`;
   3. senão, plano B, nesta ordem, pulando a trilha do próprio bloco e qualquer trilha cujo item atual não esteja `disponivel`: o item atual da Teoria, se ela ainda não foi estudada no dia (nenhum `plano_blocos` do dia com `codigo_estudado` da Teoria); depois o item atual de Cursos; por fim "Cards e Cerebro" (revisão do dia no módulo Cards, erros do caderno com revisão vencida e o lembrete de passar as notas no Cerebro).

   O bloco mostra o motivo: "Aguardando: A6. Prova da Fase 1. Plano B: ...".

6. **Troca manual:** em um bloco do dia posso escolher qualquer item atual `disponivel` de qualquer trilha ou "Cards e Cerebro". Nunca um item bloqueado nem um futuro. A troca vale só para aquele dia e bloco e não muda a ordem de nada.
7. **Horas:** restantes da fase e da trilha = soma das horas estimadas dos itens ativos não concluídos, sem os opcionais. Horas gastas no item = soma dos minutos dos blocos registrados com aquele item. Mostre "6 h gastas de 15 h estimadas" e nunca converta horas em datas.
8. **Opcional:** a Fase 9 (A35) fica fora das horas restantes e do percentual. Quando a Teoria termina, ela aparece como "Disponível, opcional".
9. **Recrutamento:** liberado quando B5 e C8 estiverem concluídos. Antes disso não aparece.
10. **Validação do seed** (roda no build e nos testes; seed inválido quebra o deploy):
    - códigos únicos, requisitos que existem, fase existente nos itens da Teoria;
    - sem ciclos;
    - um requisito na mesma trilha tem que vir antes na ordem;
    - sem trava cruzada: simule a conclusão (a cada passo, conclua qualquer item atual disponível) e verifique que todos os itens ativos são concluídos;
    - horas maiores que zero; `aprovacoes` de 1 ou 2;
    - nenhum texto com travessão, meia risca, " - " ou hífen entre palavras.

## 7. Telas

### 7.1 Primeira abertura (`/plano/inicio`)

Enquanto `plano_iniciado_em` for nulo, o Hoje mostra só o cartão "Comece o plano" (sem blocos e sem avisos de bloco) e `/plano` leva para cá. Lista os itens das três trilhas, agrupados por trilha e fase, com caixa de seleção. A0 e C1 já vêm marcados como sugestão; posso desmarcar. Texto de apoio: "Marque o que você já concluiu. O resto será liberado um de cada vez." Ao salvar, se um item marcado tiver requisito não marcado, o app lista esses requisitos e pergunta se marca junto (fechamento transitivo). As conclusões entram com origem `inicio`. Depois disso, a tela não volta; correções são feitas com desfazer.

### 7.2 Plano (`/plano`, no lugar de Estudos e Trilhas no menu e na barra do iPhone)

Três seções, uma por trilha, nesta ordem: Teoria, Cursos e Certificações, Projetos. Cada seção mostra:

- o nome da trilha, o bloco ligado a ela, a barra de progresso (itens concluídos de total) e as horas restantes da trilha;
- o **item atual**, completo: código, título, fase (na Teoria, com as horas restantes da fase), o que estudar, recurso, critério de conclusão, horas estimadas e gastas, checklist "Antes de começar" (com os detalhes escondidos até ela ser marcada), etapas, checklist do padrão de entrega nos itens de entrega, tentativas de prova com nota;
- se o item atual estiver aguardando: "Aguardando: <código. título>" e o que o bloco faz no lugar;
- **Próximos:** os três itens seguintes, só código e título, sem detalhe e sem toque;
- **Concluídos:** lista recolhida com a data de conclusão e o desfazer quando permitido.

O botão "Concluir" abre uma folha inferior (`FolhaInferior`) que mostra o critério de conclusão e pede confirmação; nos itens com nota, o campo da nota (0 a 100) e a mensagem clara quando ela fica abaixo da mínima ("Tentativa registrada: 72%. Para passar, 80% ou mais."). Abaixo das três trilhas: **Recrutamento** (quando liberado), com o checklist e o contador "Questões de programação: 1 de 2 nesta semana", com botão de mais um. No fim: link discreto "Trilhas arquivadas" (lista só leitura).

### 7.3 Hoje (`/`)

- Nos dias úteis, até a resposta (ou até 12:00), o cartão "Hoje tem folga no estágio?" com Nada, 1 h, 2 h e 3 h. Posso mudar a resposta no mesmo dia. Sem resposta ou com Nada, o bloco da manhã não aparece no dia.
- Cartão "Blocos de hoje": cada bloco do dia com horário, conteúdo (código e título, ou o plano B com o motivo), "Abrir" (vai para o item em `/plano`), "Fiz este bloco" (grava `plano_blocos` com os minutos do bloco, editáveis) e "Trocar" (opções da regra 6). O bloco feito fica marcado, e dá para desmarcar no mesmo dia.
- O cartão "Agora" passa a reconhecer os blocos.

### 7.4 Agenda e calendário

Os blocos aparecem na Agenda e no feed ICS como ocorrências da área estudos, com o título "Bloco Teoria: A2. Cálculo de uma variável" (conteúdo resolvido para o dia; nos dias futuros, o conteúdo atual). O bloco da manhã só aparece no dia em que respondi a folga, com sobreposição permitida com o estágio. Os blocos da Teoria e do Projeto entram na detecção de conflitos como qualquer compromisso.

### 7.5 Ajustes

A seção "Horários de estudo" dá lugar a "Blocos de estudo": manhã (início padrão 08:00; duração vem da folga), Teoria (13:30, 90 min), Projeto (17:20, 80 min), horário da pergunta da folga (07:40), aviso dos blocos (5 min antes) e, para sábado e domingo, cada bloco com chave liga e desliga, início e duração (todos desligados por padrão). O antigo `horarios_estudo` fica no banco, sem uso. Formato de `blocos_plano`: `{ "dias_uteis": { "manha": { "inicio": "08:00" }, "teoria": { "inicio": "13:30", "minutos": 90 }, "projeto": { "inicio": "17:20", "minutos": 80 } }, "sabado": {...}, "domingo": {...} }`, validado com Zod.

### 7.6 Academia

O seed da rotina passa a criar a Academia com 80 min (16:00 às 17:20). A migração de dados ajusta o compromisso existente só se ele ainda estiver exatamente com 16:00 e 90 min; se eu tiver mudado, não mexe.

## 8. Avisos

1. **Pergunta da folga:** dias úteis, no horário de `pergunta_folga`. Título "Hoje tem folga no estágio?", corpo "Toque para responder. Na manhã: <conteúdo atual de Cursos ou o plano B>", abre `/`. Não é agendada (ou é cancelada) se a folga do dia já foi respondida. No iPhone a notificação não recebe resposta; ela só abre o app.
2. **Blocos:** `aviso_blocos_min` antes de cada bloco Teoria e Projeto (13:25 e 17:15 no padrão) e dos blocos de fim de semana ligados. Título "Bloco Teoria às 13:30", corpo com o conteúdo do bloco. O bloco da manhã não tem aviso próprio (a pergunta já cumpre esse papel). Não envia se o bloco do dia já foi marcado como feito.
3. **Conteúdo sempre atual:** para `bloco` e `folga`, `dispararAviso` recalcula título e corpo na hora do envio a partir do estado do banco (o texto gravado na hora do agendamento é só uma reserva). Além disso, concluir, desfazer, trocar, responder folga, marcar bloco feito, terminar a primeira abertura e mudar Ajustes chamam a reconciliação.
4. O aviso geral de `aviso_min` continua para compromissos e lembretes. Avisos de sessões DevOps e do "Ciber e SecOps" deixam de existir (o arquivamento os remove da reconciliação, e os já agendados são cancelados).
5. Sem avisos de bloco enquanto a primeira abertura não terminar.

## 9. Conteúdo inicial (seed)

Arquivo versionado `src/server/plano/plano.json`, lido pelo seed do catálogo a cada deploy (`scripts/seed-plano.ts`, chamado em `scripts/migrar.ts`). Editar este arquivo é a forma de mudar o conteúdo sem mexer na lógica. Campos omitidos usam o padrão: `requisitos` vazio, `avaliacao` nula, `antesDeComecar` e `etapas` vazios, `entrega` e `opcional` falsos. A ordem dos itens no array é a ordem da trilha; a ordem de `fases` é a ordem de exibição.

Ajustes já aprovados em relação ao plano original, refletidos abaixo: Fases 7 e 8 antes das Fases 5 e 6 (os números das fases ficam, porque as sessões de professor usam esses números); B2 sem requisito; B6 com requisito A8 e A29 dependendo de B6; B7 com A12 em vez de A16; B11 com A16 em vez de A28 e antes do B10 na trilha; B9 sem C8; C9 sem requisito e mais cedo; C12 dividido em C12a e C12b; B10 e B11 com o restante dos cursos e menos horas; recursos citando só as seções usadas; C2 com a autorização como etapa.

```json
{
  "versao": 1,
  "trilhas": [
    { "slug": "teoria", "nome": "Teoria", "bloco": "teoria" },
    { "slug": "cursos", "nome": "Cursos e Certificações", "bloco": "manha" },
    { "slug": "projetos", "nome": "Projetos", "bloco": "projeto" }
  ],
  "fases": [
    { "numero": 0, "nome": "Base de engenharia" },
    { "numero": 1, "nome": "Matemática" },
    { "numero": 2, "nome": "ML clássico" },
    { "numero": 3, "nome": "Deep learning" },
    { "numero": 4, "nome": "Transformers" },
    { "numero": 7, "nome": "AI Engineering aplicada" },
    { "numero": 8, "nome": "MLOps e LLMOps" },
    { "numero": 5, "nome": "Reinforcement learning" },
    { "numero": 6, "nome": "LLMs por dentro" },
    { "numero": 9, "nome": "Especialização (opcional, depois da contratação)" }
  ],
  "padraoDeEntrega": [
    "README com o problema, a arquitetura em diagrama e números medidos",
    "Evals descritas no README",
    "Deploy no ar ou vídeo de até 2 minutos",
    "Post no LinkedIn em português e em inglês"
  ],
  "recrutamento": {
    "liberaCom": ["B5", "C8"],
    "checklist": [
      "LinkedIn atualizado com badges e projetos",
      "Currículo em português e em inglês",
      "Candidaturas a estágio e júnior de AI Engineer no Brasil",
      "Candidaturas a vagas remotas no exterior",
      "Pitch do Pulse AI em português e em inglês"
    ],
    "contadores": [{ "chave": "questoes", "titulo": "Questões de programação", "metaSemanal": 2 }]
  },
  "itens": [
    {
      "codigo": "A0",
      "trilha": "teoria",
      "fase": 0,
      "titulo": "Python científico",
      "estudar": "NumPy, pandas e uv.",
      "recurso": "Sessão da Fase 0.",
      "criterio": "Notebook do ENEM organizado com ambiente uv.",
      "horas": 10
    },

    {
      "codigo": "A1",
      "trilha": "teoria",
      "fase": 1,
      "titulo": "Álgebra linear",
      "estudar": "Terminar o caderno e fazer a prova diagnóstica.",
      "recurso": "Caderno de álgebra linear no GoodNotes e Essence of Linear Algebra (3Blue1Brown).",
      "criterio": "10 de 12 na prova diagnóstica, nenhum módulo abaixo de 70%.",
      "horas": 6
    },
    {
      "codigo": "A2",
      "trilha": "teoria",
      "fase": 1,
      "titulo": "Cálculo de uma variável",
      "estudar": "Limites, derivadas, regra da cadeia, otimização.",
      "recurso": "Essence of Calculus (3Blue1Brown) e, do curso de cálculo do Mike X Cohen (Udemy), só as seções de limites, derivadas, regra da cadeia e otimização.",
      "criterio": "Lista de exercícios com 80% ou mais.",
      "horas": 15,
      "requisitos": ["A1"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },
    {
      "codigo": "A3",
      "trilha": "teoria",
      "fase": 1,
      "titulo": "Cálculo de várias variáveis",
      "estudar": "Derivadas parciais, gradiente, jacobiano, descida do gradiente.",
      "recurso": "Sessão da Fase 1 e Mathematics for ML (DeepLearning.AI).",
      "criterio": "Descida do gradiente implementada do zero em NumPy.",
      "horas": 12,
      "requisitos": ["A2"]
    },
    {
      "codigo": "A4",
      "trilha": "teoria",
      "fase": 1,
      "titulo": "Probabilidade",
      "estudar": "Variáveis aleatórias, distribuições, Bayes, esperança e variância.",
      "recurso": "Sessão da Fase 1.",
      "criterio": "Lista com 80% ou mais.",
      "horas": 12,
      "requisitos": ["A1"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },
    {
      "codigo": "A5",
      "trilha": "teoria",
      "fase": 1,
      "titulo": "Estatística para ML",
      "estudar": "Máxima verossimilhança, entropia cruzada, divergência KL, intervalos.",
      "recurso": "Sessão da Fase 1.",
      "criterio": "MLE de uma distribuição implementada do zero.",
      "horas": 10,
      "requisitos": ["A3", "A4"]
    },
    {
      "codigo": "A6",
      "trilha": "teoria",
      "fase": 1,
      "titulo": "Prova da Fase 1",
      "criterio": "80% ou mais na prova.",
      "horas": 2,
      "requisitos": ["A5"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },

    {
      "codigo": "A7",
      "trilha": "teoria",
      "fase": 2,
      "titulo": "Regressão linear e logística do zero",
      "estudar": "Regressão linear e logística implementadas em NumPy.",
      "recurso": "Machine Learning Specialization (Andrew Ng), só as seções de regressão linear e logística, e sessão da Fase 2.",
      "criterio": "As duas implementadas em NumPy e comparadas com scikit learn.",
      "horas": 12,
      "requisitos": ["A6"]
    },
    {
      "codigo": "A8",
      "trilha": "teoria",
      "fase": 2,
      "titulo": "Avaliação de modelos",
      "estudar": "Treino, validação e teste, validação cruzada, métricas, overfitting, regularização.",
      "recurso": "Sessão da Fase 2.",
      "criterio": "Perguntas de checagem com 80% ou mais.",
      "horas": 8,
      "requisitos": ["A7"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },
    {
      "codigo": "A9",
      "trilha": "teoria",
      "fase": 2,
      "titulo": "Árvores e ensembles",
      "estudar": "Árvore de decisão, random forest, gradient boosting (XGBoost ou LightGBM).",
      "recurso": "Machine Learning A Z (Udemy), só as seções de árvore de decisão, random forest e XGBoost.",
      "criterio": "Árvore simples do zero e um boosting com scikit learn.",
      "horas": 10,
      "requisitos": ["A8"]
    },
    {
      "codigo": "A10",
      "trilha": "teoria",
      "fase": 2,
      "titulo": "Aprendizado não supervisionado",
      "estudar": "k means, PCA, detecção de anomalias (Isolation Forest).",
      "recurso": "Sessão da Fase 2.",
      "criterio": "k means do zero e anomalias detectadas em um dataset.",
      "horas": 8,
      "requisitos": ["A8"]
    },
    {
      "codigo": "A11",
      "trilha": "teoria",
      "fase": 2,
      "titulo": "Séries temporais básicas",
      "estudar": "Tendência, sazonalidade, previsão simples.",
      "recurso": "Sessão da Fase 2.",
      "criterio": "Previsão de uma série com erro medido.",
      "horas": 6,
      "requisitos": ["A10"]
    },
    {
      "codigo": "A12",
      "trilha": "teoria",
      "fase": 2,
      "titulo": "Prova da Fase 2",
      "criterio": "80% ou mais na prova.",
      "horas": 2,
      "requisitos": ["A9", "A11"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },

    {
      "codigo": "A13",
      "trilha": "teoria",
      "fase": 3,
      "titulo": "Backpropagation do zero",
      "estudar": "Backpropagation implementada à mão.",
      "recurso": "Neural Networks Zero to Hero (Karpathy), episódio do micrograd.",
      "criterio": "Micrograd próprio funcionando.",
      "horas": 10,
      "requisitos": ["A12"]
    },
    {
      "codigo": "A14",
      "trilha": "teoria",
      "fase": 3,
      "titulo": "Redes em PyTorch",
      "estudar": "MLP, otimizadores, inicialização, normalização.",
      "recurso": "Série makemore (Karpathy) e, do A deep understanding of deep learning (Mike X Cohen, Udemy), só as seções de otimizadores, inicialização e normalização.",
      "criterio": "MLP treinada com a curva de perda analisada.",
      "horas": 14,
      "requisitos": ["A13"]
    },
    {
      "codigo": "A15",
      "trilha": "teoria",
      "fase": 3,
      "titulo": "Visão computacional",
      "estudar": "CNNs, transfer learning, CLIP.",
      "recurso": "Sessão da Fase 3.",
      "criterio": "Classificador de imagens com transfer learning.",
      "horas": 10,
      "requisitos": ["A14"]
    },
    {
      "codigo": "A16",
      "trilha": "teoria",
      "fase": 3,
      "titulo": "Prova da Fase 3",
      "criterio": "80% ou mais na prova.",
      "horas": 2,
      "requisitos": ["A15"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },

    {
      "codigo": "A17",
      "trilha": "teoria",
      "fase": 4,
      "titulo": "Tokenização e embeddings",
      "estudar": "BPE, embeddings, similaridade.",
      "recurso": "Vídeo do tokenizer (Karpathy).",
      "criterio": "BPE simples do zero.",
      "horas": 8,
      "requisitos": ["A16"]
    },
    {
      "codigo": "A18",
      "trilha": "teoria",
      "fase": 4,
      "titulo": "Atenção e transformer do zero",
      "estudar": "Atenção e transformer implementados do zero.",
      "recurso": "Let's build GPT (Karpathy).",
      "criterio": "Mini GPT treinado em texto em português.",
      "horas": 14,
      "requisitos": ["A17"]
    },
    {
      "codigo": "A19",
      "trilha": "teoria",
      "fase": 4,
      "titulo": "Hugging Face Transformers",
      "estudar": "Fine tuning de um modelo de classificação.",
      "recurso": "LLM Course da Hugging Face, só os capítulos de fine tuning.",
      "criterio": "Modelo ajustado com métrica medida.",
      "horas": 8,
      "requisitos": ["A18"]
    },
    {
      "codigo": "A20",
      "trilha": "teoria",
      "fase": 4,
      "titulo": "Prova da Fase 4",
      "criterio": "80% ou mais na prova.",
      "horas": 2,
      "requisitos": ["A19"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },

    {
      "codigo": "A28",
      "trilha": "teoria",
      "fase": 7,
      "titulo": "Prompting e saídas estruturadas",
      "estudar": "Prompting e saídas estruturadas com schema.",
      "recurso": "Claude Academy.",
      "criterio": "Função que sempre devolve JSON válido segundo um schema.",
      "horas": 6,
      "requisitos": ["A20"]
    },
    {
      "codigo": "A29",
      "trilha": "teoria",
      "fase": 7,
      "titulo": "RAG",
      "estudar": "Chunking, embeddings, busca híbrida, reranking.",
      "recurso": "LLM Zoomcamp (vídeos vistos no B6) e sessão da Fase 7.",
      "criterio": "RAG avaliado com métricas de busca.",
      "horas": 12,
      "requisitos": ["A28", "B6"]
    },
    {
      "codigo": "A30",
      "trilha": "teoria",
      "fase": 7,
      "titulo": "Evals",
      "estudar": "Conjuntos rotulados, LLM como juiz, análise de erros.",
      "recurso": "Material de evals do Hamel Husain e da Shreya Shankar e o livro AI Engineering (Chip Huyen).",
      "criterio": "Suíte de evals rodando em um projeto.",
      "horas": 10,
      "requisitos": ["A28"]
    },
    {
      "codigo": "A31",
      "trilha": "teoria",
      "fase": 7,
      "titulo": "Agentes, tool use e MCP",
      "estudar": "Agentes com ferramentas e servidores MCP.",
      "recurso": "Claude Academy, Context Course da Hugging Face (só os capítulos de MCP) e trilha do Ed Donner (Udemy), só os módulos de tool use.",
      "criterio": "Agente com ferramentas em Python puro e um servidor MCP simples.",
      "horas": 12,
      "requisitos": ["A29", "A30"]
    },
    {
      "codigo": "A32",
      "trilha": "teoria",
      "fase": 7,
      "titulo": "Prova da Fase 7",
      "criterio": "80% ou mais na prova.",
      "horas": 2,
      "requisitos": ["A31"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },

    {
      "codigo": "A33",
      "trilha": "teoria",
      "fase": 8,
      "titulo": "Produção",
      "estudar": "Deploy, observabilidade (Langfuse), custo, latência, evals no CI.",
      "recurso": "Trilha do Ed Donner (Udemy), só a parte de deploy.",
      "criterio": "Um projeto com tracing e evals rodando a cada mudança.",
      "horas": 12,
      "requisitos": ["A32"]
    },
    {
      "codigo": "A34",
      "trilha": "teoria",
      "fase": 8,
      "titulo": "Prova da Fase 8",
      "criterio": "80% ou mais na prova.",
      "horas": 2,
      "requisitos": ["A33"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },

    {
      "codigo": "A21",
      "trilha": "teoria",
      "fase": 5,
      "titulo": "Fundamentos de RL",
      "estudar": "MDP, Q learning, policy gradient.",
      "recurso": "Cursos do Lazy Programmer (Udemy) ou Deep RL Course da Hugging Face.",
      "criterio": "Agente de Q learning e um policy gradient simples.",
      "horas": 14,
      "requisitos": ["A34"]
    },
    {
      "codigo": "A22",
      "trilha": "teoria",
      "fase": 5,
      "titulo": "Prova da Fase 5",
      "criterio": "80% ou mais na prova.",
      "horas": 2,
      "requisitos": ["A21"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },

    {
      "codigo": "A23",
      "trilha": "teoria",
      "fase": 6,
      "titulo": "Pré treino e leis de escala",
      "estudar": "Pré treino de LLMs e leis de escala.",
      "recurso": "Aulas do CS336 (Stanford, YouTube).",
      "criterio": "Nota no Cerebro e perguntas de checagem com 80% ou mais.",
      "horas": 10,
      "requisitos": ["A22"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },
    {
      "codigo": "A24",
      "trilha": "teoria",
      "fase": 6,
      "titulo": "Pós treino",
      "estudar": "SFT, RLHF, DPO, GRPO.",
      "recurso": "CS336.",
      "criterio": "Perguntas de checagem com 80% ou mais.",
      "horas": 10,
      "requisitos": ["A23"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },
    {
      "codigo": "A25",
      "trilha": "teoria",
      "fase": 6,
      "titulo": "Inferência",
      "estudar": "KV cache, quantização, estratégias de decodificação.",
      "recurso": "CS336 e vídeos do Umar Jamil.",
      "criterio": "KV cache implementado no mini GPT da A18.",
      "horas": 8,
      "requisitos": ["A24"]
    },
    {
      "codigo": "A26",
      "trilha": "teoria",
      "fase": 6,
      "titulo": "Estudo do nanochat",
      "estudar": "Ler e rodar em escala pequena.",
      "recurso": "Repositório nanochat (Karpathy).",
      "criterio": "Execução pequena rodando e explicada no Cerebro.",
      "horas": 8,
      "requisitos": ["A25"]
    },
    {
      "codigo": "A27",
      "trilha": "teoria",
      "fase": 6,
      "titulo": "Prova da Fase 6",
      "criterio": "80% ou mais na prova.",
      "horas": 2,
      "requisitos": ["A26"],
      "avaliacao": { "tipo": "nota", "minima": 80 }
    },

    {
      "codigo": "A35",
      "trilha": "teoria",
      "fase": 9,
      "titulo": "Escolher uma especialização",
      "estudar": "GPU (GPU MODE) ou interpretabilidade.",
      "recurso": "Sessão da Fase 9.",
      "criterio": "Critério definido na sessão da Fase 9.",
      "horas": 20,
      "requisitos": ["A27", "A34"],
      "opcional": true
    },

    {
      "codigo": "B1",
      "trilha": "cursos",
      "titulo": "Building with the Claude API",
      "recurso": "Claude Academy.",
      "criterio": "Curso completo.",
      "horas": 8
    },
    {
      "codigo": "B2",
      "trilha": "cursos",
      "titulo": "Plano oficial AIF C01",
      "recurso": "Standard Exam Prep Plan no AWS Skill Builder (grátis).",
      "criterio": "Plano completo e o conjunto oficial de 20 questões feito.",
      "horas": 8,
      "antesDeComecar": [
        "Criar um alarme de cobrança no AWS Budgets antes do primeiro laboratório na AWS"
      ]
    },
    {
      "codigo": "B3",
      "trilha": "cursos",
      "titulo": "Ultimate AWS Certified AI Practitioner",
      "recurso": "Stéphane Maarek (Udemy).",
      "criterio": "Curso completo.",
      "horas": 12,
      "requisitos": ["B2"]
    },
    {
      "codigo": "B4",
      "trilha": "cursos",
      "titulo": "Simulados AIF C01",
      "recurso": "Practice exams do Maarek (Udemy).",
      "criterio": "80% ou mais em dois simulados diferentes.",
      "horas": 6,
      "requisitos": ["B3"],
      "avaliacao": { "tipo": "nota", "minima": 80, "aprovacoes": 2 }
    },
    {
      "codigo": "B5",
      "trilha": "cursos",
      "titulo": "Prova AWS Certified AI Practitioner",
      "criterio": "Aprovado e badge no LinkedIn.",
      "horas": 2,
      "requisitos": ["B4"],
      "avaliacao": { "tipo": "aprovacao" }
    },
    {
      "codigo": "B6",
      "trilha": "cursos",
      "titulo": "LLM Zoomcamp, módulos de RAG e avaliação de busca",
      "estudar": "Vídeos dos módulos. A implementação fica para a A29.",
      "recurso": "LLM Zoomcamp.",
      "criterio": "Módulos completos.",
      "horas": 10,
      "requisitos": ["A8"]
    },
    {
      "codigo": "B7",
      "trilha": "cursos",
      "titulo": "Curso MLA C01",
      "recurso": "AWS Certified Machine Learning Engineer Associate: Hands On (Frank Kane e Stéphane Maarek, Udemy) e Exam Prep Plan do Skill Builder.",
      "criterio": "Curso completo, com SageMaker praticado.",
      "horas": 25,
      "requisitos": ["A12", "B5"]
    },
    {
      "codigo": "B8",
      "trilha": "cursos",
      "titulo": "Simulados MLA C01",
      "recurso": "Practice Exams: AWS Machine Learning Engineer Associate Cert (Udemy).",
      "criterio": "80% ou mais em dois simulados.",
      "horas": 8,
      "requisitos": ["B7"],
      "avaliacao": { "tipo": "nota", "minima": 80, "aprovacoes": 2 }
    },
    {
      "codigo": "B9",
      "trilha": "cursos",
      "titulo": "Prova AWS Certified Machine Learning Engineer Associate",
      "criterio": "Aprovado.",
      "horas": 2,
      "requisitos": ["B8"],
      "avaliacao": { "tipo": "aprovacao" }
    },
    {
      "codigo": "B11",
      "trilha": "cursos",
      "titulo": "Trilha de agentes do Ed Donner: o restante",
      "estudar": "Os módulos que a A31 e a A33 não usam.",
      "recurso": "Udemy.",
      "criterio": "Curso completo.",
      "horas": 14,
      "requisitos": ["A16"]
    },
    {
      "codigo": "B10",
      "trilha": "cursos",
      "titulo": "LLM Course e Context Course da Hugging Face: o restante",
      "estudar": "Os capítulos que a A19 e a A31 não usam.",
      "recurso": "Hugging Face.",
      "criterio": "Os dois cursos completos.",
      "horas": 10,
      "requisitos": ["A20"]
    },
    {
      "codigo": "B12",
      "trilha": "cursos",
      "titulo": "Curso AIP C01",
      "recurso": "Ultimate AWS Certified Generative AI Developer Professional (Frank Kane e Stéphane Maarek, Udemy).",
      "criterio": "Curso completo, com Bedrock praticado.",
      "horas": 24,
      "requisitos": ["A32", "B9"]
    },
    {
      "codigo": "B13",
      "trilha": "cursos",
      "titulo": "Simulados AIP C01",
      "recurso": "Practice Exams: AWS Certified Generative AI Developer Pro (Maarek e Abhishek Singh, Udemy).",
      "criterio": "80% ou mais em dois simulados.",
      "horas": 8,
      "requisitos": ["B12"],
      "avaliacao": { "tipo": "nota", "minima": 80, "aprovacoes": 2 }
    },
    {
      "codigo": "B14",
      "trilha": "cursos",
      "titulo": "Prova AWS Certified Generative AI Developer Professional",
      "criterio": "Aprovado.",
      "horas": 3,
      "requisitos": ["B13", "C15"],
      "avaliacao": { "tipo": "aprovacao" }
    },

    {
      "codigo": "C1",
      "trilha": "projetos",
      "titulo": "ENEM: análise exploratória dos microdados",
      "criterio": "Publicado no GitHub com README.",
      "horas": 8
    },
    {
      "codigo": "C2",
      "trilha": "projetos",
      "titulo": "Pulse AI: pipeline de dados",
      "estudar": "Coleta diária da API do Meta Ads, armazenamento e anonimização dos clientes.",
      "criterio": "Histórico de pelo menos uma conta salvo e anonimizado. Conta real só com autorização da agência; até ela chegar, uma conta de teste serve.",
      "horas": 10,
      "etapas": [
        "Pedir a autorização da agência para usar os dados reais",
        "Coleta diária rodando",
        "Anonimização dos clientes"
      ]
    },
    {
      "codigo": "C9",
      "trilha": "projetos",
      "titulo": "UPick: busca semântica",
      "estudar": "Embeddings e pgvector no Supabase com os materiais do aluno.",
      "criterio": "Busca avaliada com métricas.",
      "horas": 10
    },
    {
      "codigo": "C12a",
      "trilha": "projetos",
      "titulo": "Arqueólogo: indexador de código legado",
      "estudar": "Grafo de classes, rotas e tabelas de projetos PHP open source antigos. Nunca código da Codevasf ou da PGFN.",
      "criterio": "Grafo gerado e navegável para um projeto real.",
      "horas": 8
    },
    {
      "codigo": "C3",
      "trilha": "projetos",
      "titulo": "Tutor UPick: TRI parte 1",
      "estudar": "Modelos de 1, 2 e 3 parâmetros e verossimilhança implementados do zero.",
      "criterio": "Estimação funcionando em dados simulados.",
      "horas": 10,
      "requisitos": ["A5", "C1"]
    },
    {
      "codigo": "C4",
      "trilha": "projetos",
      "titulo": "Tutor UPick: TRI parte 2",
      "estudar": "Calibrar itens com os microdados do ENEM e comparar com as notas oficiais.",
      "criterio": "Comparação publicada.",
      "horas": 12,
      "requisitos": ["C3"]
    },
    {
      "codigo": "C5",
      "trilha": "projetos",
      "titulo": "Pulse AI: anomalias e previsão de saldo",
      "estudar": "Detector de custo por lead fora do padrão e previsão de quando o saldo acaba.",
      "criterio": "Alertas avaliados contra casos reais marcados por mim.",
      "horas": 12,
      "requisitos": ["A11", "C2"]
    },
    {
      "codigo": "C6",
      "trilha": "projetos",
      "titulo": "Tutor UPick: simulado adaptativo",
      "estudar": "Modelo de conhecimento do aluno que escolhe a próxima questão usando a TRI.",
      "criterio": "Funcionando no UPick em ambiente de teste.",
      "horas": 14,
      "requisitos": ["A12", "C4"]
    },
    {
      "codigo": "C7",
      "trilha": "projetos",
      "titulo": "Pulse AI: leitor de criativos",
      "estudar": "Modelo de visão que marca cada criativo e cruza com CTR e custo por lead por nicho.",
      "criterio": "Análise por nicho publicada com números agregados.",
      "horas": 14,
      "requisitos": ["A15", "C2"]
    },
    {
      "codigo": "C8",
      "trilha": "projetos",
      "titulo": "Pulse AI v1: entrega",
      "criterio": "Padrão de entrega completo e demonstração na agência.",
      "horas": 8,
      "requisitos": ["C5", "C7"],
      "entrega": true
    },
    {
      "codigo": "C10",
      "trilha": "projetos",
      "titulo": "UPick: geração de flashcards e questões com RAG",
      "estudar": "Com citação da fonte e previsão de dificuldade pela TRI.",
      "criterio": "Evals de fidelidade à fonte passando.",
      "horas": 14,
      "requisitos": ["A29", "A30", "C6", "C9"],
      "entrega": true
    },
    {
      "codigo": "C11",
      "trilha": "projetos",
      "titulo": "Pulse AI: relatório semanal automático",
      "estudar": "No estilo das mensagens que mando aos clientes, avaliado contra relatórios que eu aprovei.",
      "criterio": "Evals passando e um relatório real enviado.",
      "horas": 12,
      "requisitos": ["A30", "C8"]
    },
    {
      "codigo": "C12b",
      "trilha": "projetos",
      "titulo": "Arqueólogo: perguntas com citação",
      "estudar": "Perguntas sobre o código indexado na C12a.",
      "criterio": "Perguntas respondidas com citação de arquivo e linha.",
      "horas": 6,
      "requisitos": ["A29", "C12a"]
    },
    {
      "codigo": "C13",
      "trilha": "projetos",
      "titulo": "Pulse AI: agente com ferramentas e MCP",
      "estudar": "Responde perguntas sobre as contas consultando a API e o histórico.",
      "criterio": "Evals de agente passando.",
      "horas": 14,
      "requisitos": ["A31", "C11"]
    },
    {
      "codigo": "C14",
      "trilha": "projetos",
      "titulo": "Arqueólogo: agente, testes de caracterização e servidor MCP",
      "criterio": "Padrão de entrega completo.",
      "horas": 16,
      "requisitos": ["A31", "C12b"],
      "entrega": true
    },
    {
      "codigo": "C15",
      "trilha": "projetos",
      "titulo": "Produção na AWS",
      "estudar": "Pulse AI no Bedrock, com observabilidade, controle de custo e evals no CI.",
      "criterio": "Rodando com monitoramento.",
      "horas": 14,
      "requisitos": ["A33", "C13"],
      "entrega": true
    },
    {
      "codigo": "C16",
      "trilha": "projetos",
      "titulo": "Vitrine final",
      "estudar": "Os três projetos fixados no GitHub, páginas no portfólio, currículo em português e inglês.",
      "criterio": "Os três projetos fixados, páginas no portfólio e currículo nas duas línguas.",
      "horas": 8,
      "requisitos": ["C10", "C14", "C15"],
      "entrega": true
    }
  ]
}
```

## 10. Migração dos dados atuais e estado inicial

Passo de dados idempotente, em TypeScript, chamado por `scripts/migrar.ts` depois do seed do catálogo, só para usuários do OWNER_EMAILS e só quando `settings.plano_migrado_em` for nulo:

1. Registra em `arquivamentos`: as trilhas de estudo existentes (DevOps e Segurança), os roadmaps com progresso do usuário, os eventos com `track_id` dessas trilhas (o "Ciber e SecOps"), as trilhas de card existentes (CKA, SEG e outras) e `erros` com chave `antes_do_plano` (erros com `created_at` anterior ao arquivamento ficam ocultos).
2. Ajusta a Academia para 80 min, só se ela ainda estiver às 16:00 com 90 min (seção 7.6).
3. Grava `blocos_plano`, `pergunta_folga` e `aviso_blocos_min` com os padrões, se estiverem nulos.
4. Grava `plano_migrado_em`.
5. Roda a reconciliação de avisos do usuário (cancela os avisos de sessões DevOps e do "Ciber e SecOps" já agendados).

Usuários fora do OWNER_EMAILS: nada de plano, nada de arquivamento; `/plano` mostra o estado vazio "Nenhum plano de estudos nesta conta".

Estado inicial do meu progresso: nenhuma conclusão gravada pela migração. Estou terminando A1, então depois da primeira abertura (onde vou marcar A0 e C1) o item atual da Teoria será A1, o de Cursos será B1 e o de Projetos será C2.

## 11. Assistente de voz

Continua restrito ao app; tudo que não for agenda, lembretes e plano de estudos segue como `fora_do_escopo` (inclusive "me explica gradiente", porque explicar conteúdo não é papel dele).

1. **Ferramentas novas** (esquemas Zod em `ferramentas.ts`, descrições curtas):
   - `consultar_plano` com `pergunta` (`agora` ou `proximo`) e `trilha` opcional. O app monta a resposta, nunca a IA. Para `agora`: o bloco em andamento, ou o próximo bloco de hoje, com o conteúdo resolvido pela regra 5 e as horas ("Agora: bloco Teoria, A2. Cálculo de uma variável. 9 h restantes de 15 h."); sem blocos no resto do dia, o item atual de cada trilha. Para `proximo`: o item seguinte ao atual na trilha do bloco atual ou do próximo bloco (ou da trilha pedida), só código e título.
   - `propor_conclusao_conteudo` com `trilha` opcional e `nota` opcional. Nunca conclui na hora: cria uma ação com status `proposta` (entidade `item_plano`, tipo `concluido`), e o cartão mostra o item, o critério de conclusão e, se houver avaliação, a nota dita ("terminei a prova com 85") ou o campo para digitar. Só o toque em Confirmar conclui, passando pelas mesmas regras do servidor da seção 6. Sem trilha dita, vale a do bloco em andamento ou do último bloco do dia; se não der para saber, o cartão mostra os três itens atuais para eu escolher. O desfazer do cartão usa a regra 4.
2. **Ferramenta removida:** `concluir_sessao_estudo` (as sessões são da trilha arquivada). `listar_agenda` passa a trazer os blocos do plano e não traz nada arquivado.
3. **Instruções:** atualize `instrucoes.ts` para incluir o plano de estudos no que ele pode fazer, a regra de que concluir conteúdo é sempre proposta, e as frases que ele precisa entender ("o que eu estudo agora?", "qual o próximo conteúdo?", "terminei o conteúdo atual"). O texto continua fixo, sem dados, para o cache valer.
4. **Resposta de consulta:** um tipo novo de consulta (`plano`) ao lado da janela de agenda atual, com o texto montado pelo app.

## 12. Etapas (um PR por etapa, nesta ordem)

Cada etapa termina com lint, typecheck, testes da etapa e build passando, CI verde e preview da Vercel conferido. Não comece a seguinte sem o meu sim.

1. **Seed e regras puras.** `src/server/plano/plano.json`, `src/lib/plano.ts` (seção 6 inteira, sem banco), validação do seed e testes unitários. Sem migration, sem tela.
2. **Banco e serviço.** Migration 0010, seed do catálogo a cada deploy, `src/server/servicos/plano.ts` e as rotas `/api/plano/...` (ler estado, primeira abertura, concluir, tentativa, desfazer, checks, contador, folga, bloco feito, troca). Testes de integração, com os casos negados.
3. **Telas do plano.** `/plano`, `/plano/inicio`, folha de conclusão, aviso de liberação, desfazer, recrutamento, Trilhas arquivadas (vazia por enquanto). Entrada no menu ao lado das telas antigas.
4. **Blocos do dia.** Hoje (pergunta da folga, blocos, fiz este bloco, troca, plano B), Agenda, conflitos, ICS, Ajustes de blocos, Academia com 80 min.
5. **Avisos.** Pergunta da folga, avisos dos blocos, recálculo no disparo, reconciliação nos gatilhos da seção 8.
6. **Arquivamento e migração.** Tabela `arquivamentos` em uso, seeds respeitando, filtros em todas as consultas da seção 4, passo de dados da seção 10, menu sem Estudos e Trilhas antigas, redirecionamentos, Cards e caderno de erros como ferramentas gerais. Só depois desta etapa o lote pode ir para a produção.
7. **Assistente de voz.** Seção 11 inteira.

## 13. Testes obrigatórios

Cada regra testada no caso permitido e no negado.

**Unitários (`src/lib/plano.test.ts`):**

- item atual, estados `disponivel`, `aguardando` (com a lista certa) e `bloqueado`;
- concluir recusado: item que não é o atual, requisito pendente, nota 79 com mínima 80, simulado com uma aprovação só, entrega com checklist incompleto, B2 sem o "antes de começar";
- desfazer recusado quando há dependente concluído e quando não é a conclusão mais recente da trilha;
- plano B na ordem certa, pulando a própria trilha, a Teoria já estudada no dia e trilha aguardando; e o fallback para Cards e Cerebro;
- troca recusada para item bloqueado ou futuro;
- horas restantes sem o opcional; recrutamento só com B5 e C8;
- fechamento transitivo da primeira abertura;
- validação do seed: o seed real passa; seeds com ciclo, código repetido, requisito desconhecido, requisito posterior na mesma trilha, trava cruzada ou texto com travessão falham.

**Integração (`tests/integracao/plano.test.ts`, com `docker start pentagon-db`):**

- migration e seed rodando duas vezes sem duplicar;
- item removido do seed fica inativo e o progresso continua;
- migração de dados idempotente, e sem rearquivar depois de uma reativação manual;
- seeds DevOps e Segurança não tocam o que está arquivado, nem no login;
- nenhuma ocorrência arquivada na agenda, nos conflitos, no ICS nem nos avisos;
- outro usuário não lê nem altera o progresso de ninguém; usuário fora do OWNER_EMAILS sem plano;
- avisos: 07:40, 13:25 e 17:15 agendados; pergunta não enviada quando a folga já foi respondida; corpo recalculado no disparo depois de uma conclusão;
- Academia ajustada só quando estava no padrão.

**Assistente (`tests/integracao/assistente.test.ts` e o Claude falso):**

- "o que eu estudo agora?" e "qual o próximo conteúdo?" respondidos pelo app;
- "terminei o conteúdo atual" cria proposta e não conclui nada antes do Confirmar; o Confirmar conclui; o desfazer funciona;
- sem trilha definida, o cartão mostra a escolha;
- nota abaixo da mínima por voz vira tentativa;
- "me explica gradiente" dá `fora_do_escopo`;
- `concluir_sessao_estudo` não existe mais.

**E2E (Chromium):** primeira abertura com fechamento de requisitos; concluir com aviso de liberação e desfazer; a resposta da folga mostra e esconde o bloco da manhã; plano B aparecendo com "Aguardando".

## 14. Critérios de pronto

1. Todas as etapas mergeadas com o meu sim, CI verde, preview conferido e o lote publicado pelo `/publicar`.
2. Lint, typecheck, unitários, integração, e2e Chromium e build passando.
3. Na produção, na primeira abertura, marco A0 e C1, e o app mostra A1 na Teoria, B1 em Cursos e C2 em Projetos.
4. Nenhuma tela, aviso, compromisso, card ou resposta do assistente mostra DevOps, Segurança ou CKA, e os dados delas continuam no banco.
5. Os avisos de 07:40, 13:25 e 17:15 chegam com o conteúdo atual.
6. Nenhum texto do app tem travessão ou hífen como pontuação, e nenhuma tela mostra data de término ou prazo.
7. Editar `plano.json` (texto, horas, ordem, requisito) e fazer deploy muda o app sem perder progresso.
8. Ao terminar, registre no Cerebro com a skill `cerebro` o que foi entregue e as decisões desta especificação.
