# Roadmap profissional de Cibersegurança e SecOps

20 de out. de 2026

## Hoje: a primeira sessão (17:30 às 18:40)

Você começa hoje, 20/10, e a partir de amanhã segue a trilha diária de segunda a sexta, das 17:30 às 18:40.

1. 17:30. Criar a conta gratuita no TryHackMe e conferir na página de estudantes se o desconto vale para você. Não precisa pagar hoje.
2. 17:40. Inscrever-se no Cisco Introdução à Cibersegurança (em português, 15 h no total) e fazer o módulo 1.
3. 18:20. Criar o caderno-de-erros-seguranca.md e anotar 5 termos novos do módulo, cada um com uma frase sua.

Resto da semana: quarta (21/10), módulo 2 do Cisco. Quinta (22/10), Pre Security do TryHackMe, "como a web funciona". Sexta (23/10), montar o lab isolado com Kali e Metasploitable 2.

## Roadmap profissional

Você está na Base: a Security+ em 22/10/2027 fecha o primeiro ano, e a especialização em um lado vem em 2028.

Cada portão abre o nível seguinte. O primeiro emprego na área pode vir antes da especialização, como estágio ou SOC N1, já no segundo nível.

| Nível           | O que você sabe fazer                                                                   | Cargos de entrada            | Faixa salarial (R$ por mês) |
| --------------- | --------------------------------------------------------------------------------------- | ---------------------------- | --------------------------- |
| Base            | Ler tráfego, endurecer Linux e Windows, explicar CIA, criptografia e LGPD               | Estágio em TI ou segurança   | 1.800 a 3.500 (estágio)     |
| SecOps e ataque | Triar alertas num SIEM, conduzir a resposta a um incidente, achar falhas web com o Burp | Estágio em segurança, SOC N1 | 4.000 a 7.000 (júnior)      |
| Especialização  | Dominar um lado: resposta a incidentes, AppSec e DevSecOps ou Cloud Security            | Analista júnior de segurança | 4.000 a 7.000 (júnior)      |
| Pleno           | Conduzir incidentes, desenhar controles e ensinar quem chega                            | Analista pleno               | 8.000 a 13.000              |

Faixas de guia de carreira (JobRise), não pesquisa salarial formal. Com a DevOps em paralelo, DevSecOps e Cloud Security são os lados mais naturais para você.

## O primeiro ano em quatro fases

O primeiro ano tem quatro fases e termina na Security+ em 22/10/2027. Nas retas finais das três provas da DevOps, a semana fica leve.

Nas semanas leves, só segunda e quarta têm algo curto; o resto do horário fica livre para a prova da DevOps.

| Fase                   | Foco                                                     | Portão     | Para passar                                                                                                |
| ---------------------- | -------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| 1 · Fundamentos        | Redes, Linux, Windows, criptografia, ameaças, LGPD       | 12/02/2027 | Pre Security e Cyber Security 101 concluídos, badge da Cisco, Bandit até o nível 20, simulado acima de 75% |
| 2 · SecOps e blue team | SOC, MITRE ATT&CK, SIEM, detecção, resposta a incidentes | 14/05/2027 | SOC Level 1 concluído e Projeto SOC em casa (Wazuh, Suricata, Sysmon e regras próprias) no GitHub          |
| 3 · Ofensiva e web     | OWASP, Burp Suite, enumeração, escalação de privilégio   | 16/07/2027 | Jr Penetration Tester concluído, labs Apprentice da PortSwigger e 2 relatórios de pentest                  |
| 4 · Security+          | Os cinco domínios da SY0 801 e simulados                 | 22/10/2027 | Três simulados acima de 85% e a prova                                                                      |

## Trilha diária

São 264 sessões de 20/10/2026 a 22/10/2027, de segunda a sexta, das 17:30 às 18:40. As datas são o ritmo mínimo: adiantou, puxe a linha seguinte e siga.

Segunda é conteúdo, terça é lab, quarta e quinta são projeto ou CTF, sexta é revisão. Nas semanas leves das provas da DevOps, o horário fica livre para a prova.

No app, a tarefa do dia aparece no bloco "Ciber e SecOps" da Agenda e da tela Hoje. A tabela abaixo é a fonte: `scripts/gerar-trilha-diaria.mjs` gera `src/server/roadmap/trilhas/seguranca-diaria.json` a partir dela.

<!-- trilha-diaria:inicio -->

### Fase 1 e semana leve da CKA · 20/10/2026 a 05/03/2027

