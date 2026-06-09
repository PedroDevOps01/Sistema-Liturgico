# Ministério dos Acólitos

Sistema web para gerenciamento do ministério de cerimoniários e acólitos: escalas, presenças, treinamentos, relatórios e estatísticas de celebrações da Igreja Católica.

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

## Funcionalidades

### Autenticação
- Login com **usuário e senha** (sem e-mail)
- Usuário master criado automaticamente no seed
- Tokens via Laravel Sanctum (Bearer)

### Dashboard
- Cards de resumo: escalas do mês, cerimoniários ativos, próximas celebrações, sem escala
- Lista de próximas celebrações com scroll interno
- Alertas de celebrações sem escala e conflitos de horário

### Cerimoniários
- Cadastro individual e **em massa** (várias linhas de uma vez)
- Disponibilidade por turno: domingo manhã/tarde/noite, semana manhã/tarde/noite, sábado
- Flag de indisponibilidade temporária
- Flag de **cerimoniário experiente** (destacado em listagens e relatórios)
- Flag de **Mestre** — exibe prefixo `M -` antes do nome em toda escala (cópia WhatsApp, PDF, calendário mensal)
- Soft delete — excluídos somem da lista permanentemente
- Exibição de telefone com máscara `(XX) XXXXX-XXXX`

### Celebrações
- Cadastro individual ou **em lote para final de semana**
- Flag "Repetir mesmo dia" no cadastro em lote
- Detecção automática de celebração noturna (horário ≥ 17h)
- **Cor litúrgica CNBB** configurável por celebração (Branco, Vermelho, Verde, Roxo, Preto, Rosa, Dourado, Azul)
- Flags disponíveis: Possui Bispo/Arcebispo · Celebração das 6h · Celebração da Palavra · Celebração Solene · Casamento · Batismo · Crisma · Primeira Eucaristia · Adoração ao Santíssimo · Procissão · Via-Sacra · Exéquias · Vigília Pascal · Paixão do Senhor · Ordenação
- Soft delete

### Escalas
- Estrutura **automática** gerada pelas flags da celebração
- Celebrações já escaladas não aparecem no seletor de nova escala
- Funções geradas automaticamente por tipo de celebração:
  - Cerimoniário Mestre sempre presente
  - Auxiliares 1–4 em celebrações padrão
  - Turiferário (5º Aux) apenas em celebrações noturnas
  - Môr, Mitra, Bácula quando possui Bispo/Arcebispo
- **Sugestão automática de acólitos** — botão "Sugerir" preenche a escala com base em:
  - Disponibilidade de horário/turno
  - Acólitos não escalados no mesmo dia
  - Rotatividade justa (prioriza quem há mais tempo sem servir)
  - Mestres priorizados para a primeira posição
- **Drag & drop** para reordenar funções
- Adicionar, remover e duplicar funções livremente
- Select de cerimoniário com busca e indicadores visuais:
  - 🟢 Verde — disponível para o horário
  - 🟡 Âmbar — fora do turno habitual
  - 🔴 Vermelho — indisponível temporariamente
  - 🟠 Laranja — já escalado em outra escala no mesmo dia
- Alerta de conflito ao selecionar cerimoniário já escalado no mesmo dia
- Alerta de cerimoniário duplicado na mesma escala
- Soft delete

### Confirmação de Presença via Link
- Cada acólito na escala recebe um **link único** (token de 40 chars) para confirmar ou recusar presença
- A página de confirmação (`/confirmar/:token`) é **pública** — não exige login
- Exibe detalhes da celebração (data, horário, função) antes de confirmar
- Status visível na visualização da escala: ✓ Confirmado / ✗ Recusou / ? Pendente
- Botão de WhatsApp na escala para enviar o link diretamente ao acólito
- Token regenerado automaticamente se o cerimoniário for trocado

### Exportação
- **Copiar para WhatsApp** — texto compacto formatado com prefixo `M -` para mestres:
  ```
  TEMPO COMUM
  DIA 31/05 - Tempo Comum
  Missa às 19h

  Cerimoniário: M - Pedro Gabriel
  1ª Aux: Gabriel Lustosa
  2ª Aux: Lucas Aguiar
  ...
  ```
