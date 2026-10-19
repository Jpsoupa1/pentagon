# Método de revisão da Trilha DevOps

Três camadas de revisão, cada uma com uma função: a prática da tarde fixa o conteúdo do dia, a revisão de sexta junta a semana, e o domingo traz de volta o que você errou antes que esqueça. O registro que liga tudo é o caderno de erros.

> **No app:** a revisão de sexta tem o roteiro abaixo, com nota e pontos fracos gravados por semana, e o caderno de erros fica na tela Estudos (a data de revisão é 21 dias depois, e o domingo mostra os erros da semana). As datas seguem o calendário do app, com a semana 1 em 26/10/2026.

## Revisão de sexta (08:00 às 09:30, no estágio)

| Tempo | Etapa | Como fazer |
| --- | --- | --- |
| 15 min | Folha em branco | Sem consultar nada, escreva tudo o que lembra da semana: conceitos, comandos, campos do YAML. O que você não conseguiu escrever é o que mais precisa de revisão. |
| 45 min | Bateria da semana | 10 exercícios misturando todos os temas da semana, no terminal, cronometrados. Na fase da CKA, só com a documentação do Kubernetes aberta, como na prova. |
| 20 min | Correção | Confira com o gabarito, refaça na hora cada exercício errado e anote os erros no caderno. |
| 10 min | Nota e pontos fracos | Registre a nota (x de 10) e os 2 ou 3 pontos mais fracos da semana. Eles entram na revisão de domingo. |

Se a sexta tiver mais tempo livre, estenda a bateria para 15 exercícios em vez de aumentar a parte de leitura.

## Caderno de erros

Um arquivo de texto seu (por exemplo, `caderno-de-erros.md` no repositório de estudos), com uma linha por erro:

| Data | Tema | O que errei | Como é o certo | Revisar de novo em |
| --- | --- | --- | --- | --- |
| 30/10 | Static pods | Criei o manifest no nó errado | O manifest vai em `/etc/kubernetes/manifests` do nó onde o pod deve rodar, pelo `minikube ssh` | 20/11 |

Na coluna "Revisar de novo em", coloque a data de três semanas depois. É o que o domingo usa.

## Domingo: revisão espaçada (19:00 às 20:00)

1. Refaça, sem olhar a resposta, os exercícios que você errou na sexta.
2. Refaça os erros do caderno marcados para revisar nesta semana (os de três semanas atrás).
3. Erro que voltou a acontecer ganha nova data, três semanas depois. Erro que você acertou sai da lista.
4. Confira o cronograma da semana seguinte e ajuste o que precisar.

## Prompts prontos para usar neste Projeto

Abra uma conversa dentro do Projeto "Trilha DevOps" e cole o prompt. O Claude já tem o cronograma, então sabe o que foi estudado em cada semana.

**Prática da tarde**

```text
Prática da tarde, semana [N], [dia da semana].
Tema da manhã: [cole o tema do cronograma].
Monte 10 exercícios práticos no terminal, do mais simples ao mais difícil,
no estilo da prova CKA, e mande o gabarito completo logo depois.
```

**Revisão de sexta**

```text
Revisão de sexta, semana [N].
Use o cronograma do Projeto para ver tudo o que estudei de segunda a quinta.
Monte uma bateria de 10 exercícios misturando todos os temas da semana,
no estilo da prova CKA, com tempo sugerido para cada um.
Mande o gabarito só quando eu disser "gabarito".
Depois, me ajude a escolher os 3 pontos mais fracos com base nos meus erros.
```

**Domingo**

```text
Revisão de domingo. Estes são os erros do meu caderno para esta semana:
[cole as linhas do caderno].
Monte um exercício novo para cada erro, cobrindo o mesmo ponto
de um jeito diferente, e mande o gabarito no fim.
```

## Revisão inicial da CKA (semanas 1 e 2)

Antes de seguir para Cluster Maintenance, as semanas de 26/10 a 08/11 revisam tudo o que você já estudou: Core Concepts, Scheduling, Logging e Monitoring e Application Lifecycle, incluindo o fechamento da bateria de ALM e o Autoscaling. As três lacunas que você já identificou entram como drills próprios:

* Criar static pods.
* Seletor imutável do ReplicaSet (apagar e recriar).
* Tarefas com várias partes em condição de prova.

Na quinta da semana 2, um simulado diagnóstico de 15 tarefas mede onde você está. Na sexta, o resultado define os 3 pontos que recebem reforço nas semanas seguintes, dentro das práticas da tarde.