| Semana                                | Dia            | O que fazer                                                                                              |
| ------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------- |
| 1 · O mapa da segurança               | ter 20/10/2026 | Conta no TryHackMe, módulo 1 do Cisco e caderno de erros                                                 |
|                                       | qua 21/10/2026 | Cisco Introdução à Cibersegurança, módulo 2                                                              |
|                                       | qui 22/10/2026 | TryHackMe Pre Security: como a web funciona                                                              |
|                                       | sex 23/10/2026 | Montar o lab: VMs Kali e Metasploitable 2 em rede isolada                                                |
| 2 · Linux na prática com o Bandit     | seg 26/10/2026 | OverTheWire Bandit, níveis 0 a 3                                                                         |
|                                       | ter 27/10/2026 | Bandit, níveis 4 a 6                                                                                     |
|                                       | qua 28/10/2026 | Bandit, níveis 7 a 10                                                                                    |
|                                       | qui 29/10/2026 | Anotar no caderno os comandos Linux que o Bandit usou                                                    |
|                                       | sex 30/10/2026 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 3 · Linux na prática com o Bandit     | seg 02/11/2026 | Feriado (Finados). Opcional: OverTheWire Bandit, níveis 11 a 14                                          |
|                                       | ter 03/11/2026 | Bandit, níveis 15 a 17                                                                                   |
|                                       | qua 04/11/2026 | Bandit, níveis 18 a 20                                                                                   |
|                                       | qui 05/11/2026 | TryHackMe Pre Security: terminar o que ficou                                                             |
|                                       | sex 06/11/2026 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 4 · Ataques e proteção em visão geral | seg 09/11/2026 | Cisco Introdução à Cibersegurança, módulos 3 a 5: ataques, proteção de dados e da organização            |
|                                       | ter 10/11/2026 | TryHackMe Pre Security: fundamentos de redes (OSI, TCP/IP, pacotes)                                      |
|                                       | qua 11/11/2026 | Terminar os módulos do Pre Security que ficaram para trás                                                |
|                                       | qui 12/11/2026 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 13/11/2026 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 5 · Redes para quem defende           | seg 16/11/2026 | Portas, protocolos, DNS, HTTP e o que cada um expõe                                                      |
|                                       | ter 17/11/2026 | Wireshark: capturar e ler um handshake TCP, uma consulta DNS e um login HTTP sem TLS                     |
|                                       | qua 18/11/2026 | picoCTF: desafios de General Skills                                                                      |
|                                       | qui 19/11/2026 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 20/11/2026 | Feriado (Consciência Negra). Opcional: Revisão: folha em branco, caderno de erros e flashcards           |
| 6 · Linux para segurança              | seg 23/11/2026 | Usuários, permissões, SUID, sudo, logs em /var/log e no journald                                         |
|                                       | ter 24/11/2026 | TryHackMe Linux Fundamentals, partes 1 a 3                                                               |
|                                       | qua 25/11/2026 | Endurecer uma VM Linux: SSH só por chave, firewall com nftables e fail2ban                               |
|                                       | qui 26/11/2026 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 27/11/2026 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 7 · Windows para segurança            | seg 30/11/2026 | Feriado (Dia do Evangélico, DF). Opcional: Usuários e grupos, registro, Event Viewer e PowerShell básico |
|                                       | ter 01/12/2026 | TryHackMe Windows Fundamentals                                                                           |
|                                       | qua 02/12/2026 | Prova final do curso Cisco Introdução à Cibersegurança e badge no LinkedIn                               |
|                                       | qui 03/12/2026 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 04/12/2026 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 8 · Criptografia na prática           | seg 07/12/2026 | Hash, criptografia simétrica e assimétrica, TLS e certificados                                           |
|                                       | ter 08/12/2026 | Lab com openssl: criar uma CA, assinar um certificado, conferir hashes e quebrar um hash fraco com John  |
|                                       | qua 09/12/2026 | picoCTF: desafios de Cryptography                                                                        |
|                                       | qui 10/12/2026 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 11/12/2026 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 9 · Revisão do bloco de novembro      | seg 14/12/2026 | Folha em branco: redes, Linux e Windows                                                                  |
|                                       | ter 15/12/2026 | Refazer os labs que ficaram pela metade                                                                  |
|                                       | qua 16/12/2026 | picoCTF: desafios de Web Exploitation, sem pressa                                                        |
|                                       | qui 17/12/2026 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 18/12/2026 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 10 · Semana leve de Natal             | seg 21/12/2026 | Identidade e acesso: autenticação, MFA, gestão de senhas e menor privilégio                              |
|                                       | ter 22/12/2026 | TryHackMe Cyber Security 101: introdução à segurança ofensiva e defensiva                                |
|                                       | qua 23/12/2026 | Livre                                                                                                    |
|                                       | qui 24/12/2026 | Livre (véspera)                                                                                          |
|                                       | sex 25/12/2026 | Feriado (Natal)                                                                                          |
| 11 · Semana leve de Ano Novo          | seg 28/12/2026 | Ameaças e malware: tipos, Cyber Kill Chain, engenharia social e phishing                                 |
|                                       | ter 29/12/2026 | TryHackMe Cyber Security 101: ferramentas de linha de comando                                            |
|                                       | qua 30/12/2026 | Livre                                                                                                    |
|                                       | qui 31/12/2026 | Livre (véspera)                                                                                          |
|                                       | sex 01/01/2027 | Feriado (Ano Novo)                                                                                       |
| 12 · Vulnerabilidades                 | seg 04/01/2027 | CVE, CVSS e como funciona uma varredura de vulnerabilidades                                              |
|                                       | ter 05/01/2027 | Nmap e Greenbone (OpenVAS) contra a VM alvo; ler o relatório                                             |
|                                       | qua 06/01/2027 | Revisão do bloco de dezembro com folha em branco                                                         |
|                                       | qui 07/01/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 08/01/2027 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 13 · Defesa de perímetro              | seg 11/01/2027 | Firewalls, IDS e IPS, VPN e segmentação de rede                                                          |
|                                       | ter 12/01/2027 | Suricata básico: instalar e ver um alerta disparar no lab                                                |
|                                       | qua 13/01/2027 | Diagrama de rede do lab com as zonas e o que cada uma pode acessar                                       |
|                                       | qui 14/01/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 15/01/2027 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 14 · Logs e monitoramento             | seg 18/01/2027 | Syslog, eventos do Windows e o que é um SIEM                                                             |
|                                       | ter 19/01/2027 | TryHackMe Cyber Security 101: módulos de segurança defensiva                                             |
|                                       | qua 20/01/2027 | picoCTF: desafios de Forensics                                                                           |
|                                       | qui 21/01/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 22/01/2027 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 15 · Governança e LGPD                | seg 25/01/2027 | LGPD, ISO 27001 em linhas gerais, políticas e gestão de risco                                            |
|                                       | ter 26/01/2027 | Cartilha do CERT.br e um caso público de incidente, lido do começo ao fim                                |
|                                       | qua 27/01/2027 | Simulado de fundamentos: 40 questões, meta de 75%                                                        |
|                                       | qui 28/01/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 29/01/2027 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 16 · Segurança em nuvem e containers  | seg 01/02/2027 | Responsabilidade compartilhada, imagens, segredos e menor privilégio (ponte com a DevOps)                |
|                                       | ter 02/02/2027 | Trivy na imagem do BookStack: ler as vulnerabilidades e corrigir a base                                  |
|                                       | qua 03/02/2027 | Revisão dos pontos fracos do simulado                                                                    |
|                                       | qui 04/02/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                                  |
|                                       | sex 05/02/2027 | Revisão: folha em branco, caderno de erros e flashcards                                                  |
| 17 · Portão da Fase 1                 | seg 08/02/2027 | Feriado (Carnaval). Opcional: Revisão final dos fundamentos                                              |
|                                       | ter 09/02/2027 | Feriado (Carnaval). Opcional: Fechar o Cyber Security 101 do TryHackMe                                   |
|                                       | qua 10/02/2027 | Fechar o que falta na lista de requisitos                                                                |
|                                       | qui 11/02/2027 | Folha em branco da fase inteira                                                                          |
|                                       | sex 12/02/2027 | Portão: conferir a lista de requisitos da Fase 1                                                         |
| 18 · Semana leve: reta final da CKA   | seg 15/02/2027 | 20 min no caderno de erros                                                                               |
|                                       | ter 16/02/2027 | Livre: foco na CKA                                                                                       |
|                                       | qua 17/02/2027 | Um desafio leve do picoCTF ou nada                                                                       |
|                                       | qui 18/02/2027 | Livre: foco na CKA                                                                                       |
|                                       | sex 19/02/2027 | Livre: foco na CKA                                                                                       |
| 19 · Semana leve: reta final da CKA   | seg 22/02/2027 | 20 min no caderno de erros                                                                               |
|                                       | ter 23/02/2027 | Livre: foco na CKA                                                                                       |
|                                       | qua 24/02/2027 | Um desafio leve do picoCTF ou nada                                                                       |
|                                       | qui 25/02/2027 | Livre: foco na CKA                                                                                       |
|                                       | sex 26/02/2027 | Livre: foco na CKA                                                                                       |
| 20 · Semana leve: prova CKA           | seg 01/03/2027 | 20 min no caderno de erros                                                                               |
|                                       | ter 02/03/2027 | Livre: foco na CKA                                                                                       |
|                                       | qua 03/03/2027 | Um desafio leve do picoCTF ou nada                                                                       |
|                                       | qui 04/03/2027 | Livre: foco na CKA                                                                                       |
|                                       | sex 05/03/2027 | Prova CKA: sem estudo de segurança                                                                       |

