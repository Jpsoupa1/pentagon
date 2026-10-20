# Cronograma semana a semana da Trilha DevOps

Versão 2, de 19/10/2026. As datas das provas continuam as mesmas; as horas a mais viram prática. As duas primeiras semanas revisam tudo o que você já estudou para a CKA antes de seguir para Cluster Maintenance.

> **No app:** a trilha começou uma semana depois do previsto. A semana zero é de 19 a 25/10/2026 e a semana 1 começa em 26/10; as datas das semanas e das provas abaixo já seguem o app. O conteúdo de cada dia é o mesmo da versão 2 e é a fonte do seed (`src/server/estudos/cronograma.test.ts` confere dia a dia).

## Rotina da semana

| Dia | Manhã no estágio (08:00 às 09:30) | Tarde (14:00 às 15:30) |
| --- | --- | --- |
| Segunda | Aula: conteúdo novo | Prática do tema da manhã |
| Terça | Lab: prática guiada | Prática do tema da manhã |
| Quarta | Aprofundar: tópico avançado ou simulado | Prática do tema da manhã |
| Quinta | Base: redes, Linux, Bash ou CI/CD | Prática do tema da manhã |
| Sexta | **Revisão da semana** (roteiro em `metodo-de-revisao.md`) | Reposição do que atrasou |
| Sábado | Projeto de portfólio, 09:00 às 12:00 | |
| Domingo | Revisão espaçada e planejamento, 19:00 às 20:00 | |

Total: cerca de 19 h por semana (antes eram 10 h), com a reposição de sexta à tarde, que entrou em 20/10/2026. A academia (16:00 às 17:30), a trilha Segurança (17:30 às 18:40, de segunda a sexta) e as aulas da faculdade (19:10 às 22:00) ficam de fora desses blocos.

**Prática da tarde:** bateria de 10 exercícios sobre o tema da manhã, com gabarito no fim, no mesmo formato que você já usa na CKA. Quando a manhã for de lab ou simulado, a tarde corrige e refaz o que deu errado.

**Domingo:** refazer os exercícios que você errou na sexta e os erros de três semanas atrás (revisão espaçada), e conferir o plano da semana seguinte.

## Marcos

| Data | Marco |
| --- | --- |
| 27/11/2026 | Black Friday: comprar o voucher da CKA |
| 01/03/2027 | Início das candidaturas a estágio e júnior |
| 05/03/2027 | Prova CKA (meta) |
| 26/03/2027 | Prova AWS Cloud Practitioner (meta) |
| 04/06/2027 | Prova AWS Solutions Architect Associate (meta) |
| 30/07/2027 | Prova Terraform Associate (meta) |
| 01/10/2027 | Projeto principal publicado |

## Semana zero: preparação

### Semana zero · 19/10/2026 a 25/10/2026 · Preparação

| Dia | Conteúdo |
| --- | --- |
| Segunda | Ler o plano de estudos completo |
| Terça | Separar os horários fixos da semana |
| Quarta | Revisar o que já foi feito na CKA |
| Quinta | Configurar o app, o calendário e o widget da tela bloqueada |
| Sexta | Reposição do que atrasou |
| Sábado | Montar o lab no CachyOS (minikube e kind) e criar o repositório do Projeto 1 |
| Domingo | Planejar a semana 1 |

## Fase 1: Kubernetes e fundamentos (fecha com CKA)

