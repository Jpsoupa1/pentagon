# Trilha Segurança (SecOps e Cibersegurança)

Base geral de SecOps e cibersegurança em paralelo à trilha DevOps, de 20/10/2026 a 22/10/2027 (53 semanas, 264 sessões, cerca de 5 h 50 por semana). São quatro fases, cada uma fechada por um portão, e a trilha termina na Security+. No fim, a ideia é escolher o lado: SOC, AppSec e DevSecOps ou Cloud Security. O plano completo, com a trilha dia a dia, está em `roadmap-profissional.md`.

No app, ela aparece em três lugares:

- **Agenda e Hoje:** o bloco "Ciber e SecOps", com a tarefa do dia.
- **Trilhas › Segurança › Roadmap** (`/trilhas/seguranca/roadmap`): mapa das fases, portão, requisitos para marcar, cursos, provas e simulados e prática com contadores.
- **Estudos**, no cartão "Segurança e SecOps": a fase em que hoje cai, o portão dela, os blocos da semana com a tarefa de cada dia e o link para o Roadmap.

## Horário

| Dia             | Horário        | Bloco          |
| --------------- | -------------- | -------------- |
| Segunda a sexta | 17:30 às 18:40 | Ciber e SecOps |

O bloco fica entre a academia (16:00 às 17:30) e a aula (19:10 às 22:00) e não divide horário com a DevOps: as tardes de segunda a quinta são da prática da CKA, e a de sexta é a reposição do que atrasou. O sábado à tarde fica livre.

É um compromisso recorrente da área Estudos, a partir de 20/10/2026 e sem data de fim. Mudar o horário, cancelar um dia ou apagar o bloco se faz pela agenda, e o deploy não recria o que foi apagado. A tarefa de cada dia vem de `src/server/roadmap/trilhas/seguranca-diaria.json`.

## Semanas leves

Nas retas finais das provas da DevOps, a Segurança fica leve: só segunda e quarta têm algo curto, e o resto do horário vai para a prova. As semanas leves aparecem no Roadmap e em Estudos só como informação. O bloco continua na agenda, com a tarefa leve do dia ("Livre: foco na CKA", por exemplo). Numa semana leve, a fase de antes continua como a atual, e a contagem do portão segue correndo.

| Semanas leves              | Período            | Prova da DevOps |
| -------------------------- | ------------------ | --------------- |
| Semanas leves da CKA       | 15/02 a 07/03/2027 | CKA             |
| Semanas leves da AWS SAA   | 17/05 a 06/06/2027 | AWS SAA         |
| Semanas leves do Terraform | 19/07 a 01/08/2027 | Terraform       |

Natal e Ano Novo também são semanas leves na trilha diária, mas sem ligação com a DevOps.

## Fases

1. **Fundamentos de segurança** (semanas 1 a 17, 20/10/2026 a 12/02/2027): redes e protocolos, Linux e Windows, criptografia e identidade, ameaças e controles, governança e LGPD. Portão **Base** (marco, 12/02/2027): cursos concluídos, badge da Cisco e simulado de fundamentos acima de 75%. Sem prova paga.
2. **SecOps e blue team** (semanas 21 a 30, 08/03 a 16/05/2027): triagem de alertas, SIEM, detecção na rede e no endpoint, resposta a incidentes e MITRE ATT&CK. Portão **SOC** (projeto, 14/05/2027): Projeto SOC em casa com Wazuh, Suricata e Sysmon, regras próprias e um relatório de incidente.
3. **Ofensiva e web** (semanas 34 a 39, 07/06 a 18/07/2027): metodologia e ética, OWASP, reconhecimento, exploração e escalação de privilégio, relatório com correção. Portão **Web** (projeto, 16/07/2027): labs Apprentice da PortSwigger e dois relatórios de pentest.
4. **Consolidação e Security+** (semanas 42 a 53, 02/08 a 22/10/2027): revisão dos cinco domínios, PBQs e simulados. Portão **CompTIA Security+** (prova, 22/10/2027). Os pesos dos domínios no Roadmap são provisórios.

Prática só em laboratório próprio e nas plataformas feitas para isso (TryHackMe, PortSwigger, OverTheWire, CyberDefenders, LetsDefend). Nada de testar sistemas de terceiros sem autorização por escrito.

## Flashcards

Cards com `"trilha": "SEG"` contam sozinhos nos contadores "Flashcards de portas e siglas" (Fase 1) e "Flashcards de siglas" (Fase 4): cada dia com pelo menos uma resposta dentro da fase soma 1.

## Onde ficam os dados

- `docs/seguranca/roadmap-profissional.md`: o plano completo e a tabela da trilha diária (a fonte). `npm run gerar:trilha-diaria` gera dela o `seguranca-diaria.json`.
- `src/server/roadmap/trilhas/seguranca.json`: fases, portões, requisitos, cursos, provas, prática e semanas leves. O deploy regrava o catálogo e mantém o que você marcou.
- `src/server/roadmap/compartilhamento.ts`: a fase atual e a semana leve de um dia (só informação).
- `src/server/estudos/seguranca.ts`: o bloco diário na agenda e a tarefa de cada dia.

Para rodar o seed à mão: `npm run seed:roadmap` (catálogo) e `npm run seed:seguranca` (bloco), ou `npm run db:migrate` para tudo.

## Histórico

Até 20/10/2026, a trilha era leve e sem datas: fases Fundamentos, Web, SecOps e DevSecOps, que você avançava à mão em Estudos, e sessões terça e quinta às 17:45 e sexta às 14:00. O deploy de 20/10/2026 trocou essa versão pela atual uma única vez.

Na manhã de 20/10/2026, a trilha passou a ter datas, com sessões terça e quinta às 14:00 (que tiravam essas tardes da DevOps fora das pausas, canceladas nas pausas) e sábado às 14:00. No mesmo dia, o deploy seguinte trocou essas três sessões pelo bloco diário das 17:30, uma única vez, e as tardes de terça e quinta voltaram para a CKA.