### Fase 2 e semana leve da AWS · 08/03 a 04/06/2027

| Semana                             | Dia            | O que fazer                                                                              |
| ---------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| 21 · O que faz um SOC              | seg 08/03/2027 | Papéis N1, N2 e N3, triagem de alertas, playbooks e turnos                               |
|                                    | ter 09/03/2027 | TryHackMe SOC Level 1: Cyber Defence Frameworks (Kill Chain, Pyramid of Pain)            |
|                                    | qua 10/03/2027 | Projeto SOC em casa: subir o Wazuh (manager e painel) numa VM                            |
|                                    | qui 11/03/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                  |
|                                    | sex 12/03/2027 | Revisão: folha em branco, caderno de erros e flashcards                                  |
| 22 · MITRE ATT&CK e inteligência   | seg 15/03/2027 | MITRE ATT&CK: táticas e técnicas e como mapear um alerta                                 |
|                                    | ter 16/03/2027 | TryHackMe SOC Level 1: Cyber Threat Intelligence                                         |
|                                    | qua 17/03/2027 | Instalar agentes do Wazuh no Linux e no Windows do lab                                   |
|                                    | qui 18/03/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                  |
|                                    | sex 19/03/2027 | Revisão: folha em branco, caderno de erros e flashcards                                  |
| 23 · Phishing                      | seg 22/03/2027 | Análise de phishing: cabeçalhos, links, anexos e reputação                               |
|                                    | ter 23/03/2027 | TryHackMe SOC Level 1: Phishing                                                          |
|                                    | qua 24/03/2027 | Analisar 3 mensagens de phishing de amostra e escrever o relatório                       |
|                                    | qui 25/03/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                  |
|                                    | sex 26/03/2027 | Feriado (Sexta Santa). Opcional: Revisão: folha em branco, caderno de erros e flashcards |
| 24 · Detecção na rede              | seg 29/03/2027 | Snort e Suricata, Zeek e análise de fluxo                                                |
|                                    | ter 30/03/2027 | TryHackMe SOC Level 1: Network Security and Traffic Analysis                             |
|                                    | qua 31/03/2027 | Integrar o Suricata ao Wazuh                                                             |
|                                    | qui 01/04/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                  |
|                                    | sex 02/04/2027 | Revisão: folha em branco, caderno de erros e flashcards                                  |
| 25 · Detecção no endpoint          | seg 05/04/2027 | Sysmon, EDR e processos suspeitos                                                        |
|                                    | ter 06/04/2027 | TryHackMe SOC Level 1: Endpoint Security Monitoring                                      |
|                                    | qua 07/04/2027 | Sysmon no Windows do lab enviando eventos para o Wazuh                                   |
|                                    | qui 08/04/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                  |
|                                    | sex 09/04/2027 | Revisão: folha em branco, caderno de erros e flashcards                                  |
| 26 · SIEM na prática               | seg 12/04/2027 | Consultas e painéis no Splunk e no Elastic                                               |
|                                    | ter 13/04/2027 | TryHackMe SOC Level 1: SIEM com Splunk                                                   |
|                                    | qua 14/04/2027 | Escrever 3 regras de detecção próprias no Wazuh                                          |
|                                    | qui 15/04/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                  |
|                                    | sex 16/04/2027 | Revisão: folha em branco, caderno de erros e flashcards                                  |
| 27 · Resposta a incidentes         | seg 19/04/2027 | NIST SP 800 61: preparação, detecção, contenção, erradicação, recuperação e lições       |
|                                    | ter 20/04/2027 | TryHackMe SOC Level 1: DFIR                                                              |
|                                    | qua 21/04/2027 | Feriado (Tiradentes). Opcional: Simular uma força bruta no SSH e conduzir a resposta     |
|                                    | qui 22/04/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                  |
|                                    | sex 23/04/2027 | Revisão: folha em branco, caderno de erros e flashcards                                  |
| 28 · Forense básica                | seg 26/04/2027 | Memória, disco e linha do tempo                                                          |
|                                    | ter 27/04/2027 | CyberDefenders: um lab gratuito de blue team                                             |
|                                    | qua 28/04/2027 | Relatório do incidente da semana passada, no formato de um SOC                           |
|                                    | qui 29/04/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                  |
|                                    | sex 30/04/2027 | Revisão: folha em branco, caderno de erros e flashcards                                  |
| 29 · Gestão de vulnerabilidades    | seg 03/05/2027 | Priorizar por impacto real: CVSS, EPSS e o catálogo KEV da CISA                          |
|                                    | ter 04/05/2027 | Fechar o SOC Level 1 do TryHackMe                                                        |
|                                    | qua 05/05/2027 | README do Projeto SOC com diagrama e regras                                              |
|                                    | qui 06/05/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta                  |
|                                    | sex 07/05/2027 | Revisão: folha em branco, caderno de erros e flashcards                                  |
| 30 · Portão da Fase 2              | seg 10/05/2027 | Revisão dos pontos fracos                                                                |
|                                    | ter 11/05/2027 | Simulação de turno de SOC no LetsDefend ou no Blue Team Labs Online                      |
|                                    | qua 12/05/2027 | Fechar o que falta na lista de requisitos                                                |
|                                    | qui 13/05/2027 | Folha em branco da fase inteira                                                          |
|                                    | sex 14/05/2027 | Portão: publicar o Projeto SOC no GitHub                                                 |
| 31 · Semana leve: simulados da SAA | seg 17/05/2027 | 20 min no caderno de erros                                                               |
|                                    | ter 18/05/2027 | Livre: foco na AWS SAA                                                                   |
|                                    | qua 19/05/2027 | Um lab leve do CyberDefenders ou nada                                                    |
|                                    | qui 20/05/2027 | Livre: foco na AWS SAA                                                                   |
|                                    | sex 21/05/2027 | Livre: foco na AWS SAA                                                                   |
| 32 · Semana leve: simulados da SAA | seg 24/05/2027 | 20 min no caderno de erros                                                               |
|                                    | ter 25/05/2027 | Livre: foco na AWS SAA                                                                   |
|                                    | qua 26/05/2027 | Um lab leve do CyberDefenders ou nada                                                    |
|                                    | qui 27/05/2027 | Feriado (Corpus Christi)                                                                 |
|                                    | sex 28/05/2027 | Livre: foco na AWS SAA                                                                   |
| 33 · Semana leve: prova SAA        | seg 31/05/2027 | 20 min no caderno de erros                                                               |
|                                    | ter 01/06/2027 | Livre: foco na AWS SAA                                                                   |
|                                    | qua 02/06/2027 | Um desafio leve do picoCTF ou nada                                                       |
|                                    | qui 03/06/2027 | Livre: foco na AWS SAA                                                                   |
|                                    | sex 04/06/2027 | Prova AWS SAA: sem estudo de segurança                                                   |