- **Enviar no WhatsApp** — abre `wa.me` com o texto pronto
- **PDF estilizado** — layout compacto com logo da paróquia, tabela de funções, prefixo `M -` para mestres e legenda:
  ```
  Nomenclatura do Serviço
  1ª AUX: Lado direito (microfone)   2ª AUX: Lado esquerdo (missal)
  3ª AUX: Leitores                   4ª AUX: Preces, intenções e avisos
  5ª AUX: Turiferário (somente à noite)
  ```
- **Calendário mensal** — cópia de todas as escalas do mês com prefixo `M -` para mestres

### Presença
- Registro pós-celebração por cerimoniário
- Status: Confirmado · Serviu normalmente · Faltou · Substituído · Justificado
- Campo de substituto vinculado ao status "Substituído"

### Treinamentos
- Cadastro de treinamentos com data, horário, tema, local, período litúrgico e observação
- Funções litúrgicas alvo (JSON) para direcionar o treinamento
- Registro de presença por cerimoniário com status individual
- Geração de convite formatado para WhatsApp

### Relatórios e Estatísticas
- **Relatório de Presenças**: total de serviços, faltas, substituições e justificativas por cerimoniário — considera apenas escalas ativas
- **Estatísticas gerais**: ranking dos que mais serviram (somente escalas ativas, via `status = 'serviu'`), participações mensais, faltas por cerimoniário
- **Top presenças** e **substituições** por período

### Chat Inteligente (Consulta Rápida)
- Interface de chat com respostas em linguagem natural
- Reconhece perguntas sobre: ranking de serviços, escalas, celebrações, cerimoniários, treinamentos, presenças e funções litúrgicas
- Ranking "Quem mais serviu" baseado em `status = 'serviu'` nas escalas ativas (consistente com o relatório de presenças)
- Consultas disponíveis: próximas escalas, escalas da semana/mês, casamentos, batismos, cerimoniários ativos/inativos/experientes/indisponíveis, presenças pendentes, ausências e muito mais

### Busca Global (Ctrl+K)
- Atalho `Ctrl+K` (ou `Cmd+K` no Mac) abre o modal de busca de qualquer página
- Pesquisa simultânea em cerimoniários, celebrações e escalas
- Navegação por teclado: ↑↓ para mover, Enter para ir, Esc para fechar
- Busca com debounce de 280ms para evitar requisições desnecessárias
- Resultados com ícone colorido por tipo e link direto para a página

### Portal Público
- Página pública em `/portal` sem necessidade de login
- Estatísticas em tempo real puxadas do banco de dados:
  - Total de acólitos cadastrados
  - Total de celebrações registradas
  - Anos de serviço (calculado a partir da celebração mais antiga)
  - Presença média percentual
- Formulário **"Quero Servir"** para interessados enviarem nome, telefone, e-mail e mensagem

### Interessados
- Administradores recebem as inscrições do portal na página `/interessados`
- Badge "NOVO" para inscrições não lidas
- Ação de marcar como lido / não lido
- Botão de WhatsApp direto para entrar em contato com o interessado
- Exclusão com confirmação

### Usuários
- CRUD de administradores com usuário/senha (sem e-mail)
- Resetar senha, ativar/desativar, soft delete

### Configurações
- Nome da paróquia, endereço, telefone, coordenador
- Logo salvo em **base64** diretamente no banco (sem storage externo)
- Configurações do portal público

---

## Estrutura do Banco

| Tabela | Descrição |
|--------|-----------|
| `users` | Administradores do sistema |
| `cerimoniarios` | Cerimoniários/acólitos (com flags `mestre`, `experiente`, `indisponivel_temporario`) |
| `funcoes` | 9 funções litúrgicas fixas |
| `celebracoes` | Celebrações com flags, cor litúrgica e agrupamento de final de semana |
| `escalas` | Escalas vinculadas a uma celebração |
| `escala_itens` | Linhas da escala (função + cerimoniário + token de confirmação + status) |
| `presencas` | Presença pós-celebração (com campo de substituto) |
| `treinamentos` | Treinamentos com tema, local, período litúrgico e funções alvo |
| `treinamento_presencas` | Presença individual por cerimoniário em cada treinamento |
| `historico_escalas` | Auditoria de criação/edição/exclusão |
| `configuracoes` | Dados, logo da paróquia e configurações do portal |
| `interessados` | Inscrições recebidas pelo formulário do portal público |

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
SANCTUM_STATEFUL_DOMAINS=localhost:5173
FRONTEND_URL=http://localhost:5173
```
