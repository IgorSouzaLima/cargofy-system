# CargoFy System

Sistema de gestão logística construído com React + Vite + Firebase.

## Estrutura profissional recomendada

```text
src/
  components/
    ui/                # Componentes visuais reutilizáveis
  config/              # Configurações centralizadas (Firebase, env)
  constants/           # Constantes de domínio e valores default
  features/
    auth/              # Fluxos de autenticação
  App.jsx              # Orquestração principal da aplicação
  main.jsx             # Bootstrap da aplicação
```

## Boas práticas aplicadas

- Configuração Firebase isolada em `src/config/firebase.js`.
- Estado inicial do formulário isolado em `src/constants/formData.js`.
- Componentes de UI reutilizáveis extraídos de `App.jsx`.
- Fluxo de login modularizado em `src/features/auth/Login.jsx`.
- Suporte a variáveis de ambiente via `.env` (ver `.env.example`).

## Como executar

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run preview
```

## Próximos passos para escala

1. Quebrar `App.jsx` em módulos por domínio (`viagens`, `financeiro`, `relatorios`).
2. Adicionar TypeScript para contratos de dados e maior segurança de manutenção.
3. Adicionar testes (unitários + integração) para regras de status e relatórios.
4. Configurar CI com lint, build e testes automatizados.