### Fase 3 e semana leve do Terraform · 07/06 a 30/07/2027

| Semana                                    | Dia            | O que fazer                                                                 |
| ----------------------------------------- | -------------- | --------------------------------------------------------------------------- |
| 34 · Pensar como atacante                 | seg 07/06/2027 | Metodologia de pentest e ética: escopo, autorização por escrito e relatório |
|                                           | ter 08/06/2027 | TryHackMe Jr Penetration Tester: reconhecimento                             |
|                                           | qua 09/06/2027 | PortSwigger: labs Apprentice de SQL injection                               |
|                                           | qui 10/06/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta     |
|                                           | sex 11/06/2027 | Revisão: folha em branco, caderno de erros e flashcards                     |
| 35 · OWASP Top 10                         | seg 14/06/2027 | OWASP Top 10: a lista atual e um exemplo real de cada item                  |
|                                           | ter 15/06/2027 | TryHackMe Jr Penetration Tester: vulnerabilidades web                       |
|                                           | qua 16/06/2027 | PortSwigger: labs Apprentice de XSS e controle de acesso                    |
|                                           | qui 17/06/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta     |
|                                           | sex 18/06/2027 | Revisão: folha em branco, caderno de erros e flashcards                     |
| 36 · Burp Suite                           | seg 21/06/2027 | Burp Suite: proxy, repeater e intruder                                      |
|                                           | ter 22/06/2027 | TryHackMe Jr Penetration Tester: Burp Suite                                 |
|                                           | qua 23/06/2027 | PortSwigger: autenticação e path traversal                                  |
|                                           | qui 24/06/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta     |
|                                           | sex 25/06/2027 | Revisão: folha em branco, caderno de erros e flashcards                     |
| 37 · Exploração de serviços               | seg 28/06/2027 | Nmap avançado, enumeração de serviços e Metasploit                          |
|                                           | ter 29/06/2027 | TryHackMe Jr Penetration Tester: Metasploit                                 |
|                                           | qua 30/06/2027 | Uma máquina fácil do TryHackMe com relatório completo                       |
|                                           | qui 01/07/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta     |
|                                           | sex 02/07/2027 | Revisão: folha em branco, caderno de erros e flashcards                     |
| 38 · Escalação de privilégio              | seg 05/07/2027 | Escalação de privilégio no Linux e no Windows                               |
|                                           | ter 06/07/2027 | TryHackMe Jr Penetration Tester: Privilege Escalation                       |
|                                           | qua 07/07/2027 | Segunda máquina fácil com relatório                                         |
|                                           | qui 08/07/2027 | Terminar a quarta; se sobrar tempo, refazer o lab de terça sem consulta     |
|                                           | sex 09/07/2027 | Revisão: folha em branco, caderno de erros e flashcards                     |
| 39 · Portão da Fase 3                     | seg 12/07/2027 | Active Directory em linhas gerais: Kerberos e os ataques mais comuns        |
|                                           | ter 13/07/2027 | Fechar o Jr Penetration Tester                                              |
|                                           | qua 14/07/2027 | Fechar o que falta na lista de requisitos                                   |
|                                           | qui 15/07/2027 | Folha em branco da fase inteira                                             |
|                                           | sex 16/07/2027 | Portão: labs Apprentice e 2 relatórios conferidos                           |
| 40 · Semana leve: reta final do Terraform | seg 19/07/2027 | 20 min no caderno de erros                                                  |
|                                           | ter 20/07/2027 | Livre: foco no Terraform                                                    |
|                                           | qua 21/07/2027 | Um desafio leve ou nada                                                     |
|                                           | qui 22/07/2027 | Livre: foco no Terraform                                                    |
|                                           | sex 23/07/2027 | Livre: foco no Terraform                                                    |
| 41 · Semana leve: prova Terraform         | seg 26/07/2027 | 20 min no caderno de erros                                                  |
|                                           | ter 27/07/2027 | Livre: foco no Terraform                                                    |
|                                           | qua 28/07/2027 | Um desafio leve do picoCTF ou nada                                          |
|                                           | qui 29/07/2027 | Livre: foco no Terraform                                                    |
|                                           | sex 30/07/2027 | Prova Terraform: sem estudo de segurança                                    |

