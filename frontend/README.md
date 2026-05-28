# Frontend — Sistema de Escalas Litúrgicas

React 18 + TypeScript + Vite + TailwindCSS

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
  lib/
    api.ts          # axios com interceptor Bearer token
    auth.ts         # helpers de localStorage (token/user)
    dateUtils.ts    # formatadores de data/hora/telefone
  pages/            # uma página por rota
  components/
    Layout/         # Sidebar + Layout com Outlet
    common/         # Badge, Modal, SearchableSelect, etc.
  types/index.ts    # interfaces TypeScript de toda a API
```

---

Veja o README raiz do projeto para instruções completas.

## Plugins anteriores

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
