# Plano de Estudos DevOps

Versão de 15 de outubro de 2026, com a rotina atualizada em 19 de outubro. Documento original, com gráficos (sem a atualização da rotina): https://claude.ai/code/artifact/c480d65b-ce0d-43e1-99e7-263cc5ba107c

> **No app:** a trilha começou uma semana depois do previsto neste plano. A semana zero é de 19 a 25/10/2026, a semana 1 começa em 26/10 e as metas de prova ficam uma semana depois (CKA em 05/03/2027). As datas da revisão inicial abaixo já seguem o app.

## Resumo e diagnóstico

Em 12 meses (out/2026 a out/2027) dá para sair de "desenvolvedor que mexe com containers" para candidato competitivo a DevOps júnior, com CKA, AWS Solutions Architect Associate e Terraform Associate, mais três projetos públicos. Seu ponto de partida é melhor que o da maioria: você já faz, no trabalho, coisas que as vagas pedem.

| O que você já tem | Por que pesa |
| --- | --- |
| Docker em sistema legado real na Codevasf: Dockerfile, compose, GitLab auto hospedado e Container Registry | É experiência de produção, o filtro mais difícil para quem é júnior |
| CKA em andamento pela KodeKloud, com lab local em minikube (Core Concepts até Application Lifecycle concluídos) | Kubernetes aparece em cerca de metade das vagas de nuvem no Brasil |
| Linux como sistema principal, terminal como IDE (Neovim, tmux, fish) | Base que muita gente pula e que entrevista técnica cobra |
| Python em pipeline de dados na PGFN | Automação e scripts; Python aparece em cerca de 4 de cada 10 vagas |
| Ciência da Computação no CEUB, formatura em jun/2027 | Abre programas de estágio e trainee até a formatura |

**Lacunas a fechar:** nuvem pública (AWS), Infraestrutura como Código (Terraform), CI/CD de ponta a ponta, observabilidade (Prometheus, Grafana), redes e inglês (de B1 para B2, se o alvo incluir vagas remotas de fora).

**Alvos:**

1. Até mar/2027: CKA aprovada, primeiro projeto público no GitHub e currículo específico de DevOps.
2. Até jun/2027: AWS SAA e Terraform Associate; candidaturas a estágio e júnior em DevOps, Cloud e SRE.
3. 2028 em diante: nível pleno, com especialização em SRE ou Platform Engineering e vagas remotas.

**Um ajuste de currículo:** no seu currículo de front end, a Codevasf fica de fora. No de DevOps é o contrário: a containerização do fwzend e do fwphp4 vira o destaque principal, descrita com números (quantas imagens, quantos serviços, o que mudou no deploy).

## O que é DevOps em 2026 e os cargos

DevOps virou um guarda chuva de cargos parecidos; as vagas usam nomes diferentes para funções que se sobrepõem, então vale procurar todos eles. O que une todos é levar software para produção com rapidez, segurança e confiabilidade, automatizando o caminho.

| Cargo | Foco | Rotina típica |
| --- | --- | --- |
| DevOps Engineer | Pipelines, automação, ambientes | CI/CD, Docker, Terraform, deploy, suporte a times de produto |
| Cloud Engineer | Infra em AWS, Azure ou GCP | Redes, IAM, custos, arquitetura de serviços na nuvem |
| SRE (Site Reliability Engineering) | Confiabilidade e incidentes | SLOs, monitoramento, plantão, pós incidente, automação de operação |
| Platform Engineer | Plataforma interna para os devs | Kubernetes como base, GitOps, portal interno (Backstage), autoatendimento |
| DevSecOps | Segurança no ciclo | Varredura de imagens, políticas, segredos, conformidade |

Três tendências moldam a área agora:

* **Platform Engineering virou padrão.** No relatório DORA 2025 (Google Cloud, cerca de 5 mil respondentes), 90% das organizações já adotaram plataforma interna e 76% têm time dedicado a ela.
* **IA amplifica o que já existe.** O mesmo relatório conclui que IA acelera times com boa base de engenharia e piora a instabilidade nos que não têm. Quem constrói essa base (pipelines, padrões, plataforma) ganha relevância.
* **Segurança, custo e observabilidade entraram no pacote.** Vagas de 2026 cobram o básico de segurança e de FinOps (controle de custo de nuvem) junto com automação.

## Mercado de trabalho

DevOps segue entre as áreas mais bem pagas da tecnologia no Brasil, mas a porta de entrada é estreita: vagas de júnior são poucas e muitas empresas preferem pleno, porque infraestrutura envolve risco alto. Quem entra costuma vir de áreas vizinhas (desenvolvimento, suporte N2, infraestrutura), e é exatamente aí que sua experiência com Docker conta.

### Salários estimados (2026, mensal)

| Nível | DevOps CLT | SRE CLT |
| --- | --- | --- |
| Júnior | R$ 4.500 a R$ 8.000 | R$ 6.000 a R$ 10.000 |
| Pleno | R$ 8.000 a R$ 14.000 | R$ 11.000 a R$ 18.000 |
| Sênior | R$ 14.000 a R$ 22.000 | R$ 18.000 a R$ 30.000 |

Quem está começando (estágio, trainee, primeiro emprego) em grandes centros costuma ver R$ 3.500 a R$ 6.000. Como PJ, júnior fica em R$ 6.000 a R$ 9.000 e pleno em R$ 10.000 a R$ 17.000.

São faixas de guias de carreira (JobRise), não pesquisa salarial formal; use como referência de negociação. Vagas remotas para empresas dos EUA pagam algo como US$ 60 mil a US$ 120 mil por ano para profissionais no Brasil, quase sempre a partir do pleno e com inglês fluente. Para comparar CLT com PJ, a regra prática citada é pedir 1,5 a 1,8 vez o valor CLT.

### O que as vagas pedem

Levantamento de 387 vagas de DevOps, Cloud, SRE e Platform no LinkedIn Brasil (11 set 2026, Carlos Bustillos). É um recorte de uma única fonte, mas bate com o que os guias de carreira descrevem.

| Habilidade | % das vagas |
| --- | --- |
| Observabilidade | 81% |
| Segurança | 78% |
| Automação | 75% |
| Redes | 58% |
| CI/CD | 58% |
| Terraform | 53% |
| Kubernetes | 52% |
| Infraestrutura como Código | 52% |
| Linux | 44% |
| Python | 41% |
| Docker | 35% |
| Bash | 27% |
| FinOps | 22% |
| Ansible | 22% |
| GitHub Actions | 18% |

Observabilidade, segurança e automação aparecem em três de cada quatro vagas; por isso elas entram nos projetos desde o início, e não só na Fase 4.

Nuvem: 54% das vagas pedem mais de uma nuvem; somando menções, AWS aparece em 65%, Azure em 50% e Google Cloud em 35%. Certificação aparece em 45% das vagas brasileiras, contra 21% na Irlanda, então no Brasil ela pesa de verdade no filtro.

**Onde procurar:** bancos, fintechs, varejo digital, telecom, consultorias e startups B2B; busque por "DevOps", "SRE", "Cloud Engineer", "Platform Engineer", "Analista de Infraestrutura" e "DevOps remoto Brasil". Cuidado com vaga de "júnior" que pede Kubernetes, Terraform, AWS, plantão e segurança ao mesmo tempo: costuma ser pleno pagando como júnior.

## Certificações

Três certificações formam o núcleo do plano: CKA, AWS Solutions Architect Associate e Terraform Associate. Juntas cobrem Kubernetes, nuvem e Infraestrutura como Código, os três blocos que mais filtram vagas, por cerca de US$ 666 a preço cheio.