### Fase 4 e Security+ · 02/08 a 22/10/2027

| Semana                  | Dia            | O que fazer                                                                      |
| ----------------------- | -------------- | -------------------------------------------------------------------------------- |
| 42 · Plano da Security+ | seg 02/08/2027 | Objetivos oficiais da SY0 801, marcar a prova e comprar o voucher acadêmico      |
|                         | ter 03/08/2027 | Professor Messer: domínio 1, conceitos gerais                                    |
|                         | qua 04/08/2027 | Simulado diagnóstico de Security+                                                |
|                         | qui 05/08/2027 | Corrigir o simulado diagnóstico e anotar os domínios mais fracos                 |
|                         | sex 06/08/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 43 · Domínio 2          | seg 09/08/2027 | Ameaças, vulnerabilidades e ataques                                              |
|                         | ter 10/08/2027 | Questões do domínio 2                                                            |
|                         | qua 11/08/2027 | Revisar os erros do diagnóstico                                                  |
|                         | qui 12/08/2027 | Mais 30 questões do domínio da semana                                            |
|                         | sex 13/08/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 44 · Domínio 2 (cont.)  | seg 16/08/2027 | Ameaças, vulnerabilidades e ataques: mitigação                                   |
|                         | ter 17/08/2027 | Questões do domínio 2                                                            |
|                         | qua 18/08/2027 | Ponte com a DevOps: Trivy e segredos no pipeline do Projeto 3                    |
|                         | qui 19/08/2027 | Mais 30 questões do domínio da semana                                            |
|                         | sex 20/08/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 45 · Domínio 3          | seg 23/08/2027 | Arquitetura de segurança: nuvem, rede, dados e resiliência                       |
|                         | ter 24/08/2027 | Questões do domínio 3                                                            |
|                         | qua 25/08/2027 | Revisão espaçada dos erros                                                       |
|                         | qui 26/08/2027 | Mais 30 questões do domínio da semana                                            |
|                         | sex 27/08/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 46 · Domínio 4, parte 1 | seg 30/08/2027 | Operações de segurança: monitoramento, identidade e acesso                       |
|                         | ter 31/08/2027 | Questões do domínio 4                                                            |
|                         | qua 01/09/2027 | Revisão espaçada dos erros                                                       |
|                         | qui 02/09/2027 | Mais 30 questões do domínio da semana                                            |
|                         | sex 03/09/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 47 · Domínio 4, parte 2 | seg 06/09/2027 | Operações de segurança: resposta a incidentes, forense e automação               |
|                         | ter 07/09/2027 | Feriado (Independência). Opcional: Questões do domínio 4                         |
|                         | qua 08/09/2027 | Revisão espaçada dos erros                                                       |
|                         | qui 09/09/2027 | Mais 30 questões do domínio da semana                                            |
|                         | sex 10/09/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 48 · Domínio 5          | seg 13/09/2027 | Gestão do programa: governança, risco, terceiros, conformidade e conscientização |
|                         | ter 14/09/2027 | Questões do domínio 5                                                            |
|                         | qua 15/09/2027 | Revisão espaçada dos erros                                                       |
|                         | qui 16/09/2027 | Mais 30 questões do domínio da semana                                            |
|                         | sex 17/09/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 49 · PBQs e simulado 1  | seg 20/09/2027 | Como funcionam as PBQs e como administrar o tempo                                |
|                         | ter 21/09/2027 | Bateria de PBQs                                                                  |
|                         | qua 22/09/2027 | Simulado completo 1, cronometrado, 17:30 às 19:00                                |
|                         | qui 23/09/2027 | Corrigir o simulado de quarta                                                    |
|                         | sex 24/09/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 50 · Simulado 2         | seg 27/09/2027 | Refazer as questões que errou no simulado 1                                      |
|                         | ter 28/09/2027 | Drill dos dois domínios mais fracos                                              |
|                         | qua 29/09/2027 | Simulado completo 2, cronometrado, 17:30 às 19:00                                |
|                         | qui 30/09/2027 | Corrigir o simulado de quarta                                                    |
|                         | sex 01/10/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 51 · Simulado 3         | seg 04/10/2027 | Refazer as questões que errou no simulado 2                                      |
|                         | ter 05/10/2027 | Bateria de PBQs                                                                  |
|                         | qua 06/10/2027 | Simulado completo 3, cronometrado, 17:30 às 19:00                                |
|                         | qui 07/10/2027 | Corrigir o simulado de quarta                                                    |
|                         | sex 08/10/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 52 · Reta final         | seg 11/10/2027 | Refazer as questões que errou no simulado 3                                      |
|                         | ter 12/10/2027 | Feriado (Nossa Senhora Aparecida). Opcional: Revisão leve dos acrônimos          |
|                         | qua 13/10/2027 | Revisão final com folha em branco                                                |
|                         | qui 14/10/2027 | Flashcards de siglas e portas                                                    |
|                         | sex 15/10/2027 | Revisão: folha em branco, caderno de erros e flashcards                          |
| 53 · Prova Security+    | seg 18/10/2027 | Revisão leve dos pontos fracos                                                   |
|                         | ter 19/10/2027 | Flashcards de siglas, 30 min                                                     |
|                         | qua 20/10/2027 | Descanso                                                                         |
|                         | qui 21/10/2027 | Descanso                                                                         |
|                         | sex 22/10/2027 | Prova Security+ (no horário que você agendar)                                    |

