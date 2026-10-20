# Trilha Segurança (SecOps e Cibersegurança)

Base geral de SecOps e cibersegurança em paralelo à trilha DevOps, de 19/10/2026 a 24/10/2027 (53 semanas, cerca de 5 h por semana). São quatro fases, cada uma fechada por um portão, e a trilha termina na Security+. No fim, a ideia é escolher o lado: SOC, AppSec e DevSecOps ou Cloud Security.

No app, ela aparece em dois lugares:

- **Trilhas › Segurança › Roadmap** (`/trilhas/seguranca/roadmap`): mapa das fases, portão, requisitos para marcar, cursos, provas e simulados e prática com contadores.
- **Estudos**, no cartão "Segurança e SecOps": a fase em que hoje cai, o portão dela, as sessões da semana e o link para o Roadmap.

## Sessões semanais

| Dia    | Horário        | Nas pausas                                       |
| ------ | -------------- | ------------------------------------------------ |
| Terça  | 14:00 às 15:30 | Volta para a DevOps                              |
| Quinta | 14:00 às 15:30 | Volta para a DevOps                              |
| Sábado | 14:00 às 16:00 | Continua (leve ou normal, conforme o cronograma) |

Nas semanas compartilhadas, as tardes de terça e quinta deixam de ser prática da DevOps e passam a ser da Segurança. Por isso a meta da "Bateria de 10 exercícios na tarde" da DevOps conta só as tardes que sobram para ela: 48, 32, 20 e 16 nas quatro fases.

As sessões são compromissos recorrentes da área Estudos. Mudar o horário, cancelar um dia ou apagar uma sessão se faz pela agenda, e o deploy não recria o que foi apagado. Nas pausas, terça e quinta já entram canceladas, com o motivo "Pausa: …".

## Pausas para a DevOps

A Segurança para nas revisões e nas retas finais das provas da DevOps. Durante uma pausa, a fase de antes dela continua como a atual, e a contagem do portão segue correndo.

| Pausa           | Período            | Prova da DevOps |
| --------------- | ------------------ | --------------- |
| Revisão CKA     | 26/10 a 08/11/2026 | CKA             |
| Pausa CKA       | 15/02 a 07/03/2027 | CKA             |
| Pausa AWS SAA   | 17/05 a 06/06/2027 | AWS SAA         |
| Pausa Terraform | 19/07 a 01/08/2027 | Terraform       |

## Fases

1. **Fundamentos de segurança** (semanas 1 a 17, 19/10/2026 a 14/02/2027): redes e protocolos, Linux e Windows, criptografia e identidade, ameaças e controles, governança e LGPD. Portão **Base** (marco, 13/02/2027): cursos concluídos, badge da Cisco e simulado de fundamentos acima de 75%. Sem prova paga.
2. **SecOps e blue team** (semanas 21 a 30, 08/03 a 16/05/2027): triagem de alertas, SIEM, detecção na rede e no endpoint, resposta a incidentes e MITRE ATT&CK. Portão **SOC** (projeto, 15/05/2027): Projeto SOC em casa com Wazuh, Suricata e Sysmon, regras próprias e um relatório de incidente.
3. **Ofensiva e web** (semanas 34 a 39, 07/06 a 18/07/2027): metodologia e ética, OWASP, reconhecimento, exploração e escalação de privilégio, relatório com correção. Portão **Web** (projeto, 17/07/2027): labs Apprentice da PortSwigger e dois relatórios de pentest.
4. **Consolidação e Security+** (semanas 42 a 53, 02/08 a 24/10/2027): revisão dos cinco domínios, PBQs e simulados. Portão **CompTIA Security+** (prova, 22/10/2027). Os pesos dos domínios no Roadmap são provisórios.

Prática só em laboratório próprio e nas plataformas feitas para isso (TryHackMe, PortSwigger, OverTheWire, CyberDefenders, LetsDefend). Nada de testar sistemas de terceiros sem autorização por escrito.

## Flashcards

Cards com `"trilha": "SEG"` contam sozinhos nos contadores "Flashcards de portas e siglas" (Fase 1) e "Flashcards de siglas" (Fase 4): cada dia com pelo menos uma resposta dentro da fase soma 1.

## Onde ficam os dados

- `src/server/roadmap/trilhas/seguranca.json`: fases, portões, requisitos, cursos, provas, prática e pausas. O deploy regrava o catálogo e mantém o que você marcou.
- `src/server/roadmap/compartilhamento.ts`: a regra de quem fica com a tarde de terça e quinta.
- `src/server/estudos/seguranca.ts`: as sessões semanais na agenda e os cancelamentos nas pausas.

Para rodar o seed à mão: `npm run seed:roadmap` (catálogo) e `npm run seed:seguranca` (sessões), ou `npm run db:migrate` para tudo.

## Histórico

Até 20/10/2026, a trilha era leve e sem datas: fases Fundamentos, Web, SecOps e DevSecOps, que você avançava à mão em Estudos, e sessões terça e quinta às 17:45 e sexta às 14:00. O deploy de 20/10/2026 trocou essa versão pela atual uma única vez.
