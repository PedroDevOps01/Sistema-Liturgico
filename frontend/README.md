# Frontend — Ministério dos Acólitos

React 19 + TypeScript + Vite + TailwindCSS

## Iniciar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de produção
```

O Vite redireciona `/api/*` para `http://127.0.0.1:8000` via proxy (configurado em `vite.config.ts`).

## Principais bibliotecas

| Lib | Uso |
|-----|-----|
| `react-router-dom` | Roteamento SPA |
| `react-hook-form` + `zod` | Formulários com validação |
| `axios` | Requisições HTTP com interceptor de auto-unwrap |
| `@dnd-kit` | Drag & drop na montagem da escala |
| `date-fns` | Formatação de datas em pt-BR |
| `lucide-react` | Ícones |
| `react-hot-toast` | Notificações |

## Estrutura de pastas relevante

```
src/
  assets/           # imagens e logos estáticos
  lib/
    api.ts          # axios com interceptor Bearer token
    auth.ts         # helpers de localStorage (token/user)
    dateUtils.ts    # formatadores de data/hora/telefone
    liturgico.ts    # detecção de período e cores litúrgicas
    theme.ts        # aplicação de tema litúrgico via CSS vars
    favicon.ts      # favicon dinâmico
  pages/            # uma página por rota
  components/
    Layout/         # Sidebar + Layout com Outlet
    common/         # Badge, Modal, SearchableSelect, ConfirmDialog, etc.
  types/index.ts    # interfaces TypeScript de toda a API
```

---

Veja o README raiz do projeto para instruções completas de setup e funcionalidades.