<!-- trilha-diaria:fim -->

## Certificações e custos

O primeiro ano custa cerca de US$ 335 no caminho enxuto: TryHackMe anual com desconto de estudante e a Security+ no voucher acadêmico. As outras provas são opcionais e dependem do lado que você escolher.

| Certificação                       | Quando                               | Preço                                                | Formato                                                            | Papel no roadmap                                |
| ---------------------------------- | ------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| CompTIA Security+ (SY0 801)        | 22/10/2027                           | US$ 439 cheio; cerca de US$ 220 no voucher acadêmico | Até 90 questões com PBQs, 90 min; corte 750 de 900 na versão atual | Núcleo: a prova de entrada mais citada em vagas |
| eJPT (INE)                         | Depois da Fase 3, se escolher ataque | US$ 249, com uma nova tentativa                      | 48 h, 35 questões sobre um lab                                     | Opcional                                        |
| SAL1 (TryHackMe)                   | Depois da Fase 2, se escolher SOC    | US$ 349, com uma nova tentativa                      | 80 questões e 2 cenários de SOC                                    | Opcional                                        |
| ISC2 CC                            | Não recomendada agora                | US$ 199 e US$ 50 por ano                             | 100 a 125 questões, 2 h                                            | Deixou de ser gratuita em 2026                  |
| CySA+, CKS, AWS Security Specialty | 2028                                 | Variam                                               | Variam                                                             | Especialização, depois da escolha do lado       |