| Certificação | Para quê | Preço cheio | Formato | Validade | Prioridade |
| --- | --- | --- | --- | --- | --- |
| CKA (Linux Foundation) | Administrar Kubernetes | US$ 445, inclui 2 tentativas e simulador killer.sh | Prática no terminal, 2 h | 2 anos | 1, já em andamento |
| AWS Solutions Architect Associate | Arquitetura em AWS, a nuvem mais pedida | US$ 150 | Múltipla escolha | 3 anos | 2 |
| Terraform Associate (004) | Infraestrutura como Código | US$ 70,50 | 57 questões, 60 min | 2 anos | 3 |
| AWS Cloud Practitioner | Porta de entrada em AWS | US$ 100, dá voucher de 50% para a próxima prova | Múltipla escolha | 3 anos | Opcional |
| KCNA | Fundamentos cloud native | US$ 250 | Múltipla escolha, 90 min | 3 anos | Opcional |
| Azure Fundamentals (AZ 900) | Base em Azure | US$ 99 (preço EUA; no Brasil varia) | Múltipla escolha, 45 min | Não expira | Opcional |
| Azure Administrator (AZ 104) | Administração Azure | US$ 165 (preço EUA) | Múltipla escolha | 1 ano, renovação gratuita | Se o alvo usar Azure |
| CKAD e CKS | Kubernetes para devs e segurança | US$ 445 cada; CKS exige CKA válida | Prática | 2 anos | Depois do primeiro emprego |

**Como pagar menos:**

* A Linux Foundation faz promoções frequentes de 30% a 40%, principalmente na Black Friday, Cyber Monday e semanas da KubeCon. Em junho de 2026 o exame individual chegou a US$ 267. Compre o voucher da CKA na Black Friday (fim de novembro); ele vale por 12 meses.
* Na AWS, quem passa em qualquer prova recebe 50% de desconto na próxima. Fazer Cloud Practitioner (US$ 100) e depois SAA por US$ 75 custa US$ 175, só US$ 25 a mais que a SAA sozinha, e rende duas certificações.
* Microsoft costuma ter preço acadêmico para estudantes e vouchers em eventos.

**Ordem recomendada:** CKA (já em curso), depois AWS SAA, depois Terraform Associate. Terraform vem depois da AWS porque você precisa de uma nuvem real para praticar. Evite "dumps" de questões: além de violar as regras das provas, não formam a habilidade que a entrevista técnica testa.

## Cursos, plataformas e livros

Uma plataforma paga basta: a KodeKloud, que você já usa, cobre Kubernetes, AWS, Terraform e CI/CD com laboratórios. O resto pode vir de material oficial gratuito, que é justamente o que as provas cobram.

### Gratuitos