### Semana 1 · 26/10/2026 a 01/11/2026 · Revisão CKA 1: Core Concepts e Scheduling

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Revisão: arquitetura do cluster, `etcd`, `kube-apiserver`, `kube-controller-manager`, `kube-scheduler`, `kubelet` e `kube-proxy` | Drill: inspecionar o control plane no minikube (pods do `kube-system` e manifests em `/etc/kubernetes/manifests`) |
| Terça | Revisão: Pods, ReplicaSets, Deployments, Namespaces e comandos imperativos | Drill: criar tudo por comando imperativo com `$do`; refazer o seletor imutável do ReplicaSet (lacuna) |
| Quarta | Revisão: labels e selectors, taints e tolerations, `nodeSelector` e node affinity | Drill: agendar pods em nós específicos no cluster de 2 nós (`cka` e `cka-m02`) |
| Quinta | Revisão: requests e limits, DaemonSets, static pods e múltiplos schedulers | Drill: criar um static pod do zero pelo `minikube ssh -p cka` (lacuna) |
| Sexta | Revisão da semana: Core Concepts e Scheduling | Reposição do que atrasou |
| Sábado | Projeto 1: escolher um app PHP de código aberto para o projeto (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 2 · 02/11/2026 a 08/11/2026 · Revisão CKA 2: Logging, Monitoring e Application Lifecycle

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Revisão: Metrics Server, `kubectl top` e logs de aplicação (incluindo multi container) | Drill: diagnosticar pods com `top`, `logs`, `describe` e `events` |
| Terça | Revisão: rolling update e rollback, command e args, variáveis de ambiente | Drill: Teste 2 da bateria de ALM (retomar de onde parou) |
| Quarta | Revisão: ConfigMaps, Secrets, multi container e initContainers | Drill: Teste 3 da bateria de ALM |
| Quinta | Autoscaling: HPA e noções de VPA (fecha o bloco 1) | Simulado diagnóstico: 15 tarefas de tudo o que foi revisado, 1 h, só com a documentação do Kubernetes |
| Sexta | Revisão da semana + resultado do simulado diagnóstico: escolher os 3 pontos mais fracos para reforçar | Reposição do que atrasou |
| Sábado | Projeto 1: escrever o Dockerfile do app PHP (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 3 · 09/11/2026 a 15/11/2026 · Cluster Maintenance (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Drain, cordon e atualização do sistema dos nós | Prática do tema da manhã |
| Terça | Upgrade do cluster com kubeadm | Prática do tema da manhã |
| Quarta | Backup e restore do etcd | Prática do tema da manhã |
| Quinta | Redes: HTTP, TLS e certificados | Prática do tema da manhã |
| Sexta | Revisão da semana: Cluster Maintenance (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: compose local com o banco de dados (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 4 · 16/11/2026 a 22/11/2026 · Cluster Maintenance (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Drain, cordon e atualização do sistema dos nós | Prática do tema da manhã |
| Terça | Upgrade do cluster com kubeadm | Prática do tema da manhã |
| Quarta | Backup e restore do etcd | Prática do tema da manhã |
| Quinta | Redes: HTTP, TLS e certificados | Prática do tema da manhã |
| Sexta | Revisão da semana: Cluster Maintenance (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: compose local com o banco de dados (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 5 · 23/11/2026 a 29/11/2026 · Security e RBAC (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Certificados TLS do cluster e kubeconfig | Prática do tema da manhã |
| Terça | Roles, ClusterRoles e ServiceAccounts | Prática do tema da manhã |
| Quarta | Network Policies e segurança de imagens | Prática do tema da manhã |
| Quinta | Linux: systemd e journalctl | Prática do tema da manhã |
| Sexta | Revisão da semana: Security e RBAC (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: manifests básicos (Deployment e Service) (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 6 · 30/11/2026 a 06/12/2026 · Security e RBAC (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Certificados TLS do cluster e kubeconfig | Prática do tema da manhã |
| Terça | Roles, ClusterRoles e ServiceAccounts | Prática do tema da manhã |
| Quarta | Network Policies e segurança de imagens | Prática do tema da manhã |
| Quinta | Linux: systemd e journalctl | Prática do tema da manhã |
| Sexta | Revisão da semana: Security e RBAC (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: manifests básicos (Deployment e Service) (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 7 · 07/12/2026 a 13/12/2026 · Storage (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Volumes, PersistentVolumes e PersistentVolumeClaims | Prática do tema da manhã |
| Terça | StorageClass e provisionamento dinâmico | Prática do tema da manhã |
| Quarta | Revisão em exercícios: Security e Storage | Prática do tema da manhã |
| Quinta | Linux: permissões, usuários e processos | Prática do tema da manhã |
| Sexta | Revisão da semana: Storage (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: ConfigMap, Secret e volume persistente (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 8 · 14/12/2026 a 20/12/2026 · Storage (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Volumes, PersistentVolumes e PersistentVolumeClaims | Prática do tema da manhã |
| Terça | StorageClass e provisionamento dinâmico | Prática do tema da manhã |
| Quarta | Revisão em exercícios: Security e Storage | Prática do tema da manhã |
| Quinta | Linux: permissões, usuários e processos | Prática do tema da manhã |
| Sexta | Revisão da semana: Storage (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: ConfigMap, Secret e volume persistente (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 9 · 21/12/2026 a 27/12/2026 · Networking (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | CNI, rede de pods e Services | Prática do tema da manhã |
| Terça | CoreDNS e Ingress | Prática do tema da manhã |
| Quarta | Gateway API e troubleshooting de rede | Prática do tema da manhã |
| Quinta | Redes: CIDR e sub redes | Prática do tema da manhã |
| Sexta | Revisão da semana: Networking (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: Ingress e probes (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 10 · 28/12/2026 a 03/01/2027 · Networking (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | CNI, rede de pods e Services | Prática do tema da manhã |
| Terça | CoreDNS e Ingress | Prática do tema da manhã |
| Quarta | Gateway API e troubleshooting de rede | Prática do tema da manhã |
| Quinta | Redes: CIDR e sub redes | Prática do tema da manhã |
| Sexta | Revisão da semana: Networking (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: Ingress e probes (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 11 · 04/01/2027 a 10/01/2027 · Extensibility (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Helm: charts, values e releases | Prática do tema da manhã |
| Terça | Kustomize com overlays | Prática do tema da manhã |
| Quarta | CRDs e Operators | Prática do tema da manhã |
| Quinta | Bash: variáveis, laços e funções | Prática do tema da manhã |
| Sexta | Revisão da semana: Extensibility (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: Helm chart do app (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 12 · 11/01/2027 a 17/01/2027 · Extensibility (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Helm: charts, values e releases | Prática do tema da manhã |
| Terça | Kustomize com overlays | Prática do tema da manhã |
| Quarta | CRDs e Operators | Prática do tema da manhã |
| Quinta | Bash: variáveis, laços e funções | Prática do tema da manhã |
| Sexta | Revisão da semana: Extensibility (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: Helm chart do app (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 13 · 18/01/2027 a 24/01/2027 · Install e HA (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Kubeadm: requisitos e init | Prática do tema da manhã |
| Terça | Cluster com kubeadm em VMs locais | Prática do tema da manhã |
| Quarta | Alta disponibilidade do control plane | Prática do tema da manhã |
| Quinta | Redes: balanceadores e proxies reversos | Prática do tema da manhã |
| Sexta | Revisão da semana: Install e HA (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: HPA e README com diagrama (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 14 · 25/01/2027 a 31/01/2027 · Install e HA (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Kubeadm: requisitos e init | Prática do tema da manhã |
| Terça | Cluster com kubeadm em VMs locais | Prática do tema da manhã |
| Quarta | Alta disponibilidade do control plane | Prática do tema da manhã |
| Quinta | Redes: balanceadores e proxies reversos | Prática do tema da manhã |
| Sexta | Revisão da semana: Install e HA (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: HPA e README com diagrama (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 15 · 01/02/2027 a 07/02/2027 · Troubleshooting (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Falhas de aplicação: logs, eventos e describe | Prática do tema da manhã |
| Terça | Falhas do control plane | Prática do tema da manhã |
| Quarta | Falhas de nó e de rede | Prática do tema da manhã |
| Quinta | Revisão geral de Linux e redes | Prática do tema da manhã |
| Sexta | Revisão da semana: Troubleshooting (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: publicar no GitHub e postar no LinkedIn (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 16 · 08/02/2027 a 14/02/2027 · Troubleshooting (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Falhas de aplicação: logs, eventos e describe | Prática do tema da manhã |
| Terça | Falhas do control plane | Prática do tema da manhã |
| Quarta | Falhas de nó e de rede | Prática do tema da manhã |
| Quinta | Revisão geral de Linux e redes | Prática do tema da manhã |
| Sexta | Revisão da semana: Troubleshooting (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 1: publicar no GitHub e postar no LinkedIn (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 17 · 15/02/2027 a 21/02/2027 · Simulados CKA (parte 1 de 3)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Simulado killer.sh ou mock da KodeKloud (2 h) | Prática do tema da manhã |
| Terça | Corrigir o simulado e refazer os erros | Prática do tema da manhã |
| Quarta | Drill dos domínios mais fracos | Prática do tema da manhã |
| Quinta | Velocidade: aliases, comandos imperativos e documentação | Prática do tema da manhã |
| Sexta | Revisão da semana: Simulados CKA (parte 1 de 3) | Reposição do que atrasou |
| Sábado | Simulado completo cronometrado (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 18 · 22/02/2027 a 28/02/2027 · Simulados CKA (parte 2 de 3)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Simulado killer.sh ou mock da KodeKloud (2 h) | Prática do tema da manhã |
| Terça | Corrigir o simulado e refazer os erros | Prática do tema da manhã |
| Quarta | Drill dos domínios mais fracos | Prática do tema da manhã |
| Quinta | Velocidade: aliases, comandos imperativos e documentação | Prática do tema da manhã |
| Sexta | Revisão da semana: Simulados CKA (parte 2 de 3) | Reposição do que atrasou |
| Sábado | Simulado completo cronometrado (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 19 · 01/03/2027 a 07/03/2027 · Simulados CKA (parte 3 de 3)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Simulado killer.sh ou mock da KodeKloud (2 h) | Prática do tema da manhã |
| Terça | Corrigir o simulado e refazer os erros | Prática do tema da manhã |
| Quarta | Drill dos domínios mais fracos | Prática do tema da manhã |
| Quinta | Velocidade: aliases, comandos imperativos e documentação | Prática do tema da manhã |
| Sexta | Revisão da semana: Simulados CKA (parte 3 de 3) | Reposição do que atrasou |
| Sábado | Simulado completo cronometrado (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

## Fase 2: AWS e CI/CD (fecha com AWS SAA)

### Semana 20 · 08/03/2027 a 14/03/2027 · AWS Cloud Practitioner (parte 1 de 3)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Skill Builder: Cloud Practitioner Essentials | Prática do tema da manhã |
| Terça | Conta AWS com MFA e alerta de orçamento | Prática do tema da manhã |
| Quarta | Responsabilidade compartilhada, preços e suporte | Prática do tema da manhã |
| Quinta | Simulado Cloud Practitioner | Prática do tema da manhã |
| Sexta | Revisão da semana: AWS Cloud Practitioner (parte 1 de 3) | Reposição do que atrasou |
| Sábado | Projeto 2: site do currículo em React (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 21 · 15/03/2027 a 21/03/2027 · AWS Cloud Practitioner (parte 2 de 3)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Skill Builder: Cloud Practitioner Essentials | Prática do tema da manhã |
| Terça | Conta AWS com MFA e alerta de orçamento | Prática do tema da manhã |
| Quarta | Responsabilidade compartilhada, preços e suporte | Prática do tema da manhã |
| Quinta | Simulado Cloud Practitioner | Prática do tema da manhã |
| Sexta | Revisão da semana: AWS Cloud Practitioner (parte 2 de 3) | Reposição do que atrasou |
| Sábado | Projeto 2: site do currículo em React (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 22 · 22/03/2027 a 28/03/2027 · AWS Cloud Practitioner (parte 3 de 3)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Skill Builder: Cloud Practitioner Essentials | Prática do tema da manhã |
| Terça | Conta AWS com MFA e alerta de orçamento | Prática do tema da manhã |
| Quarta | Responsabilidade compartilhada, preços e suporte | Prática do tema da manhã |
| Quinta | Simulado Cloud Practitioner | Prática do tema da manhã |
| Sexta | Revisão da semana: AWS Cloud Practitioner (parte 3 de 3) | Reposição do que atrasou |
| Sábado | Projeto 2: site do currículo em React (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 23 · 29/03/2027 a 04/04/2027 · IAM e VPC (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | IAM: usuários, papéis e políticas | Prática do tema da manhã |
| Terça | VPC com sub redes públicas e privadas | Prática do tema da manhã |
| Quarta | NAT, security groups e NACLs | Prática do tema da manhã |
| Quinta | CI/CD: fundamentos de GitHub Actions | Prática do tema da manhã |
| Sexta | Revisão da semana: IAM e VPC (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 2: site no S3 com CloudFront e HTTPS (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 24 · 05/04/2027 a 11/04/2027 · IAM e VPC (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | IAM: usuários, papéis e políticas | Prática do tema da manhã |
| Terça | VPC com sub redes públicas e privadas | Prática do tema da manhã |
| Quarta | NAT, security groups e NACLs | Prática do tema da manhã |
| Quinta | CI/CD: fundamentos de GitHub Actions | Prática do tema da manhã |
| Sexta | Revisão da semana: IAM e VPC (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 2: site no S3 com CloudFront e HTTPS (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 25 · 12/04/2027 a 18/04/2027 · EC2 e escalabilidade

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | EC2, AMIs e EBS | Prática do tema da manhã |
| Terça | ELB com Auto Scaling | Prática do tema da manhã |
| Quarta | Alta disponibilidade entre zonas | Prática do tema da manhã |
| Quinta | CI/CD: pipeline de build e testes | Prática do tema da manhã |
| Sexta | Revisão da semana: EC2 e escalabilidade | Reposição do que atrasou |
| Sábado | Projeto 2: domínio no Route 53 (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 26 · 19/04/2027 a 25/04/2027 · Armazenamento e dados

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | S3: classes, ciclo de vida e políticas | Prática do tema da manhã |
| Terça | RDS com backup e réplica de leitura | Prática do tema da manhã |
| Quarta | Route 53 e políticas de roteamento | Prática do tema da manhã |
| Quinta | CI/CD: varredura da imagem e push no registry | Prática do tema da manhã |
| Sexta | Revisão da semana: Armazenamento e dados | Reposição do que atrasou |
| Sábado | Projeto 2: API com Lambda e DynamoDB (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 27 · 26/04/2027 a 02/05/2027 · Serverless e monitoramento

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Lambda, API Gateway e DynamoDB | Prática do tema da manhã |
| Terça | CloudWatch, métricas e alarmes | Prática do tema da manhã |
| Quarta | Mensageria: SQS e SNS | Prática do tema da manhã |
| Quinta | CI/CD: deploy automático na AWS | Prática do tema da manhã |
| Sexta | Revisão da semana: Serverless e monitoramento | Reposição do que atrasou |
| Sábado | Projeto 2: contador de visitas no site (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 28 · 03/05/2027 a 09/05/2027 · CI/CD de ponta a ponta (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | GitLab CI: stages, jobs e runners | Prática do tema da manhã |
| Terça | Pipeline do Projeto 1 no GitLab CI | Prática do tema da manhã |
| Quarta | Estratégias de deploy: rolling, blue green e canary | Prática do tema da manhã |
| Quinta | AWS Well Architected: os seis pilares | Prática do tema da manhã |
| Sexta | Revisão da semana: CI/CD de ponta a ponta (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 2: pipeline completo no GitHub Actions (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 29 · 10/05/2027 a 16/05/2027 · CI/CD de ponta a ponta (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | GitLab CI: stages, jobs e runners | Prática do tema da manhã |
| Terça | Pipeline do Projeto 1 no GitLab CI | Prática do tema da manhã |
| Quarta | Estratégias de deploy: rolling, blue green e canary | Prática do tema da manhã |
| Quinta | AWS Well Architected: os seis pilares | Prática do tema da manhã |
| Sexta | Revisão da semana: CI/CD de ponta a ponta (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 2: pipeline completo no GitHub Actions (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 30 · 17/05/2027 a 23/05/2027 · Simulados SAA (parte 1 de 3)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Simulado SAA (Tutorials Dojo) | Prática do tema da manhã |
| Terça | Revisar os erros do simulado | Prática do tema da manhã |
| Quarta | Drill: redes e segurança | Prática do tema da manhã |
| Quinta | Drill: armazenamento e custos | Prática do tema da manhã |
| Sexta | Revisão da semana: Simulados SAA (parte 1 de 3) | Reposição do que atrasou |
| Sábado | Projeto 2: testes e README (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 31 · 24/05/2027 a 30/05/2027 · Simulados SAA (parte 2 de 3)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Simulado SAA (Tutorials Dojo) | Prática do tema da manhã |
| Terça | Revisar os erros do simulado | Prática do tema da manhã |
| Quarta | Drill: redes e segurança | Prática do tema da manhã |
| Quinta | Drill: armazenamento e custos | Prática do tema da manhã |
| Sexta | Revisão da semana: Simulados SAA (parte 2 de 3) | Reposição do que atrasou |
| Sábado | Projeto 2: testes e README (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 32 · 31/05/2027 a 06/06/2027 · Simulados SAA (parte 3 de 3)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Simulado SAA (Tutorials Dojo) | Prática do tema da manhã |
| Terça | Revisar os erros do simulado | Prática do tema da manhã |
| Quarta | Drill: redes e segurança | Prática do tema da manhã |
| Quinta | Drill: armazenamento e custos | Prática do tema da manhã |
| Sexta | Revisão da semana: Simulados SAA (parte 3 de 3) | Reposição do que atrasou |
| Sábado | Projeto 2: testes e README (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

## Fase 3: Infraestrutura como Código (fecha com Terraform Associate)

### Semana 33 · 07/06/2027 a 13/06/2027 · Terraform básico (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Providers, resources, variables e outputs | Prática do tema da manhã |
| Terça | A VPC da AWS em Terraform | Prática do tema da manhã |
| Quarta | Ciclo plan, apply e destroy; data sources | Prática do tema da manhã |
| Quinta | Ansible: inventário e primeiro playbook | Prática do tema da manhã |
| Sexta | Revisão da semana: Terraform básico (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 2: reescrever a infra em Terraform (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 34 · 14/06/2027 a 20/06/2027 · Terraform básico (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Providers, resources, variables e outputs | Prática do tema da manhã |
| Terça | A VPC da AWS em Terraform | Prática do tema da manhã |
| Quarta | Ciclo plan, apply e destroy; data sources | Prática do tema da manhã |
| Quinta | Ansible: inventário e primeiro playbook | Prática do tema da manhã |
| Sexta | Revisão da semana: Terraform básico (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 2: reescrever a infra em Terraform (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 35 · 21/06/2027 a 27/06/2027 · State e módulos (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | State remoto no S3 com lock | Prática do tema da manhã |
| Terça | Módulo próprio reutilizável | Prática do tema da manhã |
| Quarta | Workspaces e ambientes dev e prod | Prática do tema da manhã |
| Quinta | Ansible: roles e variáveis | Prática do tema da manhã |
| Sexta | Revisão da semana: State e módulos (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: Terraform da rede e do cluster (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 36 · 28/06/2027 a 04/07/2027 · State e módulos (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | State remoto no S3 com lock | Prática do tema da manhã |
| Terça | Módulo próprio reutilizável | Prática do tema da manhã |
| Quarta | Workspaces e ambientes dev e prod | Prática do tema da manhã |
| Quinta | Ansible: roles e variáveis | Prática do tema da manhã |
| Sexta | Revisão da semana: State e módulos (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: Terraform da rede e do cluster (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 37 · 05/07/2027 a 11/07/2027 · HCP Terraform e boas práticas (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | HCP Terraform: runs, variáveis e workspaces | Prática do tema da manhã |
| Terça | Terraform dentro do pipeline de CI | Prática do tema da manhã |
| Quarta | Formatação, validação e segurança do código | Prática do tema da manhã |
| Quinta | Simulado Terraform Associate | Prática do tema da manhã |
| Sexta | Revisão da semana: HCP Terraform e boas práticas (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: cluster Kubernetes na AWS (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 38 · 12/07/2027 a 18/07/2027 · HCP Terraform e boas práticas (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | HCP Terraform: runs, variáveis e workspaces | Prática do tema da manhã |
| Terça | Terraform dentro do pipeline de CI | Prática do tema da manhã |
| Quarta | Formatação, validação e segurança do código | Prática do tema da manhã |
| Quinta | Simulado Terraform Associate | Prática do tema da manhã |
| Sexta | Revisão da semana: HCP Terraform e boas práticas (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: cluster Kubernetes na AWS (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 39 · 19/07/2027 a 25/07/2027 · Simulados Terraform (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Simulado Terraform Associate | Prática do tema da manhã |
| Terça | Revisar os erros e refazer os labs | Prática do tema da manhã |
| Quarta | Drill: state e módulos | Prática do tema da manhã |
| Quinta | Drill: fluxo de trabalho e HCP Terraform | Prática do tema da manhã |
| Sexta | Revisão da semana: Simulados Terraform (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: deploy da API no cluster (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 40 · 26/07/2027 a 01/08/2027 · Simulados Terraform (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Simulado Terraform Associate | Prática do tema da manhã |
| Terça | Revisar os erros e refazer os labs | Prática do tema da manhã |
| Quarta | Drill: state e módulos | Prática do tema da manhã |
| Quinta | Drill: fluxo de trabalho e HCP Terraform | Prática do tema da manhã |
| Sexta | Revisão da semana: Simulados Terraform (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: deploy da API no cluster (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 41 · 02/08/2027 a 08/08/2027 · Revisão e descanso

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Revisar as anotações de AWS | Prática do tema da manhã |
| Terça | Revisar os labs de Kubernetes | Prática do tema da manhã |
| Quarta | Atualizar currículo e LinkedIn | Prática do tema da manhã |
| Quinta | Semana leve: só leitura | Prática do tema da manhã |
| Sexta | Revisão da semana: Revisão e descanso | Reposição do que atrasou |
| Sábado | Projeto 3: README parcial (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

## Fase 4: Observabilidade, GitOps e segurança (fecha com Projeto principal)

### Semana 42 · 09/08/2027 a 15/08/2027 · Prometheus e Grafana (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Prometheus: métricas, PromQL e exporters | Prática do tema da manhã |
| Terça | Kube prometheus stack com Helm | Prática do tema da manhã |
| Quarta | Grafana: painéis que respondem perguntas | Prática do tema da manhã |
| Quinta | Livro de SRE: capítulos 3 e 4 | Prática do tema da manhã |
| Sexta | Revisão da semana: Prometheus e Grafana (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: métricas da API (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 43 · 16/08/2027 a 22/08/2027 · Prometheus e Grafana (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Prometheus: métricas, PromQL e exporters | Prática do tema da manhã |
| Terça | Kube prometheus stack com Helm | Prática do tema da manhã |
| Quarta | Grafana: painéis que respondem perguntas | Prática do tema da manhã |
| Quinta | Livro de SRE: capítulos 3 e 4 | Prática do tema da manhã |
| Sexta | Revisão da semana: Prometheus e Grafana (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: métricas da API (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 44 · 23/08/2027 a 29/08/2027 · Logs, alertas e SLOs (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Loki e logs centralizados | Prática do tema da manhã |
| Terça | Alertmanager e regras de alerta | Prática do tema da manhã |
| Quarta | SLOs e orçamento de erro | Prática do tema da manhã |
| Quinta | Livro de SRE: capítulos 5 e 6 | Prática do tema da manhã |
| Sexta | Revisão da semana: Logs, alertas e SLOs (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: alerta e SLO da API (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 45 · 30/08/2027 a 05/09/2027 · Logs, alertas e SLOs (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Loki e logs centralizados | Prática do tema da manhã |
| Terça | Alertmanager e regras de alerta | Prática do tema da manhã |
| Quarta | SLOs e orçamento de erro | Prática do tema da manhã |
| Quinta | Livro de SRE: capítulos 5 e 6 | Prática do tema da manhã |
| Sexta | Revisão da semana: Logs, alertas e SLOs (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: alerta e SLO da API (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 46 · 06/09/2027 a 12/09/2027 · GitOps (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Argo CD: aplicações e sincronização | Prática do tema da manhã |
| Terça | Helm chart próprio com Argo CD | Prática do tema da manhã |
| Quarta | OpenTelemetry: noções de traces | Prática do tema da manhã |
| Quinta | FinOps: tags, orçamento e alertas de custo | Prática do tema da manhã |
| Sexta | Revisão da semana: GitOps (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: deploy via GitOps (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 47 · 13/09/2027 a 19/09/2027 · GitOps (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Argo CD: aplicações e sincronização | Prática do tema da manhã |
| Terça | Helm chart próprio com Argo CD | Prática do tema da manhã |
| Quarta | OpenTelemetry: noções de traces | Prática do tema da manhã |
| Quinta | FinOps: tags, orçamento e alertas de custo | Prática do tema da manhã |
| Sexta | Revisão da semana: GitOps (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: deploy via GitOps (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 48 · 20/09/2027 a 26/09/2027 · Segurança e fechamento (parte 1 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Trivy e varredura no pipeline | Prática do tema da manhã |
| Terça | Segredos e menor privilégio no IAM e no RBAC | Prática do tema da manhã |
| Quarta | Simular uma falha e escrever o pós incidente | Prática do tema da manhã |
| Quinta | Revisão para entrevistas técnicas | Prática do tema da manhã |
| Sexta | Revisão da semana: Segurança e fechamento (parte 1 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: README final e post no LinkedIn (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |

### Semana 49 · 27/09/2027 a 03/10/2027 · Segurança e fechamento (parte 2 de 2)

| Dia | Manhã no estágio | Tarde |
| --- | --- | --- |
| Segunda | Trivy e varredura no pipeline | Prática do tema da manhã |
| Terça | Segredos e menor privilégio no IAM e no RBAC | Prática do tema da manhã |
| Quarta | Simular uma falha e escrever o pós incidente | Prática do tema da manhã |
| Quinta | Revisão para entrevistas técnicas | Prática do tema da manhã |
| Sexta | Revisão da semana: Segurança e fechamento (parte 2 de 2) | Reposição do que atrasou |
| Sábado | Projeto 3: README final e post no LinkedIn (09:00 às 12:00) | |
| Domingo | Revisão espaçada e planejamento (19:00 às 20:00) | |
