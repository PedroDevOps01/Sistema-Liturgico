# Ministério dos Acólitos

Sistema web para gerenciamento do ministério de cerimoniários e acólitos: escalas, presenças, treinamentos, relatórios, formação litúrgica, controle de túnicas e estatísticas de celebrações da Igreja Católica.

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Backend | Laravel 12 · PHP 8.4 · Sanctum (Bearer Token) |
| Frontend | React 19 · TypeScript · Vite · TailwindCSS |
| Banco de dados | PostgreSQL 16 |
| PDF | DomPDF (barryvdh/laravel-dompdf) |
| Drag & Drop | @dnd-kit |

---

## Como rodar localmente

### Pré-requisitos
- PHP 8.4 com extensão `pdo_pgsql`
- Composer
- Node.js 20+
- PostgreSQL 16 rodando (`brew services start postgresql@16`)

### 1. Backend

```bash
cd backend
composer install
cp .env.example .env          # ajuste DB_DATABASE, DB_USERNAME
php artisan migrate --seed    # cria tabelas e usuário master
php artisan storage:link      # publica storage para uploads do portal
php artisan serve --host=127.0.0.1 --port=8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

### Ou use o script de inicialização

```bash
./start.sh
```

---

## Acesso inicial

| Campo | Valor |
|-------|-------|
| URL | http://localhost:5173 |
| Usuário | `master` |
| Senha | `master123` |

Portal público: http://localhost:5173/portal

---

## Deploy (Oracle Cloud / Ubuntu 24.04)

```bash
# Primeira vez — configura toda a infraestrutura
bash deploy.sh