| Recurso | Idioma | Use para |
| --- | --- | --- |
| [roadmap.sh DevOps](https://roadmap.sh/devops) | EN | Mapa de tópicos para conferir lacunas |
| [Descomplicando o Kubernetes](https://github.com/badtuxx/descomplicandokubernetes) e Descomplicando o Docker (LINUXtips) | PT | Reforço em português, do básico a Helm, Kyverno e Network Policies |
| Documentação do Kubernetes (kubernetes.io) | EN | Base da CKA; é a única fonte liberada durante a prova |
| AWS Skill Builder | EN | Trilhas oficiais gratuitas, incluindo Cloud Practitioner Essentials e Solutions Architect |
| Tutoriais HashiCorp Developer | EN | Trilha oficial de Terraform, cobre todos os domínios da prova 004 |
| [Livros de SRE do Google](https://sre.google/books/) | EN | Três livros completos e gratuitos: SRE, The Site Reliability Workbook e Building Secure and Reliable Systems |
| [Cloud Resume Challenge](https://cloudresumechallenge.dev/docs/the-challenge/aws/) | EN | Projeto guiado de ponta a ponta em AWS (ver Projetos) |
| 90DaysOfDevOps | EN | Desafio diário no GitHub, bom para manter ritmo |
| [GitHub Student Developer Pack](https://education.github.com/pack) | EN | Créditos para praticar sem gastar: US$ 100 em Azure sem cartão, US$ 200 na DigitalOcean por um ano, GitHub Pro e Copilot |

### Pagos

| Recurso | Preço | Vale a pena se |
| --- | --- | --- |
| KodeKloud Standard / Pro | US$ 15/mês / US$ 30/mês; descontos anuais variam de 21% a 50% em promoções | Você quer labs prontos; os labs de nuvem exigem o Pro |
| Alura (formação DevOps) | Plano Plus de 2 anos por cerca de R$ 2.400 a R$ 2.700 à vista, conforme a promoção | Você prefere conteúdo em português e estruturado (Docker, Kubernetes, Terraform, GitHub Actions, ECS) |
| Linux Foundation LFS258 + exame CKA | US$ 645 o pacote; curso sozinho US$ 299 | Raramente: o curso é leitura, sem labs; a KodeKloud cobre melhor |
| Treinamentos pagos da LINUXtips | Consultar | Você quer turmas ao vivo em português e comunidade |
| Simulados (Tutorials Dojo para AWS, Udemy para Terraform) | Cerca de US$ 15 a US$ 20 cada | Na reta final de cada prova |

### Livros de base

* **O Projeto Fênix** (Gene Kim e outros): romance que explica a cultura DevOps; leitura leve para começar.
* **Manual de DevOps** (The DevOps Handbook): as práticas por trás do romance.
* **Site Reliability Engineering** (Google): ler os capítulos 3 a 6 primeiro (risco, SLOs, toil, monitoramento).

## Plano de estudos por fases

Quatro fases de out/2026 a set/2027, cada uma fechada por uma certificação ou projeto, com cerca de 17 h 30 por semana. Candidaturas começam em mar/2027, ainda como estudante, para aproveitar vagas de estágio até a formatura.

| Fase | Período | Foco | Fecha com |
| --- | --- | --- | --- |
| 1 | out/2026 a fev/2027 | Kubernetes, redes e Linux | CKA |
| 2 | mar a mai/2027 | AWS e CI/CD | AWS SAA |
| 3 | jun a jul/2027 | Terraform e Ansible básico | Terraform Associate |
| 4 | ago a set/2027 | Observabilidade, GitOps e segurança | Projeto principal |

Cada prova fecha uma fase; a partir de março as candidaturas correm em paralelo aos estudos. A formatura (jun/2027) cai no meio da Fase 3.

### Fase 1: Kubernetes e fundamentos (out/2026 a fev/2027)

1. Começar com duas semanas de revisão (26/10 a 08/11) de tudo o que já foi estudado: Core Concepts, Scheduling, Logging e Monitoring e Application Lifecycle, com simulado diagnóstico no fim.
2. Depois, terminar o curso de CKA na ordem dos seus blocos: Cluster Maintenance, Security e RBAC, Storage, Networking, Extensibility (Helm, Kustomize, CRDs), Install e HA com kubeadm, Troubleshooting.
3. Em paralelo, 2 h por semana de fundamentos que a CKA assume: redes (DNS, TCP/IP, HTTP e TLS, CIDR e sub redes, balanceadores), Linux de administração (systemd, journalctl, permissões, processos) e Bash.
4. Montar um cluster com kubeadm em VMs locais pelo menos uma vez; minikube esconde a parte de instalação que a prova cobra.
5. Comprar o voucher na Black Friday; últimas 3 semanas só com simulados (os dois do killer.sh inclusos e os mocks da KodeKloud), cronometrados.
6. **Fecha com:** CKA aprovada e Projeto 1 publicado.

### Fase 2: AWS e CI/CD (mar a mai/2027)

1. Serviços núcleo: IAM, VPC (sub redes públicas e privadas, NAT, security groups), EC2, Auto Scaling, ELB, S3, RDS, Route 53, CloudWatch, Lambda.
2. CI/CD de verdade com GitHub Actions e GitLab CI (você já usa GitLab): build, testes, varredura da imagem, push para registry, deploy.
3. Estratégia de prova: Cloud Practitioner rápida no início de março (2 a 3 semanas) para pegar o voucher de 50%, depois SAA com Skill Builder, KodeKloud e simulados.
4. **Fecha com:** AWS SAA e Projeto 2 (Cloud Resume Challenge).

### Fase 3: Infraestrutura como Código (jun a jul/2027)

1. Terraform: providers, state remoto em S3 com lock, módulos, workspaces e ambientes (dev e prod), HCP Terraform (domínio novo da prova 004).
2. Ansible no básico para configuração de servidores (aparece em cerca de 1 de cada 5 vagas).
3. Reescrever a infra do Projeto 2 em Terraform, se ainda não estiver.
4. **Fecha com:** Terraform Associate e Projeto 3 iniciado.

### Fase 4: Observabilidade, GitOps e segurança (ago a set/2027)

1. Observabilidade, a habilidade mais citada nas vagas: Prometheus, Grafana, Loki, alertas e noções de OpenTelemetry; definir SLOs com base no livro de SRE.
2. GitOps com Argo CD e Helm charts próprios.
3. Segurança no pipeline: Trivy para imagens, gestão de segredos, princípio do menor privilégio no IAM e RBAC.
4. Noções de FinOps: tags, orçamento e alertas de custo na AWS.
5. **Fecha com:** Projeto 3 completo (o projeto principal do portfólio).

**Contínuo ao longo do ano:** inglês técnico (ler documentação já ajuda; simulação de entrevista uma vez por semana a partir de mar/2027) e um registro público do que aprende (LinkedIn ou blog), uma publicação a cada duas semanas.

## Projetos de portfólio

Três projetos públicos no GitHub, um por fase, contam mais que qualquer certificado na entrevista: eles provam que você sabe colocar algo em produção e explicar as decisões. Cada um cresce sobre o anterior.

| Projeto | O que prova | Ferramentas | Fase |
| --- | --- | --- | --- |
| 1. App legado em Kubernetes | Que você containeriza e orquestra um sistema antigo, como faz na Codevasf | Docker (build em múltiplos estágios), compose, Deployment, Service, Ingress, ConfigMap, Secret, probes, HPA, Helm | 1 |
| 2. Cloud Resume Challenge | Que você monta uma solução completa em AWS com pipeline | React (seu forte), S3, CloudFront, ACM, Route 53, Lambda, API Gateway, DynamoDB, GitHub Actions, Terraform | 2 e 3 |
| 3. Plataforma completa (projeto principal) | Que você pensa como DevOps pleno: infra, entrega, observabilidade e segurança | API em Python (FastAPI), Terraform na AWS, Kubernetes (EKS ou k3s em EC2), Argo CD, Prometheus, Grafana, Trivy | 3 e 4 |

**Cuidados:**

* No Projeto 1, use um app PHP de código aberto, nunca código ou configuração da Codevasf, que é privado. A experiência do trabalho vai no currículo; o projeto público reproduz o desafio com material aberto.
* Todo repositório precisa de README com diagrama de arquitetura, como subir, como destruir a infra, decisões tomadas e custo mensal estimado.
* No Projeto 3, simule uma falha (derrubar um pod, encher um disco), registre o alerta disparando e escreva um pós incidente curto. Isso vira história pronta para a entrevista.
* Use os créditos do Student Pack e o nível gratuito da AWS, com alerta de orçamento configurado no primeiro dia, e destrua a infra depois de cada sessão.

## Rotina semanal e método

Atualizado em 19/10/2026: com o bloco da manhã no estágio, a rotina passa de 10 para cerca de 17 h 30 por semana. As datas das provas continuam as mesmas; as horas a mais viram prática e revisão. Se uma semana apertar, corte teoria, nunca o lab.

| Quando | Tempo | O quê |
| --- | --- | --- |
| Segunda a quinta, 08:00 às 09:30 (estágio) | 1 h 30 por dia | Conteúdo do dia: aula, lab, aprofundamento ou base |
| Segunda a quinta, 14:00 às 15:30 | 1 h 30 por dia | Prática: bateria de 10 exercícios sobre o tema da manhã |
| Sexta, 08:00 às 09:30 (estágio) | 1 h 30 | Revisão da semana |
| Sexta, 14:00 às 15:30 | 1 h 30 | Reposição do que atrasou |
| Sábado, 09:00 às 12:00 | 3 h | Projeto de portfólio |
| Domingo, 19:00 às 20:00 | 1 h | Revisão espaçada dos erros e planejamento da próxima semana |

O roteiro da revisão de sexta, o caderno de erros e os prompts prontos estão em `metodo-de-revisao.md`. O conteúdo de cada dia está em `cronograma-semanal-trilha-devops.md`.

**Método que já funciona com você:** o formato dos seus blocos de CKA (explicação, questões de fixação, bateria de 10 exercícios com gabarito, arquivo .md e resumo visual por bloco) serve para AWS e Terraform também. Mantenha um chat por bloco e o glossário à parte.

**Regras práticas:**

* Uma prova marcada é o melhor motivador: agende cada exame assim que começar a fase, com 2 a 3 meses de antecedência.
* Ao fim de cada fase, uma semana só de revisão e simulados cronometrados.
* Tudo que você configurar em lab vira um commit; o histórico do GitHub mostra constância para o recrutador.

## Estratégia de entrada no mercado

O caminho mais curto para o primeiro cargo de DevOps é transformar o trabalho que você já tem em experiência de infra, e não esperar uma vaga com o título perfeito.

1. **Ganhe escopo de infra onde já está.** Na Codevasf, proponha um pipeline no GitLab CI que construa e publique as imagens do fwzend e do fwphp4 no registry automaticamente. Na PGFN, ofereça automatizar o deploy do que o Laboratório de Inovação produz. Seis meses disso valem mais no currículo que qualquer curso.
2. **Monte um currículo só de DevOps.** Termos que mais aparecem nas vagas brasileiras: nuvem, CI/CD, containers e Infraestrutura como Código. Resumo direto ("Estudante de Ciência da Computação buscando estágio ou júnior em DevOps, com experiência em containerização de sistemas legados"), certificações em uma linha, projetos com link e impacto em números.
3. **Mire em títulos vizinhos também.** Estágio em DevOps, Cloud ou Infraestrutura; Analista de Infraestrutura júnior; Cloud Support; DevOps júnior; Backend com responsabilidade de deploy. Empresas pequenas que estão começando a adotar DevOps contratam mais júnior.
4. **Apareça na comunidade.** Kubernetes Community Days (o KCD São Paulo 2026 foi em 26 de setembro; acompanhe a edição de 2027), grupos Kubernetes Brasil e SRE Brasil, comunidade da LINUXtips no Discord e meetups locais. Palestrar sobre "migrar PHP legado para containers" num meetup é um diferencial raro para júnior.
5. **Prepare a entrevista técnica.** Ela costuma ser de troubleshooting: "o pod não sobe", "o site ficou lento", "o deploy falhou". Treine contar seus projetos no formato problema, decisão, resultado, e revise Linux e redes.
6. **Vagas de fora ficam para o pleno.** Júnior internacional é raro; com 2 a 3 anos de experiência e inglês B2, a faixa remota em dólar fica realista.

## Orçamento estimado

O ano inteiro custa entre US$ 730 e US$ 1.150, quase todo em provas; comprar nas promoções e usar o voucher da AWS é o que separa as duas colunas.

| Item (12 meses) | Enxuto (US$) | Confortável (US$) |
| --- | --- | --- |
| CKA | 267 (promoção) | 445 |
| AWS Cloud Practitioner + SAA com voucher de 50% | 175 | 175 |
| Terraform Associate | 70,50 | 70,50 |
| KodeKloud | 180 (Standard anual) | 360 (Pro anual) |
| Simulados | 35 | 35 |
| Uso de nuvem nos labs | 0 (créditos do Student Pack e nível gratuito) | 60 (cerca de 10 por mês na fase AWS) |
| **Total** | **cerca de 730** | **cerca de 1.150** |

Valores em dólar no cartão internacional; some IOF e a cotação do dia. Pergunte na PGFN e na Codevasf se há verba de capacitação: certificação em nuvem costuma entrar nesses programas.

## Fontes

Preços e versões de prova mudam; confira a página oficial antes de comprar.

* [Salário de DevOps no Brasil 2026 (JobRise)](https://jobrise.io/pt/blog/salario-devops-no-brasil-2026-quanto-paga/)
* [Salário de DevOps em Florianópolis 2026 (JobRise)](https://jobrise.io/pt/blog/salario-devops-engineer-florianopolis-2026/)
* [SRE: vagas no Brasil 2026 (JobRise)](https://jobrise.io/pt/blog/sre-vagas-brasil-2026/)
* [Como se tornar DevOps sem experiência (JobRise)](https://jobrise.io/pt/blog/como-se-tornar-devops-engineer-sem-experiencia-2026/)
* [Resumo de currículo DevOps 2026 (JobRise)](https://jobrise.io/pt/blog/devops-engineer-resume-summary-examples-2026/)
* [Análise de 387 vagas de nuvem no Brasil (Carlos Bustillos, LinkedIn)](https://pe.linkedin.com/in/carlos-bustillos)
* [Relatório DORA 2025 (InfoQ)](https://www.infoq.com/news/2025/09/dora-state-of-ai-in-dev-2025)
* [Relatório DORA 2025 e platform engineering (IT Revolution)](https://itrevolution.com/?p=78991)
* [Júnior em DevOps: é realista em 2026?](https://yomotherboard.com/?p=554593)
* [Preços CKA, CKAD, CKS e LFCS](https://macmyths.com/new-certification-pricing-cka-ckad-cks-and-lfcs-costs-explained/)
* [CKA: pacotes e preços em out/2026](https://www.techinterview.org/bootcamp_directory/p/linux-foundation-cka/)
* [KCNA: preço e formato 2026](https://www.certcrush.app/blog/kcna-explained-domains-cost-worth-it-2026)
* [Preços das provas AWS 2026](https://studytech.ai/blog/aws-exam-fees-2026-every-certification)
* [Voucher de 50% da AWS](https://studytech.ai/blog/aws-certification-cost-complete-breakdown)
* [Terraform Associate 004 (HashiCorp)](https://developer.hashicorp.com/certifications/infrastructure-automation)
* [Terraform Associate 004: preço e formato](https://www.aguidetocloud.com/guided/hashicorp-terraform-associate/)
* [AZ 900 em 2026](https://trainingcamp.com/articles/az-900-in-2026-worth-it-or-skip-to-az-104/)
* [AZ 104: preço 2026](https://www.examcert.app/blog/az-104-exam-cost-2026/)
* [KodeKloud: mudança de preços em jun/2026 (PricingSaaS)](https://pricingsaas.com/companies/kodekloud/diffs/2026W24)
* [Alura: Kubernetes com kind, minikube e nuvem](https://www.alura.com.br/curso-online-kubernetes-criando-clusters-com-kind-minikube-e-cloud)
* [Descomplicando o Kubernetes (LINUXtips)](https://github.com/badtuxx/descomplicandokubernetes)
* [GitHub Student Developer Pack](https://education.github.com/pack)
* [Livros de SRE do Google](https://cloud.google.com/blog/products/devops-sre/the-sre-book-turns-6/)
* [Cloud Resume Challenge: relato de um brasileiro](https://dev.to/felipe_costacouto/troubleshooting-your-way-through-the-cloud-resume-challenge-59c3)
* [KCD São Paulo 2026](https://sessionize.com/kcd-sao-paulo-2026)