| Gasto do primeiro ano   | Enxuto (US$)    | Confortável (US$) |
| ----------------------- | --------------- | ----------------- |
| TryHackMe Premium anual | 100 (estudante) | 134               |
| Security+               | 220 (acadêmico) | 439               |
| Simulados de Security+  | 15              | 20                |
| Total                   | 335             | 595               |

A SY0 801 sai em 17/11/2026 e a SY0 701 em inglês se aposenta em 11/06/2027, então você faz a 801. O voucher vale 12 meses: compre na loja acadêmica da CompTIA enquanto o email do CEUB estiver ativo. Valores em dólar no cartão internacional; some IOF e a cotação do dia.

## Recursos gratuitos e pagos

Uma assinatura paga basta, o TryHackMe Premium anual; todo o resto é gratuito.

| Recurso                           | Fase  | Preço                                | Idioma | Para quê                                                              |
| --------------------------------- | ----- | ------------------------------------ | ------ | --------------------------------------------------------------------- |
| Cisco Introdução à Cibersegurança | 1     | Grátis                               | PT     | Primeiro curso, 15 h, com prova final e badge                         |
| OverTheWire Bandit                | 1     | Grátis                               | EN     | Linux na prática, nível a nível                                       |
| picoCTF                           | 1     | Grátis                               | EN     | CTFs para os sábados leves                                            |
| Cartilha de Segurança do CERT.br  | 1     | Grátis                               | PT     | Conceitos e golpes do ponto de vista brasileiro                       |
| TryHackMe Premium                 | 1 a 3 | Cerca de US$ 100 por ano (estudante) | EN     | Pre Security, Cyber Security 101, SOC Level 1 e Jr Penetration Tester |
| MITRE ATT&CK                      | 2     | Grátis                               | EN     | Mapa de táticas e técnicas usado em todo SOC                          |
| Documentação do Wazuh             | 2     | Grátis                               | EN     | Base do Projeto SOC em casa                                           |
| CyberDefenders                    | 2     | Grátis                               | EN     | Labs de blue team com casos reais                                     |
| LetsDefend                        | 2     | Grátis                               | EN     | Turno simulado de SOC                                                 |
| Blue Team Labs Online             | 2     | Grátis                               | EN     | Desafios curtos de investigação                                       |
| NIST SP 800 61                    | 2     | Grátis                               | EN     | Referência de resposta a incidentes                                   |
| PortSwigger Web Security Academy  | 3     | Grátis                               | EN     | Ataques web com labs                                                  |
| OWASP Top 10                      | 3     | Grátis                               | EN     | Os riscos web mais importantes                                        |
| Cisco Ethical Hacker              | 3     | Grátis                               | EN     | Reforço da metodologia de pentest                                     |
| GTFOBins                          | 3     | Grátis                               | EN     | Escalação de privilégio no Linux                                      |
| Professor Messer                  | 4     | Grátis                               | EN     | Curso completo da Security+ em vídeo                                  |
| Simulados Jason Dion              | 4     | Cerca de US$ 15 a 20                 | EN     | Simulados completos com explicação                                    |