# Atualizações — envia arquivos e reinicia serviços
bash upload.sh <IP> update <chave-ssh>   # no Mac
bash redeploy.sh                          # no servidor
```

**Requisitos do servidor:** Ubuntu 24.04 · PHP 8.4 · PostgreSQL 16 · Nginx · Node 20

Tanto `deploy.sh` quanto `redeploy.sh` configuram automaticamente o cron do Laravel Scheduler
(necessário pros lembretes automáticos). Após o primeiro deploy com essa versão, confira se
`GEMINI_API_KEY` e, quando disponível, `EVOLUTION_API_URL`/`EVOLUTION_API_KEY` estão preenchidos
no `.env` de produção (`sudo nano /var/www/escala/backend/.env`) — o `redeploy.sh` avisa no final
se alguma dessas variáveis estiver faltando.

---

## Funcionalidades

### Autenticação
- Login com **usuário e senha** (sem e-mail)
- Tela de carregamento pós-login com logo animada e anel giratório alinhado
- Usuário master criado automaticamente no seed
- Tokens via Laravel Sanctum (Bearer)

### Dashboard
- **Relógio em tempo real** (HH:MM:SS) com atualização a cada segundo
- Hero com gradiente vinho/dourado, período litúrgico atual com cor e trecho bíblico
- Strip de estatísticas no hero: escalas do mês, cerimoniários ativos, confirmações pendentes
- **3 cards KPI**: escalas com barra de progresso (verde/âmbar/vermelho por taxa de confirmação), status com ponto pulsante animado, próxima celebração com contagem de dias
- **Timeline vertical** das próximas celebrações com selos de data nas cores do período litúrgico e pill "Próxima"
- **Widget "Hoje"** — lista todos os cerimoniários escalados nas celebrações do dia, agrupados por célula
- **Alertas de confirmação** — escalas dos próximos 7 dias com confirmações pendentes, exibidas em âmbar/vermelho por urgência

### Navegação (Sidebar)
- Menu lateral com **módulos colapsáveis** em acordeão — abre/fecha ao clicar no módulo
- Módulo ativo abre automaticamente ao navegar
- Linha vertical de indentação visual nos subitens
- Logo do grupo com fundo dourado no cabeçalho
- Modo recolhido: apenas ícones, com flyout ao passar o mouse
- Mobile: drawer deslizante com overlay e header com logo

### Cerimoniários
- Cadastro individual e **em massa** (várias linhas de uma vez, ou importação via CSV)
- **Usuário e senha do Portal do Membro gerados automaticamente na criação** (login = slug do nome; senha = data de nascimento no formato `ddmmaaaa`, ou `123` quando não há data cadastrada) — vale tanto para cadastro individual quanto para importação em massa, já que os dois caminhos passam pelo mesmo endpoint
- Disponibilidade por turno: domingo manhã/tarde/noite, semana manhã/tarde/noite, sábado
- Flag de indisponibilidade temporária
- Flag de **cerimoniário experiente** (destacado em listagens e relatórios)
- Flag de **Mestre** — exibe prefixo `M -` antes do nome em toda escala
- Soft delete

### Celebrações
- Cadastro individual ou **em lote para final de semana**
- Flag "Repetir mesmo dia" no cadastro em lote
- Detecção automática de celebração noturna (horário ≥ 17h)
- **Quantidade de cerimoniários calculada automaticamente** ao preencher o horário: < 18h → 5; ≥ 18h → 6 (Turiferário incluso) — com preview visual no formulário
- **Cor litúrgica CNBB** configurável por celebração
- Flags: Possui Bispo/Arcebispo · Celebração das 6h · Celebração da Palavra · Celebração Solene · Casamento · Batismo · Crisma · Primeira Eucaristia · Quinta Eucarística · Tríduo · Adoração ao Santíssimo · Procissão · Via-Sacra · Exéquias · Vigília Pascal · Paixão do Senhor · Ordenação
- Ordenação por data com badge "Data passada" para celebrações anteriores
- **Import via CSV** — planilha com data/horário/tipo/período/qtd. de cerimoniários, pré-visualização editável antes de confirmar
- **Import automático via IA** — envia o PDF ou foto da agenda paroquial do mês (Gemini identifica os dias com celebração e ignora compromissos que não são celebrações), com a mesma pré-visualização editável

### Escalas
- Estrutura **automática** gerada pelas flags da celebração
- **Regra de slots por horário**: horário < 18h → 5 slots (Mestre + 4 Aux); ≥ 18h → 6 slots (+ Turiferário); com Bispo → +3 extras (Môr/Mitra/Bácula); eventos especiais (Casamento, Batismo etc.) → apenas Mestre pré-preenchido
- **Sugestão automática** por disponibilidade, rotatividade justa e priorização de mestres
- **Dois modos de visualização**: lista (drag & drop para reordenar) e **grade/matriz** (cerimoniários nas linhas × funções nas colunas, marcação direta por célula)
- Select de cerimoniário com indicadores visuais de disponibilidade (verde/âmbar/vermelho/laranja)
- Alertas de conflito e duplicatas

### Confirmação de Presença
- Link único por acólito para confirmar/recusar sem login
- Status visível na escala: ✓ Confirmado / ✗ Recusou / ? Pendente
- Botão de WhatsApp para enviar link diretamente

### Exportação
- **Copiar para WhatsApp** — texto formatado com prefixo `M -` para mestres
- **PDF estilizado** — layout com logo, tabela de funções e legenda
- **Calendário mensal** — cópia de todas as escalas do mês, ou **seleção de dias específicos** pra copiar/enviar só o que interessa

### Presença
- Registro pós-celebração por cerimoniário
- Status: Confirmado · Serviu normalmente · Faltou · Substituído · Justificado
- Campo de substituto vinculado ao status "Substituído"
- **Justificativa de falta com aprovação do admin**: o membro justifica a falta com observação obrigatória — **uma única vez** por falta (sem reenviar em cima de uma pendente ou já recusada). A falta permanece "Faltou" com selo "Em análise" até o admin decidir em `/justificativas`; só vira "Justificado" quando aprovada. O admin pode **reverter a decisão a qualquer momento** (aprovar após já ter recusado, ou vice-versa)

### Justificativas (admin)
- Fila de análise das faltas justificadas pelos membros, com abas Pendentes / Aprovadas / Rejeitadas / Todas
- Aprovar (falta vira "Justificado") ou rejeitar (falta é mantida) com um clique — decisão pode ser revertida depois
- Mostra a observação do membro e quem analisou (e quando)

### Treinamentos
- Cadastro com data, horário, tema, local, período litúrgico e funções alvo
- Registro de presença por cerimoniário com status individual
- Geração de convite formatado para WhatsApp
- **Múltiplas competências por treinamento** — seletor com checkboxes agrupados por nível de formação; ao marcar presença como "presente", todas as competências vinculadas avançam automaticamente para "concluída" no perfil do cerimoniário

### Formação
- **Níveis de formação** (ex.: Introdutório, Básico, Avançado) com descrição
- **Competências** vinculadas a cada nível (ex.: conhece o rito, manuseio da cruz processional)
- **Progresso individual** de cada cerimoniário por competência: não iniciado / em andamento / concluído
- Aba de visão geral com progresso percentual de todos os cerimoniários
- Aba de progresso com seleção de cerimoniário, botão de voltar para a listagem e edição inline de cada competência
- **Emissão de certificado PDF** ao concluir um nível — gerado com DomPDF, layout paisagem A4, download autenticado
- **Histórico de competências** — aba com data de conclusão, observação e nome de quem registrou cada competência

### Controle de Túnicas
- Cadastro com código, tamanho (opcional), cor e estado de conservação
- **Empréstimo** a cerimoniário com data prevista de devolução
- **Devolução** com registro de data real e observação
- **Marcar como perdida** em túnicas emprestadas
- **Marcar como encontrada** em túnicas perdidas — volta ao status disponível
- Filtros por status: todas / disponíveis / emprestadas / perdidas
- Alerta de atraso na devolução (dias em vermelho)
- Histórico completo de empréstimos por túnica

### Relatórios
- **Presenças**: total de serviços, faltas, substituições e justificativas por cerimoniário
- **Frequência Individual**: evolução mensal de presenças de um cerimoniário específico com gráfico de barras
- **Crescimento do Ministério**: evolução do número de cerimoniários ativos mês a mês com gráfico de linha
- **Presenças em Treinamentos**: taxa de presença por treinamento e ranking de participação — `Frequência = presenças "presente" ÷ total de convites × 100`
- **Empréstimos de Túnicas**: tempo médio de devolução, cerimoniários com mais empréstimos, túnicas com mais ocorrências de perda e histórico completo com filtro por período
- **Assiduidade**: por período litúrgico (Advento, Quaresma, Tempo Comum etc.), top ausentes, faltas por mês com top 5 por mês — padrão inclui próximos 30 dias para capturar faltas pré-registradas; CalcNote com fórmulas visível após filtrar
- **Analytics**: ranking de assiduidade com tendência (subindo/estável/caindo), cerimoniários em risco (≥ 3 faltas consecutivas), score de saúde do ministério (0–100), projeção de celebrações para o próximo mês; **fórmulas exibidas via CalcNote**: score = Presença×40% + Confirmações×30% + Ativos×20% + Treinamentos×10%; projeção = média 3m×60% + mesmo mês ano anterior×40%
- Meses sempre em **português** (Jan, Fev, Mar…) independente do locale do servidor

### Chat — Consultas Rápidas (Sávio)
- Interface de chat lateral com respostas em linguagem natural
- **8 categorias**: Visão Geral, Escalas, Celebrações, Cerimoniários, Presenças, Treinamentos, Formação, Túnicas, Funções, Histórico
- Consultas pré-definidas por categoria + aba de **Pergunta Livre** (limite de 20 por dia por dispositivo)
- Reconhece: ranking de serviços, disponibilidade por turno, mestres, cerimoniários em risco, saúde do ministério, túnicas disponíveis/emprestadas/atrasadas/perdidas, progresso de formação e muito mais

### Busca Global (Ctrl+K)
- Pesquisa simultânea em cerimoniários, celebrações e escalas
- Navegação por teclado: ↑↓ para mover, Enter para ir, Esc para fechar

### Portal Público (`/portal`)
- Página pública sem necessidade de login
- **8 temas de cor litúrgica**
- Carrossels com upload de imagens, proporção 16:7 e suporte a swipe mobile
- Formulário "Quero Servir" para interessados
- Visibilidade individual de seções configurável
- **SEO básico**: meta `description`, Open Graph (`og:title`, `og:description`, `og:image`, `og:type`), Twitter Card e `theme-color` — configurado via `<head>` estático + `useEffect` no React

### Interessados
- Inscrições recebidas pelo portal em `/interessados`
- Badge "NOVO" para não lidas, marcar como lido/não lido
- Botão de WhatsApp direto para contato

### Usuários
- CRUD de administradores com usuário/senha (sem e-mail)
- Campo de **número (WhatsApp)** com máscara — usado para receber os alertas administrativos automáticos
- Resetar senha, ativar/desativar, soft delete

### Comunicação Automática
- **Canal WhatsApp** via [Evolution API](https://doc.evolution-api.com) (self-hospedada, gratuita, atrás de uma interface (`WhatsappChannel`) trocável por outro provedor sem mudar a lógica de negócio)
- **Automáticos aos cerimoniários** (WhatsApp + registrados na aba Comunicados do Portal do Membro):
  - Escala publicada (assim que é criada)
  - Lembrete de escala 24h antes e no dia da celebração
  - Aniversário — mensagem de parabéns usando o template configurável em Configurações
  - Convite de reunião/treinamento — só para convidados/participantes
  - Lembrete de reunião/treinamento 24h antes
- **Comunicados Gerais** (tela `/comunicados`) — admin escreve um aviso e escolhe destinatário (todos, pessoas específicas ou por perfil experiente/mestre) e canal (Portal, WhatsApp ou ambos)
- **Alertas administrativos — sempre por WhatsApp** (nunca e-mail): pedido de substituto, bloqueio de período/indisponibilidade e nova justificativa de falta pendente — enviados para todos os usuários admin ativos com número cadastrado (tela Usuários)
- Agendador via Laravel Scheduler (`bootstrap/app.php`) — depende de um cron no servidor chamando `php artisan schedule:run` a cada minuto (`deploy.sh`/`redeploy.sh` já configuram isso automaticamente)
- Commands: `app:notificar-aniversariantes` · `app:lembrar-escala-24h` · `app:lembrar-escala-dia` · `app:lembrar-reuniao-treinamento`

---

## Estrutura do Banco

| Tabela | Descrição |
|--------|-----------|
| `users` | Administradores do sistema (campo `numero` para alertas via WhatsApp) |
| `cerimoniarios` | Cerimoniários/acólitos (flags `mestre`, `experiente`, `indisponivel_temporario`; `usuario`/`senha` do Portal do Membro) |
| `funcoes` | 9 funções litúrgicas fixas |
| `celebracoes` | Celebrações com flags, cor litúrgica e agrupamento de final de semana |
| `escalas` | Escalas vinculadas a uma celebração |
| `escala_itens` | Linhas da escala (função + cerimoniário + token de confirmação + status) |
| `presencas` | Presença pós-celebração (substituto; fluxo de aprovação de justificativa: `justificativa_status`, `justificativa_analisada_em`, `justificativa_analisada_por`) |
| `treinamentos` | Treinamentos com tema, local, período litúrgico e funções alvo |
| `treinamento_presencas` | Presença individual por cerimoniário em cada treinamento (campo `formacao_competencia_id` para avanço automático) |
| `historico_escalas` | Auditoria de criação/edição/exclusão |
| `configuracoes` | Dados, logo da paróquia e configurações do portal (JSON `portal_config`) |
| `interessados` | Inscrições recebidas pelo formulário do portal público |
| `tunicas` | Túnicas com código, tamanho, cor, estado e soft delete |
| `tunica_emprestimos` | Histórico de empréstimos com status: `emprestada`, `devolvida`, `perdida` |
| `formacao_niveis` | Níveis de formação litúrgica |
| `formacao_competencias` | Competências vinculadas a cada nível |
| `cerimoniario_competencias` | Progresso individual por competência: `nao_iniciado`, `em_andamento`, `concluido` — campo `concluido_por` registra o usuário que marcou |
| `reunioes` / `reuniao_presencas` | Reuniões e lista real de convidados com status de presença |
| `datas_bloqueadas` | Períodos de indisponibilidade que o próprio cerimoniário bloqueia |
| `pedidos_substituto` | Pedido de troca de escala feito pelo cerimoniário, com voluntário vinculado |
| `comunicados` | Avisos gerais e pessoais exibidos na aba Comunicados do Portal do Membro (`categoria`, `canal`, `cerimoniario_id` nullable = geral) |
| `notificacoes_enviadas` | Log de auditoria de todo envio por WhatsApp, com dedup por referência |

Todas as tabelas principais usam **soft delete** (`deleted_at`).

---

## Funções Litúrgicas (fixas no banco)

| Ordem | Função | Quando aparece |
|-------|--------|----------------|
| 1 | Cerimoniário - Mestre | Sempre |
| 2 | 1º Auxiliar - Microfone | Celebrações padrão |
| 3 | 2º Auxiliar - Missal | Celebrações padrão |
| 4 | 3º Auxiliar - Leitores | Celebrações padrão |
| 5 | 4º Auxiliar - Preces | Celebrações padrão |
| 6 | 5º Auxiliar - Turiferário | Somente noturnas |
| 7 | Môr | Com Bispo/Arcebispo |
| 8 | Mitra | Com Bispo/Arcebispo |
| 9 | Bácula | Com Bispo/Arcebispo |

---

## Variáveis de Ambiente (backend `.env`)

```env
APP_NAME="Ministério dos Acólitos"
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=escala_liturgica
DB_USERNAME=seu_usuario
DB_PASSWORD=

SESSION_DRIVER=file
CACHE_STORE=file
FILESYSTEM_DISK=local
SANCTUM_STATEFUL_DOMAINS=localhost:5173
FRONTEND_URL=http://localhost:5173

# Chatbot "Sávio" e importação de agenda por IA (Google AI Studio)
GEMINI_API_KEY=

# WhatsApp — Evolution API (self-hospedada). Deixe em branco até ter uma instância
# conectada: o sistema funciona normalmente sem isso, só não envia WhatsApp.
# Usado tanto para os avisos aos cerimoniários quanto para os alertas administrativos
# (pedido de substituto, bloqueio de período, justificativa pendente) — não há envio por e-mail.
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=default
```

> Depois de editar o `.env` de produção, rode `php artisan config:cache` para aplicar.
