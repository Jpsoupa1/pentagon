# Trilha de Segurança e SecOps

Trilha leve, ao lado da trilha DevOps. Não tem datas, prazos nem meta diária: só a presença constante do estudo na semana. No app ela fica em **Estudos**, no cartão "Segurança e SecOps".

## Sessões semanais

Cerca de 4 h por semana, nos horários livres da rotina (estágio de manhã, academia às 16:00 nos dias úteis, aulas de segunda a sexta das 19:10 às 22:00):

| Dia     | Horário        | Por que aqui                                                       |
| ------- | -------------- | ------------------------------------------------------------------ |
| Sexta   | 14:00 às 15:30 | A tarde de sexta não tem prática DevOps; termina antes da academia |
| Sábado  | 15:00 às 16:30 | Depois do projeto DevOps da manhã                                  |
| Domingo | 10:00 às 11:00 | Opcional: se a semana estiver cheia, pule sem culpa                |

As sessões são compromissos recorrentes comuns da área Estudos: mudar o horário, cancelar um dia ou apagar a sessão de domingo se faz pela própria agenda. Elas não entram nas sessões pendentes da trilha DevOps.

## Fases

Uma fase por vez. A próxima só começa quando a anterior estiver consolidada; quem decide é você, no botão "Fase consolidada, avançar". A prática em laboratório legal (PortSwigger, TryHackMe, Hack The Box) acompanha todas as fases.

1. **Fundamentos**: redes (TCP/IP, DNS, HTTP/HTTPS, TLS), Linux (terminal, permissões, processos, logs) e conceitos de segurança (tríade CIA, autenticação vs autorização, criptografia e hashing). Prática: TryHackMe Pre Security e Hack The Box Starting Point (Tier 0).
2. **Segurança de aplicações web**: OWASP Top 10 e Burp Suite. Prática: PortSwigger Web Security Academy (labs Apprentice) e as salas de OWASP Top 10 e Burp Suite do TryHackMe.
3. **SecOps**: monitoramento e detecção (SIEM, leitura de logs), resposta a incidentes e MITRE ATT&CK. Prática: TryHackMe SOC Level 1 e Hack The Box Sherlocks.
4. **DevSecOps**: segurança no pipeline (SAST, DAST, varredura de dependências), gestão de segredos e segurança de containers (Docker). Prática: pipeline de um projeto seu com Semgrep, OWASP ZAP e Trivy, e a trilha DevSecOps do TryHackMe.

Os textos que o app mostra ficam em `src/server/estudos/seguranca.ts`; o deploy atualiza as fases sem mexer na fase atual nem nos horários.