## Regras do lab, método e como ajustar

Ataque só o seu próprio lab e as plataformas feitas para isso; o resto é método para não perder o que aprendeu.

### Regras do lab

- As VMs vulneráveis ficam numa rede isolada, nunca expostas na sua rede de casa nem na internet.
- Nada de varredura ou exploração em sistemas da Codevasf, da PGFN ou de qualquer pessoa sem autorização por escrito.
- Dados, logs e configurações do trabalho nunca entram nos projetos públicos.

### Método

- Segunda é conteúdo, terça é lab, quarta e quinta são projeto ou CTF, sexta é revisão. Se a semana apertar, corte a segunda, nunca a terça.
- Caderno de erros: uma linha por erro (data, tema, o que errei, como é o certo, revisar de novo em três semanas).
- Folha em branco toda sexta: escreva sem consultar tudo o que lembra da semana; o que faltou é o que revisar.
- Flashcards de portas, protocolos e siglas, um pouco por dia. A Security+ cobra muitas.
- Relatório curto de cada lab importante: o que fez, como detectar, como corrigir. Vira portfólio e história de entrevista.

### Como ajustar a trilha

- Adiantou: siga para a próxima linha da trilha diária. Os portões podem chegar antes da data.
- Atrasou: empurre a linha para a próxima sexta de revisão ou para uma semana leve.
- Gostou muito de um tema: use a quinta para ir mais fundo nele e pule o "refazer o lab".
- No treinamento da Codevasf, anote as ferramentas que a equipe usa (SIEM, EDR, firewall) e troque uma quarta e quinta da Fase 2 por um lab com elas.

## Fontes

Preços e versões de prova mudam; confira a página oficial antes de comprar.

- Cibersegurança: vagas no Brasil 2026 (JobRise)
- Fim do programa gratuito da ISC2 CC (ISC2)
- ISC2 CC em 2026: preço e formato (Training Camp)
- Certificações gratuitas que restam em 2026 (StationX)
- Security+ SY0 801 e SY0 701 (CertCrush)
- Custo da Security+ em 2026 (HackerDNA)
- Descontos de voucher da CompTIA em 2026 (CertCrush)
- Preços do TryHackMe 2026 (HackerDNA)
- Certificações SAL1 e PT1 (HackerDNA)
- eJPT em 2026 (HackerDNA)
- Cursos gratuitos da Cisco em português
