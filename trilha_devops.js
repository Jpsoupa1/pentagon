/* Pentagon: dados da trilha DevOps (49 semanas, marcos) e gerador de calendário .ics.
   Versão 2 (19/10/2026): duas sessões de segunda a quinta (conteúdo de manhã, no estágio, e prática
   à tarde), revisão da semana na sexta de manhã, reposição do que atrasou na sexta à tarde, projeto
   no sábado e revisão espaçada no domingo.
   O conteúdo de cada dia segue docs/trilha/cronograma-semanal-trilha-devops.md.
   Funciona no navegador (window.Rotina) e no Node (globalThis.Rotina). */
(function (g) {
  'use strict';

  var INICIO = '2026-10-19'; // segunda da semana zero
  var TOTAL_SEMANAS = 49;    // semana 1 começa em 26/10/2026
  var TZ = 'America/Sao_Paulo';

  var FASES = [
    { id: 0, nome: 'Preparação', curto: 'Preparação', prova: '' },
    { id: 1, nome: 'Kubernetes e fundamentos', curto: 'Kubernetes', prova: 'CKA' },
    { id: 2, nome: 'AWS e CI/CD', curto: 'AWS', prova: 'AWS SAA' },
    { id: 3, nome: 'Infraestrutura como Código', curto: 'Terraform', prova: 'Terraform Associate' },
    { id: 4, nome: 'Observabilidade, GitOps e segurança', curto: 'Observabilidade', prova: 'Projeto principal' }
  ];

  var PRATICA = 'Prática do tema da manhã';
  var DOMINGO = 'Revisão espaçada e planejamento';

  // [fase, semanas, tema, manhã de segunda a quinta, sábado, extras]
  // A tarde de segunda a quinta é a prática do tema da manhã e a sexta é a revisão da semana,
  // a não ser que `extras` diga outra coisa (as duas semanas de revisão da CKA).
  var BLOCOS = [
    [0, 1, 'Preparação',
      ['Ler o plano de estudos completo',
        'Separar os horários fixos da semana',
        'Revisar o que já foi feito na CKA',
        'Configurar o app, o calendário e o widget da tela bloqueada'],
      'Montar o lab no CachyOS (minikube e kind) e criar o repositório do Projeto 1'],

    [1, 1, 'Revisão CKA 1: Core Concepts e Scheduling',
      ['Revisão: arquitetura do cluster, etcd, kube-apiserver, kube-controller-manager, kube-scheduler, kubelet e kube-proxy',
        'Revisão: Pods, ReplicaSets, Deployments, Namespaces e comandos imperativos',
        'Revisão: labels e selectors, taints e tolerations, nodeSelector e node affinity',
        'Revisão: requests e limits, DaemonSets, static pods e múltiplos schedulers'],
      'Projeto 1: escolher um app PHP de código aberto para o projeto',
      { tarde: ['Drill: inspecionar o control plane no minikube (pods do kube-system e manifests em /etc/kubernetes/manifests)',
        'Drill: criar tudo por comando imperativo com $do; refazer o seletor imutável do ReplicaSet (lacuna)',
        'Drill: agendar pods em nós específicos no cluster de 2 nós (cka e cka-m02)',
        'Drill: criar um static pod do zero pelo minikube ssh -p cka (lacuna)'],
        sex: 'Revisão da semana: Core Concepts e Scheduling' }],
    [1, 1, 'Revisão CKA 2: Logging, Monitoring e Application Lifecycle',
      ['Revisão: Metrics Server, kubectl top e logs de aplicação (incluindo multi container)',
        'Revisão: rolling update e rollback, command e args, variáveis de ambiente',
        'Revisão: ConfigMaps, Secrets, multi container e initContainers',
        'Autoscaling: HPA e noções de VPA (fecha o bloco 1)'],
      'Projeto 1: escrever o Dockerfile do app PHP',
      { tarde: ['Drill: diagnosticar pods com top, logs, describe e events',
        'Drill: Teste 2 da bateria de ALM (retomar de onde parou)',
        'Drill: Teste 3 da bateria de ALM',
        'Simulado diagnóstico: 15 tarefas de tudo o que foi revisado, 1 h, só com a documentação do Kubernetes'],
        sex: 'Revisão da semana + resultado do simulado diagnóstico: escolher os 3 pontos mais fracos para reforçar' }],
    [1, 2, 'Cluster Maintenance',
      ['Drain, cordon e atualização do sistema dos nós',
        'Upgrade do cluster com kubeadm',
        'Backup e restore do etcd',
        'Redes: HTTP, TLS e certificados'],
      'Projeto 1: compose local com o banco de dados'],
    [1, 2, 'Security e RBAC',
      ['Certificados TLS do cluster e kubeconfig',
        'Roles, ClusterRoles e ServiceAccounts',
        'Network Policies e segurança de imagens',
        'Linux: systemd e journalctl'],
      'Projeto 1: manifests básicos (Deployment e Service)'],
    [1, 2, 'Storage',
      ['Volumes, PersistentVolumes e PersistentVolumeClaims',
        'StorageClass e provisionamento dinâmico',
        'Revisão em exercícios: Security e Storage',
        'Linux: permissões, usuários e processos'],
      'Projeto 1: ConfigMap, Secret e volume persistente'],
    [1, 2, 'Networking',
      ['CNI, rede de pods e Services',
        'CoreDNS e Ingress',
        'Gateway API e troubleshooting de rede',
        'Redes: CIDR e sub redes'],
      'Projeto 1: Ingress e probes'],
    [1, 2, 'Extensibility',
      ['Helm: charts, values e releases',
        'Kustomize com overlays',
        'CRDs e Operators',
        'Bash: variáveis, laços e funções'],
      'Projeto 1: Helm chart do app'],
    [1, 2, 'Install e HA',
      ['Kubeadm: requisitos e init',
        'Cluster com kubeadm em VMs locais',
        'Alta disponibilidade do control plane',
        'Redes: balanceadores e proxies reversos'],
      'Projeto 1: HPA e README com diagrama'],
    [1, 2, 'Troubleshooting',
      ['Falhas de aplicação: logs, eventos e describe',
        'Falhas do control plane',
        'Falhas de nó e de rede',
        'Revisão geral de Linux e redes'],
      'Projeto 1: publicar no GitHub e postar no LinkedIn'],
    [1, 3, 'Simulados CKA',
      ['Simulado killer.sh ou mock da KodeKloud (2 h)',
        'Corrigir o simulado e refazer os erros',
        'Drill dos domínios mais fracos',
        'Velocidade: aliases, comandos imperativos e documentação'],
      'Simulado completo cronometrado'],

    [2, 3, 'AWS Cloud Practitioner',
      ['Skill Builder: Cloud Practitioner Essentials',
        'Conta AWS com MFA e alerta de orçamento',
        'Responsabilidade compartilhada, preços e suporte',
        'Simulado Cloud Practitioner'],
      'Projeto 2: site do currículo em React'],
    [2, 2, 'IAM e VPC',
      ['IAM: usuários, papéis e políticas',
        'VPC com sub redes públicas e privadas',
        'NAT, security groups e NACLs',
        'CI/CD: fundamentos de GitHub Actions'],
      'Projeto 2: site no S3 com CloudFront e HTTPS'],
    [2, 1, 'EC2 e escalabilidade',
      ['EC2, AMIs e EBS',
        'ELB com Auto Scaling',
        'Alta disponibilidade entre zonas',
        'CI/CD: pipeline de build e testes'],
      'Projeto 2: domínio no Route 53'],
    [2, 1, 'Armazenamento e dados',
      ['S3: classes, ciclo de vida e políticas',
        'RDS com backup e réplica de leitura',
        'Route 53 e políticas de roteamento',
        'CI/CD: varredura da imagem e push no registry'],
      'Projeto 2: API com Lambda e DynamoDB'],
    [2, 1, 'Serverless e monitoramento',
      ['Lambda, API Gateway e DynamoDB',
        'CloudWatch, métricas e alarmes',
        'Mensageria: SQS e SNS',
        'CI/CD: deploy automático na AWS'],
      'Projeto 2: contador de visitas no site'],
    [2, 2, 'CI/CD de ponta a ponta',
      ['GitLab CI: stages, jobs e runners',
        'Pipeline do Projeto 1 no GitLab CI',
        'Estratégias de deploy: rolling, blue green e canary',
        'AWS Well Architected: os seis pilares'],
      'Projeto 2: pipeline completo no GitHub Actions'],
    [2, 3, 'Simulados SAA',
      ['Simulado SAA (Tutorials Dojo)',
        'Revisar os erros do simulado',
        'Drill: redes e segurança',
        'Drill: armazenamento e custos'],
      'Projeto 2: testes e README'],

    [3, 2, 'Terraform básico',
      ['Providers, resources, variables e outputs',
        'A VPC da AWS em Terraform',
        'Ciclo plan, apply e destroy; data sources',
        'Ansible: inventário e primeiro playbook'],
      'Projeto 2: reescrever a infra em Terraform'],
    [3, 2, 'State e módulos',
      ['State remoto no S3 com lock',
        'Módulo próprio reutilizável',
        'Workspaces e ambientes dev e prod',
        'Ansible: roles e variáveis'],
      'Projeto 3: Terraform da rede e do cluster'],
    [3, 2, 'HCP Terraform e boas práticas',
      ['HCP Terraform: runs, variáveis e workspaces',
        'Terraform dentro do pipeline de CI',
        'Formatação, validação e segurança do código',
        'Simulado Terraform Associate'],
      'Projeto 3: cluster Kubernetes na AWS'],
    [3, 2, 'Simulados Terraform',
      ['Simulado Terraform Associate',
        'Revisar os erros e refazer os labs',
        'Drill: state e módulos',
        'Drill: fluxo de trabalho e HCP Terraform'],
      'Projeto 3: deploy da API no cluster'],
    [3, 1, 'Revisão e descanso',
      ['Revisar as anotações de AWS',
        'Revisar os labs de Kubernetes',
        'Atualizar currículo e LinkedIn',
        'Semana leve: só leitura'],
      'Projeto 3: README parcial'],

    [4, 2, 'Prometheus e Grafana',
      ['Prometheus: métricas, PromQL e exporters',
        'Kube prometheus stack com Helm',
        'Grafana: painéis que respondem perguntas',
        'Livro de SRE: capítulos 3 e 4'],
      'Projeto 3: métricas da API'],
    [4, 2, 'Logs, alertas e SLOs',
      ['Loki e logs centralizados',
        'Alertmanager e regras de alerta',
        'SLOs e orçamento de erro',
        'Livro de SRE: capítulos 5 e 6'],
      'Projeto 3: alerta e SLO da API'],
    [4, 2, 'GitOps',
      ['Argo CD: aplicações e sincronização',
        'Helm chart próprio com Argo CD',
        'OpenTelemetry: noções de traces',
        'FinOps: tags, orçamento e alertas de custo'],
      'Projeto 3: deploy via GitOps'],
    [4, 2, 'Segurança e fechamento',
      ['Trivy e varredura no pipeline',
        'Segredos e menor privilégio no IAM e no RBAC',
        'Simular uma falha e escrever o pós incidente',
        'Revisão para entrevistas técnicas'],
      'Projeto 3: README final e post no LinkedIn']
  ];

  var MARCOS = [
    { data: '2026-11-27', titulo: 'Black Friday: comprar o voucher da CKA', fase: 1 },
    { data: '2027-03-01', titulo: 'Início das candidaturas a estágio e júnior', fase: 2 },
    { data: '2027-03-05', titulo: 'Prova CKA (meta)', fase: 1, prova: true },
    { data: '2027-03-26', titulo: 'Prova AWS Cloud Practitioner (meta)', fase: 2, prova: true },
    { data: '2027-06-04', titulo: 'Prova AWS Solutions Architect Associate (meta)', fase: 2, prova: true },
    { data: '2027-07-30', titulo: 'Prova Terraform Associate (meta)', fase: 3, prova: true },
    { data: '2027-10-01', titulo: 'Projeto principal publicado', fase: 4, prova: true }
  ];

  // Tipo da sessão de conteúdo por dia (0 = domingo); a tarde de segunda a quinta é Prática.
  var TIPOS = { 1: 'Aula', 2: 'Lab', 3: 'Aprofundar', 4: 'Base', 5: 'Revisão', 6: 'Projeto', 0: 'Revisão' };
  var CATEGORIAS = ['conteudo', 'pratica', 'revisao_semanal', 'projeto', 'revisao_espacada', 'reposicao'];
  var REPOSICAO = 'Reposição do que atrasou';
  var TURNOS = ['manha', 'tarde', 'noite'];
  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  // Horário de cada turno, pela chave "<dia>-<turno>". A manhã de segunda a sexta cai dentro do
  // estágio (07:30 às 12:00) de propósito; a tarde de sexta é a reposição do que atrasou.
  var PADRAO = {
    turnos: {
      '1-manha': { on: true, ini: '08:00', min: 90 },
      '2-manha': { on: true, ini: '08:00', min: 90 },
      '3-manha': { on: true, ini: '08:00', min: 90 },
      '4-manha': { on: true, ini: '08:00', min: 90 },
      '5-manha': { on: true, ini: '08:00', min: 90 },
      '1-tarde': { on: true, ini: '14:00', min: 90 },
      '2-tarde': { on: true, ini: '14:00', min: 90 },
      '3-tarde': { on: true, ini: '14:00', min: 90 },
      '4-tarde': { on: true, ini: '14:00', min: 90 },
      '5-tarde': { on: true, ini: '14:00', min: 90 },
      '6-manha': { on: true, ini: '09:00', min: 180 },
      '0-noite': { on: true, ini: '19:00', min: 60 }
    },
    alerta: 10
  };

  // ---------- datas (aritmética em UTC para não depender do fuso do aparelho)
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ms(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  function iso(t) { var d = new Date(t); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function addDias(s, n) { return iso(ms(s) + n * 864e5); }
  function difDias(a, b) { return Math.round((ms(b) - ms(a)) / 864e5); }
  function dow(s) { return new Date(ms(s)).getUTCDay(); }
  function segundaDe(s) { return addDias(s, -((dow(s) + 6) % 7)); }
  function hoje(agora) {
    var d = agora || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dataCurta(s) { var p = s.split('-'); return (+p[2]) + ' ' + MESES[+p[1] - 1]; }
  function dataLonga(s) { return DIAS[dow(s)] + ', ' + dataCurta(s); }
  function hm2min(h) { var p = h.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function min2hm(m) { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }

  // ---------- semanas
  var SEMANAS = [];
  (function () {
    var n = 0;
    BLOCOS.forEach(function (b, bi) {
      var extras = b[5] || {};
      for (var k = 0; k < b[1]; k++) {
        var parte = b[1] > 1 ? (k + 1) + ' de ' + b[1] : '';
        SEMANAS.push({
          n: n, inicio: addDias(INICIO, n * 7), fase: b[0], bloco: bi, tema: b[2], parte: parte,
          manha: b[3], tarde: extras.tarde || [PRATICA, PRATICA, PRATICA, PRATICA],
          sex: extras.sex || 'Revisão da semana: ' + b[2] + (parte ? ' (parte ' + parte + ')' : ''),
          sab: b[4]
        });
        n++;
      }
    });
  })();
  var FIM = addDias(SEMANAS[SEMANAS.length - 1].inicio, 6);

  function semanaDe(data) {
    var n = Math.floor(difDias(INICIO, data) / 7);
    return (n >= 0 && n < SEMANAS.length) ? SEMANAS[n] : null;
  }

  function item(turno, categoria, tipo, texto, d) {
    // Estudo de manhã em dia útil acontece durante o estágio: a sobreposição é permitida.
    return { turno: turno, categoria: categoria, tipo: tipo, texto: texto, permiteSobreposicao: turno === 'manha' && d >= 1 && d <= 5 };
  }

  /** O que a trilha prevê para um dia da semana, turno a turno. */
  function planoDoDia(sem, d) {
    if (d >= 1 && d <= 4) {
      // Na semana zero havia uma sessão por dia, à tarde, e ela continua igual.
      if (sem.n === 0) return [item('tarde', 'conteudo', TIPOS[d], sem.manha[d - 1], d)];
      return [
        item('manha', 'conteudo', TIPOS[d], sem.manha[d - 1], d),
        item('tarde', 'pratica', 'Prática', sem.tarde[d - 1], d)
      ];
    }
    if (d === 5) {
      var reposicao = item('tarde', 'reposicao', 'Reposição', REPOSICAO, d);
      return sem.n === 0 ? [reposicao] : [item('manha', 'revisao_semanal', TIPOS[5], sem.sex, d), reposicao];
    }
    if (d === 6) return [item('manha', 'projeto', TIPOS[6], sem.sab, d)];
    return [item('noite', 'revisao_espacada', TIPOS[0], sem.n === 0 ? 'Planejar a semana 1' : DOMINGO, d)];
  }

  /** "Aula: Drain, cordon..."; o texto fica sozinho quando já diz o que é ("Drill: ...", "Revisão da semana..."). */
  function titulo(tipo, texto) {
    var palavra = tipo.split(' ')[0].toLowerCase();
    if (/^[^:]{1,40}: /.test(texto) || texto.toLowerCase().indexOf(palavra) === 0) return texto;
    return tipo + ': ' + texto;
  }

  function sessoesDoDia(data, cfg) {
    cfg = cfg || PADRAO;
    var sem = semanaDe(data);
    if (!sem) return [];
    var d = dow(data);
    var fase = FASES[sem.fase];
    var out = [];
    planoDoDia(sem, d).forEach(function (p) {
      var chave = d + '-' + p.turno;
      var slot = cfg.turnos[chave];
      if (!slot || !slot.on) return;
      var ini = hm2min(slot.ini);
      out.push({
        id: data + '-' + p.turno, data: data, dow: d, turno: p.turno, chave: chave,
        ini: slot.ini, fim: min2hm(ini + slot.min), iniMin: ini, min: slot.min,
        semana: sem.n, fase: sem.fase, faseNome: fase.nome, tema: sem.tema, parte: sem.parte,
        categoria: p.categoria, tipo: p.tipo, texto: p.texto, titulo: titulo(p.tipo, p.texto),
        permiteSobreposicao: p.permiteSobreposicao
      });
    });
    return out;
  }

  function sessoesEntre(a, b, cfg) {
    var out = [];
    for (var s = a; ms(s) <= ms(b); s = addDias(s, 1)) out.push.apply(out, sessoesDoDia(s, cfg));
    return out;
  }

  function marcosEntre(a, b) {
    return MARCOS.filter(function (m) { return ms(m.data) >= ms(a) && ms(m.data) <= ms(b); });
  }

  function cron(slot, d) {
    var p = slot.ini.split(':');
    return (+p[1]) + ' ' + (+p[0]) + ' * * ' + d;
  }

  // ---------- calendário (.ics)
  function esc(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function dobrar(linha) {
    // RFC 5545: no máximo 75 octetos por linha, continuação começa com espaço
    var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    var bytes = function (c) { return enc ? enc.encode(c).length : Buffer.byteLength(c); };
    var out = [], atual = '', tam = 0, limite = 75;
    for (var i = 0; i < linha.length; i++) {
      var c = linha[i];
      var code = linha.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < linha.length) { c += linha[++i]; }
      var b = bytes(c);
      if (tam + b > limite) { out.push(atual); atual = ' '; tam = 1; limite = 75; }
      atual += c; tam += b;
    }
    out.push(atual);
    return out.join('\r\n');
  }
  function stampLocal(data, minutos) {
    var dia = addDias(data, Math.floor(minutos / 1440));
    var m = ((minutos % 1440) + 1440) % 1440;
    return dia.replace(/-/g, '') + 'T' + pad(Math.floor(m / 60)) + pad(m % 60) + '00';
  }
  function stampUTC(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  function gerarICS(cfg, desde, opcoes) {
    cfg = cfg || PADRAO;
    opcoes = opcoes || {};
    var agora = opcoes.agora || new Date();
    var dtstamp = stampUTC(agora);
    var alerta = Math.max(0, +cfg.alerta || 0);
    var L = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rotina DevOps//Plano de estudos//PT',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Rotina DevOps', 'X-WR-TIMEZONE:' + TZ,
      'BEGIN:VTIMEZONE', 'TZID:' + TZ, 'BEGIN:STANDARD', 'DTSTART:19700101T000000',
      'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE'
    ];
    var url = opcoes.url ? '\n\nAbrir o app: ' + opcoes.url : '';
    sessoesEntre(desde || SEMANAS[0].inicio, FIM, cfg).forEach(function (s) {
      L.push('BEGIN:VEVENT',
        'UID:sessao-' + s.data + '-' + s.turno + '@rotina-devops',
        'DTSTAMP:' + dtstamp,
        'DTSTART;TZID=' + TZ + ':' + stampLocal(s.data, s.iniMin),
        'DTEND;TZID=' + TZ + ':' + stampLocal(s.data, s.iniMin + s.min),
        'SUMMARY:' + esc(s.titulo),
        'DESCRIPTION:' + esc((s.semana ? 'Semana ' + s.semana + ' de ' + TOTAL_SEMANAS + ' · ' : '') +
          'Fase ' + s.fase + ', ' + s.faseNome + '\nTema: ' + s.tema + (s.parte ? ' (parte ' + s.parte + ')' : '') + url),
        'CATEGORIES:' + esc('Estudo DevOps'),
        'TRANSP:OPAQUE',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(s.titulo),
        'TRIGGER:' + (alerta ? '-PT' + alerta + 'M' : 'PT0M'), 'END:VALARM',
        'END:VEVENT');
    });
    MARCOS.forEach(function (m) {
      if (desde && ms(m.data) < ms(desde)) return;
      L.push('BEGIN:VEVENT',
        'UID:marco-' + m.data + '@rotina-devops',
        'DTSTAMP:' + dtstamp,
        'DTSTART;VALUE=DATE:' + m.data.replace(/-/g, ''),
        'DTEND;VALUE=DATE:' + addDias(m.data, 1).replace(/-/g, ''),
        'SUMMARY:' + esc('Marco: ' + m.titulo),
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(m.titulo), 'TRIGGER:PT9H', 'END:VALARM',
        'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(dobrar).join('\r\n') + '\r\n';
  }

  g.Rotina = {
    INICIO: INICIO, FIM: FIM, TOTAL_SEMANAS: TOTAL_SEMANAS, FASES: FASES, SEMANAS: SEMANAS, MARCOS: MARCOS,
    TIPOS: TIPOS, CATEGORIAS: CATEGORIAS, TURNOS: TURNOS, DIAS: DIAS, DIAS_CURTOS: DIAS_CURTOS, PADRAO: PADRAO,
    ms: ms, addDias: addDias, difDias: difDias, dow: dow, segundaDe: segundaDe, hoje: hoje,
    dataCurta: dataCurta, dataLonga: dataLonga, hm2min: hm2min, min2hm: min2hm,
    semanaDe: semanaDe, sessoesDoDia: sessoesDoDia, sessoesEntre: sessoesEntre, marcosEntre: marcosEntre,
    titulo: titulo, cron: cron, gerarICS: gerarICS
  };
})(typeof window !== 'undefined' ? window : globalThis);
