# Arquitetura do projeto CargoFy

## Estrutura recomendada

```txt
src/
  components/
    ui/                # componentes visuais reutilizáveis (Card, Modal, etc.)
  config/              # inicialização de SDKs e integrações externas
  constants/           # constantes compartilhadas (nomes de coleções, IDs, etc.)
  services/            # acesso a APIs e Firestore (paths e regras de acesso)
  App.jsx              # composição principal da aplicação
  main.jsx             # bootstrap da aplicação React
```

## Princípios adotados

1. **Separação de responsabilidades**
   - Configuração do Firebase em `src/config/firebase.js`.
   - Caminhos/referências do Firestore em `src/services/firestorePaths.js`.
   - Constantes de domínio em `src/constants/firestore.js`.

2. **Escalabilidade de manutenção**
   - Componentes de UI em pasta dedicada para facilitar reuso.
   - `App.jsx` fica focado em regras de negócio e telas.

3. **Evolução sugerida (próximos passos)**
   - Mover blocos grandes de tela para `src/features/<modulo>/components`.
   - Criar hooks por domínio, ex.: `useViagens`, `useFinanceiro`.
   - Adicionar TypeScript e linting (`eslint` + `prettier`) para padronização.
   - Introduzir testes unitários para utilitários e regras de cálculo.
